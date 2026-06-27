﻿import { computed } from 'vue';
import { useProjectStore } from '../stores/project';
import type { ComponentInstance, ComponentAnimation } from '../types/component';
import { FONT_PRESETS } from '../types/fontPresets';
import { generateAnimeExportJS, isLoopAnim } from './useAnimeEngine';
import { getEffectTemplate } from '../types/effect';
import { CDN_LINKS } from '../config/cdn';
import { escHtml, hexToRgba, sanitizeHtml } from './useSanitize';

function generateComponentHTML(comp: ComponentInstance): string {
  const cls = comp.id;
  const p = comp.props;
  const posStyle = `position:absolute;left:${comp.position.x}px;top:${comp.position.y}px;width:${comp.size.width}px;height:${comp.size.height}px;${comp.type === 'AmbientOrb' ? 'pointer-events:none;' : ''}`;

  switch (comp.type) {
    case 'Text': {
      const textContent = p.richText && p.htmlContent
        ? sanitizeHtml(p.htmlContent)
        : escHtml(p.text);
      return `      <div class="${cls}" style="${posStyle}display:flex;align-items:${p.alignItems || 'center'};justify-content:${p.textAlign === 'center' ? 'center' : p.textAlign === 'right' ? 'flex-end' : 'flex-start'};"><div style="font-size:${p.fontSize}px;color:${p.color};font-weight:${p.fontWeight};font-family:${p.fontFamily || 'sans-serif'};text-align:${p.textAlign || 'left'};">${textContent}</div></div>\n`;
    }

    case 'Image':
      return `      <img class="${cls}" src="${escHtml(p.src)}" alt="${escHtml(p.alt)}" style="${posStyle}display:block;object-fit:${p.objectFit || 'cover'};border-radius:${p.borderRadius || 4}px;" />\n`;

    case 'Rectangle':
      return `      <div class="${cls}" style="${posStyle}background:${p.fill};border:${p.strokeWidth}px solid ${p.stroke};border-radius:${p.cornerRadius}px;"></div>\n`;

    case 'GradientText':
      return `      <div class="${cls}" style="${posStyle}display:flex;align-items:${p.alignItems || 'center'};justify-content:${p.textAlign === 'center' ? 'center' : p.textAlign === 'right' ? 'flex-end' : 'flex-start'};"><h2 style="margin:0;font-size:${p.fontSize}px;font-weight:${p.fontWeight};font-family:${p.fontFamily || 'sans-serif'};letter-spacing:${p.letterSpacing || -1}px;background:linear-gradient(${p.gradientAngle || 135}deg, ${p.gradientStart}, ${p.gradientMid}, ${p.gradientEnd});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;text-align:${p.textAlign || 'left'};">${escHtml(p.text)}</h2></div>\n`;

    case 'Container': {
      const blurStyle = p.blur ? `backdrop-filter:blur(${p.blur}px);-webkit-backdrop-filter:blur(${p.blur}px);` : '';
      return `      <div class="${cls}" style="${posStyle}background:${p.background};border:${p.borderWidth}px solid ${p.borderColor};border-radius:${p.cornerRadius}px;${blurStyle}padding:${p.padding}px;overflow:${p.overflow || 'hidden'};"></div>\n`;
    }

    case 'Badge':
      return `      <span class="${cls}" style="${posStyle}display:flex;align-items:${p.alignItems || 'center'};justify-content:${p.textAlign === 'center' ? 'center' : p.textAlign === 'right' ? 'flex-end' : 'flex-start'};box-sizing:border-box;padding:${p.paddingY || 5}px ${p.paddingX || 16}px;border-radius:${p.borderRadius}px;font-size:${p.fontSize}px;font-weight:600;color:${p.color};background:${p.background};border:1px solid ${p.borderColor};">${escHtml(p.text)}</span>\n`;

    case 'IconBox': {
      const svg = p.iconSvg || '';
      return `      <div class="${cls}" style="${posStyle}display:flex;align-items:center;justify-content:center;background:${p.background};border-radius:${p.cornerRadius}px;color:${p.iconColor};"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:${p.iconSize}px;height:${p.iconSize}px;">${svg.replace(/<svg[^>]*>|<\/svg>/g, '')}</svg></div>\n`;
    }

    case 'AmbientOrb':
      return `      <div class="${cls}" style="${posStyle}border-radius:50%;filter:blur(${p.blur}px);background:${hexToRgba(p.color, p.opacity)};will-change:filter;"></div>\n`;

    case 'MqttDisplay': {
      const dp = `data-mqtt-topic="${p.topic}" data-value-key="${p.valueKey || ''}" data-unit="${p.unit || ''}" data-decimal="${p.decimalPlaces ?? -1}"`;
      const dot = `<div style="position:absolute;top:6px;right:6px;width:8px;height:8px;border-radius:50%;background:#ef4444;box-shadow:0 0 4px rgba(239,68,68,0.6);" class="mqtt-status-dot" data-mqtt-status="${p.topic}"></div>`;
      const align = p.textAlign === 'center' ? 'center' : p.textAlign === 'right' ? 'flex-end' : 'flex-start';
      const justify = p.alignItems || 'center';
      const preset = p.stylePreset || 'card';
      if (preset === 'minimal')
        return `      <div class="${cls}" ${dp} style="${posStyle}display:flex;flex-direction:column;align-items:${align};justify-content:${justify};padding:8px;">${dot}<span style="font-size:12px;color:#888;text-align:${p.textAlign || 'center'};">${p.label}</span><span class="mqtt-value" style="font-size:${p.fontSize}px;color:${p.color};font-weight:bold;text-align:${p.textAlign || 'center'};">--</span></div>\n`;
      if (preset === 'dark')
        return `      <div class="${cls}" ${dp} style="${posStyle}display:flex;flex-direction:column;align-items:${align};justify-content:${justify};background:#1e293b;border:1px solid #334155;border-radius:8px;padding:8px;">${dot}<span style="font-size:12px;color:#94a3b8;text-align:${p.textAlign || 'center'};">${p.label}</span><span class="mqtt-value" style="font-size:${p.fontSize}px;color:#f1f5f9;font-weight:bold;text-align:${p.textAlign || 'center'};">--</span></div>\n`;
      if (preset === 'gradient')
        return `      <div class="${cls}" ${dp} style="${posStyle}display:flex;flex-direction:column;align-items:${align};justify-content:${justify};background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;padding:10px;">${dot}<span style="font-size:12px;color:rgba(255,255,255,0.7);text-align:${p.textAlign || 'center'};">${p.label}</span><span class="mqtt-value" style="font-size:${p.fontSize}px;color:#fff;font-weight:bold;text-align:${p.textAlign || 'center'};">--</span></div>\n`;
      if (preset === 'dashboard')
        return `      <div class="${cls}" ${dp} style="${posStyle}display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0f172a;border:2px solid #334155;border-radius:12px;padding:8px;">${dot}<span style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">${p.label}</span><span class="mqtt-value" style="font-size:${Math.max(p.fontSize, 28)}px;color:${p.color};font-weight:bold;font-family:monospace;">--</span><span style="font-size:11px;color:#64748b;">${p.unit || ''}</span></div>\n`;
      if (preset === 'valueOnly')
        return `      <div class="${cls}" ${dp} style="${posStyle}display:flex;align-items:center;justify-content:center;">${dot}<span class="mqtt-value" style="font-size:${p.fontSize}px;color:${p.color};font-weight:bold;">--</span></div>\n`;
      // card (default)
      return `      <div class="${cls}" ${dp} style="${posStyle}display:flex;flex-direction:column;align-items:${align};justify-content:${justify};background:#f8f9fa;border:1px solid #dee2e6;border-radius:8px;padding:8px;">${dot}<span style="font-size:12px;color:#888;text-align:${p.textAlign || 'center'};">${p.label}</span><span class="mqtt-value" style="font-size:${p.fontSize}px;color:${p.color};font-weight:bold;text-align:${p.textAlign || 'center'};">--</span></div>\n`;
    }

    case 'ChartLine': {
      const chartConfig: any = { data: p.data, color: p.color, title: p.title, yAxisName: p.yAxisName, lineWidth: p.lineWidth, stylePreset: p.stylePreset || 'line' };
      if (p.mqttTopic) {
        chartConfig.mqttTopic = p.mqttTopic;
        chartConfig.valueKey = p.valueKey || '';
        chartConfig.maxPoints = p.maxPoints || 20;
      }
      const isDark = (p.stylePreset || 'line') === 'dark';
      return `      <div class="${cls}" data-chart-config='${JSON.stringify(chartConfig)}' style="${posStyle}${isDark ? 'background:#0f172a;border:1px solid #334155;' : 'background:#fff;border:1px solid #eee;'}border-radius:4px;"></div>\n`;
    }

    case 'Arrow': {
      const dir = p.direction || 'right';
      const c = p.color || '#6366F1';
      const sw = p.strokeWidth || 3;
      let path = '';
      if (dir === 'right') path = `<line x1="4" y1="20" x2="36" y2="20"/><polyline points="28,12 36,20 28,28"/>`;
      else if (dir === 'left') path = `<line x1="36" y1="20" x2="4" y2="20"/><polyline points="12,12 4,20 12,28"/>`;
      else if (dir === 'down') path = `<line x1="20" y1="4" x2="20" y2="36"/><polyline points="12,28 20,36 28,28"/>`;
      else if (dir === 'up') path = `<line x1="20" y1="36" x2="20" y2="4"/><polyline points="12,12 20,4 28,12"/>`;
      return `      <svg class="${cls}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" style="${posStyle}">${path}</svg>\n`;
    }

    case 'Divider':
      return `      <div class="${cls}" style="${posStyle}display:flex;align-items:center;"><div style="width:100%;border-top:${p.thickness}px ${p.style} ${p.color};"></div></div>\n`;

    case 'Step':
      return `      <div class="${cls}" style="${posStyle}display:flex;gap:12px;align-items:${p.alignItems || 'flex-start'};"><div style="width:32px;height:32px;min-width:32px;border-radius:50%;background:${p.color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:${p.fontSize}px;">${escHtml(p.number)}</div><div style="display:flex;flex-direction:column;gap:2px;"><div style="font-weight:600;font-size:${p.fontSize}px;color:${p.textColor};">${escHtml(p.text)}</div><div style="font-size:12px;color:#888;">${escHtml(p.description)}</div></div></div>\n`;

    case 'List': {
      let items: string[];
      try { items = JSON.parse(p.items); } catch { items = ['要点一', '要点二', '要点三']; }
      const bulletMap: Record<string, (i: number) => string> = {
        disc: () => '•', circle: () => '●', check: () => '✔', arrow: () => '→', number: (i) => `${i + 1}.`,
      };
      const getBullet = bulletMap[p.bulletStyle || 'disc'] || bulletMap['disc'];
      const ls = items.map((item: string, i: number) =>
        `<div style="display:flex;gap:8px;align-items:baseline;"><span style="color:${p.color};font-weight:bold;min-width:16px;text-align:center;">${getBullet(i)}</span><span style="font-size:${p.fontSize}px;color:${p.color};font-family:${p.fontFamily || 'sans-serif'};">${escHtml(item)}</span></div>`
      ).join('');
      return `      <div class="${cls}" style="${posStyle}display:flex;flex-direction:column;gap:${p.lineSpacing || 8}px;justify-content:center;">${ls}</div>\n`;
    }

    case 'Video': {
      const src = p.src || '';
      if (!src) return `      <div class="${cls}" style="${posStyle}background:#1e293b;border-radius:${p.borderRadius || 8}px;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:14px;">视频</div>\n`;
      const extraAttrs = (p.startTime ? ` data-start-time="${p.startTime}"` : '') + (p.endTime ? ` data-end-time="${p.endTime}"` : '');
      return `      <video class="${cls}" src="${escHtml(src)}" style="${posStyle}object-fit:${p.objectFit || 'cover'};border-radius:${p.borderRadius || 8}px;display:block;" ${p.autoplay ? 'autoplay' : ''} ${p.loop ? 'loop' : ''} ${p.muted ? 'muted' : ''} ${p.controls ? 'controls' : ''}${extraAttrs}></video>\n`;
    }

    case 'Audio': {
      const src = p.src || '';
      if (!src) return `      <div class="${cls}" style="${posStyle}background:#f5f5f5;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#999;font-size:13px;">音频</div>\n`;
      return `      <audio class="${cls}" src="${escHtml(src)}" style="${posStyle}display:block;" ${p.autoplay ? 'autoplay' : ''} ${p.loop ? 'loop' : ''} ${p.muted ? 'muted' : ''} ${p.controls ? 'controls' : ''} volume="${p.volume || 1}"></audio>\n`;
    }

    case 'Circle': {
      const fill = p.fill || '#ecf0f1';
      const stroke = p.stroke || '#bdc3c7';
      const sw = p.strokeWidth || 1;
      return `      <div class="${cls}" style="${posStyle}border-radius:50%;background:${fill};border:${sw}px solid ${stroke};box-sizing:border-box;"></div>\n`;
    }

    case 'Table': {
      let headers: string[], data: string[][];
      try { headers = JSON.parse(p.headers); } catch { headers = ['列一', '列一', '列一']; }
      try { data = JSON.parse(p.data); } catch { data = []; }
      let mergedCells: Array<{ row: number; col: number; rowspan: number; colspan: number }> = [];
      try { if (p.mergedCells) mergedCells = JSON.parse(p.mergedCells); } catch {}
      const mergeMap = new Map<string, { rowspan: number; colspan: number }>();
      const skipSet = new Set<string>();
      for (const m of mergedCells) {
        const key = `${m.row}:${m.col}`;
        mergeMap.set(key, { rowspan: m.rowspan || 1, colspan: m.colspan || 1 });
        for (let r = 0; r < (m.rowspan || 1); r++) {
          for (let c = 0; c < (m.colspan || 1); c++) {
            if (r !== 0 || c !== 0) skipSet.add(`${m.row + r}:${m.col + c}`);
          }
        }
      }
      const fs = p.fontSize || 13;
      const headerRow = `<tr>${headers.map((h: string, ci: number) => {
        if (skipSet.has(`-1:${ci}`)) return '';
        const merge = mergeMap.get(`0:${ci}`);
        const rs = merge ? ` rowspan="${merge.rowspan || 1}"` : '';
        const cs = merge ? ` colspan="${merge.colspan || 1}"` : '';
        return `<th style="padding:6px 10px;text-align:left;font-size:${fs}px;color:${p.headerColor || '#1e293b'};background:${p.headerBg || '#f1f5f9'};border-bottom:1px solid ${p.borderColor || '#e2e8f0'};font-weight:600;"${rs}${cs}>${h}</th>`;
      }).join('')}</tr>`;
      const dataRows = data.map((row: string[], ri: number) =>
        `<tr>${row.map((cell: string, ci: number) => {
          if (skipSet.has(`${ri}:${ci}`)) return '';
          const merge = mergeMap.get(`${ri + 1}:${ci}`);
          const rs = merge ? ` rowspan="${merge.rowspan || 1}"` : '';
          const cs = merge ? ` colspan="${merge.colspan || 1}"` : '';
          return `<td style="padding:6px 10px;font-size:${fs}px;color:${p.textColor || '#333'};border-bottom:1px solid ${p.borderColor || '#e2e8f0'};"${rs}${cs}>${cell}</td>`;
        }).join('')}</tr>`
      ).join('');
      return `      <div class="${cls}" style="${posStyle}overflow:hidden;border:1px solid ${p.borderColor || '#e2e8f0'};border-radius:6px;box-sizing:border-box;"><table style="width:100%;border-collapse:collapse;">${headerRow}${dataRows}</table></div>\n`;
    }

    case 'Effect': {
      const tpl = getEffectTemplate(p.effectId || 'glass-card');
      if (!tpl) return `      <div class="${cls}" style="${posStyle}background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#999;">未知特效</div>\n`;
      const merged = { ...tpl.defaultParams, ...p.params };
      return `      <div class="${cls}" style="${posStyle}">${tpl.generateHTML(merged)}</div>\n`;
    }

    case 'QRCode': {
      return `      <div class="${cls}" id="qr-${comp.id}" style="${posStyle}display:flex;align-items:center;justify-content:center;background:${p.lightColor || '#fff'};border-radius:4px;overflow:hidden;"></div>\n`;
    }

    case 'PieChart': {
      const chartConfig = { type: 'pie', data: p.data, title: p.title, color: p.color, donut: p.donut, showLabel: p.showLabel, stylePreset: p.stylePreset || 'default' };
      return `      <div class="${cls}" data-chart-config='${JSON.stringify(chartConfig)}' style="${posStyle}background:#fff;border:1px solid #eee;border-radius:4px;"></div>\n`;
    }

    case 'BarChart': {
      const chartConfig = { type: 'bar', data: p.data, title: p.title, color: p.color, yAxisName: p.yAxisName, barMaxWidth: p.barMaxWidth || 40, showValue: p.showValue, stylePreset: p.stylePreset || 'default' };
      return `      <div class="${cls}" data-chart-config='${JSON.stringify(chartConfig)}' style="${posStyle}background:#fff;border:1px solid #eee;border-radius:4px;"></div>\n`;
    }

    case 'RadarChart': {
      const chartConfig = { type: 'radar', data: p.data, title: p.title, color: p.color, indicators: p.indicators, fillOpacity: p.fillOpacity, showLabel: p.showLabel };
      return `      <div class="${cls}" data-chart-config='${JSON.stringify(chartConfig)}' style="${posStyle}background:#fff;border:1px solid #eee;border-radius:4px;"></div>\n`;
    }

    case 'Countdown':
      return `      <div class="${cls}" data-target="${p.targetDate || ''}" data-show-days="${p.showDays !== false}" data-show-hours="${p.showHours !== false}" data-show-minutes="${p.showMinutes !== false}" data-show-seconds="${p.showSeconds !== false}" style="${posStyle}display:flex;flex-direction:column;align-items:${p.alignItems || 'center'};justify-content:center;"><span style="font-size:12px;color:#888;">${escHtml(p.label || '倒计时')}</span><span class="countdown-value" style="font-size:${p.fontSize || 24}px;color:${p.color || '#6366F1'};font-weight:bold;">--:--:--</span></div>\n`;

    case 'Tag':
      return `      <span class="${cls}" style="${posStyle}display:inline-flex;align-items:center;gap:4px;padding:2px 10px;font-size:${p.fontSize || 12}px;color:${p.color || '#6366F1'};background:${p.bgColor || 'rgba(99,102,241,0.12)'};border-radius:${p.borderRadius || 4}px;font-weight:500;white-space:nowrap;">${escHtml(p.text || '标签')}${p.removable ? '<span style="cursor:pointer;opacity:0.6;margin-left:2px;">脳</span>' : ''}</span>\n`;

    case 'Avatar': {
      const sz = p.size || 48;
      const shape = p.shape === 'round' ? 8 : p.shape === 'square' ? 0 : 50;
      if (p.src) return `      <img class="${cls}" src="${escHtml(p.src)}" alt="avatar" style="${posStyle}width:${sz}px;height:${sz}px;border-radius:${p.shape === 'circle' ? '50%' : p.shape === 'round' ? '8px' : '0'};object-fit:cover;" />\n`;
      return `      <div class="${cls}" style="${posStyle}width:${sz}px;height:${sz}px;border-radius:${p.shape === 'circle' ? '50%' : p.shape === 'round' ? '8px' : '0'};background:${p.bgColor || '#6366F1'};color:${p.color || '#fff'};display:flex;align-items:center;justify-content:center;font-size:${p.fontSize || 20}px;font-weight:600;">${escHtml(p.text || 'U')}</div>\n`;
    }

    case 'Timeline': {
      let items: any[];
      try { items = JSON.parse(p.items); } catch { items = []; }
      const ls = items.map((item: any) =>
        `        <div style="display:flex;gap:12px;position:relative;padding-bottom:16px;"><div style="display:flex;flex-direction:column;align-items:center;"><div style="width:${p.dotSize || 10}px;height:${p.dotSize || 10}px;border-radius:50%;background:${item.color || '#6366F1'};flex-shrink:0;margin-top:4px;"></div><div style="flex:1;width:2px;background:${p.lineColor || '#e2e8f0'};min-height:20px;"></div></div><div style="flex:1;"><div style="font-weight:600;font-size:${p.fontSize || 13}px;">${item.title || ''}</div>${item.desc ? `<div style="font-size:12px;color:#888;margin-top:2px;">${item.desc}</div>` : ''}${item.time ? `<div style="font-size:11px;color:#aaa;margin-top:2px;">${item.time}</div>` : ''}</div></div>`
      ).join('\n');
      return `      <div class="${cls}" style="${posStyle}padding:8px;overflow-y:auto;">\n${ls}\n      </div>\n`;
    }

    default:
      return '';
  }
}

