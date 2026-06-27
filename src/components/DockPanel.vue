<template>
  <div v-if="panel.dock.edge !== 'float'" class="dock-panel docked">
    <div class="dock-titlebar" @mousedown="onDockedDragStart" @dblclick="onDblClick">
      <span class="dock-title">{{ panel.title }}</span>
      <button class="dock-close" @mousedown.stop @click.stop="layout.togglePanel(panelId)">&times;</button>
    </div>
    <div class="dock-content">
      <slot />
    </div>
  </div>

  <div v-else class="dock-panel floating" :style="floatStyle" @mousedown="onFloatClick">
    <div class="dock-titlebar" @mousedown="onFloatDragStart" @dblclick="onDblClick">
      <span class="dock-title">{{ panel.title }}</span>
      <button class="dock-close" @mousedown.stop @click.stop="layout.togglePanel(panelId)">&times;</button>
    </div>
    <div class="dock-content">
      <slot />
    </div>
    <div class="dock-resize-grip se" @mousedown.stop="onFloatResizeStart($event, 'se')"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { useDockLayout } from '../composables/useDockLayout';
import type { DockEdge } from '../types/dock';

const props = defineProps<{ panelId: string }>();
const layout = useDockLayout();
const panel = computed(() => layout.state.panels[props.panelId]);

const floatStyle = computed(() => {
  const f = panel.value.float;
  return {
    position: 'fixed' as const,
    left: f.x + 'px',
    top: f.y + 'px',
    width: f.width + 'px',
    height: f.height + 'px',
    zIndex: f.zIndex,
  };
});

// ── Dock zone overlay state ──
const showZones = ref(false);
const hoveredZone = ref<DockEdge | null>(null);

// ── Detect which dock zone mouse is over ──
function detectZone(mx: number, my: number): DockEdge | null {
  const el = document.querySelector('.dock-area');
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const THRESHOLD = 40;
  const x = mx - r.left, y = my - r.top;
  // Center = float
  if (x > THRESHOLD && x < r.width - THRESHOLD && y > THRESHOLD && y < r.height - THRESHOLD) {
    return 'float';
  }
  if (x < THRESHOLD) return 'left';
  if (x > r.width - THRESHOLD) return 'right';
  if (y > r.height - THRESHOLD) return 'bottom';
  return 'float';
}

// ── Dock zone overlay element ──
let overlay: HTMLDivElement | null = null;
function createOverlay() {
  overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:9999;border-radius:6px;transition:all 0.15s ease;';
  document.body.appendChild(overlay);
}
function updateOverlay(zone: DockEdge | null) {
  if (!overlay) return;
  if (!zone || zone === 'float') {
    overlay.style.display = 'none';
    return;
  }
  const el = document.querySelector('.dock-area');
  if (!el) return;
  const r = el.getBoundingClientRect();
  overlay.style.display = 'block';
  overlay.style.background = 'rgba(52,152,219,0.18)';
  overlay.style.border = '2px dashed #3498db';
  switch (zone) {
    case 'left':
      overlay.style.left = r.left + 'px'; overlay.style.top = r.top + 'px';
      overlay.style.width = '200px'; overlay.style.height = r.height + 'px';
      break;
    case 'right':
      overlay.style.left = (r.right - 200) + 'px'; overlay.style.top = r.top + 'px';
      overlay.style.width = '200px'; overlay.style.height = r.height + 'px';
      break;
    case 'bottom':
      overlay.style.left = r.left + 'px'; overlay.style.top = (r.bottom - 200) + 'px';
      overlay.style.width = r.width + 'px'; overlay.style.height = '200px';
      break;
  }
}
function removeOverlay() {
  if (overlay) { overlay.remove(); overlay = null; }
}

// ── Docked title bar drag → undock ──
let dockDragStart: { x: number; y: number; triggered: boolean } | null = null;

function onDockedDragStart(e: MouseEvent) {
  if (e.button !== 0) return;
  e.preventDefault();
  dockDragStart = { x: e.clientX, y: e.clientY, triggered: false };
  window.addEventListener('mousemove', onDockedDragMove);
  window.addEventListener('mouseup', onDockedDragEnd);
}

function onDockedDragMove(e: MouseEvent) {
  if (!dockDragStart) return;
  const dx = e.clientX - dockDragStart.x;
  const dy = e.clientY - dockDragStart.y;
  if (!dockDragStart.triggered && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
    dockDragStart.triggered = true;
    layout.undockPanel(props.panelId, e.clientX - 100, e.clientY - 12);
    showZones.value = true;
    createOverlay();
  }
  if (dockDragStart.triggered) {
    layout.moveFloatPanel(props.panelId, e.clientX - 100, e.clientY - 12);
    const zone = detectZone(e.clientX, e.clientY);
    hoveredZone.value = zone;
    updateOverlay(zone);
  }
}

