// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager};
use serde::{Deserialize, Serialize};
use futures_util::StreamExt;
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Deserialize)]
struct HttpRequest {
    url: String,
    method: Option<String>,
    headers: Option<std::collections::HashMap<String, String>>,
    body: Option<String>,
    timeout_secs: Option<u64>,
}

#[derive(Debug, Serialize)]
struct HttpResponse {
    status: u16,
    status_text: String,
    headers: std::collections::HashMap<String, String>,
    body: String,
}

#[tauri::command]
async fn http_request(req: HttpRequest) -> Result<HttpResponse, String> {
    let mut client_builder = reqwest::Client::builder();
    if let Some(timeout_secs) = req.timeout_secs {
        client_builder = client_builder.timeout(std::time::Duration::from_secs(timeout_secs));
    }
    let client = client_builder.build().map_err(|e| e.to_string())?;
    let method = req.method.unwrap_or_else(|| "GET".to_string());
    let method = reqwest::Method::from_bytes(method.as_bytes()).map_err(|e| e.to_string())?;

    let mut builder = client.request(method, &req.url);

    if let Some(headers) = req.headers {
        for (k, v) in headers {
            builder = builder.header(&k, &v);
        }
    }

    if let Some(body) = req.body {
        builder = builder.body(body);
    }

    let resp = builder.send().await.map_err(|e| e.to_string())?;
    let status = resp.status();
    let resp_headers: std::collections::HashMap<String, String> = resp
        .headers()
        .iter()
        .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
        .collect();
    let body = resp.text().await.map_err(|e| e.to_string())?;

    Ok(HttpResponse {
        status: status.as_u16(),
        status_text: status.canonical_reason().unwrap_or("").to_string(),
        headers: resp_headers,
        body,
    })
}

#[derive(Debug, Clone, Serialize)]
struct StreamChunk {
    content: String,
    reasoning: String,
    done: bool,
}

struct SessionState {
    current_slide: Arc<AtomicU32>,
    _total_slides: u32,
    _html: String,
}

struct PresenterSessions(Mutex<HashMap<String, SessionState>>);