export function useCodeGenerator() {
  const store = useProjectStore();

  const generatedCode = computed(() => {
    const allComps = store.components;
    const pages = store.pages;
    let css = '';
    const mqttComponents: any[] = [];
    const chartComponents: any[] = [];
    const animationScripts: string[] = [];

    // Filter pages: respect customShow or skip hidden pages
    const visiblePages = store.customShow
      ? pages.filter(p => store.customShow!.includes(p.id))
      : pages.filter(p => !p.hidden);
    if (visiblePages.length === 0) visiblePages.push(pages[0]); // fallback

    // Generate CSS and HTML per page
    const slides: string[] = [];

    for (let pi = 0; pi < visiblePages.length; pi++) {
      const page = visiblePages[pi];
      const pageComps = allComps.filter(c => c.pageId === page.id);
      let slideHTML = '';

      for (const comp of pageComps) {
        const cls = comp.id;
        if (comp.animation && comp.animation.type !== 'none') {
          animationScripts.push(generateAnimeExportJS(cls, comp.animation));
        }
        slideHTML += generateComponentHTML(comp);

        if (comp.type === 'MqttDisplay') mqttComponents.push(comp);
        if (comp.type === 'ChartLine' || comp.type === 'PieChart' || comp.type === 'BarChart' || comp.type === 'RadarChart') chartComponents.push(comp);
      }

      slides.push(slideHTML);
    }

    // Slide CSS
    css += `
    .slide {
      position: absolute; inset: 0;
      display: flex; justify-content: center; align-items: center;
      opacity: 0; visibility: hidden; overflow: hidden;
      transition: opacity 0.45s ease, transform 0.45s ease;
      transform: translateX(100%);
    }
    .slide.active {
      opacity: 1; visibility: visible; transform: translateX(0);
    }
    .slide.prev {
      transform: translateX(-100%);
    }
    .slide-inner {
      position: relative;
      width: ${store.canvasConfig.width}px;
      height: ${store.canvasConfig.height}px;
      flex-shrink: 0;
    }
    .slide-ctx-menu {
      position: fixed; z-index: 200; min-width: 160px;
      background: rgba(30,41,59,0.95); backdrop-filter: blur(8px);
      border: 1px solid rgba(148,163,184,0.2);
      border-radius: 10px; padding: 4px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.4);
      display: none; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .slide-ctx-menu.show { display: block; }
    .slide-ctx-item {
      padding: 8px 14px; font-size: 13px; color: #e2e8f0;
      cursor: pointer; border-radius: 6px; white-space: nowrap;
      display: flex; align-items: center; gap: 8px;
    }
    .slide-ctx-item:hover { background: rgba(99,102,241,0.35); color: #fff; }
    .slide-ctx-divider { height: 1px; background: rgba(148,163,184,0.15); margin: 4px; }
    .slide-nav {
      position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
      display: flex; gap: 10px; z-index: 100;
    }
    .slide-dot {
      width: 10px; height: 10px; border-radius: 50%;
      background: rgba(148,163,184,0.4); border: none; cursor: pointer;
      transition: all 0.3s; padding: 0;
    }
    .slide-dot.active {
      background: #6366F1; transform: scale(1.3);
    }
    .slide-counter {
      position: fixed; bottom: 24px; right: 24px;
      font-size: 13px; color: rgba(148,163,184,0.6);
      font-family: monospace; z-index: 100;
    }
    .mqtt-status-dot { animation: mqttBlink 2s ease-in-out infinite; }
    @keyframes mqttBlink { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
    @keyframes progress-stripes { 0% { background-position: 1rem 0; } 100% { background-position: 0 0; } }
    `;

    // Build script section
    let script = '';

    // MQTT script
    const mqttChartComponents = chartComponents.filter(c => c.props.mqttTopic);
    if (mqttComponents.length > 0 || mqttChartComponents.length > 0) {
      const brokerUrl = mqttComponents.length > 0 ? mqttComponents[0].props.brokerUrl : 'ws://broker.emqx.io:8083/mqtt';
      const username = mqttComponents.length > 0 ? (mqttComponents[0].props.username || '') : '';
      const password = mqttComponents.length > 0 ? (mqttComponents[0].props.password || '') : '';
      const allTopics = [
        ...mqttComponents.map(c => c.props.topic),
        ...mqttChartComponents.map(c => c.props.mqttTopic)
      ];
      const topics = [...new Set(allTopics)];
      const connectOpts = `clientId:'noah_${Math.random().toString(36).slice(2,10)}'${username ? `,username:'${username}'` : ''}${password ? `,password:'${password}'` : ''}`;
      script += `
    <script src="${CDN_LINKS.mqtt}"><\/script>
    <script>
      (function() {
        var client = mqtt.connect('${brokerUrl}', { ${connectOpts} });
        function setMqttStatus(color) {
          document.querySelectorAll('.mqtt-status-dot').forEach(function(el) {
            el.style.background = color;
            el.style.boxShadow = '0 0 4px ' + color.replace(')', ',0.6)').replace('rgb', 'rgba');
          });
        }
        client.on('connect', function() {
          console.log('MQTT connected');
          setMqttStatus('#22c55e');
          ${topics.map(t => `client.subscribe('${t}');`).join('\n          ')}
        });
        client.on('reconnect', function() { setMqttStatus('#f59e0b'); });
        client.on('close', function() { setMqttStatus('#ef4444'); });
        client.on('message', function(topic, message) {
          var els = document.querySelectorAll('[data-mqtt-topic="' + topic + '"]');
          els.forEach(function(el) {
            var val = el.querySelector('.mqtt-value');
            if (!val) return;
            var raw = message.toString();
            var key = el.getAttribute('data-value-key');
            var unit = el.getAttribute('data-unit') || '';
            var decimal = parseInt(el.getAttribute('data-decimal') || '-1', 10);
            var displayVal;
            if (key) {
              try { var obj = JSON.parse(raw); displayVal = obj[key] !== undefined ? String(obj[key]) : '--'; }
              catch(e) { displayVal = raw; }
            } else { displayVal = raw; }
            if (decimal >= 0 && displayVal !== '--') {
              var n = parseFloat(displayVal);
              if (!isNaN(n)) displayVal = n.toFixed(decimal);
            }
            val.textContent = displayVal + (unit && displayVal !== '--' ? ' ' + unit : '');
          });
          // Update MQTT-bound charts
          var charts = window._noahCharts || {};
          Object.keys(charts).forEach(function(id) {
            var info = charts[id];
            if (info.topic !== topic) return;
            var raw = message.toString();
            var val;
            if (info.valueKey) {
              try { var obj = JSON.parse(raw); val = parseFloat(obj[info.valueKey]); }
              catch(e) { val = parseFloat(raw); }
            } else { val = parseFloat(raw); }
            if (isNaN(val)) return;
            info.data.push(val);
            if (info.data.length > info.maxPoints) info.data.shift();
            info.chart.setOption({
              xAxis: { data: info.data.map(function(_, i) { return '' + (i+1); }) },
              series: [{ data: info.data }]
            });
          });
        });
        client.on('error', function(e) { console.error('MQTT error:', e); setMqttStatus('#ef4444'); });
      })();
    <\/script>`;
    }

    // ECharts script
    if (chartComponents.length > 0) {
      script += `
    <script src="${CDN_LINKS.echarts}"><\/script>
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        window._noahChartInstances = window._noahChartInstances || {};
        ${chartComponents.map(c => `
        (function() {
          var el = document.querySelector('.${c.id}');
          if (el && typeof echarts !== 'undefined') {
            var chart = echarts.init(el);
            var config = JSON.parse(el.getAttribute('data-chart-config'));
            var data = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;

            // Pie chart
            if (config.type === 'pie') {
              var isDark = config.stylePreset === 'dark';
              var colors = [config.color || '#6366F1', '#8B5CF6', '#06B6D4', '#F59E0B', '#EF4444', '#10B981', '#EC4899', '#F97316', '#14B8A6'];
              chart.setOption({
                title: { text: config.title || '', left: 'center', textStyle: { fontSize: 13, color: isDark ? '#94a3b8' : '#666' } },
                tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
                color: colors,
                series: [{ type: 'pie', radius: config.donut ? ['35%','60%'] : '55%', center: ['50%','55%'], data: data, label: { show: config.showLabel !== false, fontSize: 11 } }],
                backgroundColor: isDark ? '#0f172a' : 'transparent',
              });
              return;
            }

            // Bar chart
            if (config.type === 'bar') {
              var isDark = config.stylePreset === 'dark';
              var names = data.map(function(d) { return d.name || ''; });
              var values = data.map(function(d) { return d.value || 0; });
              chart.setOption({
                title: { text: config.title || '', left: 'center', textStyle: { fontSize: 13, color: isDark ? '#94a3b8' : '#666' } },
                tooltip: { trigger: 'axis' },
                xAxis: { type: 'category', data: names, axisLabel: { fontSize: 10, color: isDark ? '#64748b' : '#999' } },
                yAxis: { type: 'value', name: config.yAxisName || '', axisLabel: { fontSize: 10, color: isDark ? '#64748b' : '#999' }, splitLine: { lineStyle: { color: isDark ? '#1e293b' : '#eee' } } },
                series: [{ type: 'bar', data: values, barMaxWidth: config.barMaxWidth || 40, itemStyle: { color: config.color || '#6366F1', borderRadius: [4,4,0,0] }, label: { show: config.showValue, position: 'top', fontSize: 10 } }],
                grid: { left: 45, right: 10, top: 30, bottom: 30 },
                backgroundColor: isDark ? '#0f172a' : 'transparent',
              });
              return;
            }

            // Radar chart
            if (config.type === 'radar') {
              var indicators = (typeof config.indicators === 'string' ? JSON.parse(config.indicators) : config.indicators).map(function(n) { return { name: n }; });
              var radarData = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
              chart.setOption({
                title: { text: config.title || '', left: 'center', textStyle: { fontSize: 13, color: '#666' } },
                tooltip: {},
                radar: { indicator: indicators, radius: '55%' },
                series: [{ type: 'radar', data: radarData.map(function(d) { return { value: d.value, name: d.name || '', areaStyle: { color: (config.color || '#6366F1') + '26' }, lineStyle: { color: config.color || '#6366F1' }, itemStyle: { color: config.color || '#6366F1' } }; }) }],
                backgroundColor: 'transparent',
              });
              return;
            }

            // ChartLine (original)
            var chartData = config.mqttTopic ? [] : data;
            if (config.mqttTopic) {
              window._noahCharts = window._noahCharts || {};
              window._noahCharts['${c.id}'] = { chart: chart, data: [], topic: config.mqttTopic, valueKey: config.valueKey || '', maxPoints: config.maxPoints || 20 };
            }
            var preset = config.stylePreset || 'line';
            var isDark = preset === 'dark';
            var titleColor = isDark ? '#94a3b8' : '#666';
            var axisColor = isDark ? '#64748b' : '#999';
            var seriesConfig = { data: chartData, itemStyle: { color: config.color } };
            if (preset === 'line' || preset === 'dark' || preset === 'minimal') {
              seriesConfig.type = 'line';
              seriesConfig.smooth = preset !== 'minimal';
              seriesConfig.lineStyle = { color: config.color, width: config.lineWidth || 2 };
              if (preset === 'minimal') seriesConfig.showSymbol = false;
            } else if (preset === 'area') {
              seriesConfig.type = 'line';
              seriesConfig.smooth = true;
              seriesConfig.lineStyle = { color: config.color, width: config.lineWidth || 2 };
              seriesConfig.areaStyle = { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: config.color + '40' }, { offset: 1, color: config.color + '05' }] } };
            } else if (preset === 'bar') {
              seriesConfig.type = 'bar';
              seriesConfig.barMaxWidth = 30;
              seriesConfig.itemStyle = { color: config.color };
            }
            chart.setOption({
              title: { text: config.title || '', left: 'center', textStyle: { fontSize: 13, color: titleColor } },
              tooltip: { trigger: 'axis' },
              xAxis: { type: 'category', data: chartData.map(function(_, i) { return '' + (i+1); }), axisLabel: { fontSize: 10, color: axisColor }, axisLine: { lineStyle: { color: axisColor } } },
              yAxis: { type: 'value', name: config.yAxisName || '', axisLabel: { fontSize: 10, color: axisColor }, splitLine: { lineStyle: { color: isDark ? '#1e293b' : '#eee' } } },
              series: [seriesConfig],
              grid: { left: 35, right: 8, top: 30, bottom: 25 },
              backgroundColor: isDark ? '#0f172a' : 'transparent'
            });
            window._noahChartInstances['${c.id}'] = { chart: chart, el: el, ow: el.offsetWidth, oh: el.offsetHeight };
          }
        })();`).join('\n')}
      });
    <\/script>`;
    }

    // Anime.js script
    if (animationScripts.length > 0) {
      script += `
    <script src="${CDN_LINKS.animejs}"><\/script>
    <script>
      window._noahAnims = window._noahAnims || {};
      ${animationScripts.join('\n      ')}
      document.addEventListener('DOMContentLoaded', function() {
        Object.keys(window._noahAnims).forEach(function(id) { window._noahAnims[id](); });
      });
    <\/script>`;
    }

    // QRCode init
    const qrComponents = allComps.filter(c => c.type === 'QRCode');
    if (qrComponents.length > 0) {
      script += `
    <script src="${CDN_LINKS.qrcode}"><\/script>
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        ${qrComponents.map(c => `
        var qrEl = document.querySelector('#qr-${c.id}');
        if (qrEl && typeof QRCode !== 'undefined') {
          new QRCode(qrEl, { text: "${(c.props.text || 'https://example.com').replace(/"/g, '\\"')}", width: qrEl.offsetWidth || ${c.size.width}, height: qrEl.offsetHeight || ${c.size.height} });
        }`).join('\n')}
      });
    <\/script>`;
    }

    // Countdown init
    const countdownComps = allComps.filter(c => c.type === 'Countdown');
    if (countdownComps.length > 0) {
      script += `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        setInterval(function() {
          document.querySelectorAll('[data-target]').forEach(function(el) {
            var target = el.getAttribute('data-target');
            if (!target) return;
            var diff = Math.max(0, new Date(target).getTime() - Date.now());
            var val = el.querySelector('.countdown-value');
            if (!val) return;
            if (diff <= 0) { val.textContent = '00:00:00'; return; }
            var d = Math.floor(diff / 86400000);
            var h = Math.floor((diff % 86400000) / 3600000);
            var m = Math.floor((diff % 3600000) / 60000);
            var s = Math.floor((diff % 60000) / 1000);
            var parts = [];
            if (el.getAttribute('data-show-days') !== 'false') parts.push(String(d).padStart(2,'0'));
            if (el.getAttribute('data-show-hours') !== 'false') parts.push(String(h).padStart(2,'0'));
            if (el.getAttribute('data-show-minutes') !== 'false') parts.push(String(m).padStart(2,'0'));
            if (el.getAttribute('data-show-seconds') !== 'false') parts.push(String(s).padStart(2,'0'));
            val.textContent = parts.join(':');
          });
        }, 1000);
      });
    <\/script>`;
    }

    // Slide navigation script
    const autoPlayDurations = visiblePages.map(p => p.duration || 0);
    const slideNavScript = `
    <script>
    (function() {
      var slides = document.querySelectorAll('.slide');
      var dots = document.querySelectorAll('.slide-dot');
      var counter = document.querySelector('.slide-counter');
      var current = 0;
      var transitioning = false;
      var inners = document.querySelectorAll('.slide-inner');
      var autoTimer = null;
      var durations = [${autoPlayDurations.join(',')}];
      var autoPlayEnabled = ${store.autoPlay};
      var CW = ${store.canvasConfig.width}, CH = ${store.canvasConfig.height};
      function fitCanvas() {
        var vw = window.innerWidth, vh = window.innerHeight;
        var s = Math.min(vw / CW, vh / CH);
        inners.forEach(function(el) { el.style.transform = 'scale(' + s + ')'; });
      }
      window.addEventListener('resize', fitCanvas);
      fitCanvas();

      function showSlide(idx, direction) {
        if (idx < 0 || idx >= slides.length || idx === current || transitioning) return;
        transitioning = true;

        var forward = direction !== undefined ? direction > 0 : idx > current;
        var oldSlide = slides[current];
        var newSlide = slides[idx];

        // Remove active from old slide, set its exit direction
        oldSlide.classList.remove('active');
        oldSlide.classList.remove('prev');
        if (forward) {
          oldSlide.classList.add('prev'); // old slides out to the left
        }
        // else: old slides out to the right (default translateX(100%))

        // Prepare new slide entry direction
        newSlide.classList.remove('active');
        newSlide.classList.remove('prev');
        if (!forward) {
          // Coming from left
          newSlide.style.transform = 'translateX(-100%)';
          newSlide.style.transition = 'none';
          newSlide.offsetHeight; // force reflow
          newSlide.style.transition = '';
          newSlide.style.transform = '';
        }

        // Activate new slide
        newSlide.classList.add('active');

        if (dots[current]) dots[current].classList.remove('active');
        if (dots[idx]) dots[idx].classList.add('active');
        current = idx;
        if (counter) counter.textContent = (current + 1) + ' / ' + slides.length;

        // Re-trigger component animations via Anime.js
        if (typeof anime !== 'undefined' && window._noahAnims) {
          Object.keys(window._noahAnims).forEach(function(id) {
            var el = newSlide.querySelector('.' + id);
            if (el) {
              // Reset element styles before replaying
              el.style.opacity = ''; el.style.transform = ''; el.style.filter = ''; el.style.backgroundColor = '';
              window._noahAnims[id]();
            }
          });
        }

        // Unlock after transition
        setTimeout(function() { transitioning = false; }, 480);

        // Auto-play: schedule next slide
        if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
        if (autoPlayEnabled && durations[current] > 0) {
          autoTimer = setTimeout(function() {
            if (current < slides.length - 1) {
              showSlide(current + 1, 1);
            } else {
              // Loop back to first slide
              showSlide(0, 1);
            }
          }, durations[current] * 1000);
        }
      }

      // Init first slide
      if (slides.length > 0) slides[0].classList.add('active');
      if (dots.length > 0) dots[0].classList.add('active');

      // Start auto-play timer for first slide
      if (autoPlayEnabled && durations[0] > 0) {
        autoTimer = setTimeout(function() {
          if (slides.length > 1) showSlide(1, 1);
        }, durations[0] * 1000);
      }

      // Dot clicks
      dots.forEach(function(dot, i) {
        dot.addEventListener('click', function(e) {
          e.stopPropagation();
          showSlide(i);
        });
      });

      // Right-click context menu
      var ctxMenu = document.getElementById('slide-ctx-menu');
      document.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        if (!ctxMenu) return;
        ctxMenu.style.left = Math.min(e.clientX, window.innerWidth - 180) + 'px';
        ctxMenu.style.top = Math.min(e.clientY, window.innerHeight - 220) + 'px';
        ctxMenu.classList.add('show');
      });
      document.addEventListener('click', function(e) {
        if (!ctxMenu) return;
        if (!ctxMenu.contains(e.target)) {
          ctxMenu.classList.remove('show');
        }
      });
      if (ctxMenu) {
        ctxMenu.querySelectorAll('[data-ctx-action]').forEach(function(el) {
          el.addEventListener('click', function(e) {
            e.stopPropagation();
            ctxMenu.classList.remove('show');
            var action = this.getAttribute('data-ctx-action');
            if (action === 'next') showSlide(current + 1, 1);
            else if (action === 'prev') showSlide(current - 1, -1);
            else if (action === 'presenter') { if (window.openPresenterMode) openPresenterMode(); }
            else if (action === 'exit') {
              if (window.parent && window.parent !== window) {
                window.parent.postMessage('noah-exit-fullscreen', '*');
              } else if (document.documentElement.requestFullscreen) {
                if (document.fullscreenElement) document.exitFullscreen();
              }
            }
          });
        });
      }

      // Click to advance (right 70% = forward, left 30% = backward, PPT style)
      document.addEventListener('click', function(e) {
        if (!ctxMenu || ctxMenu.classList.contains('show')) return;
        var x = e.clientX / window.innerWidth;
        if (x > 0.3) {
          showSlide(current + 1, 1);
        } else {
          showSlide(current - 1, -1);
        }
      });

      // Keyboard navigation (in-iframe)
      function handleNav(key) {
        if (key === 'ArrowRight' || key === 'ArrowDown' || key === ' ' || key === 'PageDown') {
          showSlide(current + 1, 1);
        } else if (key === 'ArrowLeft' || key === 'ArrowUp' || key === 'PageUp') {
          showSlide(current - 1, -1);
        } else if (key === 'Home') {
          showSlide(0, -1);
        } else if (key === 'End') {
          showSlide(slides.length - 1, 1);
        }
      }

      document.addEventListener('keydown', function(e) {
        if (['ArrowRight','ArrowLeft','ArrowUp','ArrowDown',' ','PageDown','PageUp','Home','End'].indexOf(e.key) >= 0) {
          e.preventDefault();
          handleNav(e.key);
        }
      });

      // Receive keyboard from parent window (for sandboxed iframe)
      window.addEventListener('message', function(e) {
        if (!e.data || !e.data.type) return;
        if (e.data.type === 'keydown') { handleNav(e.data.key); }
      });

      // Double-click to toggle fullscreen (standalone) or exit (iframe)
      document.addEventListener('dblclick', function() {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage('noah-exit-fullscreen', '*');
        } else if (document.documentElement.requestFullscreen) {
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            document.documentElement.requestFullscreen();
          }
        }
      });

      // Touch/swipe
      var touchStartX = 0;
      document.addEventListener('touchstart', function(e) { touchStartX = e.touches[0].clientX; });
      document.addEventListener('touchend', function(e) {
        var dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 50) {
          if (dx < 0) showSlide(current + 1, 1);
          else showSlide(current - 1, -1);
        }
      });

      // Mouse wheel
      var wheelTimeout = null;
      document.addEventListener('wheel', function(e) {
        e.preventDefault();
        if (wheelTimeout) return;
        wheelTimeout = setTimeout(function() { wheelTimeout = null; }, 500);
        if (e.deltaY > 0) showSlide(current + 1, 1);
        else if (e.deltaY < 0) showSlide(current - 1, -1);
      }, { passive: false });

      // ── Presenter mode ──
      // Listen for navigation messages from presenter (works with both postMessage and BroadcastChannel)
      window.addEventListener('message', function(e) {
        if (e.data && (e.data.type === 'navigate' || e.data.type === 'sync')) {
          if (typeof e.data.slideIndex === 'number') showSlide(e.data.slideIndex);
        }
      });

      // For exported HTML: presenter mode opens an audience window
      // For iframe (Tauri app): sends message to parent to open presenter mode
      function openPresenterMode() {
        // In iframe → tell parent to handle it
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'noah-open-presenter' }, '*');
          return;
        }
        // Standalone HTML: open audience window via popup
        var audUrl = window.location.href.split('?')[0] + '?mode=audience';
        var audWin = window.open(audUrl, 'noah-audience', 'width=1280,height=720');
        if (!audWin) { alert('请允许弹出窗口以打开观众视图'); return; }
        // Override showSlide to broadcast to audience
        var origShow = showSlide;
        showSlide = function(idx, dir) {
          origShow(idx, dir);
          try { audWin.postMessage({ type: 'navigate', slideIndex: idx, totalSlides: slides.length }, '*'); } catch(e) {}
        };
        // Send current slide to audience
        setTimeout(function() {
          try { audWin.postMessage({ type: 'sync', slideIndex: current, totalSlides: slides.length }, '*'); } catch(e) {}
        }, 1000);
      }
      window.openPresenterMode = openPresenterMode;

      // If loaded as audience (?mode=audience), hide context menu
      window._noahGoToSlide = showSlide;
    })();
    <\/script>`;

    // Video time-range enforcement
    const videoTimeScript = `
    <script>
    document.addEventListener('DOMContentLoaded', function() {
      document.querySelectorAll('video[data-start-time], video[data-end-time]').forEach(function(v) {
        var st = parseFloat(v.getAttribute('data-start-time'));
        var et = parseFloat(v.getAttribute('data-end-time'));
        v.addEventListener('timeupdate', function() {
          if (!isNaN(st) && st > 0 && this.currentTime < st) { this.currentTime = st; }
          if (!isNaN(et) && et > 0 && this.currentTime >= et) { this.pause(); }
        });
        if (!isNaN(st) && st > 0) { v.currentTime = st; }
      });
    });
    <\/script>`;

    // Generate slides HTML
    const slidesHTML = slides.map((html, i) =>
      `    <div class="slide${i === 0 ? ' active' : ''}" id="slide-${i}">\n      <div class="slide-inner">\n${html}      </div>\n    </div>\n`
    ).join('');

    // Generate nav dots
    const dotsHTML = visiblePages.map((_, i) =>
      `      <button class="slide-dot${i === 0 ? ' active' : ''}" data-slide="${i}"></button>`
    ).join('\n');

    

    // Auto-collect font imports from page style + all components
    const fontImportUrls = new Set<string>();
    if (store.pageStyle.fontImport) fontImportUrls.add(store.pageStyle.fontImport);
    allComps.forEach(c => {
      if (c.props.fontFamily) {
        const preset = FONT_PRESETS.find(f => f.value === c.props.fontFamily);
        if (preset?.importUrl) fontImportUrls.add(preset.importUrl);
      }
    });
    const fontImport = [...fontImportUrls].map(u => `@import url('${u}');`).join('\n    ') + (fontImportUrls.size > 0 ? '\n    ' : '');
    const bodyBg = store.pageStyle.background;
    const bodyFont = store.pageStyle.fontFamily;
    const textColor = bodyBg.startsWith('#0') || bodyBg.startsWith('#1') || bodyBg.startsWith('#2') || bodyBg.startsWith('rgb(0') ? '#F1F5F9' : '#1a1a1a';

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${store.title}</title>
  <style>
    ${fontImport}* { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: ${bodyBg}; color: ${textColor}; font-family: ${bodyFont}; }
	    .slide { background: ${bodyBg}; }
