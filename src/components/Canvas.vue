<template>
  <div class="canvas-wrapper" ref="wrapperRef"
       @wheel.prevent="onWheel">
    <div class="canvas-scroll" ref="scrollRef"
         @mousedown.right="onPanStart" @contextmenu.prevent
         @drop.prevent="onDrop" @dragover.prevent>
      <div class="zoom-wrapper" ref="zoomRef" :style="zoomWrapperStyle">
        <div ref="artboardRef" class="canvas-artboard" :style="artboardStyle"
             @mousedown="onArtboardMouseDown">
          <!-- Preview iframe (pixel-identical to fullscreen) -->
          <iframe :srcdoc="srcDoc" class="preview-iframe"
                  :class="{ dragging: draggingId !== null }"
                  title="Editor Preview"
                  :style="{ pointerEvents: 'none' }"
                  scrolling="no" />
          <!-- Interaction overlay -->
          <div class="canvas-overlay">
            <div v-for="comp in store.pageComponents" :key="comp.id"
                 class="canvas-element"
                 :class="{ selected: isSelected(comp.id), dragging: draggingId === comp.id }"
                 :style="getElementStyle(comp)"
                 @mousedown.stop="onCompMouseDown($event, comp)"
                 @contextmenu.prevent.stop="onCompContextMenu($event, comp)">
              <div class="comp-inner" v-html="componentHTML(comp)"></div>
              <!-- Selection overlay -->
              <template v-if="isSelected(comp.id)">
                <div class="selection-border"></div>
                <div v-for="h in handles" :key="h.dir" class="resize-handle"
                     :class="'handle-' + h.dir"
                     :style="h.style"
                     @mousedown.stop="onHandleMouseDown($event, comp, h.dir)">
                </div>
              </template>
            </div>
          </div>
          <!-- Grid -->
          <div v-if="store.showGrid" class="grid-overlay" :style="gridStyle"></div>
          <!-- Box selection rect -->
          <div v-if="selRect.active" class="selection-rect" :style="selRectStyle"></div>
          <!-- Smart guide lines -->
          <template v-for="(g, i) in guides" :key="i">
            <div v-if="g.dir === 'v'" class="guide-line guide-v" :style="{ left: g.pos + 'px' }"></div>
            <div v-if="g.dir === 'h'" class="guide-line guide-h" :style="{ top: g.pos + 'px' }"></div>
          </template>
        </div>
      </div>
    </div>
    <!-- Zoom bar -->
    <div class="zoom-bar">
      <button class="zoom-btn" @click="zoomOut" title="缩小">−</button>
      <span class="zoom-label" @click="resetZoom">{{ Math.round(zoom * 100) }}%</span>
      <button class="zoom-btn" @click="zoomIn" title="放大">+</button>
      <button class="zoom-btn fit-btn" @click="fitCanvas" title="适应画布">⊡</button>
    </div>
    <button class="start-btn" @click="$emit('startFullscreen')" title="开始演示 (F6)">▶ 开始</button>
    <button class="presenter-btn" @click="$emit('startPresenter')" title="演讲者模式 (F7)">演讲者模式</button>
    <!-- Context menu -->
    <div v-if="ctxMenu.visible" class="context-menu"
         :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }">
      <div class="ctx-item" @click="ctxDelete">删除</div>
      <div class="ctx-item" @click="ctxDuplicate">复制</div>
      <div class="ctx-divider"></div>
      <div class="ctx-item" @click="ctxBringFront">置于顶层</div>
      <div class="ctx-item" @click="ctxSendBack">置于底层</div>
    </div>
    <div v-if="ctxMenu.visible" class="ctx-overlay" @mousedown="closeCtx" @contextmenu.prevent="closeCtx"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useProjectStore } from '../stores/project';
import { COMPONENT_DEFS, type ComponentInstance } from '../types/component';
import { FONT_PRESETS } from '../types/fontPresets';
import { getEffectTemplate } from '../types/effect';
import { useCodeGenerator } from '../composables/useCodeGenerator';
import { escHtml, hexToRgba, sanitizeHtml } from '../composables/useSanitize';

const store = useProjectStore();
const { previewHTML } = useCodeGenerator();
const emit = defineEmits<{ startFullscreen: []; startPresenter: [] }>();

// ── Iframe srcDoc management ──
const srcDoc = ref('');
let updateTimer: any;

function scheduleSrcDocUpdate() {
  clearTimeout(updateTimer);
  updateTimer = setTimeout(() => {
    srcDoc.value = previewHTML.value;
  }, 16); // ~1 frame at 60fps
}

// Update on page switch (immediate)
watch(() => store.currentPageId, () => {
  clearTimeout(updateTimer);
  srcDoc.value = previewHTML.value;
});

// Update on component content changes
watch(() => store.pageComponents, () => {
  scheduleSrcDocUpdate();
}, { deep: true });

// Also update on pageStyle changes
watch(() => store.pageStyle, () => {
  scheduleSrcDocUpdate();
}, { deep: true });

// ── Font loading for overlay ──
const loadedFonts = new Set<string>();
function loadFonts() {
  const families = new Set<string>();
  store.pageComponents.forEach(c => { if (c.props.fontFamily) families.add(c.props.fontFamily); });
  if (store.pageStyle.fontFamily) families.add(store.pageStyle.fontFamily);
  families.forEach(ff => {
    const preset = FONT_PRESETS.find(f => f.value === ff);
    if (preset?.importUrl && !loadedFonts.has(preset.importUrl)) {
      loadedFonts.add(preset.importUrl);
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = preset.importUrl;
      document.head.appendChild(link);
    }
  });
}
watch(() => store.pageComponents, loadFonts, { deep: true, immediate: true });
watch(() => store.pageStyle.fontFamily, loadFonts);

const wrapperRef = ref<HTMLDivElement | null>(null);
const scrollRef = ref<HTMLDivElement | null>(null);
const artboardRef = ref<HTMLDivElement | null>(null);
const zoomRef = ref<HTMLDivElement | null>(null);

