import html2canvas from 'html2canvas';

export type OnExportProgress = (current: number, total: number) => void;

// ── Shared: capture a slide as an image (data URL) ──
async function captureSlide(htmlContent: string, slideIndex: number): Promise<string> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = '1280px';
  container.style.height = '720px';
  container.style.zIndex = '-1';
  document.body.appendChild(container);

  const iframe = document.createElement('iframe');
  iframe.style.width = '1280px';
  iframe.style.height = '720px';
  iframe.style.border = 'none';
  container.appendChild(iframe);

  return new Promise((resolve, reject) => {
    iframe.onload = async () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow!.document;
        const slides = doc.querySelectorAll('.slide');
        slides.forEach((s, j) => s.classList.toggle('active', j === slideIndex));
        const nav = doc.querySelector<HTMLElement>('.slide-nav, .slide-counter');
        if (nav) nav.style.display = 'none';
        await new Promise(r => setTimeout(r, 500));

        const canvas = await html2canvas(doc.body, {
          width: 1280, height: 720,
          scale: 2, useCORS: true,
          backgroundColor: '#ffffff',
        });
        document.body.removeChild(container);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        document.body.removeChild(container);
        reject(e);
      }
    };
    iframe.srcdoc = htmlContent;
  });
}

// ── Download helper ──
async function downloadBlob(blob: Blob, defaultName: string) {
  const isTauri = !!(window as any).isTauri;
  if (isTauri) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      const filePath = await save({
        defaultPath: defaultName,
        filters: [{ name: defaultName.split('.').pop()?.toUpperCase() || 'File', extensions: [defaultName.split('.').pop() || ''] }]
      });
      if (!filePath) return;
      const arrayBuffer = await blob.arrayBuffer();
      await writeFile(filePath, new Uint8Array(arrayBuffer));
    } catch (e) {
      console.error('[Tauri save]', e);
      fallbackDownload(blob, defaultName);
    }
  } else {
    fallbackDownload(blob, defaultName);
  }
}

function fallbackDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF / Print export ──
export async function exportPDF(htmlContent: string, title: string, totalPages: number, onProgress?: OnExportProgress) {
  const images: string[] = [];
  for (let i = 0; i < totalPages; i++) {
    onProgress?.(i, totalPages);
    try {
      const dataUrl = await captureSlide(htmlContent, i);
      images.push(dataUrl);
    } catch (e) {
      console.error(`[PDF] Failed to capture slide ${i}`, e);
    }
  }
  onProgress?.(totalPages, totalPages);
  if (images.length === 0) {
    alert('无法生成 PDF 预览');
    return;
  }

  // Build print HTML with images only (no nested iframes)
  const printDoc = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    @page { size: landscape; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #ddd; }
    .page {
      width: 100vw; height: 100vh; overflow: hidden;
      page-break-after: always; display: flex;
      align-items: center; justify-content: center;
      background: #fff;
    }
    .page:last-child { page-break-after: avoid; }
    .page img { width: 100%; height: 100%; object-fit: contain; }
  </style>
</head>
<body>
  ${images.map(url => `<div class="page"><img src="${url}" /></div>`).join('')}
  <script>setTimeout(function(){ window.print(); }, 300);<\/script>
</body>
</html>`;

  const isTauri = !!(window as any).isTauri;
  if (isTauri) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.left = '-9999px';
    iframe.style.top = '0';
    iframe.style.width = '1280px';
    iframe.style.height = '720px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
    iframe.srcdoc = printDoc;
  } else {
    const win = window.open('', 'noah-print', 'width=1280,height=720');
    if (!win) { alert('请允许弹出窗口以打印'); return; }
    win.document.write(printDoc);
    win.document.close();
  }
}

// ── Image export (single slide) ──
export async function exportSlideAsImage(htmlContent: string, slideIndex: number, pageName: string) {
  try {
    const dataUrl = await captureSlide(htmlContent, slideIndex);
    const blob = dataURLToBlob(dataUrl);
    const name = `${pageName || `slide-${slideIndex + 1}`}.png`;
    await downloadBlob(blob, name);
  } catch (e) {
    console.error('[exportImage]', e);
  }
}

// ── Export all slides as images ──
export async function exportAllSlidesAsImages(htmlContent: string, totalPages: number, onProgress?: OnExportProgress) {
  for (let i = 0; i < totalPages; i++) {
    onProgress?.(i, totalPages);
    await exportSlideAsImage(htmlContent, i, `slide-${i + 1}`);
  }
  onProgress?.(totalPages, totalPages);
}

function dataURLToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)![1];
  const bytes = atob(parts[1]);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mime });
}
