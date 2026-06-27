import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useAiStore } from '../stores/ai';
import { useProjectStore } from '../stores/project';
import { getSystemPrompt } from './systemPrompt';

interface HttpResponse {
  status: number;
  status_text: string;
  headers: Record<string, string>;
  body: string;
}

interface StreamChunk {
  content: string;
  reasoning: string;
  done: boolean;
}

async function tauriFetch(url: string, options: { method?: string; headers?: Record<string, string>; body?: string; timeout_secs?: number }): Promise<HttpResponse> {
  return invoke('http_request', {
    req: {
      url,
      method: options.method || 'POST',
      headers: options.headers,
      body: options.body,
      timeout_secs: options.timeout_secs,
    },
  }) as Promise<HttpResponse>;
}

function friendlyError(msg: string): string {
  const m = msg.toLowerCase();
  const stripped = msg.replace(/^error sending request for url \([^)]+\):\s*/i, '').trim();
  const realMsg = (stripped && stripped !== msg) ? stripped : msg;
  const r = realMsg.toLowerCase();

  if (r.includes('dns')) return 'DNS 解析失败，请检查 API 地址是否正确';
  if (r.includes('tls') || r.includes('ssl') || r.includes('certificate')) return 'SSL/TLS 连接错误，请检查网络环境';
  if (r.includes('refused') || r.includes('connection reset')) return '连接被拒绝，请确认 API 地址正确且服务可用';
  if (r.includes('timeout') || r.includes('timed out')) return '连接超时，请检查 API 地址和网络连接';
  if (r.includes('no route to host')) return '无法连接到服务器，请检查网络';
  if (r.includes('eof') || r.includes('unexpected eof')) return '服务器返回不完整响应，请检查 API 地址';
  if (r.includes('error sending request')) return '无法连接到服务器，请检查 API 地址和网络连接是否正常';
  return realMsg;
}

function friendlyHttpError(status: number, body: string): string {
  if (status === 401) return 'API Key 无效或未授权，请检查 API Key 是否正确';
  if (status === 403) return '无权限访问，请检查 API Key 权限';
  if (status === 404) return 'API 地址不存在，请检查 URL 是否正确';
  if (status === 429) return '请求频率过高或 API 额度已用完，请稍后重试或检查账户余额';
  if (status >= 500) return '服务器内部错误，请稍后重试';
  try {
    const json = JSON.parse(body);
    const errMsg = json.error?.message || json.error?.type || '';
    if (errMsg.includes('Incorrect API key')) return 'API Key 错误，请检查并重新填写';
    if (errMsg.includes('invalid_api_key')) return 'API Key 无效';
    if (errMsg.includes('insufficient_quota')) return 'API 额度不足，请检查账户余额';
    if (errMsg.includes('rate limit')) return '请求频率过高，请稍后重试';
    if (errMsg.includes('overdue') || errMsg.includes('overdue-payment')) return '服务不可用：账户欠费或未开通，请检查云服务商账户状态';
    if (errMsg) return `请求失败: ${errMsg}`;
  } catch {}
  return `请求失败 (HTTP ${status})`;
}

function friendlyStreamError(content: string): string {
  // Format from Rust: "请求失败 (400): {json body}"
  const match = content.match(/^请求失败 \((\d+)\):\s*(.*)/);
  if (!match) {
    // Not a stream error, check if it's a connection error
    if (content.startsWith('连接错误:')) {
      const errMsg = content.slice(5).trim();
      return `连接错误：${friendlyError(errMsg)}`;
    }
    return content;
  }

  const status = parseInt(match[1]);
  const body = match[2].trim();

  // Try to parse JSON body
  try {
    const json = JSON.parse(body);
    const errMsg = json.error?.message || json.error?.type || '';

    if (status === 401) return '对话失败：API Key 无效或未授权，请检查 API Key 是否正确';
    if (status === 403) return '对话失败：无权限访问，请检查 API Key 权限';
    if (status === 404) return '对话失败：API 地址不存在，请检查 URL 是否正确';
    if (status === 429) {
      if (errMsg.includes('insufficient_quota') || errMsg.includes('exceeded')) {
        return '对话失败：API 额度已用完，请充值后继续使用';
      }
      return '对话失败：请求频率过高或 API 额度已用完，请稍后重试或检查账户余额';
    }
    if (status === 400) {
      if (errMsg.includes('token') || errMsg.includes('length') || errMsg.includes('context')) {
        return '对话失败：对话内容过长，请开启新对话后重试';
      }
      if (errMsg.includes('model')) {
        return '对话失败：模型参数有误，请检查配置中的模型名称是否正确';
      }
      if (errMsg.includes('overdue') || errMsg.includes('overdue-payment')) return '对话失败：账户欠费或未开通，请检查云服务商账户状态';
      if (errMsg) return `对话失败：${errMsg}`;
    }
    if (status >= 500) return '对话失败：服务器内部错误，请稍后重试';
    if (errMsg.includes('overdue') || errMsg.includes('overdue-payment')) return '对话失败：账户欠费或未开通，请检查云服务商账户状态';
    if (errMsg) return `对话失败：${errMsg}`;
  } catch {}

  if (status === 400) return '对话失败：请求参数有误，请检查 API 地址和模型配置是否正确';
  if (status === 401) return '对话失败：API Key 无效或未授权';
  if (status === 429) return '对话失败：请求频率过高或 API 额度已用完';
  if (status >= 500) return '对话失败：服务器内部错误，请稍后重试';
  return `对话失败 (HTTP ${status})`;
}