// ── Zoom ──
const zoom = ref(1);
const MIN_ZOOM = 0.1, MAX_ZOOM = 5;

const zoomWrapperStyle = computed(() => ({
  width: store.canvasConfig.width * zoom.value + 'px',
  height: store.canvasConfig.height * zoom.value + 'px',
}));

const artboardStyle = computed(() => ({
  width: store.canvasConfig.width + 'px',
  height: store.canvasConfig.height + 'px',
  background: store.pageStyle.background,
  transform: `scale(${zoom.value})`,
  transformOrigin: 'top left' as const,
}));

function zoomIn() { zoom.value = Math.min(MAX_ZOOM, +(zoom.value + 0.1).toFixed(2)); }
function zoomOut() { zoom.value = Math.max(MIN_ZOOM, +(zoom.value - 0.1).toFixed(2)); }
function resetZoom() { zoom.value = 1; }
function fitCanvas() {
  const c = wrapperRef.value;
  if (!c) return;
  const s = Math.min((c.clientWidth - 80) / store.canvasConfig.width, (c.clientHeight - 80) / store.canvasConfig.height, 1);
  zoom.value = +s.toFixed(2);
}
function onWheel(e: WheelEvent) {
  if (e.ctrlKey || e.metaKey) {
    zoom.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(zoom.value + (e.deltaY > 0 ? -0.05 : 0.05)).toFixed(2)));
  } else if (scrollRef.value) {
    scrollRef.value.scrollTop += e.deltaY;
    scrollRef.value.scrollLeft += e.deltaX;
  }
}

// ── Right-click pan ──
let panState: { startX: number; startY: number; scrollLeft: number; scrollTop: number } | null = null;

function onPanStart(e: MouseEvent) {
  if (!scrollRef.value) return;
  panState = {
    startX: e.clientX, startY: e.clientY,
    scrollLeft: scrollRef.value.scrollLeft, scrollTop: scrollRef.value.scrollTop,
  };
  window.addEventListener('mousemove', onPanMove);
  window.addEventListener('mouseup', onPanEnd);
}
function onPanMove(e: MouseEvent) {
  if (!panState || !scrollRef.value) return;
  scrollRef.value.scrollLeft = panState.scrollLeft - (e.clientX - panState.startX);
  scrollRef.value.scrollTop = panState.scrollTop - (e.clientY - panState.startY);
}
function onPanEnd() {
  panState = null;
  window.removeEventListener('mousemove', onPanMove);
  window.removeEventListener('mouseup', onPanEnd);
}

// ── Grid ──
const gridStyle = computed(() => {
  const g = 20;
  return {
    backgroundImage: `radial-gradient(circle, #ddd 1px, transparent 1px)`,
    backgroundSize: `${g}px ${g}px`,
  };
});

// ── Context menu ──
const ctxMenu = ref({ visible: false, x: 0, y: 0, compId: '' as string });

function onCompContextMenu(e: MouseEvent, comp: ComponentInstance) {
  if (!isSelected(comp.id)) {
    selectedIds.value = [];
    store.selectComponent(comp.id);
  }
  ctxMenu.value = { visible: true, x: e.clientX, y: e.clientY, compId: comp.id };
}
function closeCtx() { ctxMenu.value.visible = false; }

function ctxDelete() {
  const ids = getSelectedIds();
  if (ids.length > 1 && ids.includes(ctxMenu.value.compId)) {
    for (const id of ids) store.removeComponent(id);
  } else {
    store.removeComponent(ctxMenu.value.compId);
  }
  clearSelection();
  closeCtx();
}
function ctxDuplicate() {
  const comp = store.pageComponents.find(c => c.id === ctxMenu.value.compId);
  if (!comp) { closeCtx(); return; }
  const newComp: ComponentInstance = {
    ...comp, id: store.genId(),
    position: { x: comp.position.x + 20, y: comp.position.y + 20 },
    props: { ...comp.props }, animation: comp.animation ? { ...comp.animation } : undefined,
  };
  store.addComponent(newComp);
  closeCtx();
}
function ctxBringFront() {
  const idx = store.components.findIndex(c => c.id === ctxMenu.value.compId);
  if (idx >= 0) {
    const [comp] = store.components.splice(idx, 1);
    store.components.push(comp);
    store.snapshot();
  }
  closeCtx();
}
function ctxSendBack() {
  const idx = store.components.findIndex(c => c.id === ctxMenu.value.compId);
  if (idx >= 0) {
    const [comp] = store.components.splice(idx, 1);
    store.components.unshift(comp);
    store.snapshot();
  }
  closeCtx();
}

// ── Selection state ──
const selectedIds = ref<string[]>([]);

function isSelected(id: string) {
  return store.selectedComponentId === id || selectedIds.value.includes(id);
}
function getSelectedIds(): string[] {
  if (selectedIds.value.length > 0) return [...selectedIds.value];
  if (store.selectedComponentId) return [store.selectedComponentId];
  return [];
}
function clearSelection() {
  selectedIds.value = [];
  store.selectComponent(null);
}

// ── Smart guides ──
interface GuideLine { dir: 'v' | 'h'; pos: number; }
const guides = ref<GuideLine[]>([]);
const SNAP_THRESHOLD = 5;

