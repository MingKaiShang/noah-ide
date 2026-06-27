import JSZip from 'jszip';
import type { ComponentInstance } from '../types/component';

interface ExtractedSlide {
  texts: Array<{ text: string; x: number; y: number; w: number; h: number; fontSize?: number; color?: string; bold?: boolean; align?: string }>;
  images: Array<{ src: string; x: number; y: number; w: number; h: number; contentType: string }>;
  tables: Array<{ headers: string[]; data: string[][]; x: number; y: number; w: number; h: number }>;
  shapes: Array<{ type: 'rect' | 'ellipse' | 'line'; x: number; y: number; w: number; h: number; fill?: string; line?: string }>;
  name?: string;
}

/** Parse EMU to Noah coordinate (assumes 16:9 slide → 1280x720) */
const SLIDE_W = 12192000; // standard 16:9 slide in EMU
const SLIDE_H = 6858000;
const TARGET_W = 1280;
const TARGET_H = 720;

function emuToX(emu: number): number { return (emu / SLIDE_W) * TARGET_W; }
function emuToY(emu: number): number { return (emu / SLIDE_H) * TARGET_H; }

function parseColor(xmlColor: string | null): string {
  if (!xmlColor) return '#333333';
  const srgb = xmlColor.match(/srgbClr\s+val\s*=\s*["']([0-9A-Fa-f]{6,8})["']/);
  if (srgb) return '#' + srgb[1].slice(0, 6);
  return '#333333';
}

function extractTexts(slideXml: string): ExtractedSlide['texts'] {
  const texts: ExtractedSlide['texts'] = [];
  // Extract text elements with positions
  const txBodyRegex = /<p:txBody[^>]*>([\s\S]*?)<\/p:txBody>/g;
  let bodyMatch;
  while ((bodyMatch = txBodyRegex.exec(slideXml)) !== null) {
    const body = bodyMatch[1];
    // Get all text runs
    const tRegex = /<a:t[^>]*>([^<]*)<\/a:t>/g;
    let text = '';
    let tMatch;
    while ((tMatch = tRegex.exec(body)) !== null) {
      text += tMatch[1];
    }
    if (!text.trim()) continue;

    // Find parent shape for position
    // Walk up to find the containing sp or tbl element
    const bodyStart = bodyMatch.index;
    const beforeBody = slideXml.slice(0, bodyStart);
    const lastSpStart = beforeBody.lastIndexOf('<p:sp>');
    const spSection = lastSpStart >= 0 ? slideXml.slice(lastSpStart, bodyStart + body.length) : '';

    const xfrmRegex = /<a:xfrm[^>]*>[\s\S]*?<\/a:xfrm>/;
    const xfrm = spSection.match(xfrmRegex) || body.match(xfrmRegex);
    let x = 0, y = 0, w = 100, h = 50;
    if (xfrm) {
      const off = xfrm[0].match(/<a:off\s+([^>]*)>/);
      const ext = xfrm[0].match(/<a:ext\s+([^>]*)>/);
      if (off) {
        const cx = off[1].match(/x\s*=\s*["'](\d+)["']/);
        const cy = off[1].match(/y\s*=\s*["'](\d+)["']/);
        if (cx) x = emuToX(parseInt(cx[1]));
        if (cy) y = emuToY(parseInt(cy[1]));
      }
      if (ext) {
        const cw = ext[1].match(/cx\s*=\s*["'](\d+)["']/);
        const ch = ext[1].match(/cy\s*=\s*["'](\d+)["']/);
        if (cw) w = emuToX(parseInt(cw[1]));
        if (ch) h = emuToY(parseInt(ch[1]));
      }
    }

    // Check if this text is inside a table - skip if so (tables handled separately)
    const tableParent = slideXml.slice(0, bodyStart).lastIndexOf('<p:tbl>');
    const tableEnd = slideXml.slice(0, bodyStart).lastIndexOf('</p:tbl>');
    if (tableParent > tableEnd) continue;

    // Font size from defRPr
    const defRPr = body.match(/<a:defRPr[^>]*>/);
    let fontSize = 16;
    let color = '#333333';
    let bold = false;
    if (defRPr) {
      const sz = defRPr[0].match(/sz\s*=\s*["'](\d+)["']/);
      if (sz) fontSize = parseInt(sz[1]) / 100;
      bold = defRPr[0].includes('b="1"') || defRPr[0].includes('b="true"');
    }
    // Color from end of body
    const srgbClr = body.match(/<a:srgbClr\s+val\s*=\s*["']([0-9A-Fa-f]{6})["']/);
    if (srgbClr) color = '#' + srgbClr[1];

    // Text alignment
    let align = 'left';
    const algn = body.match(/<a:algn>(\w+)<\/a:algn>/);
    if (algn) {
      if (algn[1] === 'ctr') align = 'center';
      else if (algn[1] === 'r') align = 'right';
    }

    texts.push({ text: text.trim(), x, y, w, h, fontSize, color, bold, align });
  }
  return texts;
}

function extractTables(slideXml: string): ExtractedSlide['tables'] {
  const tables: ExtractedSlide['tables'] = [];
  const tblRegex = /<p:tbl>([\s\S]*?)<\/p:tbl>/g;
  let tblMatch;
  while ((tblMatch = tblRegex.exec(slideXml)) !== null) {
    const tbl = tblMatch[1];
    // Find table position from parent graphic frame
    const beforeTbl = slideXml.slice(0, tblMatch.index);
    const lastGfrm = beforeTbl.lastIndexOf('<p:graphicFrame>');
    const gfrmSection = lastGfrm >= 0 ? slideXml.slice(lastGfrm, tblMatch.index) : '';

    const xfrmRegex = /<a:xfrm[^>]*>[\s\S]*?<\/a:xfrm>/;
    const xfrm = gfrmSection.match(xfrmRegex);
    let x = 0, y = 0, w = 300, h = 150;
    if (xfrm) {
      const off = xfrm[0].match(/<a:off\s+([^>]*)>/);
      const ext = xfrm[0].match(/<a:ext\s+([^>]*)>/);
      if (off) {
        const cx = off[1].match(/x\s*=\s*["'](\d+)["']/);
        const cy = off[1].match(/y\s*=\s*["'](\d+)["']/);
        if (cx) x = emuToX(parseInt(cx[1]));
        if (cy) y = emuToY(parseInt(cy[1]));
      }
      if (ext) {
        const cw = ext[1].match(/cx\s*=\s*["'](\d+)["']/);
        const ch = ext[1].match(/cy\s*=\s*["'](\d+)["']/);
        if (cw) w = emuToX(parseInt(cw[1]));
        if (ch) h = emuToY(parseInt(ch[1]));
      }
    }

    // Extract rows
    const trRegex = /<a:tr[^>]*>([\s\S]*?)<\/a:tr>/g;
    const headers: string[] = [];
    const data: string[][] = [];
    let isFirst = true;
    let trMatch;
    while ((trMatch = trRegex.exec(tbl)) !== null) {
      const row = trMatch[1];
      const cells: string[] = [];
      const tcRegex = /<a:tc[^>]*>([\s\S]*?)<\/a:tc>/g;
      let tcMatch;
      while ((tcMatch = tcRegex.exec(row)) !== null) {
        const cell = tcMatch[1];
        const tMatch = cell.match(/<a:t[^>]*>([^<]*)<\/a:t>/);
        cells.push(tMatch ? tMatch[1].trim() : '');
      }
      if (isFirst) {
        headers.push(...cells);
        isFirst = false;
      } else {
        data.push(cells);
      }
    }

    tables.push({ headers, data, x, y, w, h });
  }
  return tables;
}

function extractImages(slideXml: string, zip: JSZip, relsXml: string): ExtractedSlide['images'] {
  const images: ExtractedSlide['images'] = [];
  const blipRegex = /<a:blip\s+([^>]*)>/g;
  let blipMatch;

  // Build relationship map
  const relMap = new Map<string, string>();
  const relRegex = /<Relationship\s+Id\s*=\s*["']([^"']+)["'][^>]*Target\s*=\s*["']([^"']+)["']/g;
  let relMatch;
  while ((relMatch = relRegex.exec(relsXml)) !== null) {
    relMap.set(relMatch[1], relMatch[2]);
  }

  while ((blipMatch = blipRegex.exec(slideXml)) !== null) {
    const blip = blipMatch[1];
    const embed = blip.match(/r:embed\s*=\s*["']([^"']+)["']/) || blip.match(/embed\s*=\s*["']([^"']+)["']/);
    if (!embed) continue;

    const relPath = relMap.get(embed[1]);
    if (!relPath) continue;

    // Find position in parent shape
    const beforeBlip = slideXml.slice(0, blipMatch.index);
    const lastSp = beforeBlip.lastIndexOf('<p:sp>');
    const spSection = lastSp >= 0 ? slideXml.slice(lastSp, blipMatch.index + 200) : '';

    const xfrmRegex = /<a:xfrm[^>]*>[\s\S]*?<\/a:xfrm>/;
    const xfrm = spSection.match(xfrmRegex);
    let x = 0, y = 0, w = 100, h = 100;
    if (xfrm) {
      const off = xfrm[0].match(/<a:off\s+([^>]*)>/);
      const ext = xfrm[0].match(/<a:ext\s+([^>]*)>/);
      if (off) {
        const cx = off[1].match(/x\s*=\s*["'](\d+)["']/);
        const cy = off[1].match(/y\s*=\s*["'](\d+)["']/);
        if (cx) x = emuToX(parseInt(cx[1]));
        if (cy) y = emuToY(parseInt(cy[1]));
      }
      if (ext) {
        const cw = ext[1].match(/cx\s*=\s*["'](\d+)["']/);
        const ch = ext[1].match(/cy\s*=\s*["'](\d+)["']/);
        if (cw) w = emuToX(parseInt(cw[1]));
        if (ch) h = emuToY(parseInt(ch[1]));
      }
    }

    // Get content type from [Content_Types].xml
    const ext = relPath.split('.').pop()?.toLowerCase() || 'png';
    const contentType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : 'image/png';

    // Read image data from zip
    const imgPath = relPath.startsWith('../') ? relPath.replace('../', '') : `ppt/${relPath}`;
    const imgFile = zip.file(imgPath) || zip.file(relPath);
    if (imgFile) {
      const blob = imgFile.async('base64');
      // We'll return the path and load it later in the main function
      images.push({ src: relPath, x, y, w, h, contentType });
    }
  }
  return images;
}

export interface PptxParseResult {
  pages: Array<{ name?: string; components: Array<{ type: string; x: number; y: number; w: number; h: number; props: Record<string, any> }> }>;
}

export async function parsePptx(file: File): Promise<PptxParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  // Read presentation.xml for slide order
  const presXml = await zip.file('ppt/presentation.xml')?.async('string') || '';
  const slideIdRegex = /r:id\s*=\s*["']([^"']+)["']/g;
  const slideRels: string[] = [];
  let sidMatch;
  while ((sidMatch = slideIdRegex.exec(presXml)) !== null) {
    slideRels.push(sidMatch[1]);
  }

  // Read presentation relationships
  const presRels = await zip.file('ppt/_rels/presentation.xml.rels')?.async('string') || '';
  const relMap = new Map<string, string>();
  const relRegex = /<Relationship\s+Id\s*=\s*["']([^"']+)["'][^>]*Target\s*=\s*["']([^"']+)["']/g;
  let rm;
  while ((rm = relRegex.exec(presRels)) !== null) {
    relMap.set(rm[1], rm[2]);
  }

  // Get slide filenames in order
  const slidePaths: string[] = [];
  for (const relId of slideRels) {
    const target = relMap.get(relId);
    if (target) {
      const path = target.startsWith('/') ? `ppt${target}` : `ppt/${target}`;
      slidePaths.push(path);
    }
  }

  // Try to also read slide names from slide metadata
  const slideNames: string[] = [];
  const sldRegex = /<p:sld[^>]*>[\s\S]*?<\/p:sld>/g;
  let sldMatch;
  const sldXml = await zip.file('ppt/presentation.xml')?.async('string') || '';
  const nameRegex = /<p:cSld[^>]*>[\s\S]*?<p:name\s+[^>]*\/>[\s\S]*?<\/p:cSld>/g;
  // Just use index-based naming

  const result: PptxParseResult = { pages: [] };

  for (let i = 0; i < slidePaths.length; i++) {
    const path = slidePaths[i];
    const slideXml = await zip.file(path)?.async('string');
    if (!slideXml) continue;

    // Get slide relationships for images
    const slideRelPath = `ppt/slides/_rels/slide${i + 1}.xml.rels`;
    const relsXml = await zip.file(slideRelPath)?.async('string') || '';

    const texts = extractTexts(slideXml);
    const tables = extractTables(slideXml);

    // Extract images with base64 data
    const images: ExtractedSlide['images'] = [];
    const blipRegex = /<a:blip\s+([^>]*)>/g;
    let blipMatch;

    const imgRelMap = new Map<string, string>();
    const imgRelRegex = /<Relationship\s+Id\s*=\s*["']([^"']+)["'][^>]*Target\s*=\s*["']([^"']+)["']/g;
    let imgRelMatch;
    while ((imgRelMatch = imgRelRegex.exec(relsXml)) !== null) {
      imgRelMap.set(imgRelMatch[1], imgRelMatch[2]);
    }

    while ((blipMatch = blipRegex.exec(slideXml)) !== null) {
      const embed = blipMatch[1].match(/r:embed\s*=\s*["']([^"']+)["']/);
      if (!embed) continue;
      const relTarget = imgRelMap.get(embed[1]);
      if (!relTarget) continue;

      // Get position
      const beforeBlip = slideXml.slice(0, blipMatch.index);
      const lastSp = beforeBlip.lastIndexOf('<p:sp>');
      const beforeSection = lastSp >= 0 ? slideXml.slice(lastSp, blipMatch.index + 500) : '';

      const xfrmMatch = beforeSection.match(/<a:xfrm[^>]*>[\s\S]*?<\/a:xfrm>/);
      let x = 0, y = 0, w = 100, h = 100;
      if (xfrmMatch) {
        const offMatch = xfrmMatch[0].match(/<a:off\s+x\s*=\s*["'](\d+)["']\s+y\s*=\s*["'](\d+)["']/);
        const extMatch = xfrmMatch[0].match(/<a:ext\s+cx\s*=\s*["'](\d+)["']\s+cy\s*=\s*["'](\d+)["']/);
        if (offMatch) { x = emuToX(parseInt(offMatch[1])); y = emuToY(parseInt(offMatch[2])); }
        if (extMatch) { w = emuToX(parseInt(extMatch[1])); h = emuToY(parseInt(extMatch[2])); }
      }

      // Try to load image data
      const imgFullPath = relTarget.startsWith('../') ? relTarget.replace('../media/', 'ppt/media/') : `ppt/${relTarget}`;
      const imgFile = zip.file(imgFullPath) || zip.file(relTarget) || zip.file(`ppt/media/${relTarget.split('/').pop()}`);
      if (imgFile) {
        const base64 = await imgFile.async('base64');
        const ext = relTarget.split('.').pop()?.toLowerCase() || 'png';
        const mime = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : ext === 'gif' ? 'image/gif' : ext === 'svg' ? 'image/svg+xml' : 'image/png';
        const dataUrl = `data:${mime};base64,${base64}`;
        images.push({ src: dataUrl, x, y, w, h, contentType: mime });
      }
    }

    // Extract shapes
    const shapes: ExtractedSlide['shapes'] = [];
    const spRegex = /<p:sp[^>]*>([\s\S]*?)<\/p:sp>/g;
    let spMatch;
    while ((spMatch = spRegex.exec(slideXml)) !== null) {
      const sp = spMatch[1];
      // Skip if it has txBody (text handled above) or blipFill (image handled above)
      if (sp.includes('<a:txBody>') || sp.includes('<p:txBody>') || sp.includes('<a:blipFill>') || sp.includes('<p:blipFill>')) continue;

      const spPr = sp.match(/<a:spPr[^>]*>([\s\S]*?)<\/a:spPr>/);
      if (!spPr) continue;

      let shapeType = 'rect';
      const prstGeom = spPr[1].match(/<a:prstGeom\s+prst\s*=\s*["'](\w+)["']/);
      if (prstGeom) {
        if (prstGeom[1] === 'ellipse') shapeType = 'ellipse';
        else if (prstGeom[1] === 'line') shapeType = 'line';
      }

      // Position
      const xfrmMatch = spPr[1].match(/<a:xfrm[^>]*>[\s\S]*?<\/a:xfrm>/);
      let x = 0, y = 0, w = 100, h = 100;
      if (xfrmMatch) {
        const offMatch = xfrmMatch[0].match(/<a:off\s+x\s*=\s*["'](\d+)["']\s+y\s*=\s*["'](\d+)["']/);
        const extMatch = xfrmMatch[0].match(/<a:ext\s+cx\s*=\s*["'](\d+)["']\s+cy\s*=\s*["'](\d+)["']/);
        if (offMatch) { x = emuToX(parseInt(offMatch[1])); y = emuToY(parseInt(offMatch[2])); }
        if (extMatch) { w = emuToX(parseInt(extMatch[1])); h = emuToY(parseInt(extMatch[2])); }
      }

      // Fill
      let fill = '#ecf0f1';
      const solidFill = spPr[1].match(/<a:solidFill>[\s\S]*?<a:srgbClr\s+val\s*=\s*["']([0-9A-Fa-f]{6})["']/);
      if (solidFill) fill = '#' + solidFill[1];

      shapes.push({ type: shapeType as any, x, y, w, h, fill });
    }

    // Build components from extracted content
    const components: PptxParseResult['pages'][0]['components'] = [];

    // Add text components
    for (const t of texts) {
      components.push({
        type: 'Text',
        x: Math.round(t.x), y: Math.round(t.y),
        w: Math.round(t.w), h: Math.round(t.h),
        props: {
          text: t.text,
          fontSize: Math.round(t.fontSize || 16),
          color: t.color || '#333333',
          fontWeight: t.bold ? 'bold' : 'normal',
          textAlign: t.align || 'left',
          alignItems: 'center',
          fontFamily: 'sans-serif',
        },
      });
    }

    // Add table components
    for (const tbl of tables) {
      components.push({
        type: 'Table',
        x: Math.round(tbl.x), y: Math.round(tbl.y),
        w: Math.round(tbl.w), h: Math.round(tbl.h),
        props: {
          headers: JSON.stringify(tbl.headers),
          data: JSON.stringify(tbl.data),
          fontSize: 13,
          headerBg: '#f1f5f9',
          borderColor: '#e2e8f0',
          textColor: '#333',
          headerColor: '#1e293b',
        },
      });
    }

    // Add image components
    for (const img of images) {
      components.push({
        type: 'Image',
        x: Math.round(img.x), y: Math.round(img.y),
        w: Math.round(img.w), h: Math.round(img.h),
        props: {
          src: img.src,
          alt: '',
          objectFit: 'cover',
          borderRadius: 0,
        },
      });
    }

    // Add rectangle/circle components
    for (const sh of shapes) {
      if (sh.type === 'ellipse') {
        components.push({
          type: 'Circle',
          x: Math.round(sh.x), y: Math.round(sh.y),
          w: Math.round(sh.w), h: Math.round(sh.h),
          props: { fill: sh.fill || '#ecf0f1', stroke: '#bdc3c7', strokeWidth: 1 },
        });
      } else {
        components.push({
          type: 'Rectangle',
          x: Math.round(sh.x), y: Math.round(sh.y),
          w: Math.round(sh.w), h: Math.round(sh.h),
          props: { fill: sh.fill || '#ecf0f1', stroke: '#bdc3c7', strokeWidth: 1, cornerRadius: 0 },
        });
      }
    }

    result.pages.push({
      name: `第 ${i + 1} 页`,
      components,
    });
  }

  return result;
}

/** Parse a PPTX file and return a structured description for AI */
export async function describePptxForAi(file: File): Promise<string> {
  const result = await parsePptx(file);
  const lines: string[] = ['以下是从 PPTX 文件中提取的内容，请根据这些内容生成 Noah 格式的演示文稿：'];
  for (let i = 0; i < result.pages.length; i++) {
    const page = result.pages[i];
    lines.push(`\n--- 第 ${i + 1} 页 ---`);
    for (const comp of page.components) {
      switch (comp.type) {
        case 'Text':
          lines.push(`[文本] "${comp.props.text}" (字号:${comp.props.fontSize}, 颜色:${comp.props.color})`);
          break;
        case 'Image':
          lines.push(`[图片] 位置(${comp.x},${comp.y}) 尺寸(${comp.w}×${comp.h})${comp.props.src.startsWith('data:') ? ' [已嵌入]' : ''}`);
          break;
        case 'Table':
          lines.push(`[表格] ${JSON.stringify(JSON.parse(comp.props.headers))} × ${JSON.parse(comp.props.data).length}行`);
          break;
        case 'Rectangle':
          lines.push(`[矩形] 填充:${comp.props.fill} 位置(${comp.x},${comp.y})`);
          break;
        case 'Circle':
          lines.push(`[圆形] 填充:${comp.props.fill}`);
          break;
      }
    }
  }
  return lines.join('\n');
}