/**
 * Check if the last JSON code block in the response is complete.
 * Returns true if: no JSON block found, the block is properly closed with ```,
 * or the JSON within the unclosed block has balanced braces/brackets.
 */
function isJsonResponseComplete(text: string): boolean {
  if (!text) return true;
  const lines = text.split('\n');
  let inJsonBlock = false;
  let jsonContent = '';

  for (const line of lines) {
    if (line.trimStart().startsWith('```json')) {
      inJsonBlock = true;
      jsonContent = '';
    } else if (inJsonBlock && line.trim() === '```') {
      inJsonBlock = false;
      jsonContent = '';
    } else if (inJsonBlock) {
      jsonContent += line + '\n';
    }
  }

  if (!inJsonBlock) return true;

  // Check brace/bracket balance in the unclosed JSON
  let braces = 0;
  let brackets = 0;
  let inStr = false;
  let esc = false;

  for (const ch of jsonContent) {
    if (esc) { esc = false; continue; }
    if (ch === '\\' && inStr) { esc = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') braces++;
    if (ch === '}') braces--;
    if (ch === '[') brackets++;
    if (ch === ']') brackets--;
  }

  return braces <= 0 && brackets <= 0;
}

export function useAiChat() {
  const ai = useAiStore();

  function buildCurrentProjectContext(): string | undefined {
    const store = useProjectStore();
    // Only inject context if project has pages with components
    if (store.pages.length <= 1 && store.components.length === 0) return undefined;

    const pageData = store.pages.map((page, i) => ({
      name: page.name,
      components: store.components
        .filter(c => c.pageId === page.id)
        .map(c => ({
          type: c.type,
          x: c.position.x,
          y: c.position.y,
          w: c.size.width,
          h: c.size.height,
          props: c.props,
          animation: c.animation,
        })),
    }));

    return JSON.stringify({
      format: 'noah-v1',
      project: {
        title: store.title,
        canvas: store.canvasConfig,
        background: store.pageStyle.background,
      },
      pages: pageData,
    }, null, 2);
  }

  function getMaxTokens(): number {
    const url = ai.config.apiUrl.toLowerCase();
    if (url.includes('openai.com')) return 16384;
    if (url.includes('anthropic.com')) return 8192;
    if (url.includes('deepseek.com')) return 65536;
    if (url.includes('moonshot.cn')) return 32768;
    if (url.includes('dashscope') || url.includes('bigmodel.cn')) return 8192;
    if (url.includes('token-plan-cn.xiaomimimo.com')) return 16384;
    return 16384;
  }

  /** Ensure URL ends with /chat/completions (for base URLs that omit it) */
  function chatUrl(): string {
    const u = ai.config.apiUrl;
    if (u.endsWith('/chat/completions')) return u;
    const base = u.endsWith('/') ? u.slice(0, -1) : u;
    return `${base}/chat/completions`;
  }

  async function sendMessage(userInput: string) {
    if (ai.streaming) return;
    if (!ai.config.apiKey) {
      ai.showConfig = true;
      return;
    }

    ai.addUserMessage(userInput);
    ai.addAssistantMessage('');
    ai.streaming = true;

    const projectContext = buildCurrentProjectContext();
    const specPrompt = getSystemPrompt(projectContext);
    let fullContent = '';
    let fullReasoning = '';
    const allMessages = [
      { role: 'system', content: specPrompt },
      ...ai.messages.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
    ];

    fullContent = '';
    fullReasoning = '';
    let streamDone = false;

    const unlisten = await listen<StreamChunk>('stream-chunk', (event) => {
      const { content, reasoning, done } = event.payload;
      if (reasoning) fullReasoning += reasoning;
      if (content) fullContent += content;
      if (done) {
        if (fullContent && !fullContent.startsWith('<think>') && !fullContent.startsWith('#')) {
          const translated = friendlyStreamError(fullContent);
          if (translated !== fullContent) fullContent = translated;
        }
        streamDone = true;
        return;
      }
      let display = '';
      if (fullReasoning) display = `<think>\n${fullReasoning}`;
      display += fullContent;
      ai.updateLastAssistant(display);
    });

    try {
      let headers: Record<string, string>;
      let body: string;
      const isAnthropic = ai.config.provider === 'anthropic';

      if (isAnthropic) {
        const systemMsg = allMessages.find(m => m.role === 'system');
        let chatMessages = allMessages.filter(m => m.role !== 'system');
        headers = {
          'Content-Type': 'application/json',
          'x-api-key': ai.config.apiKey,
        };
        if (ai.config.apiUrl.includes('anthropic.com')) {
          headers['anthropic-version'] = '2023-06-01';
        }
        if (systemMsg?.content) {
          chatMessages = [
            { role: 'user', content: `[System Context]\n${systemMsg.content}\n\n---\nPlease follow the above instructions.` },
            ...chatMessages,
          ];
        }
        body = JSON.stringify({
          model: ai.config.model,
          max_tokens: getMaxTokens(),
          system: systemMsg?.content || '',
          messages: chatMessages,
          stream: true,
        });
      } else {
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ai.config.apiKey}`,
        };
        body = JSON.stringify({
          model: ai.config.model,
          max_tokens: getMaxTokens(),
          messages: allMessages,
          stream: true,
        });
      }

      await invoke('stream_chat', { url: chatUrl(), headers, body });

      for (let i = 0; i < 1200; i++) {
        if (streamDone) break;
        await new Promise(r => setTimeout(r, 100));
      }

      if (!streamDone) {
        ai.updateLastAssistant(ai.messages[ai.messages.length - 1].content + '\n\n**请求超时：AI 响应时间过长，请检查网络连接或 API 服务状态后重试。**');
        ai.saveCurrentHistory();
        unlisten();
        ai.streaming = false;
        return;
      }

      // Auto-continuation for truncated JSON
      if (fullContent && !isAnthropic) {
        const MAX_CONTINUES = 10;
        ai.continuationStatus = '正在拼接完整响应...';
        for (let ci = 0; ci < MAX_CONTINUES; ci++) {
          if (isJsonResponseComplete(fullContent)) break;

          const contMessages = [
            ...allMessages,
            { role: 'assistant', content: fullContent },
            { role: 'user', content: '继续输出JSON。上面生成的内容被截断了，直接从断点处继续输出后续的JSON数据。不要使用```json或```包裹，不要重复任何已输出的内容，直接从上一个未闭合的JSON处继续输出纯JSON文本。' },
          ];

          streamDone = false;
          const contUnlisten = await listen<StreamChunk>('stream-chunk', (event) => {
            const { content, reasoning, done } = event.payload;
            if (reasoning) fullReasoning += reasoning;
            if (content) fullContent += content;
            if (done) { streamDone = true; return; }
            let display = '';
            if (fullReasoning) display = `<think>\n${fullReasoning}`;
            display += fullContent;
            ai.updateLastAssistant(display);
          });

          await invoke('stream_chat', {
            url: chatUrl(), headers,
            body: JSON.stringify({
              model: ai.config.model,
              max_tokens: getMaxTokens(),
              messages: contMessages,
              stream: true,
            }),
          });

          for (let j = 0; j < 1200; j++) {
            if (streamDone) break;
            await new Promise(r => setTimeout(r, 100));
          }
          if (!streamDone) {
            ai.continuationStatus = '';
            fullContent += '\n\n**续接超时：AI 响应时间过长，请重试。**';
            ai.updateLastAssistant(ai.messages[ai.messages.length - 1].content);
            contUnlisten();
            break;
          }
          contUnlisten();
        }
        ai.continuationStatus = '';
      }

    } catch (e: any) {
      const errText = e?.message || e || '未知错误';
      ai.updateLastAssistant(ai.messages[ai.messages.length - 1].content + `\n\n${friendlyStreamError(`连接错误: ${errText}`)}`);
      ai.saveCurrentHistory();
    }

    // Release streaming lock FIRST so the import button becomes clickable immediately
    ai.streaming = false;
    unlisten();

    // Then do final content updates (button is already enabled)
    if (fullContent || fullReasoning) {
      let final = '';
      if (fullReasoning) final = `<think>\n${fullReasoning}\n</think>\n`;
      final += fullContent;
      if (final) ai.updateLastAssistant(final);
      ai.saveCurrentHistory();
    }
  }

  async function testConnection(): Promise<string> {
    try {
      const isAnthropic = ai.config.provider === 'anthropic';
      let headers: Record<string, string>;
      let body: string;

      if (isAnthropic) {
        headers = {
          'Content-Type': 'application/json',
          'x-api-key': ai.config.apiKey,
        };
        if (ai.config.apiUrl.includes('anthropic.com')) {
          headers['anthropic-version'] = '2023-06-01';
        }
        body = JSON.stringify({
          model: ai.config.model,
          max_tokens: 5,
          messages: [{ role: 'user', content: 'Hi' }],
        });
      } else {
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ai.config.apiKey}`,
        };
        body = JSON.stringify({
          model: ai.config.model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5,
        });
      }

      const res = await tauriFetch(chatUrl(), {
        method: 'POST',
        headers,
        body,
        timeout_secs: 10,
      });
      if (res.status >= 200 && res.status < 300) return '连接成功！';
      return friendlyHttpError(res.status, res.body);
    } catch (e: any) {
      return friendlyError(e?.message || e || '未知错误');
    }
  }

  return { sendMessage, testConnection };
}
