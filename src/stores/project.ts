import { defineStore, acceptHMRUpdate } from 'pinia';
import { ref, toRaw, watch, computed } from 'vue';
import type { ComponentInstance, ProjectState, ComponentAnimation } from '../types/component';
import { COMPONENT_DEFS } from '../types/component';

function migrateAnimation(a: any): ComponentAnimation | undefined {
  if (!a || !a.type || a.type === 'none') return undefined;
  return {
    easing: 'easeOutQuad',
    stagger: 0,
    direction: 'alternate' as const,
    ...a,
  };
}

export interface CanvasConfig {
  type: 'slide' | 'phone' | 'pc' | 'custom';
  width: number;
  height: number;
}

export interface Page {
  id: string;
  name: string;
  duration: number; // 自动播放停留秒数，0=不自动播放
  notes: string;   // 演讲者备注
  section: string; // 分节名称
  hidden: boolean; // 是否隐藏
}

export interface PageStyle {
  background: string;
  fontImport: string;
  fontFamily: string;
}

const DEFAULT_PAGE_STYLE: PageStyle = {
  background: '#ffffff',
  fontImport: '',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

export const CANVAS_PRESETS: { type: CanvasConfig['type']; label: string; width: number; height: number }[] = [
  { type: 'slide', label: '幻灯片 (16:9)', width: 1280, height: 720 },
  { type: 'phone', label: '手机 (390×844)', width: 390, height: 844 },
  { type: 'pc', label: 'PC (1920×1080)', width: 1920, height: 1080 },
  { type: 'custom', label: '自定义', width: 800, height: 600 },
];

export const useProjectStore = defineStore('project', () => {
  const title = ref('未命名项目');
  const components = ref<ComponentInstance[]>([]);
  const selectedComponentId = ref<string | null>(null);
  const mqttBrokerUrl = ref('ws://broker.emqx.io:8083/mqtt');
  const showGrid = ref(true);
  const showPageDots = ref(true);
  const fillMode = ref(true);
  const currentFilePath = ref<string | null>(null);
  const canvasConfig = ref<CanvasConfig>({ type: 'slide', width: 1280, height: 720 });
  const pageStyle = ref<PageStyle>({ ...DEFAULT_PAGE_STYLE });
  const showCanvasSelector = ref(true);
  const dragComponentType = ref<string | null>(null);

  // Multi-page
  const pages = ref<Page[]>([{ id: 'p1', name: '第 1 页', duration: 0, notes: '', section: '', hidden: false }]);
  const currentPageId = ref('p1');
  const autoPlay = ref(false);
  const customShow = ref<string[] | null>(null);

  // Computed: components on current page
  const pageComponents = computed(() =>
    components.value.filter(c => c.pageId === currentPageId.value)
  );

  // Computed: current page index
  const currentPageIndex = computed(() =>
    pages.value.findIndex(p => p.id === currentPageId.value)
  );

  function genPageId() {
    return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function addPage() {
    const id = genPageId();
    const num = pages.value.length + 1;
    pages.value.push({ id, name: `第 ${num} 页`, duration: 0, notes: '', section: '', hidden: false });
    currentPageId.value = id;
  }

  function removePage(id: string) {
    if (pages.value.length <= 1) return;
    components.value = components.value.filter(c => c.pageId !== id);
    pages.value = pages.value.filter(p => p.id !== id);
    if (currentPageId.value === id) {
      currentPageId.value = pages.value[0].id;
    }
    selectedComponentId.value = null;
  }

  function renamePage(id: string, name: string) {
    const page = pages.value.find(p => p.id === id);
    if (page) page.name = name;
  }

  function switchPage(id: string) {
    currentPageId.value = id;
    selectedComponentId.value = null;
  }

  function movePage(fromIndex: number, toIndex: number) {
    const item = pages.value.splice(fromIndex, 1)[0];
    pages.value.splice(toIndex, 0, item);
  }

  // Undo/Redo
  const historyStack = ref<ComponentInstance[][]>([[]]);
  const historyIndex = ref(0);
  let _batchDepth = 0;

  const canUndo = computed(() => historyIndex.value > 0);
  const canRedo = computed(() => historyIndex.value < historyStack.value.length - 1);

  function snapshot() {
    const copy = JSON.parse(JSON.stringify(toRaw(components.value)));
    historyStack.value = historyStack.value.slice(0, historyIndex.value + 1);
    historyStack.value.push(copy);
    if (historyStack.value.length > 50) historyStack.value.shift();
    historyIndex.value = historyStack.value.length - 1;
  }

  function undo() {
    if (historyIndex.value <= 0) return;
    historyIndex.value--;
    components.value = JSON.parse(JSON.stringify(historyStack.value[historyIndex.value]));
    selectedComponentId.value = null;
  }

  function redo() {
    if (historyIndex.value >= historyStack.value.length - 1) return;
    historyIndex.value++;
    components.value = JSON.parse(JSON.stringify(historyStack.value[historyIndex.value]));
    selectedComponentId.value = null;
  }

  function beginBatch() { _batchDepth++; }
  function endBatch() {
    _batchDepth = Math.max(0, _batchDepth - 1);
    if (_batchDepth === 0) snapshot();
  }

  // Dirty tracking (unsaved changes)
  let savedSnapshot = '[]';
  const isDirty = ref(false);

  function markClean() {
    savedSnapshot = JSON.stringify(toRaw(components.value));
    isDirty.value = false;
  }

  watch(components, () => {
    const current = JSON.stringify(toRaw(components.value));
    isDirty.value = current !== savedSnapshot;
  }, { deep: true });

  function genId() {
    return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function addComponent(comp: ComponentInstance) {
    components.value = [...components.value, comp];
    selectedComponentId.value = comp.id;
    if (_batchDepth === 0) snapshot();
  }

  function removeComponent(id: string) {
    components.value = components.value.filter(c => c.id !== id);
    if (selectedComponentId.value === id) selectedComponentId.value = null;
    if (_batchDepth === 0) snapshot();
  }

  function moveComponent(fromIndex: number, toIndex: number) {
    console.log('[moveComponent] called with', fromIndex, toIndex);
    const pageComps = pageComponents.value;
    console.log('[moveComponent] pageComps.length =', pageComps.length, 'pid =', currentPageId.value);
    if (fromIndex < 0 || fromIndex >= pageComps.length) { console.log('[moveComponent] bail: fromIndex OOB'); return; }
    if (toIndex < 0 || toIndex >= pageComps.length) { console.log('[moveComponent] bail: toIndex OOB'); return; }
    if (fromIndex === toIndex) { console.log('[moveComponent] bail: same index'); return; }
    const pid = currentPageId.value;
    const thisPage: ComponentInstance[] = [];
    for (const c of components.value) {
      if (c.pageId === pid) thisPage.push(c);
    }
    console.log('[moveComponent] thisPage ids:', thisPage.map(c => c.id.slice(-6)));
    const [item] = thisPage.splice(fromIndex, 1);
    thisPage.splice(toIndex, 0, item);
    console.log('[moveComponent] reordered ids:', thisPage.map(c => c.id.slice(-6)));
    const result: ComponentInstance[] = [];
    let pi = 0;
    for (const c of components.value) {
      if (c.pageId === pid) { result.push(thisPage[pi++]); }
      else { result.push(c); }
    }
    console.log('[moveComponent] done, result length =', result.length);
    components.value = result;
    if (_batchDepth === 0) snapshot();
  }

  function updateComponent(id: string, updates: Partial<ComponentInstance>) {
    const idx = components.value.findIndex(c => c.id === id);
    if (idx !== -1) {
      components.value[idx] = { ...components.value[idx], ...updates };
    }
    if (_batchDepth === 0) snapshot();
  }

  function updateComponentProps(id: string, props: Record<string, any>) {
    const idx = components.value.findIndex(c => c.id === id);
    if (idx !== -1) {
      components.value[idx].props = { ...components.value[idx].props, ...props };
    }
    if (_batchDepth === 0) snapshot();
  }

  function selectComponent(id: string | null) {
    selectedComponentId.value = id;
  }

  const selectedComponent = computed(() => {
    if (!selectedComponentId.value) return undefined;
    return components.value.find(c => c.id === selectedComponentId.value);
  });

  // Import AI-generated Noah project
  function importNoahJson(data: any) {
    if (data.format !== 'noah-v1') return false;

    const proj = data.project || {};
    title.value = proj.title || '导入项目';
    canvasConfig.value = {
      type: 'custom',
      width: proj.canvas?.width || 1280,
      height: proj.canvas?.height || 720,
    };
    pageStyle.value = {
      background: proj.background || '#ffffff',
      fontFamily: proj.font || '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontImport: proj.fontImport || '',
    };

    const pageList: any[] = data.pages || [];
    pages.value = pageList.map((p: any, i: number) => ({
      id: 'p' + (i + 1),
      name: p.name || `第 ${i + 1} 页`,
      duration: typeof p.duration === 'number' ? p.duration : 0,
      notes: p.notes || '',
      section: p.section || '',
      hidden: p.hidden === true,
    }));
    if (pages.value.length === 0) pages.value = [{ id: 'p1', name: '第 1 页', duration: 0, notes: '', section: '', hidden: false }];

    // Collect all components from all pages
    const allComps: ComponentInstance[] = [];
    pageList.forEach((p: any, pi: number) => {
      const pageId = 'p' + (pi + 1);
      (p.components || []).forEach((c: any) => {
        const def = COMPONENT_DEFS.find(d => d.type === c.type);

        // Merge flat-level props
        const flatProps: Record<string, any> = {};
        if (def) {
          for (const key of Object.keys(def.defaultProps)) {
            if (c[key] !== undefined) {
              flatProps[key] = c[key];
            }
          }
        }

        allComps.push({
          id: genId(),
          pageId,
          type: c.type,
          position: { x: c.x ?? 0, y: c.y ?? 0 },
          size: {
            width: c.w ?? def?.defaultSize.width ?? 200,
            height: c.h ?? def?.defaultSize.height ?? 100,
          },
          props: { ...(def?.defaultProps || {}), ...flatProps, ...(c.props || {}) },
          animation: migrateAnimation(c.animation),
        });
      });
    });

    // Auto-detect full-canvas Rectangle → sync page background
    const cw = canvasConfig.value.width;
    const ch = canvasConfig.value.height;
    for (const p of pageList) {
      for (const c of (p.components || [])) {
        if (c.type === 'Rectangle') {
          const x = c.x ?? 0;
          const y = c.y ?? 0;
          const w = c.w ?? 0;
          const h = c.h ?? 0;
          const fill = c.props?.fill || c.fill;
          if (fill && x <= 1 && y <= 1 && w >= cw - 2 && h >= ch - 2) {
            pageStyle.value.background = fill;
            break;
          }
        }
      }
    }

    components.value = allComps;
    currentPageId.value = pages.value[0].id;
    selectedComponentId.value = null;
    historyStack.value = [JSON.parse(JSON.stringify(allComps))];
    historyIndex.value = 0;
    showCanvasSelector.value = false;
    queueMicrotask(() => markClean());
    return true;
  }

  function clearProject() {
    components.value = [];
    selectedComponentId.value = null;
    title.value = '未命名项目';
    currentFilePath.value = null;
    canvasConfig.value = { type: 'slide', width: 1280, height: 720 };
    pageStyle.value = { ...DEFAULT_PAGE_STYLE };
    pages.value = [{ id: 'p1', name: '第 1 页', duration: 0, notes: '', section: '', hidden: false }];
    customShow.value = null;
    autoPlay.value = false;
    currentPageId.value = 'p1';
    historyStack.value = [[]];
    historyIndex.value = 0;
    showCanvasSelector.value = true;
    queueMicrotask(() => markClean());
  }

  function loadProject(data: any) {
    components.value = (data.components || []).map((c: any) => ({
      ...c,
      pageId: c.pageId || 'p1',
      animation: migrateAnimation(c.animation),
    }));
    title.value = data.title || '未命名项目';
    mqttBrokerUrl.value = data.mqttBrokerUrl || 'ws://broker.emqx.io:8083/mqtt';
    showGrid.value = data.showGrid !== false;
    showPageDots.value = data.showPageDots !== false;
    fillMode.value = data.fillMode === true;
    canvasConfig.value = data.canvasConfig || { type: 'slide', width: 1280, height: 720 };
    pageStyle.value = data.pageStyle || { ...DEFAULT_PAGE_STYLE };
    pages.value = data.pages && data.pages.length > 0 ? data.pages.map((p: any) => ({ ...p, duration: p.duration || 0, notes: p.notes || '', section: p.section || '', hidden: p.hidden === true })) : [{ id: 'p1', name: '第 1 页', duration: 0, notes: '', section: '', hidden: false }];
    customShow.value = data.customShow || null;
    autoPlay.value = data.autoPlay === true;
    currentPageId.value = pages.value[0].id;
    selectedComponentId.value = null;
    historyStack.value = [JSON.parse(JSON.stringify(components.value))];
    historyIndex.value = 0;
    showCanvasSelector.value = false;
    queueMicrotask(() => markClean());
  }

  // Update a single page from AI delta (updatePage action)
  function updatePageFromJson(pageIndex: number, pageData: any) {
    if (pageIndex < 0 || pageIndex >= pages.value.length) return false;
    const pageId = pages.value[pageIndex].id;
    if (pageData.name) pages.value[pageIndex].name = pageData.name;
    components.value = components.value.filter(c => c.pageId !== pageId);
    const newComps: ComponentInstance[] = (pageData.components || []).map((c: any) => {
      const def = COMPONENT_DEFS.find(d => d.type === c.type);
      return {
        id: genId(),
        pageId,
        type: c.type,
        position: { x: c.x ?? 0, y: c.y ?? 0 },
        size: {
          width: c.w ?? def?.defaultSize.width ?? 200,
          height: c.h ?? def?.defaultSize.height ?? 100,
        },
        props: { ...(def?.defaultProps || {}), ...(c.props || {}) },
        animation: migrateAnimation(c.animation),
      } as ComponentInstance;
    });
    components.value = [...components.value, ...newComps];
    currentPageId.value = pageId;
    selectedComponentId.value = null;
    snapshot();
    return true;
  }

  // Update multiple pages from AI delta (updatePages action)
  function updatePagesFromJson(pagesData: Array<{ pageIndex: number; page: any }>) {
    for (const { pageIndex, page } of pagesData) {
      if (pageIndex < 0 || pageIndex >= pages.value.length) continue;
      const pageId = pages.value[pageIndex].id;
      if (page.name) pages.value[pageIndex].name = page.name;
      components.value = components.value.filter(c => c.pageId !== pageId);
      const newComps: ComponentInstance[] = (page.components || []).map((c: any) => {
        const def = COMPONENT_DEFS.find(d => d.type === c.type);
        return {
          id: genId(),
          pageId,
          type: c.type,
          position: { x: c.x ?? 0, y: c.y ?? 0 },
          size: {
            width: c.w ?? def?.defaultSize.width ?? 200,
            height: c.h ?? def?.defaultSize.height ?? 100,
          },
          props: { ...(def?.defaultProps || {}), ...(c.props || {}) },
          animation: migrateAnimation(c.animation),
        } as ComponentInstance;
      });
      components.value = [...components.value, ...newComps];
    }
    if (pagesData.length > 0) {
      currentPageId.value = pages.value[pagesData[0].pageIndex]?.id || currentPageId.value;
      selectedComponentId.value = null;
      snapshot();
    }
    return true;
  }

  async function regenerateMediaBlobUrls() {
    const { readFile } = await import('@tauri-apps/plugin-fs');
    for (const c of components.value) {
      if ((c.type === 'Video' || c.type === 'Audio') && c.props?.filePath) {
        try {
          const data = await readFile(c.props.filePath);
          const ext = (c.props.filePath as string).split('.').pop()?.toLowerCase() || '';
          const mimeMap: Record<string, string> = {
            mp4: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', mov: 'video/quicktime',
            avi: 'video/x-msvideo', mkv: 'video/x-matroska',
            mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', aac: 'audio/aac',
            flac: 'audio/flac', m4a: 'audio/mp4',
          };
          const mime = mimeMap[ext] || 'application/octet-stream';
          const blob = new Blob([data], { type: mime });
          c.props.src = URL.createObjectURL(blob);
        } catch (e) {
          console.warn('Failed to reload media:', c.props.filePath, e);
        }
      }
    }
  }

  return {
    title, components, selectedComponentId, mqttBrokerUrl, showGrid, showPageDots, fillMode, currentFilePath,
    canvasConfig, showCanvasSelector, pageStyle, dragComponentType,
    pages, currentPageId, pageComponents, currentPageIndex, autoPlay, customShow,
    selectedComponent, canUndo, canRedo, isDirty, markClean,
    addComponent, removeComponent, moveComponent, updateComponent, updateComponentProps,
    selectComponent, undo, redo, beginBatch, endBatch, clearProject, loadProject, genId, snapshot,
    addPage, removePage, renamePage, switchPage, movePage,
    importNoahJson, updatePageFromJson, updatePagesFromJson,
    regenerateMediaBlobUrls,
  };
});

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useProjectStore, import.meta.hot));
}