function computeGuides(compId: string, nx: number, ny: number, nw: number, nh: number): { x: number; y: number; guides: GuideLine[] } {
  const others = store.pageComponents.filter(c => c.id !== compId);
  const result: GuideLine[] = [];
  const dLeft = nx, dRight = nx + nw, dCX = nx + nw / 2;
  const dTop = ny, dBottom = ny + nh, dCY = ny + nh / 2;
  let sx = nx, sy = ny;

  for (const o of others) {
    const oLeft = o.position.x, oRight = o.position.x + o.size.width, oCX = o.position.x + o.size.width / 2;
    const oTop = o.position.y, oBottom = o.position.y + o.size.height, oCY = o.position.y + o.size.height / 2;

    const hChecks = [
      { dEdge: dLeft, oEdge: oLeft, prop: 'left' as const },
      { dEdge: dLeft, oEdge: oRight, prop: 'left' as const },
      { dEdge: dRight, oEdge: oLeft, prop: 'right' as const },
      { dEdge: dRight, oEdge: oRight, prop: 'right' as const },
      { dEdge: dCX, oEdge: oCX, prop: 'center' as const },
    ];
    for (const h of hChecks) {
      if (Math.abs(h.dEdge - h.oEdge) < SNAP_THRESHOLD) {
        if (h.prop === 'left') sx = h.oEdge;
        else if (h.prop === 'right') sx = h.oEdge - nw;
        else sx = h.oEdge - nw / 2;
        result.push({ dir: 'v', pos: h.oEdge });
      }
    }

    const vChecks = [
      { dEdge: dTop, oEdge: oTop, prop: 'top' as const },
      { dEdge: dTop, oEdge: oBottom, prop: 'top' as const },
      { dEdge: dBottom, oEdge: oTop, prop: 'bottom' as const },
      { dEdge: dBottom, oEdge: oBottom, prop: 'bottom' as const },
      { dEdge: dCY, oEdge: oCY, prop: 'center' as const },
    ];
    for (const v of vChecks) {
      if (Math.abs(v.dEdge - v.oEdge) < SNAP_THRESHOLD) {
        if (v.prop === 'top') sy = v.oEdge;
        else if (v.prop === 'bottom') sy = v.oEdge - nh;
        else sy = v.oEdge - nh / 2;
        result.push({ dir: 'h', pos: v.oEdge });
      }
    }
  }

  const cw = store.canvasConfig.width, ch = store.canvasConfig.height;
  if (Math.abs(dCX - cw / 2) < SNAP_THRESHOLD) { sx = cw / 2 - nw / 2; result.push({ dir: 'v', pos: cw / 2 }); }
  if (Math.abs(dCY - ch / 2) < SNAP_THRESHOLD) { sy = ch / 2 - nh / 2; result.push({ dir: 'h', pos: ch / 2 }); }

  return { x: sx, y: sy, guides: result };
}

// ── Pointer helpers ──
function getArtboardPos(e: MouseEvent) {
  const r = zoomRef.value!.getBoundingClientRect();
  return { x: (e.clientX - r.left) / zoom.value, y: (e.clientY - r.top) / zoom.value };
}
function snap(v: number) { return Math.round(v / 10) * 10; }

// ── Overlay component rendering ──
function getElementStyle(comp: ComponentInstance) {
  return {
    position: 'absolute' as const,
    left: comp.position.x + 'px',
    top: comp.position.y + 'px',
    width: comp.size.width + 'px',
    height: comp.size.height + 'px',
  };
}

