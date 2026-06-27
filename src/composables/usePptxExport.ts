import PptxGenJS from 'pptxgenjs';
import html2canvas from 'html2canvas';
import { useProjectStore } from '../stores/project';
import type { OnExportProgress } from './useExport';

/**
 * Capture a single slide as a base64 data URL image
 */
function captureSlideAsImage(htmlContent: string, slideIndex: number, pageW: number, pageH: number): Promise<string> {
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.width = `${pageW}px`;
  container.style.height = `${pageH}px`;
  container.style.zIndex = '-1';
  document.body.appendChild(container);

  const iframe = document.createElement('iframe');
  iframe.style.width = `${pageW}px`;
  iframe.style.height = `${pageH}px`;
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
          width: pageW, height: pageH,
          scale: 1.5,
          useCORS: true,
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

export async function exportToPptx(currentCode?: string, onProgress?: OnExportProgress) {
  const store = useProjectStore();
  const pageW = store.canvasConfig.width || 1280;
  const pageH = store.canvasConfig.height || 720;

  if (!currentCode) {
    alert('无法获取演示文稿内容，请先在编辑器中生成预览');
    return;
  }

  // Filter visible pages
  const visiblePages = store.customShow
    ? store.pages.filter(p => store.customShow!.includes(p.id))
    : store.pages.filter(p => !p.hidden);
  if (visiblePages.length === 0) {
    alert('没有可导出的页面');
    return;
  }

  // Create PPTX with matching aspect ratio
  const pptx = new PptxGenJS();
  const pptAspect = pageW / pageH;
  let pptW: number, pptH: number;
  if (pptAspect > 1.6) {
    pptW = 13.33; pptH = 7.5;
  } else {
    pptW = 10; pptH = 7.5;
  }

  pptx.defineLayout({ name: 'CUSTOM', width: pptW, height: pptH });
  pptx.layout = 'CUSTOM';
  pptx.author = 'Noah IDE';
  pptx.title = store.title || 'Presentation';

  const total = visiblePages.length;

  // Capture each slide as image and add to PPTX
  for (let i = 0; i < total; i++) {
    const page = visiblePages[i];
    const pageIndex = store.pages.indexOf(page);
    onProgress?.(i, total);
    try {
      const dataUrl = await captureSlideAsImage(currentCode, pageIndex, pageW, pageH);
      const slide = pptx.addSlide();
      slide.addImage({
        data: dataUrl,
        x: 0, y: 0,
        w: pptW, h: pptH,
      });
      if (page.notes) {
        slide.addNotes(page.notes);
      }
    } catch (e) {
      console.warn(`[PPTX] Failed to capture slide ${i + 1}:`, e);
      const slide = pptx.addSlide();
      slide.addText(`[Slide ${i + 1} - Failed to render]`, {
        x: 0, y: 0, w: pptW, h: pptH,
        fontSize: 18, color: '999999', align: 'center', valign: 'middle',
      });
    }
  }
  onProgress?.(total, total);

  // Handle save
  const isTauri = !!(window as any).isTauri;
  if (isTauri) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      const filePath = await save({
        defaultPath: `${store.title || 'presentation'}.pptx`,
        filters: [{ name: 'PowerPoint', extensions: ['pptx'] }]
      });
      if (!filePath) return;
      const data = await pptx.write({ outputType: 'base64' });
      const binaryStr = atob(data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      await writeFile(filePath, bytes);
    } catch (e) {
      console.error('[PPTX Tauri save]', e);
      alert('保存失败: ' + String(e));
    }
  } else {
    await pptx.writeFile({ fileName: `${store.title || 'presentation'}.pptx` });
  }
}