function onDockedDragEnd(e: MouseEvent) {
  window.removeEventListener('mousemove', onDockedDragMove);
  window.removeEventListener('mouseup', onDockedDragEnd);
  if (dockDragStart?.triggered) {
    const zone = detectZone(e.clientX, e.clientY);
    if (zone && zone !== 'float') {
      layout.dockPanel(props.panelId, zone);
    }
    // else: stays floating
  }
  dockDragStart = null;
  showZones.value = false;
  hoveredZone.value = null;
  removeOverlay();
}

// ── Floating title bar drag → move ──
let floatDrag: { ox: number; oy: number } | null = null;

function onFloatClick(e: MouseEvent) {
  layout.bringToFront(props.panelId);
}

function onFloatDragStart(e: MouseEvent) {
  if (e.button !== 0) return;
  e.preventDefault();
  layout.bringToFront(props.panelId);
  const f = panel.value.float;
  floatDrag = { ox: e.clientX - f.x, oy: e.clientY - f.y };
  showZones.value = true;
  createOverlay();
  window.addEventListener('mousemove', onFloatDragMove);
  window.addEventListener('mouseup', onFloatDragEnd);
}

function onFloatDragMove(e: MouseEvent) {
  if (!floatDrag) return;
  layout.moveFloatPanel(props.panelId, e.clientX - floatDrag.ox, e.clientY - floatDrag.oy);
  const zone = detectZone(e.clientX, e.clientY);
  hoveredZone.value = zone;
  updateOverlay(zone);
}

function onFloatDragEnd(e: MouseEvent) {
  window.removeEventListener('mousemove', onFloatDragMove);
  window.removeEventListener('mouseup', onFloatDragEnd);
  if (floatDrag) {
    const zone = detectZone(e.clientX, e.clientY);
    if (zone && zone !== 'float') {
      layout.dockPanel(props.panelId, zone);
    }
  }
  floatDrag = null;
  showZones.value = false;
  hoveredZone.value = null;
  removeOverlay();
}

// ── Double-click → toggle float/dock ──
function onDblClick() {
  if (panel.value.dock.edge === 'float') {
    layout.restoreDock(props.panelId);
  } else {
    layout.undockPanel(props.panelId);
  }
}

// ── Float resize grip ──
let resizeDrag: { startX: number; startY: number; startW: number; startH: number } | null = null;

function onFloatResizeStart(e: MouseEvent, _corner: string) {
  if (e.button !== 0) return;
  e.preventDefault();
  e.stopPropagation();
  layout.bringToFront(props.panelId);
  const f = panel.value.float;
  resizeDrag = { startX: e.clientX, startY: e.clientY, startW: f.width, startH: f.height };
  window.addEventListener('mousemove', onFloatResizeMove);
  window.addEventListener('mouseup', onFloatResizeEnd);
}

function onFloatResizeMove(e: MouseEvent) {
  if (!resizeDrag) return;
  layout.resizeFloatPanel(props.panelId,
    resizeDrag.startW + (e.clientX - resizeDrag.startX),
    resizeDrag.startH + (e.clientY - resizeDrag.startY)
  );
}

function onFloatResizeEnd() {
  resizeDrag = null;
  window.removeEventListener('mousemove', onFloatResizeMove);
  window.removeEventListener('mouseup', onFloatResizeEnd);
}

onUnmounted(() => {
  removeOverlay();
});
</script>

<style scoped>
.dock-panel { display: flex; flex-direction: column; overflow: hidden; }
.dock-panel.docked { flex: 1; min-height: 0; }
.dock-panel.floating {
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1);
  border: 1px solid rgba(0,0,0,0.12);
}
.dock-titlebar {
  height: 28px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 8px 0 12px;
  background: #f0f0f0; border-bottom: 1px solid #e0e0e0;
  cursor: grab; user-select: none;
  font-size: 12px; font-weight: 600; color: #555;
}
.dock-titlebar:active { cursor: grabbing; }
.dock-panel.floating .dock-titlebar {
  background: #e8e8e8; border-radius: 8px 8px 0 0;
}
.dock-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dock-close {
  width: 20px; height: 20px; border: none; border-radius: 4px;
  background: transparent; cursor: pointer; font-size: 14px; color: #999;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.dock-close:hover { background: #fee; color: #e74c3c; }
.dock-content { flex: 1; overflow: hidden; min-height: 0; }
.dock-resize-grip {
  position: absolute; right: 0; bottom: 0; width: 14px; height: 14px;
  cursor: nwse-resize; z-index: 10;
}
.dock-resize-grip::after {
  content: ''; position: absolute; right: 3px; bottom: 3px;
  width: 8px; height: 8px;
  border-right: 2px solid #bbb; border-bottom: 2px solid #bbb;
}
</style>