function componentHTML(comp: ComponentInstance): string {
  const p = comp.props;
  const w = comp.size.width, h = comp.size.height;
  switch (comp.type) {
    case 'Text':
      if (p.richText && p.htmlContent) {
        return `<div style="width:100%;height:100%;display:flex;align-items:${p.alignItems || 'center'};justify-content:${p.textAlign === 'center' ? 'center' : p.textAlign === 'right' ? 'flex-end' : 'flex-start'};overflow-y:auto;"><div style="width:100%;font-size:${p.fontSize}px;color:${p.color};font-weight:${p.fontWeight};font-family:${p.fontFamily || 'sans-serif'};line-height:1.5;word-break:break-word;text-align:${p.textAlign || 'left'};">${sanitizeHtml(p.htmlContent)}</div></div>`;
      }
      return `<div style="width:100%;height:100%;display:flex;align-items:${p.alignItems || 'center'};justify-content:${p.textAlign === 'center' ? 'center' : p.textAlign === 'right' ? 'flex-end' : 'flex-start'};"><div style="font-size:${p.fontSize}px;color:${p.color};font-weight:${p.fontWeight};font-family:${p.fontFamily || 'sans-serif'};line-height:1.5;word-break:break-word;text-align:${p.textAlign || 'left'};">${escHtml(p.text)}</div></div>`;
    case 'Image':
      return `<img src="${escHtml(p.src)}" alt="${escHtml(p.alt)}" style="width:100%;height:100%;object-fit:${p.objectFit || 'cover'};border-radius:${p.borderRadius || 4}px;display:block;" />`;
    case 'Rectangle':
      return `<div style="width:100%;height:100%;background:${p.fill};border:${p.strokeWidth}px solid ${p.stroke};border-radius:${p.cornerRadius}px;"></div>`;
    case 'Container': {
      const blur = p.blur ? `backdrop-filter:blur(${p.blur}px);-webkit-backdrop-filter:blur(${p.blur}px);` : '';
      return `<div style="width:100%;height:100%;background:${p.background};border:${p.borderWidth}px solid ${p.borderColor};border-radius:${p.cornerRadius}px;padding:${p.padding}px;overflow:${p.overflow || 'hidden'};${blur}"></div>`;
    }
    case 'Badge':
      return `<span style="display:flex;align-items:${p.alignItems || 'center'};justify-content:${p.textAlign === 'center' ? 'center' : p.textAlign === 'right' ? 'flex-end' : 'flex-start'};box-sizing:border-box;width:100%;height:100%;padding:${p.paddingY || 5}px ${p.paddingX || 16}px;border-radius:${p.borderRadius}px;font-size:${p.fontSize}px;font-weight:600;color:${p.color};background:${p.background};border:1px solid ${p.borderColor};">${escHtml(p.text)}</span>`;
    case 'GradientText':
      return `<div style="width:100%;height:100%;display:flex;align-items:${p.alignItems || 'center'};justify-content:${p.textAlign === 'center' ? 'center' : p.textAlign === 'right' ? 'flex-end' : 'flex-start'};"><h2 style="margin:0;font-size:${p.fontSize}px;font-weight:${p.fontWeight};font-family:${p.fontFamily || 'sans-serif'};letter-spacing:${p.letterSpacing || -1}px;background:linear-gradient(${p.gradientAngle || 135}deg,${p.gradientStart},${p.gradientMid},${p.gradientEnd});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;text-align:${p.textAlign || 'left'};">${escHtml(p.text)}</h2></div>`;
    case 'IconBox': {
      const svg = (p.iconSvg || '').replace(/<svg[^>]*>|<\/svg>/g, '');
      return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${p.background};border-radius:${p.cornerRadius}px;color:${p.iconColor};"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:${p.iconSize}px;height:${p.iconSize}px;">${svg}</svg></div>`;
    }
    case 'AmbientOrb':
      return `<div style="width:100%;height:100%;border-radius:50%;filter:blur(${p.blur}px);background:${hexToRgba(p.color, p.opacity)};will-change:filter;"></div>`;
    case 'MqttDisplay': {
      const align = p.textAlign === 'center' ? 'center' : p.textAlign === 'right' ? 'flex-end' : 'flex-start';
      const justify = p.alignItems || 'center';
      const dp = `data-mqtt-topic="${p.topic}" data-value-key="${p.valueKey || ''}" data-unit="${p.unit || ''}" data-decimal="${p.decimalPlaces ?? -1}"`;
      const dot = `<div style="position:absolute;top:6px;right:6px;width:8px;height:8px;border-radius:50%;background:#ef4444;box-shadow:0 0 4px rgba(239,68,68,0.6);" class="mqtt-status-dot"></div>`;
      const label = `<span style="font-size:12px;color:#888;text-align:${p.textAlign || 'center'};">${p.label}</span>`;
      const value = `<span class="mqtt-value" style="font-size:${p.fontSize}px;color:${p.color};font-weight:bold;text-align:${p.textAlign || 'center'};">--</span>`;
      const preset = p.stylePreset || 'card';
      if (preset === 'minimal') return `<div style="position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:${align};justify-content:${justify};padding:8px;" ${dp}>${dot}${label}${value}</div>`;
      if (preset === 'dark') return `<div style="position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:${align};justify-content:${justify};background:#1e293b;border:1px solid #334155;border-radius:8px;padding:8px;" ${dp}>${dot}<span style="font-size:12px;color:#94a3b8;text-align:${p.textAlign || 'center'};">${p.label}</span><span class="mqtt-value" style="font-size:${p.fontSize}px;color:#f1f5f9;font-weight:bold;text-align:${p.textAlign || 'center'};">--</span></div>`;
      if (preset === 'gradient') return `<div style="position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:${align};justify-content:${justify};background:linear-gradient(135deg,#6366f1,#8b5cf6);border-radius:12px;padding:10px;" ${dp}>${dot}<span style="font-size:12px;color:rgba(255,255,255,0.7);text-align:${p.textAlign || 'center'};">${p.label}</span><span class="mqtt-value" style="font-size:${p.fontSize}px;color:#fff;font-weight:bold;text-align:${p.textAlign || 'center'};">--</span></div>`;
      if (preset === 'dashboard') return `<div style="position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0f172a;border:2px solid #334155;border-radius:12px;padding:8px;" ${dp}>${dot}<span style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;">${p.label}</span><span class="mqtt-value" style="font-size:${Math.max(p.fontSize, 28)}px;color:${p.color};font-weight:bold;font-family:monospace;">--</span><span style="font-size:11px;color:#64748b;">${p.unit || ''}</span></div>`;
      if (preset === 'valueOnly') return `<div style="position:relative;width:100%;height:100%;display:flex;align-items:center;justify-content:center;" ${dp}><span class="mqtt-value" style="font-size:${p.fontSize}px;color:${p.color};font-weight:bold;">--</span></div>`;
      return `<div style="position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:${align};justify-content:${justify};background:#f8f9fa;border:1px solid #dee2e6;border-radius:8px;padding:8px;" ${dp}>${dot}${label}${value}</div>`;
    }
    case 'ChartLine':
      return `<div class="chart-canvas-container" data-chart-id="${comp.id}" data-chart-config='${JSON.stringify({ data: p.data, color: p.color, title: p.title, yAxisName: p.yAxisName, lineWidth: p.lineWidth, stylePreset: p.stylePreset || 'line' })}' style="width:100%;height:100%;${(p.stylePreset || 'line') === 'dark' ? 'background:#0f172a;border:1px solid #334155;' : 'background:#fff;border:1px solid #eee;'}border-radius:4px;"></div>`;
    case 'Arrow': {
      const dir = p.direction || 'right';
      const c = p.color || '#6366F1';
      const sw = p.strokeWidth || 3;
      let path = '';
      if (dir === 'right') path = `<line x1="4" y1="20" x2="36" y2="20"/><polyline points="28,12 36,20 28,28"/>`;
      else if (dir === 'left') path = `<line x1="36" y1="20" x2="4" y2="20"/><polyline points="12,12 4,20 12,28"/>`;
      else if (dir === 'down') path = `<line x1="20" y1="4" x2="20" y2="36"/><polyline points="12,28 20,36 28,28"/>`;
      else if (dir === 'up') path = `<line x1="20" y1="36" x2="20" y2="4"/><polyline points="12,12 20,4 12,12"/>`;
      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" style="width:100%;height:100%;" fill="none" stroke="${c}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
    }
    case 'Divider': {
      const c = p.color || '#d1d5db';
      const t = p.thickness || 1;
      const s = p.style || 'solid';
      return `<div style="width:100%;height:100%;display:flex;align-items:center;"><div style="width:100%;border-top:${t}px ${s} ${c};"></div></div>`;
    }
    case 'Step': {
      const c = p.color || '#6366F1';
      const tc = p.textColor || '#333';
      return `<div style="display:flex;gap:12px;align-items:${p.alignItems || 'flex-start'};height:100%;"><div style="width:32px;height:32px;min-width:32px;border-radius:50%;background:${c};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:${p.fontSize}px;">${escHtml(p.number)}</div><div style="display:flex;flex-direction:column;gap:2px;"><div style="font-weight:600;font-size:${p.fontSize}px;color:${tc};">${escHtml(p.text)}</div><div style="font-size:12px;color:#888;">${escHtml(p.description)}</div></div></div>`;
    }
    case 'List': {
      let items: string[];
      try { items = JSON.parse(p.items); } catch { items = ['要点一', '要点二', '要点三']; }
      const bulletMap: Record<string, (i: number) => string> = {
        disc: () => '•', circle: () => '○', check: () => '✔', arrow: () => '→', number: (i) => `${i + 1}.`,
      };
      const getBullet = bulletMap[p.bulletStyle || 'disc'] || bulletMap['disc'];
      const ls = items.map((item: string, i: number) =>
        `<div style="display:flex;gap:8px;align-items:baseline;"><span style="color:${p.color};font-weight:bold;min-width:16px;text-align:center;">${getBullet(i)}</span><span style="font-size:${p.fontSize}px;color:${p.color};font-family:${p.fontFamily || 'sans-serif'};">${escHtml(item)}</span></div>`
      ).join('');
      return `<div style="display:flex;flex-direction:column;gap:${p.lineSpacing || 8}px;height:100%;justify-content:center;">${ls}</div>`;
    }
    case 'Video': {
      const src = p.src || '';
      if (!src) return `<div style="width:100%;height:100%;background:#1e293b;border-radius:${p.borderRadius || 8}px;display:flex;align-items:center;justify-content:center;color:#64748b;font-size:14px;">视频</div>`;
      const extraAttrs = (p.startTime ? ` data-start-time="${p.startTime}"` : '') + (p.endTime ? ` data-end-time="${p.endTime}"` : '');
      return `<video src="${escHtml(src)}" style="width:100%;height:100%;object-fit:${p.objectFit || 'cover'};border-radius:${p.borderRadius || 8}px;display:block;" ${p.autoplay ? 'autoplay' : ''} ${p.loop ? 'loop' : ''} ${p.muted ? 'muted' : ''} ${p.controls ? 'controls' : ''}${extraAttrs}></video>`;
    }
    case 'Audio': {
      const src = p.src || '';
      if (!src) return `<div style="width:100%;height:100%;background:#f5f5f5;border-radius:4px;display:flex;align-items:center;justify-content:center;color:#999;font-size:13px;">音频</div>`;
      return `<audio src="${escHtml(src)}" style="width:100%;height:100%;display:block;" ${p.autoplay ? 'autoplay' : ''} ${p.loop ? 'loop' : ''} ${p.muted ? 'muted' : ''} ${p.controls ? 'controls' : ''} volume="${p.volume || 1}"></audio>`;
    }
    case 'Circle': {
      const fill = p.fill || '#ecf0f1';
      const stroke = p.stroke || '#bdc3c7';
      const sw = p.strokeWidth || 1;
      return `<div style="width:100%;height:100%;border-radius:50%;background:${fill};border:${sw}px solid ${stroke};box-sizing:border-box;"></div>`;
    }
    case 'Table': {
      let headers: string[], data: string[][];
      try { headers = JSON.parse(p.headers); } catch { headers = ['列1', '列2', '列3']; }
      try { data = JSON.parse(p.data); } catch { data = []; }
      const fs = p.fontSize || 13;
      const headerRow = `<tr>${headers.map((h: string) => `<th style="padding:6px 10px;text-align:left;font-size:${fs}px;color:${p.headerColor || '#1e293b'};background:${p.headerBg || '#f1f5f9'};border-bottom:1px solid ${p.borderColor || '#e2e8f0'};font-weight:600;">${h}</th>`).join('')}</tr>`;
      const dataRows = data.map((row: string[]) =>
        `<tr>${row.map((cell: string) => `<td style="padding:6px 10px;font-size:${fs}px;color:${p.textColor || '#333'};border-bottom:1px solid ${p.borderColor || '#e2e8f0'};">${cell}</td>`).join('')}</tr>`
      ).join('');
      return `<div style="width:100%;height:100%;overflow:auto;border:1px solid ${p.borderColor || '#e2e8f0'};border-radius:6px;box-sizing:border-box;"><table style="width:100%;border-collapse:collapse;">${headerRow}${dataRows}</table></div>`;
    }
    case 'Effect': {
      const tpl = getEffectTemplate(p.effectId || 'glass-card');
      if (!tpl) return '<div style="width:100%;height:100%;background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#999;">未知特效</div>';
      const merged = { ...tpl.defaultParams, ...p.params };
      return tpl.generateHTML(merged);
    }
    case 'QRCode':
      return `<div class="qr-placeholder" data-qr-text="${(p.text || 'https://example.com').replace(/"/g, '&quot;')}" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${p.lightColor || '#fff'};border-radius:4px;overflow:hidden;"><canvas class="qr-canvas" style="width:100%;height:100%;"></canvas></div>`;
    case 'PieChart':
      return `<div class="chart-canvas-container" data-chart-id="${comp.id}" data-chart-config='${JSON.stringify({ type: 'pie', data: p.data, color: p.color, title: p.title, donut: p.donut, showLabel: p.showLabel, stylePreset: p.stylePreset || 'default' })}' style="width:100%;height:100%;border-radius:4px;"></div>`;
    case 'BarChart':
      return `<div class="chart-canvas-container" data-chart-id="${comp.id}" data-chart-config='${JSON.stringify({ type: 'bar', data: p.data, color: p.color, title: p.title, yAxisName: p.yAxisName, barMaxWidth: p.barMaxWidth || 40, showValue: p.showValue, stylePreset: p.stylePreset || 'default' })}' style="width:100%;height:100%;border-radius:4px;"></div>`;
    case 'RadarChart':
      return `<div class="chart-canvas-container" data-chart-id="${comp.id}" data-chart-config='${JSON.stringify({ type: 'radar', data: p.data, indicators: p.indicators, color: p.color, title: p.title, fillOpacity: p.fillOpacity ?? 0.15, showLabel: p.showLabel })}' style="width:100%;height:100%;border-radius:4px;"></div>`;
    case 'Countdown':
      return `<div class="countdown-display" data-target="${p.targetDate || ''}" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:${p.alignItems || 'center'};justify-content:center;"><span style="font-size:12px;color:#888;">${escHtml(p.label || '倒计时')}</span><span class="countdown-value" style="font-size:${p.fontSize || 24}px;color:${p.color || '#6366F1'};font-weight:bold;">--:--:--</span></div>`;
    case 'Tag':
      return `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 10px;font-size:${p.fontSize || 12}px;color:${p.color || '#6366F1'};background:${p.bgColor || 'rgba(99,102,241,0.12)'};border-radius:${p.borderRadius || 4}px;font-weight:500;white-space:nowrap;">${escHtml(p.text || '标签')}${p.removable ? '<span style="cursor:pointer;opacity:0.6;margin-left:2px;">×</span>' : ''}</span>`;
    case 'Avatar': {
      const sz = p.size || 48;
      if (p.src) return `<img src="${escHtml(p.src)}" alt="avatar" style="width:${sz}px;height:${sz}px;border-radius:${p.shape === 'circle' ? '50%' : p.shape === 'round' ? '8px' : '0'};object-fit:cover;" />`;
      return `<div style="width:${sz}px;height:${sz}px;border-radius:${p.shape === 'circle' ? '50%' : p.shape === 'round' ? '8px' : '0'};background:${p.bgColor || '#6366F1'};color:${p.color || '#fff'};display:flex;align-items:center;justify-content:center;font-size:${p.fontSize || 20}px;font-weight:600;">${escHtml(p.text || 'U')}</div>`;
    }
    case 'Timeline': {
      let items: any[];
      try { items = JSON.parse(p.items); } catch { items = []; }
      const ls = items.map((item: any) => `
        <div style="display:flex;gap:12px;position:relative;padding-bottom:16px;">
          <div style="display:flex;flex-direction:column;align-items:center;">
            <div style="width:${p.dotSize || 10}px;height:${p.dotSize || 10}px;border-radius:50%;background:${item.color || '#6366F1'};flex-shrink:0;margin-top:4px;"></div>
            <div style="flex:1;width:2px;background:${p.lineColor || '#e2e8f0'};min-height:20px;"></div>
          </div>
          <div style="flex:1;">
            <div style="font-weight:600;font-size:${p.fontSize || 13}px;">${item.title || ''}</div>
            ${item.desc ? `<div style="font-size:12px;color:#888;margin-top:2px;">${item.desc}</div>` : ''}
            ${item.time ? `<div style="font-size:11px;color:#aaa;margin-top:2px;">${item.time}</div>` : ''}
          </div>
        </div>`).join('');
      return `<div style="padding:8px;height:100%;overflow-y:auto;">${ls}</div>`;
    }
    default:
      return '';
  }
}