${css}
    .chart-container { }
  </style>
</head>
<body>
${slidesHTML}
${store.showPageDots ? `    <div class="slide-nav">
${dotsHTML}
    </div>
    <div class="slide-counter">1 / ${visiblePages.length}</div>
` : ''}
    <div class="slide-ctx-menu" id="slide-ctx-menu">
      <div class="slide-ctx-item" data-ctx-action="prev">◀ 上一页</div>
      <div class="slide-ctx-item" data-ctx-action="next">下一页 ▶</div>
      <div class="slide-ctx-divider"></div>
      <div class="slide-ctx-item" data-ctx-action="presenter">🎤 演讲者模式</div>
      <div class="slide-ctx-divider"></div>
      <div class="slide-ctx-item" data-ctx-action="exit">✕ 退出全屏</div>
    </div>
${script}${slideNavScript}${videoTimeScript}
</body>
</html>`;
  });

  const previewHTML = computed(() => {
    const store = useProjectStore();
    const pageComps = store.pageComponents;
    const allComps = store.components;

    // Collect script arrays
    const p_mqtt: ComponentInstance[] = [];
    const p_chart: ComponentInstance[] = [];
    const p_anims: string[] = [];

    for (const comp of pageComps) {
      if (comp.animation && comp.animation.type !== 'none') {
        p_anims.push(generateAnimeExportJS(comp.id, comp.animation));
      }
      if (comp.type === 'MqttDisplay') p_mqtt.push(comp);
      if (comp.type === 'ChartLine' || comp.type === 'PieChart' || comp.type === 'BarChart' || comp.type === 'RadarChart') p_chart.push(comp);
    }

    // Component HTML
    const compsHTML = pageComps.map(c => generateComponentHTML(c)).join('');

    // Font imports
    const fontUrls = new Set<string>();
    if (store.pageStyle.fontImport) fontUrls.add(store.pageStyle.fontImport);
    allComps.forEach(c => {
      if (c.props.fontFamily) {
        const preset = FONT_PRESETS.find(f => f.value === c.props.fontFamily);
        if (preset?.importUrl) fontUrls.add(preset.importUrl);
      }
    });
    const fontImport = [...fontUrls].map(u => `@import url('${u}');`).join('\n    ') + (fontUrls.size > 0 ? '\n    ' : '');

    const bodyBg = store.pageStyle.background;
    const bodyFont = store.pageStyle.fontFamily;
    const textColor = bodyBg.startsWith('#0') || bodyBg.startsWith('#1') || bodyBg.startsWith('#2') || bodyBg.startsWith('rgb(0') ? '#F1F5F9' : '#1a1a1a';

    const { width: pw, height: ph } = store.canvasConfig;

    // ══ Scripts ══
    let script = '';

    // MQTT
    const p_mqttChart = p_chart.filter(c => c.props.mqttTopic);
    if (p_mqtt.length > 0 || p_mqttChart.length > 0) {
      const brokerUrl = p_mqtt.length > 0 ? p_mqtt[0].props.brokerUrl : 'ws://broker.emqx.io:8083/mqtt';
      const username = p_mqtt.length > 0 ? (p_mqtt[0].props.username || '') : '';
      const password = p_mqtt.length > 0 ? (p_mqtt[0].props.password || '') : '';
      const allTopics = [...p_mqtt.map(c => c.props.topic), ...p_mqttChart.map(c => c.props.mqttTopic)];
      const topics = [...new Set(allTopics)];
      const connectOpts = `clientId:'noah_${Math.random().toString(36).slice(2,10)}'${username ? `,username:'${username}'` : ''}${password ? `,password:'${password}'` : ''}`;
      script += `
    <script src="${CDN_LINKS.mqtt}"><\/script>
    <script>
      (function() {
        var client = mqtt.connect('${brokerUrl}', { ${connectOpts} });
        function setMqttStatus(color) {
          document.querySelectorAll('.mqtt-status-dot').forEach(function(el) {
            el.style.background = color;
            el.style.boxShadow = '0 0 4px ' + color.replace(')', ',0.6)').replace('rgb', 'rgba');
          });
        }
        client.on('connect', function() {
          console.log('MQTT connected');
          setMqttStatus('#22c55e');
          ${topics.map(t => `client.subscribe('${t}');`).join('\n          ')}
        });
        client.on('reconnect', function() { setMqttStatus('#f59e0b'); });
        client.on('close', function() { setMqttStatus('#ef4444'); });
        client.on('message', function(topic, message) {
          var els = document.querySelectorAll('[data-mqtt-topic="' + topic + '"]');
          els.forEach(function(el) {
            var val = el.querySelector('.mqtt-value');
            if (!val) return;
            var raw = message.toString();
            var key = el.getAttribute('data-value-key');
            var unit = el.getAttribute('data-unit') || '';
            var decimal = parseInt(el.getAttribute('data-decimal') || '-1', 10);
            var displayVal;
            if (key) {
              try { var obj = JSON.parse(raw); displayVal = obj[key] !== undefined ? String(obj[key]) : '--'; }
              catch(e) { displayVal = raw; }
            } else { displayVal = raw; }
            if (decimal >= 0 && displayVal !== '--') {
              var n = parseFloat(displayVal);
              if (!isNaN(n)) displayVal = n.toFixed(decimal);
            }
            val.textContent = displayVal + (unit && displayVal !== '--' ? ' ' + unit : '');
          });
          var charts = window._noahCharts || {};
          Object.keys(charts).forEach(function(id) {
            var info = charts[id];
            if (info.topic !== topic) return;
            var raw = message.toString();
            var val;
            if (info.valueKey) {
              try { var obj = JSON.parse(raw); val = parseFloat(obj[info.valueKey]); }
              catch(e) { val = parseFloat(raw); }
            } else { val = parseFloat(raw); }
            if (isNaN(val)) return;
            info.data.push(val);
            if (info.data.length > info.maxPoints) info.data.shift();
            info.chart.setOption({
              xAxis: { data: info.data.map(function(_, i) { return '' + (i+1); }) },
              series: [{ data: info.data }]
            });
          });
        });
        client.on('error', function(e) { console.error('MQTT error:', e); setMqttStatus('#ef4444'); });
      })();
    <\/script>`;
    }

    // ECharts
    if (p_chart.length > 0) {
      script += `
    <script src="${CDN_LINKS.echarts}"><\/script>
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        window._noahChartInstances = window._noahChartInstances || {};
        ${p_chart.map(c => `
        (function() {
          var el = document.querySelector('.${c.id}');
          if (el && typeof echarts !== 'undefined') {
            var chart = echarts.init(el);
            var config = JSON.parse(el.getAttribute('data-chart-config'));
            var data = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
            if (config.type === 'pie') {
              var isDark = config.stylePreset === 'dark';
              var colors = [config.color || '#6366F1', '#8B5CF6', '#06B6D4', '#F59E0B', '#EF4444', '#10B981', '#EC4899', '#F97316', '#14B8A6'];
              chart.setOption({ title: { text: config.title || '', left: 'center', textStyle: { fontSize: 13, color: isDark ? '#94a3b8' : '#666' } }, tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' }, color: colors, series: [{ type: 'pie', radius: config.donut ? ['35%','60%'] : '55%', center: ['50%','55%'], data: data, label: { show: config.showLabel !== false, fontSize: 11 } }], backgroundColor: isDark ? '#0f172a' : 'transparent' });
              return;
            }
            if (config.type === 'bar') {
              var isDark = config.stylePreset === 'dark';
              var names = data.map(function(d) { return d.name || ''; });
              var values = data.map(function(d) { return d.value || 0; });
              chart.setOption({ title: { text: config.title || '', left: 'center', textStyle: { fontSize: 13, color: isDark ? '#94a3b8' : '#666' } }, tooltip: { trigger: 'axis' }, xAxis: { type: 'category', data: names, axisLabel: { fontSize: 10, color: isDark ? '#64748b' : '#999' } }, yAxis: { type: 'value', name: config.yAxisName || '', axisLabel: { fontSize: 10, color: isDark ? '#64748b' : '#999' }, splitLine: { lineStyle: { color: isDark ? '#1e293b' : '#eee' } } }, series: [{ type: 'bar', data: values, barMaxWidth: config.barMaxWidth || 40, itemStyle: { color: config.color || '#6366F1', borderRadius: [4,4,0,0] }, label: { show: config.showValue, position: 'top', fontSize: 10 } }], grid: { left: 45, right: 10, top: 30, bottom: 30 }, backgroundColor: isDark ? '#0f172a' : 'transparent' });
              return;
            }
            if (config.type === 'radar') {
              var indicators = (typeof config.indicators === 'string' ? JSON.parse(config.indicators) : config.indicators).map(function(n) { return { name: n }; });
              var radarData = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
              chart.setOption({ title: { text: config.title || '', left: 'center', textStyle: { fontSize: 13, color: '#666' } }, tooltip: {}, radar: { indicator: indicators, radius: '55%' }, series: [{ type: 'radar', data: radarData.map(function(d) { return { value: d.value, name: d.name || '', areaStyle: { color: (config.color || '#6366F1') + '26' }, lineStyle: { color: config.color || '#6366F1' }, itemStyle: { color: config.color || '#6366F1' } }; }) }], backgroundColor: 'transparent' });
              return;
            }
            var chartData = config.mqttTopic ? [] : data;
            if (config.mqttTopic) {
              window._noahCharts = window._noahCharts || {};
              window._noahCharts['${c.id}'] = { chart: chart, data: [], topic: config.mqttTopic, valueKey: config.valueKey || '', maxPoints: config.maxPoints || 20 };
            }
            var preset = config.stylePreset || 'line';
            var isDark = preset === 'dark';
            var titleColor = isDark ? '#94a3b8' : '#666';
            var axisColor = isDark ? '#64748b' : '#999';
            var seriesConfig = { data: chartData, itemStyle: { color: config.color } };
            if (preset === 'line' || preset === 'dark' || preset === 'minimal') {
              seriesConfig.type = 'line'; seriesConfig.smooth = preset !== 'minimal';
              seriesConfig.lineStyle = { color: config.color, width: config.lineWidth || 2 };
              if (preset === 'minimal') seriesConfig.showSymbol = false;
            } else if (preset === 'area') {
              seriesConfig.type = 'line'; seriesConfig.smooth = true;
              seriesConfig.lineStyle = { color: config.color, width: config.lineWidth || 2 };
              seriesConfig.areaStyle = { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: config.color + '40' }, { offset: 1, color: config.color + '05' }] };
            } else if (preset === 'bar') {
              seriesConfig.type = 'bar'; seriesConfig.barMaxWidth = 30; seriesConfig.itemStyle = { color: config.color };
            }
            chart.setOption({ title: { text: config.title || '', left: 'center', textStyle: { fontSize: 13, color: titleColor } }, tooltip: { trigger: 'axis' }, xAxis: { type: 'category', data: chartData.map(function(_, i) { return '' + (i+1); }), axisLabel: { fontSize: 10, color: axisColor }, axisLine: { lineStyle: { color: axisColor } } }, yAxis: { type: 'value', name: config.yAxisName || '', axisLabel: { fontSize: 10, color: axisColor }, splitLine: { lineStyle: { color: isDark ? '#1e293b' : '#eee' } } }, series: [seriesConfig], grid: { left: 35, right: 8, top: 30, bottom: 25 }, backgroundColor: isDark ? '#0f172a' : 'transparent' });
            window._noahChartInstances['${c.id}'] = { chart: chart, el: el, ow: el.offsetWidth, oh: el.offsetHeight };
          }
        })();`).join('\n')}
      });
    <\/script>`;
    }

    // Anime.js
    if (p_anims.length > 0) {
      script += `
    <script src="${CDN_LINKS.animejs}"><\/script>
    <script>
      window._noahAnims = window._noahAnims || {};
      ${p_anims.join('\n      ')}
      document.addEventListener('DOMContentLoaded', function() {
        Object.keys(window._noahAnims).forEach(function(id) { window._noahAnims[id](); });
      });
    <\/script>`;
    }

    // QRCode
    const qrComps = allComps.filter(c => c.type === 'QRCode');
    if (qrComps.length > 0) {
      script += `
    <script src="${CDN_LINKS.qrcode}"><\/script>
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        ${qrComps.map(c => `
        var qrEl = document.querySelector('#qr-${c.id}');
        if (qrEl && typeof QRCode !== 'undefined') {
          new QRCode(qrEl, { text: "${(c.props.text || 'https://example.com').replace(/"/g, '\\"')}", width: qrEl.offsetWidth || ${c.size.width}, height: qrEl.offsetHeight || ${c.size.height} });
        }`).join('\n')}
      });
    <\/script>`;
    }

    // Countdown
    const cdComps = allComps.filter(c => c.type === 'Countdown');
    if (cdComps.length > 0) {
      script += `
    <script>
      document.addEventListener('DOMContentLoaded', function() {
        setInterval(function() {
          document.querySelectorAll('[data-target]').forEach(function(el) {
            var target = el.getAttribute('data-target');
            if (!target) return;
            var diff = Math.max(0, new Date(target).getTime() - Date.now());
            var val = el.querySelector('.countdown-value');
            if (!val) return;
            if (diff <= 0) { val.textContent = '00:00:00'; return; }
            var d = Math.floor(diff / 86400000);
            var h = Math.floor((diff % 86400000) / 3600000);
            var m = Math.floor((diff % 3600000) / 60000);
            var s = Math.floor((diff % 60000) / 1000);
            var parts = [];
            if (el.getAttribute('data-show-days') !== 'false') parts.push(String(d).padStart(2,'0'));
            if (el.getAttribute('data-show-hours') !== 'false') parts.push(String(h).padStart(2,'0'));
            if (el.getAttribute('data-show-minutes') !== 'false') parts.push(String(m).padStart(2,'0'));
            if (el.getAttribute('data-show-seconds') !== 'false') parts.push(String(s).padStart(2,'0'));
            val.textContent = parts.join(':');
          });
        }, 1000);
      });
    <\/script>`;
    }

    // CSS (only hide entrance animations initially; loop animations like drift should remain visible)
    let p_css = '';
    pageComps.forEach(c => {
      if (c.animation && c.animation.type !== 'none' && !isLoopAnim(c.animation.type)) {
        p_css += `.${c.id} { opacity:0; }\n`;
      }
    });
    p_css += `.mqtt-status-dot { animation: mqttBlink 2s ease-in-out infinite; }
@keyframes mqttBlink { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
@keyframes progress-stripes { 0% { background-position: 1rem 0; } 100% { background-position: 0 0; } }
`;

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    ${fontImport}* { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: ${bodyBg}; color: ${textColor}; font-family: ${bodyFont}; }
    ${p_css}
  </style>
</head>
<body>
  <div style="position:relative;width:${pw}px;height:${ph}px;overflow:hidden;background:${bodyBg};">
    ${compsHTML}
  </div>
  ${script}
</body>
</html>`;
  });

  return { generatedCode, previewHTML };
}



