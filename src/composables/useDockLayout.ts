import { reactive, computed } from 'vue';
import type { DockLayoutState, PanelState, DockEdge } from '../types/dock';

const PANEL_DEFAULTS: Record<string, Omit<PanelState, 'visible' | 'float'>> = {
  'left-panel':     { id: 'left-panel',     title: '页面/图层', dock: { edge: 'left',  order: 0 }, size: 220, minSize: 150, maxSize: 500 },
  'property-panel': { id: 'property-panel', title: '属性',     dock: { edge: 'right', order: 0 }, size: 280, minSize: 200, maxSize: 500 },
  'code-editor':    { id: 'code-editor',    title: '代码',     dock: { edge: 'bottom', order: 0 }, size: 250, minSize: 100, maxSize: 600 },
  'ai-chat':        { id: 'ai-chat',        title: 'AI 助手', dock: { edge: 'left',  order: 1 }, size: 600, minSize: 300, maxSize: 1200 },
};

const state = reactive<DockLayoutState>({
  panels: {},
  nextZIndex: 1000,
});

// Initialize panels
for (const [id, def] of Object.entries(PANEL_DEFAULTS)) {
  state.panels[id] = {
    ...def,
    visible: id !== 'code-editor',
    float: { x: 100, y: 100, width: 500, height: 300, zIndex: 0 },
  };
}

function panelsForEdge(edge: DockEdge): PanelState[] {
  return Object.values(state.panels)
    .filter(p => p.visible && p.dock.edge === edge)
    .sort((a, b) => a.dock.order - b.dock.order);
}

let singleton: ReturnType<typeof createDockLayout> | null = null;

function createDockLayout() {
  const leftPanels   = computed(() => panelsForEdge('left'));
  const rightPanels  = computed(() => panelsForEdge('right'));
  const topPanels    = computed(() => panelsForEdge('top'));
  const bottomPanels = computed(() => panelsForEdge('bottom'));
  const floatPanels  = computed(() => panelsForEdge('float'));

  function togglePanel(id: string) {
    const p = state.panels[id];
    if (!p) return;
    p.visible = !p.visible;
    if (p.visible && p.dock.edge === 'float') {
      bringToFront(id);
    }
  }

  function showPanel(id: string) {
    const p = state.panels[id];
    if (!p) return;
    p.visible = true;
    if (p.dock.edge === 'float') {
      bringToFront(id);
    }
  }

  function dockPanel(id: string, edge: DockEdge, order?: number) {
    const p = state.panels[id];
    if (!p) return;
    if (p.dock.edge !== 'float') {
      p.lastDock = { ...p.dock };
    }
    const panelsOnEdge = Object.values(state.panels)
      .filter(x => x.id !== id && x.visible && x.dock.edge === edge);
    p.dock = { edge, order: order ?? panelsOnEdge.length };
  }

  function undockPanel(id: string, x?: number, y?: number) {
    const p = state.panels[id];
    if (!p) return;
    if (p.dock.edge !== 'float') {
      p.lastDock = { ...p.dock };
    }
    p.dock = { edge: 'float', order: 0 };
    p.float = {
      x: x ?? Math.max(50, (window.innerWidth / 2) - 200),
      y: y ?? Math.max(50, (window.innerHeight / 2) - 150),
      width: Math.max(p.size, 300),
      height: Math.max(200, 300),
      zIndex: state.nextZIndex++,
    };
  }

  function restoreDock(id: string) {
    const p = state.panels[id];
    if (!p) return;
    if (p.lastDock) {
      p.dock = { ...p.lastDock };
    } else {
      const defaults = PANEL_DEFAULTS[id];
      if (defaults) {
        p.dock = { ...defaults.dock };
      }
    }
  }

  function resizePanel(id: string, size: number) {
    const p = state.panels[id];
    if (!p) return;
    p.size = Math.max(p.minSize, Math.min(p.maxSize, size));
  }

  function bringToFront(id: string) {
    const p = state.panels[id];
    if (!p || p.dock.edge !== 'float') return;
    p.float.zIndex = state.nextZIndex++;
  }

  function moveFloatPanel(id: string, x: number, y: number) {
    const p = state.panels[id];
    if (!p || p.dock.edge !== 'float') return;
    p.float.x = x;
    p.float.y = y;
  }

  function resizeFloatPanel(id: string, width: number, height: number) {
    const p = state.panels[id];
    if (!p || p.dock.edge !== 'float') return;
    p.float.width = Math.max(200, width);
    p.float.height = Math.max(100, height);
  }

  function getPanel(id: string) {
    return state.panels[id];
  }

  return {
    state,
    leftPanels, rightPanels, topPanels, bottomPanels, floatPanels,
    togglePanel, showPanel, dockPanel, undockPanel, restoreDock, resizePanel,
    bringToFront, moveFloatPanel, resizeFloatPanel, getPanel,
  };
}

export function useDockLayout() {
  if (!singleton) {
    singleton = createDockLayout();
  }
  return singleton;
}