// ── Resize handles ──
const handles = [
  { dir: 'nw', style: { left: '-4px', top: '-4px', cursor: 'nwse-resize' } },
  { dir: 'n', style: { left: 'calc(50% - 4px)', top: '-4px', cursor: 'ns-resize' } },
  { dir: 'ne', style: { right: '-4px', top: '-4px', cursor: 'nesw-resize' } },
  { dir: 'e', style: { right: '-4px', top: 'calc(50% - 4px)', cursor: 'ew-resize' } },
  { dir: 'se', style: { right: '-4px', bottom: '-4px', cursor: 'nwse-resize' } },
  { dir: 's', style: { left: 'calc(50% - 4px)', bottom: '-4px', cursor: 'ns-resize' } },
  { dir: 'sw', style: { left: '-4px', bottom: '-4px', cursor: 'nesw-resize' } },
  { dir: 'w', style: { left: '-4px', top: 'calc(50% - 4px)', cursor: 'ew-resize' } },
];

// ── Drag state ──
const draggingId = ref<string | null>(null);
let dragState: { type: 'move' | 'resize'; compId: string; startX: number; startY: number; origX: number; origY: number; origW: number; origH: number; handleDir?: string; allDeltas?: { id: string; dx: number; dy: number }[] } | null = null;

function onCompMouseDown(e: MouseEvent, comp: ComponentInstance) {
  const target = e.target as HTMLElement;
  if (target.tagName === 'VIDEO' || target.closest('video')) return;
  e.preventDefault();
  if (e.shiftKey || e.ctrlKey) {
    if (selectedIds.value.includes(comp.id)) {
      selectedIds.value = selectedIds.value.filter(i => i !== comp.id);
    } else {
      selectedIds.value = [...selectedIds.value, comp.id];
    }
  } else if (!isSelected(comp.id)) {
    selectedIds.value = [];
  }
  store.selectComponent(comp.id);

  const pos = getArtboardPos(e);
  const activeIds = getSelectedIds();
  const deltas = activeIds.length > 1 && activeIds.includes(comp.id)
    ? activeIds.filter(id => id !== comp.id).map(id => {
        const c = store.pageComponents.find(x => x.id === id);
        return c ? { id, dx: c.position.x - comp.position.x, dy: c.position.y - comp.position.y } : { id, dx: 0, dy: 0 };
      })
    : [];

  store.beginBatch();
  draggingId.value = comp.id;
  dragState = {
    type: 'move', compId: comp.id,
    startX: pos.x, startY: pos.y,
    origX: comp.position.x, origY: comp.position.y,
    origW: comp.size.width, origH: comp.size.height,
    allDeltas: deltas,
  };
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

function onHandleMouseDown(e: MouseEvent, comp: ComponentInstance, dir: string) {
  e.preventDefault();
  e.stopPropagation();
  const pos = getArtboardPos(e);
  store.beginBatch();
  draggingId.value = comp.id;
  dragState = {
    type: 'resize', compId: comp.id, handleDir: dir,
    startX: pos.x, startY: pos.y,
    origX: comp.position.x, origY: comp.position.y,
    origW: comp.size.width, origH: comp.size.height,
  };
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
}

function onMouseMove(e: MouseEvent) {
  if (!dragState) return;
  const pos = getArtboardPos(e);
  const dx = pos.x - dragState.startX;
  const dy = pos.y - dragState.startY;

  if (dragState.type === 'move') {
    let nx = dragState.origX + dx;
    let ny = dragState.origY + dy;
    const comp = store.pageComponents.find(c => c.id === dragState!.compId);
    if (comp) {
      const aligned = computeGuides(comp.id, nx, ny, comp.size.width, comp.size.height);
      nx = aligned.x; ny = aligned.y;
      guides.value = aligned.guides;
    }
    nx = snap(nx); ny = snap(ny);
    store.updateComponent(dragState.compId, { position: { x: nx, y: ny } });
    for (const d of dragState.allDeltas || []) {
      store.updateComponent(d.id, { position: { x: snap(nx + d.dx), y: snap(ny + d.dy) } });
    }
  } else if (dragState.type === 'resize') {
    const dir = dragState.handleDir!;
    let nx = dragState.origX, ny = dragState.origY, nw = dragState.origW, nh = dragState.origH;
    if (dir.includes('e')) nw = Math.max(20, dragState.origW + dx);
    if (dir.includes('w')) { nw = Math.max(20, dragState.origW - dx); nx = dragState.origX + dx; }
    if (dir.includes('s')) nh = Math.max(20, dragState.origH + dy);
    if (dir.includes('n')) { nh = Math.max(20, dragState.origH - dy); ny = dragState.origY + dy; }
    const aligned = computeGuides(dragState.compId, nx, ny, nw, nh);
    nx = aligned.x; ny = aligned.y;
    guides.value = aligned.guides;
    store.updateComponent(dragState.compId, {
      position: { x: snap(nx), y: snap(ny) },
      size: { width: snap(nw), height: snap(nh) },
    });
  }
}

function onMouseUp() {
  const wasDragging = dragState !== null;
  dragState = null;
  draggingId.value = null;
  guides.value = [];
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('mouseup', onMouseUp);
  if (wasDragging) {
    store.endBatch();
    scheduleSrcDocUpdate(); // Sync iframe after drag ends
  }
}

// ── Artboard mouse down → select / box-select ──
let artboardTimer: any = null;
let artboardDownPos = { x: 0, y: 0 };

function onArtboardMouseDown(e: MouseEvent) {
  // Ignore clicks on components (those use @mousedown.stop)
  if ((e.target as HTMLElement).closest?.('.canvas-element')) return;

  const pos = getArtboardPos(e);
  artboardDownPos = pos;
  artboardTimer = setTimeout(() => {
    selRect.value = { active: true, startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y };
    window.addEventListener('mousemove', onSelRectMove);
    window.addEventListener('mouseup', onSelRectUp);
    artboardTimer = null;
  }, 150);
  window.addEventListener('mousemove', onArtboardMove);
  window.addEventListener('mouseup', onArtboardUp);
}

function onArtboardMove(e: MouseEvent) {
  if (!artboardTimer) return;
  const pos = getArtboardPos(e);
  const dx = Math.abs(pos.x - artboardDownPos.x);
  const dy = Math.abs(pos.y - artboardDownPos.y);
  if (dx > 5 || dy > 5) {
    clearTimeout(artboardTimer);
    artboardTimer = null;
    // Activate box selection immediately on drag
    selRect.value = { active: true, startX: artboardDownPos.x, startY: artboardDownPos.y, endX: pos.x, endY: pos.y };
    window.removeEventListener('mousemove', onArtboardMove);
    window.removeEventListener('mouseup', onArtboardUp);
    window.addEventListener('mousemove', onSelRectMove);
    window.addEventListener('mouseup', onSelRectUp);
  }
}

function onArtboardUp() {
  const hadTimer = artboardTimer !== null;
  if (artboardTimer) { clearTimeout(artboardTimer); artboardTimer = null; }
  window.removeEventListener('mousemove', onArtboardMove);
  window.removeEventListener('mouseup', onArtboardUp);
  if (hadTimer) clearSelection();
}

function onSelRectMove(e: MouseEvent) {
  if (!selRect.value.active) return;
  const pos = getArtboardPos(e);
  selRect.value.endX = pos.x;
  selRect.value.endY = pos.y;
}

function onSelRectUp() {
  const r = selRect.value;
  r.active = false;
  const x1 = Math.min(r.startX, r.endX), y1 = Math.min(r.startY, r.endY);
  const x2 = Math.max(r.startX, r.endX), y2 = Math.max(r.startY, r.endY);
  window.removeEventListener('mousemove', onSelRectMove);
  window.removeEventListener('mouseup', onSelRectUp);
  if (x2 - x1 < 5 && y2 - y1 < 5) return;
  const hits = store.pageComponents.filter(c =>
    c.position.x < x2 && c.position.x + c.size.width > x1 &&
    c.position.y < y2 && c.position.y + c.size.height > y1
  ).map(c => c.id);
  selectedIds.value = hits;
  if (hits.length > 0) store.selectComponent(hits[hits.length - 1]);
}

const selRect = ref({ active: false, startX: 0, startY: 0, endX: 0, endY: 0 });
const selRectStyle = computed(() => {
  const r = selRect.value;
  return {
    left: Math.min(r.startX, r.endX) + 'px',
    top: Math.min(r.startY, r.endY) + 'px',
    width: Math.abs(r.endX - r.startX) + 'px',
    height: Math.abs(r.endY - r.startY) + 'px',
  };
});

// ── Drop from ComponentBar ──
function onDrop(e: DragEvent) {
  const type = e.dataTransfer?.getData('component-type') || store.dragComponentType;
  if (!type) return;
  store.dragComponentType = null;
  const def = COMPONENT_DEFS.find(d => d.type === type);
  if (!def) return;
  const pos = getArtboardPos(e as unknown as MouseEvent);
  const comp: ComponentInstance = {
    id: store.genId(), pageId: store.currentPageId, type: def.type,
    position: { x: snap(pos.x - def.defaultSize.width / 2), y: snap(pos.y - def.defaultSize.height / 2) },
    size: { ...def.defaultSize },
    props: { ...def.defaultProps },
  };
  store.addComponent(comp);
}

// ── Lifecycle ──
onMounted(() => {
  nextTick(() => {
    srcDoc.value = previewHTML.value;
    fitCanvas();
  });

  const el = wrapperRef.value;
  if (el) {
    el.addEventListener('noah-drop', ((e: CustomEvent) => {
      const { clientX, clientY, type } = e.detail;
      const def = COMPONENT_DEFS.find(d => d.type === type);
      if (!def) return;
      const rect = zoomRef.value!.getBoundingClientRect();
      const x = (clientX - rect.left) / zoom.value;
      const y = (clientY - rect.top) / zoom.value;
      const comp: ComponentInstance = {
        id: store.genId(), pageId: store.currentPageId, type: def.type,
        position: { x: snap(x - def.defaultSize.width / 2), y: snap(y - def.defaultSize.height / 2) },
        size: { ...def.defaultSize },
        props: { ...def.defaultProps },
      };
      store.addComponent(comp);
    }) as EventListener);
  }
});

onUnmounted(() => {
  clearTimeout(updateTimer);
});
</script>

<style scoped>
.canvas-wrapper {
  flex: 1; overflow: hidden; background: #e0e0e0;
  position: relative;
}
.canvas-scroll {
  width: 100%; height: 100%; overflow: auto;
  display: flex; align-items: center; justify-content: center;
}
.zoom-wrapper {
  flex-shrink: 0; position: relative; overflow: hidden;
}
.canvas-artboard {
  box-shadow: 0 2px 20px rgba(0,0,0,0.15);
  position: relative; flex-shrink: 0;
  transform-origin: 0 0;
}
.preview-iframe {
  position: absolute; top: 0; left: 0;
  width: 100%; height: 100%;
  border: none; display: block;
  transition: opacity 0.15s;
}
.preview-iframe.dragging { opacity: 0; }
.canvas-overlay {
  position: absolute; top: 0; left: 0;
  width: 100%; height: 100%;
  z-index: 1;
}
.grid-overlay {
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
}
.canvas-element {
  cursor: move; z-index: 1; user-select: none; position: absolute;
}
.canvas-element.selected { z-index: 2; }
.canvas-element.dragging { z-index: 3; }
.comp-inner { width: 100%; height: 100%; pointer-events: none; }
.selection-border {
  position: absolute; inset: -1px;
  border: 2px dashed #3498db; pointer-events: none; z-index: 10;
}
.resize-handle {
  position: absolute; width: 8px; height: 8px;
  background: #3498db; border: 1px solid #fff;
  border-radius: 1px; z-index: 11; pointer-events: all;
}
.selection-rect {
  position: absolute;
  background: rgba(52,152,219,0.1);
  border: 1px solid #3498db; pointer-events: none; z-index: 100;
}
.guide-line { position: absolute; pointer-events: none; z-index: 99; }
.guide-v { top: 0; width: 1px; height: 100%; background: #F43F5E; }
.guide-h { left: 0; height: 1px; width: 100%; background: #F43F5E; }
.zoom-bar {
  position: absolute; bottom: 12px; right: 12px;
  display: flex; align-items: center; gap: 4px;
  background: rgba(255,255,255,0.95); border-radius: 6px;
  padding: 4px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  user-select: none; z-index: 10;
}
.zoom-btn {
  width: 26px; height: 26px; border: 1px solid #ddd; border-radius: 4px;
  background: #fff; cursor: pointer; font-size: 16px; color: #555;
  display: flex; align-items: center; justify-content: center;
}
.zoom-btn:hover { background: #f0f0f0; border-color: #3498db; color: #3498db; }
.fit-btn { font-size: 18px; }
.zoom-label {
  min-width: 48px; text-align: center; font-size: 12px; color: #666;
  cursor: pointer; font-family: monospace;
}
.zoom-label:hover { color: #3498db; }
.start-btn {
  position: absolute; bottom: 52px; right: 12px;
  padding: 6px 16px; border: none; border-radius: 6px;
  background: #6366F1; color: white; font-size: 13px; font-weight: 500;
  cursor: pointer; box-shadow: 0 2px 8px rgba(99,102,241,0.35);
  z-index: 10; display: flex; align-items: center; gap: 4px;
  transition: background 0.2s;
}
.start-btn:hover { background: #4F46E5; }
.presenter-btn {
  position: absolute; bottom: 52px; right: 100px;
  padding: 6px 16px; border: none; border-radius: 6px;
  background: #0f172a; color: white; font-size: 13px; font-weight: 500;
  cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  z-index: 10; display: flex; align-items: center; gap: 4px;
  transition: background 0.2s;
}
.presenter-btn:hover { background: #1e293b; }
.ctx-overlay { position: fixed; inset: 0; z-index: 999; }
.context-menu {
  position: fixed; z-index: 1000;
  background: white; border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  padding: 4px 0; min-width: 140px;
}
.ctx-item {
  padding: 8px 16px; cursor: pointer; font-size: 13px; color: #333;
}
.ctx-item:hover { background: #f0f0f0; }
.ctx-divider { height: 1px; background: #eee; margin: 4px 0; }
@keyframes progress-stripes {
  0% { background-position: 1rem 0; }
  100% { background-position: 0 0; }
}
</style>
