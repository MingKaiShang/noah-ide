import PptxGenJS from 'pptxgenjs';
import type { ComponentInstance } from '../types/component';
import { useProjectStore } from '../stores/project';

// ── Helpers ──

function colorToHex(color: string): string {
  if (!color) return '000000';
  const c = color.trim();
  if (c.startsWith('#')) return c.slice(1);
  const match = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (match) {
    return [Number(match[1]), Number(match[2]), Number(match[3])]
      .map(v => v.toString(16).padStart(2, '0')).join('');
  }
  return '000000';
}

/** Map CSS font-family values to real Windows/macOS font names that work in PPTX */
function mapFontFace(fontFamily: string | undefined): string | undefined {
  if (!fontFamily) return undefined;
  // CSS generic fonts → real fonts
  const genericMap: Record<string, string> = {
    'sans-serif': 'Arial',
    'serif': 'Times New Roman',
    'monospace': 'Courier New',
    'cursive': 'Comic Sans MS',
    'fantasy': 'Impact',
  };
  const trimmed = fontFamily.trim();
  if (genericMap[trimmed]) return genericMap[trimmed];

  // Handle CSS font stacks like '-apple-system, BlinkMacSystemFont, "Segoe UI", ...'
  // Split by comma, strip quotes, take first real font
  const parts = fontFamily.split(',').map(s => s.trim().replace(/["']/g, ''));
  for (const part of parts) {
    // Skip known system pseudo-fonts
    if (['-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif', 'serif', 'monospace'].includes(part)) continue;
    // Skip empty
    if (!part) continue;
    return part;
  }
  // All parts were system pseudo-fonts or CSS generics → fall back to Arial
  return 'Arial';
}

/** Decode HTML entities in text (for rich text content) */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

type PptxRenderer = (slide: PptxGenJS.Slide, comp: ComponentInstance, sx: number, sy: number) => void;

// ── Renderer registry ──

const renderers = new Map<string, PptxRenderer>();

// ═══════════════════════════════════════════
//  Text
// ═══════════════════════════════════════════
renderers.set('Text', (slide, comp, sx, sy) => {
  const p = comp.props;
  const text = p.richText && p.htmlContent
    ? decodeHtmlEntities(p.htmlContent.replace(/<[^>]+>/g, '').trim())
    : (p.text || '');
  if (!text) return;
  slide.addText(text, {
    x: comp.position.x / sx, y: comp.position.y / sy,
    w: comp.size.width / sx, h: comp.size.height / sy,
    fontSize: p.fontSize || 16,
    color: colorToHex(p.color || '#333333'),
    bold: p.fontWeight === 'bold' || p.fontWeight === '700' || p.fontWeight === '900',
    fontFace: mapFontFace(p.fontFamily),
    align: (p.textAlign === 'center' ? 'center' : p.textAlign === 'right' ? 'right' : 'left') as any,
    valign: p.alignItems === 'flex-start' ? 'top' : p.alignItems === 'flex-end' ? 'bottom' : 'middle',
    margin: 0,
  });
});

// ═══════════════════════════════════════════
//  Image
// ═══════════════════════════════════════════
renderers.set('Image', (slide, comp, sx, sy) => {
  const p = comp.props;
  if (!p.src) return;
  try {
    slide.addImage({
      path: p.src,
      x: comp.position.x / sx, y: comp.position.y / sy,
      w: comp.size.width / sx, h: comp.size.height / sy,
    });
  } catch { /* skip unloadable images */ }
});

// ═══════════════════════════════════════════
//  Rectangle
// ═══════════════════════════════════════════
renderers.set('Rectangle', (slide, comp, sx, sy) => {
  const p = comp.props;
  const shapeName = (p.cornerRadius || 0) > 0 ? 'roundRect' : 'rect';
  const opts: Record<string, any> = {
    x: comp.position.x / sx, y: comp.position.y / sy,
    w: comp.size.width / sx, h: comp.size.height / sy,
    fill: { color: colorToHex(p.fill || '#ecf0f1') },
  };
  if (p.cornerRadius) opts.rectRadius = Math.min(p.cornerRadius / comp.size.width, 0.5);
  if (p.stroke && p.strokeWidth) {
    opts.line = { color: colorToHex(p.stroke), width: p.strokeWidth };
  }
  slide.addShape(shapeName as any, opts);
});

// ═══════════════════════════════════════════
//  Circle → ellipse shape
// ═══════════════════════════════════════════
renderers.set('Circle', (slide, comp, sx, sy) => {
  const p = comp.props;
  const opts: Record<string, any> = {
    x: comp.position.x / sx, y: comp.position.y / sy,
    w: comp.size.width / sx, h: comp.size.height / sy,
    fill: { color: colorToHex(p.fill || '#ecf0f1') },
  };
  if (p.stroke && p.strokeWidth) {
    opts.line = { color: colorToHex(p.stroke), width: p.strokeWidth };
  }
  slide.addShape('ellipse', opts);
});

// ═══════════════════════════════════════════
//  Arrow
// ═══════════════════════════════════════════
renderers.set('Arrow', (slide, comp, sx, sy) => {
  const p = comp.props;
  const x = comp.position.x / sx;
  const y = comp.position.y / sy;
  const w = comp.size.width / sx;
  const h = comp.size.height / sy;
  const dir = p.direction || 'right';
  let x1 = x, y1 = y + h / 2, x2 = x + w, y2 = y + h / 2;
  if (dir === 'left') { x1 = x + w; x2 = x; }
  else if (dir === 'up') { x1 = x + w / 2; y1 = y + h; x2 = x + w / 2; y2 = y; }
  else if (dir === 'down') { x1 = x + w / 2; y1 = y; x2 = x + w / 2; y2 = y + h; }
  slide.addShape('line', {
    x: Math.min(x1, x2), y: Math.min(y1, y2),
    w: Math.abs(x2 - x1) || 0.01, h: Math.abs(y2 - y1) || 0.01,
    line: {
      color: colorToHex(p.color || '#6366F1'),
      width: p.strokeWidth || 3,
      endArrowType: 'triangle',
    },
  });
});

// ═══════════════════════════════════════════
//  Divider
// ═══════════════════════════════════════════
renderers.set('Divider', (slide, comp, sx, sy) => {
  const p = comp.props;
  const x = comp.position.x / sx;
  const y = comp.position.y / sy;
  const w = comp.size.width / sx;
  const t = p.thickness || 1;
  const dashMap: Record<string, 'solid' | 'dash' | 'dot'> = {
    solid: 'solid', dashed: 'dash', dotted: 'dot',
  };
  slide.addShape('line', {
    x, y: y + (t / 2) / sy, w, h: 0.01,
    line: {
      color: colorToHex(p.color || '#d1d5db'),
      width: t,
      dashType: dashMap[p.style] || 'solid',
    },
  });
});

// ═══════════════════════════════════════════
//  Table
// ═══════════════════════════════════════════
renderers.set('Table', (slide, comp, sx, sy) => {
  const p = comp.props;
  let headers: string[] = [];
  let data: string[][] = [];
  try { headers = JSON.parse(p.headers || '[]'); } catch { return; }
  try { data = JSON.parse(p.data || '[]'); } catch { return; }
  if (headers.length === 0) return;

  const cellOpts = (text: string, isHeader: boolean) => ({
    text,
    options: {
      bold: isHeader,
      color: colorToHex(isHeader ? (p.headerColor || '#1e293b') : (p.textColor || '#333333')),
      fill: isHeader ? { color: colorToHex(p.headerBg || '#f1f5f9') } : undefined,
      fontSize: p.fontSize || 13,
      fontFace: 'Arial',
      align: 'center' as any, valign: 'middle' as any,
      margin: [2, 4, 2, 4] as any,
    },
  });

  const headerRow = headers.map(h => cellOpts(h, true));
  const dataRows = data.map(row => headers.map((_, ci) => cellOpts(row[ci] || '', false)));

  slide.addTable([headerRow, ...dataRows], {
    x: comp.position.x / sx, y: comp.position.y / sy,
    w: comp.size.width / sx, h: comp.size.height / sy,
    border: { color: colorToHex(p.borderColor || '#e2e8f0'), pt: 1 },
    colW: headers.map(() => (comp.size.width / sx) / headers.length),
    margin: [2, 4, 2, 4],
  });
});

// ═══════════════════════════════════════════
//  List
// ═══════════════════════════════════════════
renderers.set('List', (slide, comp, sx, sy) => {
  const p = comp.props;
  let items: string[] = [];
  try { items = JSON.parse(p.items || '[]'); } catch { return; }
  if (items.length === 0) return;

  const bulletType = p.bulletStyle === 'number' ? 'number' : 'bullet';
  let characterCode: string | undefined;
  if (p.bulletStyle === 'check') characterCode = '2713';
  else if (p.bulletStyle === 'arrow') characterCode = '27A4';

  slide.addText(items.join('\n'), {
    x: comp.position.x / sx, y: comp.position.y / sy,
    w: comp.size.width / sx, h: comp.size.height / sy,
    fontSize: p.fontSize || 16,
    color: colorToHex(p.color || '#333333'),
    fontFace: mapFontFace(p.fontFamily),
    valign: 'top', align: 'left',
    bullet: characterCode
      ? { type: 'bullet', characterCode } as any
      : { type: bulletType } as any,
    lineSpacingMultiple: ((p.fontSize || 16) + (p.lineSpacing || 8)) / (p.fontSize || 16),
    margin: 0,
  });
});

// ═══════════════════════════════════════════
//  QRCode — skip, PptxGenJS v4 has removed addQrCode
// ═══════════════════════════════════════════

// ═══════════════════════════════════════════
//  Badge (rounded rect + centered text)
// ═══════════════════════════════════════════
renderers.set('Badge', (slide, comp, sx, sy) => {
  const p = comp.props;
  const x = comp.position.x / sx, y = comp.position.y / sy;
  const w = comp.size.width / sx, h = comp.size.height / sy;
  const bg = colorToHex(p.background || '#6366F1');
  const tc = colorToHex(p.color || '#ffffff');
  slide.addShape('roundRect', {
    x, y, w, h,
    fill: { color: bg },
    rectRadius: 0.5,
  });
  slide.addText(p.text || '', {
    x, y, w, h,
    fontSize: p.fontSize || 12,
    color: tc, bold: true,
    align: (p.textAlign as any) || 'center',
    valign: 'middle', margin: 0,
  });
});

// ═══════════════════════════════════════════
//  Tag (rounded rect + text)
// ═══════════════════════════════════════════
renderers.set('Tag', (slide, comp, sx, sy) => {
  const p = comp.props;
  const x = comp.position.x / sx, y = comp.position.y / sy;
  const w = comp.size.width / sx, h = comp.size.height / sy;
  slide.addShape('roundRect', {
    x, y, w, h,
    fill: { color: colorToHex(p.bgColor || '#6366F1') },
    rectRadius: Math.min(4 / comp.size.width, 0.2),
  });
  slide.addText(p.text || '', {
    x, y, w, h,
    fontSize: p.fontSize || 12,
    color: colorToHex(p.color || '#ffffff'),
    align: (p.textAlign as any) || 'center',
    valign: 'middle', margin: 0,
  });
});

// ═══════════════════════════════════════════
//  Step (circle numbered step)
// ═══════════════════════════════════════════
renderers.set('Step', (slide, comp, sx, sy) => {
  const p = comp.props;
  const x = comp.position.x / sx, y = comp.position.y / sy;
  const w = comp.size.width / sx, h = comp.size.height / sy;
  const circleSize = Math.min(h, w * 0.2);
  const circleX = x + 4 / sx;
  const circleY = y + (h - circleSize) / 2;

  slide.addShape('ellipse', {
    x: circleX, y: circleY, w: circleSize, h: circleSize,
    fill: { color: colorToHex(p.color || '#6366F1') },
  });
  slide.addText(String(p.number ?? 1), {
    x: circleX, y: circleY, w: circleSize, h: circleSize,
    fontSize: p.fontSize || 14, color: 'FFFFFF', bold: true,
    align: 'center', valign: 'middle', margin: 0,
  });
  slide.addText(p.text || '', {
    x: circleX + circleSize + 4 / sx, y,
    w: w - circleSize - 8 / sx, h,
    fontSize: p.fontSize || 14, color: colorToHex(p.textColor || '#333333'),
    align: 'left', valign: 'middle', margin: 0,
  });
});

// ═══════════════════════════════════════════
//  Container (rounded rect)
// ═══════════════════════════════════════════
renderers.set('Container', (slide, comp, sx, sy) => {
  const p = comp.props;
  const opts: Record<string, any> = {
    x: comp.position.x / sx, y: comp.position.y / sy,
    w: comp.size.width / sx, h: comp.size.height / sy,
    fill: { color: colorToHex(p.background || '#1e293b'), transparency: 45 },
    rectRadius: Math.min((p.cornerRadius || 12) / comp.size.width, 0.3),
  };
  if (p.borderColor && p.borderWidth) {
    opts.line = { color: colorToHex(p.borderColor), width: p.borderWidth };
  }
  slide.addShape('roundRect', opts);
});

// ═══════════════════════════════════════════
//  GradientText → plain text (no gradient in PPTX)
// ═══════════════════════════════════════════
renderers.set('GradientText', (slide, comp, sx, sy) => {
  const p = comp.props;
  if (!p.text) return;
  slide.addText(p.text, {
    x: comp.position.x / sx, y: comp.position.y / sy,
    w: comp.size.width / sx, h: comp.size.height / sy,
    fontSize: p.fontSize || 36, color: colorToHex(p.gradientStart || '#6366F1'),
    bold: true, fontFace: mapFontFace(p.fontFamily),
    align: (p.textAlign as any) || 'left',
    valign: p.alignItems === 'flex-start' ? 'top' : p.alignItems === 'flex-end' ? 'bottom' : 'middle',
    margin: 0,
  });
});

// ═══════════════════════════════════════════
//  Avatar
// ═══════════════════════════════════════════
renderers.set('Avatar', (slide, comp, sx, sy) => {
  const p = comp.props;
  const x = comp.position.x / sx, y = comp.position.y / sy;
  const w = comp.size.width / sx, h = comp.size.height / sy;
  if (p.src) {
    try {
      slide.addImage({ path: p.src, x, y, w, h });
      return;
    } catch { /* fall through to text */ }
  }
  const shapeName = p.shape === 'square' ? 'rect' : p.shape === 'round' ? 'roundRect' : 'ellipse';
  slide.addShape(shapeName, {
    x, y, w, h,
    fill: { color: colorToHex(p.bgColor || '#6366F1') },
  });
  slide.addText(p.text || '?', {
    x, y, w, h,
    fontSize: p.fontSize || 20, color: colorToHex(p.color || '#ffffff'),
    align: 'center', valign: 'middle', margin: 0,
  });
});

// ═══════════════════════════════════════════
//  Timeline (simplified line + dots + text)
// ═══════════════════════════════════════════
renderers.set('Timeline', (slide, comp, sx, sy) => {
  const p = comp.props;
  let items: any[] = [];
  try { items = JSON.parse(p.items || '[]'); } catch { return; }
  if (items.length === 0) return;

  const x = comp.position.x / sx;
  const y = comp.position.y / sy;
  const w = comp.size.width / sx;
  const dotSize = Math.max((p.dotSize || 10) / sy, 0.08);
  const lineX = x + 0.25;
  const rowH = Math.max((p.fontSize || 13) / sy * 2.5, dotSize * 3);

  // Vertical line
  slide.addShape('line', {
    x: lineX, y: y + 0.05,
    w: 0.01, h: items.length * rowH - 0.1,
    line: { color: colorToHex(p.lineColor || '#e2e8f0'), width: 2 },
  });

  items.forEach((item, i) => {
    const iy = y + i * rowH;
    // Dot
    slide.addShape('ellipse', {
      x: lineX - dotSize / 2, y: iy + dotSize / 2,
      w: dotSize, h: dotSize,
      fill: { color: colorToHex(item.color || '#6366F1') },
    });
    // Title + time
    const titleText = item.time ? `${item.title || ''}  (${item.time})` : (item.title || '');
    slide.addText(titleText, {
      x: x + 0.5, y: iy, w: w - 0.5, h: rowH * 0.55,
      fontSize: p.fontSize || 13, bold: true, color: '333333',
      align: 'left', valign: 'middle', margin: 0,
    });
    if (item.desc) {
      slide.addText(item.desc, {
        x: x + 0.5, y: iy + rowH * 0.55, w: w - 0.5, h: rowH * 0.4,
        fontSize: (p.fontSize || 13) - 2, color: '666666',
        align: 'left', valign: 'top', margin: 0,
      });
    }
  });
});

// ═══════════════════════════════════════════
//  Countdown → static text placeholder
// ═══════════════════════════════════════════
renderers.set('Countdown', (slide, comp, sx, sy) => {
  const p = comp.props;
  slide.addText(p.label || 'Countdown', {
    x: comp.position.x / sx, y: comp.position.y / sy,
    w: comp.size.width / sx, h: comp.size.height / sy,
    fontSize: p.fontSize || 24, color: colorToHex(p.color || '#6366F1'),
    align: (p.textAlign as any) || 'center',
    valign: p.alignItems === 'flex-start' ? 'top' : p.alignItems === 'flex-end' ? 'bottom' : 'middle',
    margin: 0,
  });
});

// ═══════════════════════════════════════════
//  IconBox → skip (SVG not supported)
// ═══════════════════════════════════════════

// ═══════════════════════════════════════════
//  AmbientOrb → skip
// ═══════════════════════════════════════════

// ═══════════════════════════════════════════
//  MqttDisplay → skip
// ═══════════════════════════════════════════

// ═══════════════════════════════════════════
//  Charts → skip (complex SVG rendering)
// ═══════════════════════════════════════════

// ═══════════════════════════════════════════
//  Effect → skip
// ═══════════════════════════════════════════

// ═══════════════════════════════════════════
//  Video → placeholder with file name
// ═══════════════════════════════════════════
renderers.set('Video', (slide, comp, sx, sy) => {
  const p = comp.props;
  const srcName = p.src ? p.src.split('/').pop()?.split('?')[0] || p.src : '视频';
  const x = comp.position.x / sx;
  const y = comp.position.y / sy;
  const w = comp.size.width / sx;
  const h = comp.size.height / sy;

  // Dark placeholder rectangle
  slide.addShape('rect', {
    x, y, w, h,
    fill: { color: '1E293B' },
    line: { color: '475569', width: 1 },
  });
  // Play icon triangle (centered)
  const iconSize = Math.min(w, h) * 0.25;
  slide.addText('▶', {
    x: x + w / 2 - iconSize / 2,
    y: y + h / 2 - iconSize / 2,
    w: iconSize, h: iconSize,
    fontSize: iconSize * 0.7,
    color: '94A3B8',
    align: 'center',
    valign: 'middle',
    fontFace: 'Arial',
  });
  // Video file name at bottom
  slide.addText(srcName, {
    x: x + 4 / sx, y: y + h - 18 / sy,
    w: w - 8 / sx, h: 14 / sy,
    fontSize: 8, color: '94A3B8',
    align: 'left', valign: 'bottom',
    fontFace: 'Arial',
  });
});

// ═══════════════════════════════════════════
//  Audio → skip
// ═══════════════════════════════════════════

// ── Types that fall back to nothing (skip silently) ──
const SKIPPED_TYPES = new Set([
  'ChartLine', 'PieChart', 'BarChart', 'RadarChart',
  'MqttDisplay', 'AmbientOrb', 'Effect', 'Audio',
  'IconBox', 'QRCode',
]);

// ── Main export function ──

export async function exportToPptxEditable() {
  const store = useProjectStore();
  const pageW = store.canvasConfig.width || 1280;
  const pageH = store.canvasConfig.height || 720;

  const visiblePages = store.customShow
    ? store.pages.filter(p => store.customShow!.includes(p.id))
    : store.pages.filter(p => !p.hidden);
  if (visiblePages.length === 0) {
    alert('没有可导出的页面');
    return;
  }

  // PPTX layout matching aspect ratio
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

  const sx = pageW / pptW; // px per inch X
  const sy = pageH / pptH; // px per inch Y

  const skippedInSession = new Set<string>();

  for (const page of visiblePages) {
    const slide = pptx.addSlide();

    // Page background
    const bg = store.pageStyle.background;
    if (bg && bg !== '#ffffff' && bg !== 'white') {
      slide.background = { color: colorToHex(bg) };
    }

    const pageComps = store.components.filter(c => c.pageId === page.id);
    // Render in array order (z-order)
    for (const comp of pageComps) {
      const renderer = renderers.get(comp.type);
      if (renderer) {
        try {
          renderer(slide, comp, sx, sy);
        } catch (e) {
          console.warn(`[PPTX Editable] ${comp.type} render error:`, e);
        }
      } else if (!SKIPPED_TYPES.has(comp.type)) {
        skippedInSession.add(comp.type);
      }
    }

    if (page.notes) {
      slide.addNotes(page.notes);
    }
  }

  if (skippedInSession.size > 0) {
    console.info(`[PPTX Editable] Unknown types skipped: ${[...skippedInSession].join(', ')}`);
  }

  // ── Save ──
  const isTauri = !!(window as any).isTauri;
  const fileName = `${store.title || 'presentation'}_可编辑.pptx`;

  if (isTauri) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      const filePath = await save({
        defaultPath: fileName,
        filters: [{ name: 'PowerPoint', extensions: ['pptx'] }],
      });
      if (!filePath) return;
      const data = await pptx.write({ outputType: 'base64' });
      const binaryStr = atob(data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      await writeFile(filePath, bytes);
    } catch (e) {
      console.error('[PPTX Editable Save]', e);
      alert('保存失败: ' + String(e));
    }
  } else {
    await pptx.writeFile({ fileName });
  }
}