#[tauri::command]
async fn stream_chat(app: tauri::AppHandle, url: String, headers: std::collections::HashMap<String, String>, body: String) -> Result<(), String> {
    let client = reqwest::Client::new();
    let resp = client
        .post(&url)
        .headers(headers.iter().map(|(k, v)| {
            let name = reqwest::header::HeaderName::from_bytes(k.as_bytes()).unwrap();
            let value = reqwest::header::HeaderValue::from_str(v).unwrap();
            (name, value)
        }).collect::<reqwest::header::HeaderMap>())
        .body(body)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let status = resp.status().as_u16();
    if status < 200 || status >= 300 {
        let err_body = resp.text().await.unwrap_or_default();
        app.emit("stream-chunk", StreamChunk { content: format!("请求失败 ({}): {}", status, err_body), reasoning: String::new(), done: true })
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    let mut stream = resp.bytes_stream();
    let mut buffer = String::new();

    tokio::spawn(async move {
        while let Some(Ok(chunk)) = stream.next().await {
            if let Ok(text) = std::str::from_utf8(&chunk) {
                buffer.push_str(text);
                // Process complete SSE lines
                while let Some(newline_pos) = buffer.find('\n') {
                    let line = buffer[..newline_pos].trim_end_matches('\r').to_string();
                    buffer = buffer[newline_pos + 1..].to_string();

                    if line.is_empty() {
                        continue;
                    }

                    // Skip Anthropic event lines (type info is in data JSON)
                    if line.starts_with("event: ") {
                        continue;
                    }

                    if let Some(data) = line.strip_prefix("data: ") {
                        if data == "[DONE]" {
                            let _ = app.emit("stream-chunk", StreamChunk { content: String::new(), reasoning: String::new(), done: true });
                            return;
                        }
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(data) {
                            let msg_type = json["type"].as_str().unwrap_or("");

                            // Anthropic format
                            if msg_type == "content_block_delta" {
                                let delta = &json["delta"];
                                let delta_type = delta["type"].as_str().unwrap_or("");
                                let mut content = String::new();
                                let mut reasoning = String::new();
                                if delta_type == "text_delta" {
                                    content = delta["text"].as_str().unwrap_or("").to_string();
                                } else if delta_type == "thinking_delta" {
                                    reasoning = delta["thinking"].as_str().unwrap_or("").to_string();
                                }
                                if !content.is_empty() || !reasoning.is_empty() {
                                    let _ = app.emit("stream-chunk", StreamChunk { content, reasoning, done: false });
                                }
                                continue;
                            }
                            if msg_type == "message_delta" || msg_type == "message_stop" {
                                let stop = json["delta"]["stop_reason"].as_str().unwrap_or("");
                                if !stop.is_empty() || msg_type == "message_stop" {
                                    let _ = app.emit("stream-chunk", StreamChunk { content: String::new(), reasoning: String::new(), done: true });
                                    return;
                                }
                                continue;
                            }

                            // OpenAI format
                            let delta = &json["choices"][0]["delta"];
                            let content = delta["content"].as_str().unwrap_or("").to_string();
                            // Try multiple field names for reasoning/thinking content
                            let reasoning = delta["reasoning_content"].as_str()
                                .or_else(|| delta["reasoning"].as_str())
                                .or_else(|| delta["thought"].as_str())
                                .unwrap_or("").to_string();
                            if !content.is_empty() || !reasoning.is_empty() {
                                let _ = app.emit("stream-chunk", StreamChunk { content, reasoning, done: false });
                            }
                        }
                    }
                }
            }
        }
        let _ = app.emit("stream-chunk", StreamChunk { content: String::new(), reasoning: String::new(), done: true });
    });

    Ok(())
}

#[tauri::command]
fn get_resource_dir(app: tauri::AppHandle) -> Result<String, String> {
    let path = app.path().resource_dir().map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn open_html_in_browser(html: String) -> Result<String, String> {
    let dir = std::env::temp_dir().join("noah_preview");
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let file_path = dir.join("preview.html");
    let mut file = std::fs::File::create(&file_path).map_err(|e| e.to_string())?;
    file.write_all(html.as_bytes()).map_err(|e| e.to_string())?;
    let url = format!("file:///{}", file_path.to_string_lossy().replace('\\', "/"));
    webbrowser::open(&url).map_err(|e| e.to_string())?;
    Ok(url)
}

#[tauri::command]
fn start_presenter_session(
    html: String,
    total_slides: u32,
    sessions: tauri::State<'_, PresenterSessions>,
) -> Result<String, String> {
    let listener = TcpListener::bind("127.0.0.1:0").map_err(|e| e.to_string())?;
    let port = listener.local_addr().map_err(|e| e.to_string())?.port();

    // Inject polling script with the actual port number
    let poll_script = format!(r#"
<script>
(function() {{
    var currentIdx = 0;
    var port = {};
    function poll() {{
        fetch('http://127.0.0.1:' + port + '/state')
            .then(function(r) {{ return r.json(); }})
            .then(function(state) {{
                if (state.currentSlide !== undefined && state.currentSlide !== currentIdx) {{
                    currentIdx = state.currentSlide;
                    if (window._noahGoToSlide) {{
                        window._noahGoToSlide(currentIdx);
                    }}
                }}
            }})
            .catch(function() {{}});
        setTimeout(poll, 300);
    }}
    poll();
}})();
</script>
</body>"#, port);

    let modified_html = if html.contains("</body>") {
        html.replace("</body>", &poll_script)
    } else {
        format!("{html}\n{poll_script}")
    };

    let current_slide = Arc::new(AtomicU32::new(0));

    // Spawn HTTP server thread
    let cs = current_slide.clone();
    let mh = modified_html.clone();
    std::thread::spawn(move || {
        serve_http(listener, mh, cs, total_slides);
    });

    // Store session state
    let session_id = port.to_string();
    if let Ok(mut map) = sessions.0.lock() {
        map.insert(session_id.clone(), SessionState {
            current_slide,
            _total_slides: total_slides,
            _html: modified_html,
        });
    }

    // Open browser to http://127.0.0.1:<port>/
    let url = format!("http://127.0.0.1:{}/", port);
    webbrowser::open(&url).map_err(|e| e.to_string())?;

    Ok(session_id)
}

#[tauri::command]
fn update_presenter_slide(
    session_dir: String,
    slide_index: u32,
    sessions: tauri::State<'_, PresenterSessions>,
) -> Result<(), String> {
    if let Ok(map) = sessions.0.lock() {
        if let Some(state) = map.get(&session_dir) {
            state.current_slide.store(slide_index, Ordering::SeqCst);
            return Ok(());
        }
    }
    Err(format!("Session not found: {}", session_dir))
}

fn handle_client(
    mut stream: TcpStream,
    html: &str,
    current_slide: &AtomicU32,
    total_slides: u32,
) {
    let mut buf = [0u8; 4096];
    let n = match stream.read(&mut buf) {
        Ok(n) if n > 0 => n,
        _ => return,
    };
    let request = String::from_utf8_lossy(&buf[..n]);
    let path = request.lines().next()
        .and_then(|line| line.split_whitespace().nth(1))
        .unwrap_or("");

    let (status, content_type, body) = match path {
        "/state" => {
            let slide = current_slide.load(Ordering::SeqCst);
            let json = serde_json::json!({ "currentSlide": slide, "totalSlides": total_slides });
            ("HTTP/1.1 200 OK", "application/json", serde_json::to_string(&json).unwrap())
        }
        "/" => {
            ("HTTP/1.1 200 OK", "text/html; charset=utf-8", html.to_string())
        }
        _ => return,
    };

    let response = format!(
        "{}\r\nContent-Type: {}\r\nAccess-Control-Allow-Origin: *\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
        status, content_type, body.len(), body
    );
    let _ = stream.write_all(response.as_bytes());
}

fn serve_http(
    listener: TcpListener,
    html: String,
    current_slide: Arc<AtomicU32>,
    total_slides: u32,
) {
    for stream in listener.incoming() {
        match stream {
            Ok(stream) => handle_client(stream, &html, &current_slide, total_slides),
            Err(_) => break,
        }
    }
}

/// Stores the content of a .noah file passed as a command-line argument
/// (e.g., when user double-clicks a .noah file associated with this app)
struct LaunchProject(Mutex<Option<String>>);

/// Returns the current platform: "linux", "windows", or "macos"
#[tauri::command]
fn get_platform() -> String {
    std::env::consts::OS.to_string()
}

#[tauri::command]
fn get_launch_project(state: tauri::State<LaunchProject>) -> Option<String> {
    state.0.lock().ok()?.take()
}

/// Returns ALL command-line arguments (for debugging file association).
#[tauri::command]
fn get_launch_args() -> Vec<String> {
    std::env::args_os().skip(1).map(|a| a.to_string_lossy().to_string()).collect()
}

/// Read a .noah file by path (bypasses frontend fs plugin restrictions for file association)
#[tauri::command]
fn read_noah_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(&path).map_err(|e| e.to_string())
}

/// Flag to prevent infinite loop when programmatically closing after dialog confirmation
struct CloseConfirmed(std::sync::Mutex<bool>);

#[tauri::command]
fn force_close(state: tauri::State<CloseConfirmed>, window: tauri::Window) -> Result<(), String> {
    *state.0.lock().map_err(|e| e.to_string())? = true;
    window.close().map_err(|e| e.to_string())
}

fn main() {
    // Find .noah file among command-line args (skip exe path)
    let launch_content = std::env::args_os()
        .skip(1)
        .find(|arg| {
            let p = std::path::Path::new(arg);
            p.extension().map_or(false, |e| e.eq_ignore_ascii_case("noah")) && p.exists()
        })
        .and_then(|p| std::fs::read_to_string(&p).ok());

    tauri::Builder::default()
        .manage(LaunchProject(Mutex::new(launch_content)))
        .manage(CloseConfirmed(Mutex::new(false)))
        .manage(PresenterSessions(Mutex::new(HashMap::new())))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_http::init())
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            let app_handle = app.handle().clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    // Check if close was already confirmed
                    if let Some(state) = app_handle.try_state::<CloseConfirmed>() {
                        if *state.0.lock().unwrap() {
                            return; // Allow close
                        }
                    }
                    api.prevent_close();
                    let h = app_handle.clone();
                    let _ = app_handle.dialog()
                        .message("当前项目未保存，是否先保存后关闭？")
                        .title("未保存的更改")
                        .kind(tauri_plugin_dialog::MessageDialogKind::Warning)
                        .show(move |confirmed| {
                            if confirmed {
                                // OK → tell JS to save, then JS calls force_close
                                let _ = h.emit("noah-close-with-save", ());
                            } else {
                                // Cancel → close without saving
                                if let Some(state) = h.try_state::<CloseConfirmed>() {
                                    *state.0.lock().unwrap() = true;
                                }
                                if let Some(w) = h.get_webview_window("main") {
                                    let _ = w.close();
                                }
                            }
                        });
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![open_html_in_browser, get_resource_dir, http_request, stream_chat, get_launch_project, get_launch_args, read_noah_file, force_close, start_presenter_session, update_presenter_slide, get_platform])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
