<template>
  <div class="left-panel">
    <!-- Page Settings -->
    <div class="panel-section">
      <div class="section-header" @click="pageSettingsExpanded = !pageSettingsExpanded">
        <span>页面设置</span>
        <span class="arrow" :class="{ expanded: pageSettingsExpanded }">›</span>
      </div>
      <div v-show="pageSettingsExpanded" class="section-body">
        <div class="page-item">
          <label>背景色</label>
          <div class="color-row">
            <input type="color" :value="store.pageStyle.background" @input="onBgChange" class="color-swatch" />
            <input type="text" :value="store.pageStyle.background" @change="onBgTextChange" class="color-text" />
          </div>
        </div>
        <div class="page-item">
          <label>页面字体</label>
          <select class="font-select" :value="currentFontValue" @change="onFontChange">
            <optgroup v-for="cat in FONT_CATEGORIES" :key="cat" :label="cat">
              <option v-for="f in FONT_PRESETS.filter(p => p.category === cat)" :key="f.value" :value="f.value">{{ f.label }}</option>
            </optgroup>
          </select>
        </div>
        <div class="page-item toggle-item">
          <label>底部导航圆球</label>
          <label class="switch-label">
            <input type="checkbox" :checked="store.showPageDots" @change="store.showPageDots = !store.showPageDots" />
            <span class="switch-track"></span>
          </label>
        </div>

      </div>
    </div>

    <!-- Page List -->
    <div class="panel-section">
      <div class="section-header">
        <span>页面 ({{ store.pages.length }})</span>
        <button class="add-btn" @click.stop="store.addPage()" title="添加页面">+</button>
      </div>
      <div class="page-list">
        <template v-for="sec in pageSections" :key="sec.name">
          <!-- Section header -->
          <div v-if="sec.name" class="section-group-header"
               @click="toggleSection(sec.name)"
               @contextmenu.prevent.stop="openSectionCtx($event, sec.name)">
            <span class="arrow" :class="{ expanded: !collapsedSections[sec.name] }">›</span>
            <span class="section-group-name">{{ sec.name }}</span>
            <span class="section-group-count">{{ sec.pages.length }}</span>
          </div>
          <!-- Page rows -->
          <div v-for="(page, pi) in sec.pages" :key="page.id"
               v-show="!sec.name || !collapsedSections[sec.name]"
               class="page-item-row"
               :class="{
                 active: page.id === store.currentPageId,
                 hidden: page.hidden,
                 'drag-over-above': dragState.type === 'page' && dragState.dropIdx === findPageIndex(page.id) && dragState.dropSide === 'above',
                 'drag-over-below': dragState.type === 'page' && dragState.dropIdx === findPageIndex(page.id) && dragState.dropSide === 'below',
               }"
               :ref="el => { if (el) pageEls[findPageIndex(page.id)] = el as HTMLElement; else delete pageEls[findPageIndex(page.id)]; }"
               @click="onRowClick('page', findPageIndex(page.id))"
               @pointerdown="onRowPointerDown($event, 'page', findPageIndex(page.id))"
               @contextmenu.prevent.stop="openCtx('page', findPageIndex(page.id), $event)">
            <span class="drag-handle">⠿</span>
            <span class="page-num">{{ findPageIndex(page.id) + 1 }}</span>
            <input v-if="editingPageId === page.id" class="page-name-input"
                   :value="page.name" @blur="finishRename($event, page.id)"
                   @keydown.enter="finishRename($event, page.id)" @click.stop />
            <span v-else class="page-name" @dblclick.stop="startRename(page.id)">{{ page.name }}</span>
            <button class="page-hide-btn" :title="page.hidden ? '取消隐藏' : '隐藏'"
                    @click.stop="toggleHide(page.id)">👁</button>
            <button v-if="store.pages.length > 1" class="page-del" @click.stop="store.removePage(page.id)" title="删除页面">×</button>
          </div>
        </template>
      </div>
      <!-- Custom show -->
      <div class="custom-show-section">
        <label class="toggle-label" @click.stop>
          <input type="checkbox" v-model="customShowEnabled" class="toggle-input">
          <span class="toggle-slider"></span>
        </label>
        <span class="custom-show-label">自定义放映</span>
        <div v-if="customShowEnabled" class="custom-show-btns">
          <button class="cs-btn" @click.stop="selectAllCustomShow">全选</button>
          <button class="cs-btn" @click.stop="deselectAllCustomShow">全部取消</button>
        </div>
      </div>
      <div v-if="customShowEnabled" class="custom-show-pages">
        <div v-for="(page, idx) in store.pages" :key="page.id" class="custom-show-row">
          <input type="checkbox" :checked="isInCustomShow(page.id)"
                 @change="toggleCustomShow(page.id)" class="custom-show-cb">
          <span class="custom-show-name">{{ idx + 1 }}. {{ page.name }}</span>
        </div>
      </div>
    </div>

    <!-- Notes -->
    <div class="panel-section">
      <div class="section-header">
        <span>演讲者备注</span>
      </div>
      <div class="section-body" style="padding: 6px 8px;">
        <textarea class="notes-textarea"
          :value="currentPageNotes"
          @input="onNotesChange"
          placeholder="当前页的演讲备注，仅演讲者可见..."
          rows="3"></textarea>
      </div>
    </div>

    <!-- Auto Play -->
    <div class="panel-section">
      <div class="section-header" @click="autoPlayExpanded = !autoPlayExpanded">
        <span class="arrow" :class="{ expanded: autoPlayExpanded }">›</span>
        <span>自动播放</span>
        <label class="toggle-label" @click.stop>
          <input type="checkbox" v-model="store.autoPlay" class="toggle-input">
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div v-show="autoPlayExpanded && store.autoPlay" class="section-body" style="padding: 6px 8px;">
        <div v-for="(page, idx) in store.pages" :key="page.id" class="auto-play-row">
          <span class="auto-play-label">{{ idx + 1 }}. {{ page.name }}</span>
          <input type="number" class="auto-play-input" min="1" max="999"
                 :value="page.duration || ''" placeholder="秒"
                 @change="setDuration(page.id, $event)" @click.stop>
          <span class="auto-play-unit">秒</span>
        </div>
      </div>
    </div>

    <!-- Layer List -->
    <div class="panel-header">图层</div>
    <div class="panel-body">
      <div class="layer-item" v-for="(comp, idx) in store.pageComponents" :key="comp.id"
           :class="{
             selected: comp.id === store.selectedComponentId,
             'drag-over-above': dragState.type === 'layer' && dragState.dropIdx === idx && dragState.dropSide === 'above',
             'drag-over-below': dragState.type === 'layer' && dragState.dropIdx === idx && dragState.dropSide === 'below',
           }"
           :ref="el => { if (el) layerEls[idx] = el as HTMLElement; else delete layerEls[idx]; }"
           @click="onRowClick('layer', idx)"
           @pointerdown="onRowPointerDown($event, 'layer', idx)"
           @contextmenu.prevent.stop="openCtx('layer', idx, $event)">
        <span class="drag-handle">⠿</span>
        <span class="layer-type">{{ getTypeLabel(comp.type) }}</span>
        <span class="layer-name">{{ comp.props.text || comp.props.label || comp.type }}</span>
      </div>
      <div v-if="store.pageComponents.length === 0" class="empty-hint">
        当前页面无组件
      </div>
    </div>

    <!-- Context Menu -->
    <div v-if="ctx.show" class="ctx-overlay" @pointerdown.prevent @click="ctx.show = false">
      <div class="ctx-menu" :style="{ left: ctx.x + 'px', top: ctx.y + 'px' }" @click.stop>
        <div class="ctx-item" @click="ctxDo('top')" v-if="ctx.idx > 0">
          &#x2191;&#x2191; 移到最前
        </div>
        <div class="ctx-item" @click="ctxDo('up')" v-if="ctx.idx > 0">
          &#x2191; 上移一层
        </div>
        <div class="ctx-item" @click="ctxDo('down')" v-if="ctx.idx < ctxMax && ctxMax >= 0">
          &#x2193; 下移一层
        </div>
        <div class="ctx-item" @click="ctxDo('bottom')" v-if="ctx.idx < ctxMax && ctxMax >= 0">
          &#x2193;&#x2193; 移到最后
        </div>
        <div class="ctx-divider" v-if="ctx.type === 'layer'"></div>
        <div class="ctx-item" @click="ctxDo('duplicate')" v-if="ctx.type === 'layer'">
          复制
        </div>
        <div class="ctx-item ctx-danger" @click="ctxDo('delete')">
          删除
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useProjectStore } from '../stores/project';
import { COMPONENT_DEFS } from '../types/component';
import { FONT_PRESETS, FONT_CATEGORIES } from '../types/fontPresets';

const store = useProjectStore();
const pageSettingsExpanded = ref(true);
const autoPlayExpanded = ref(true);
const editingPageId = ref<string | null>(null);
const collapsedSections = ref<Record<string, boolean>>({});
const customShowEnabled = ref(false);

// Computed: pages grouped by section
interface PageGroup { name: string; pages: typeof store.pages; }
const pageSections = computed<PageGroup[]>(() => {
  const groups: Record<string, typeof store.pages> = {};
  for (const p of store.pages) {
    const key = p.section || '';
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  }
  const result: PageGroup[] = [];
  // Default section first
  if (groups['']) result.push({ name: '', pages: groups[''] });
  for (const key of Object.keys(groups).sort()) {
    if (key !== '') result.push({ name: key, pages: groups[key] });
  }
  return result;
});

function findPageIndex(pageId: string): number {
  return store.pages.findIndex(p => p.id === pageId);
}

function toggleSection(name: string) {
  collapsedSections.value[name] = !collapsedSections.value[name];
}

function toggleHide(pageId: string) {
  const page = store.pages.find(p => p.id === pageId);
  if (page) page.hidden = !page.hidden;
}

function isInCustomShow(pageId: string): boolean {
  return store.customShow ? store.customShow.includes(pageId) : true;
}

function toggleCustomShow(pageId: string) {
  if (!store.customShow) {
    store.customShow = store.pages.map(p => p.id);
  }
  const idx = store.customShow.indexOf(pageId);
  if (idx >= 0) store.customShow.splice(idx, 1);
  else store.customShow.push(pageId);
  if (store.customShow.length === store.pages.length) store.customShow = null;
}

function selectAllCustomShow() {
  store.customShow = null;
}

function deselectAllCustomShow() {
  store.customShow = [];
}

function openSectionCtx(e: MouseEvent, section: string) {
  // Could add rename section etc. later
}

const currentPageNotes = computed(() => {
  const page = store.pages.find(p => p.id === store.currentPageId);
  return page ? page.notes : '';
});

function onNotesChange(e: Event) {
  const val = (e.target as HTMLTextAreaElement).value;
  const page = store.pages.find(p => p.id === store.currentPageId);
  if (page) page.notes = val;
}

function setDuration(pageId: string, e: Event) {
  const val = parseInt((e.target as HTMLInputElement).value);
  const page = store.pages.find(p => p.id === pageId);
  if (page) page.duration = isNaN(val) ? 0 : Math.max(0, val);
}

// Element refs for hit-testing
const pageEls = ref<Record<number, HTMLElement>>({});
const layerEls = ref<Record<number, HTMLElement>>({});

// --- Unified drag state ---
interface DragState {
  active: boolean;
  type: 'page' | 'layer' | '';
  fromIdx: number;
  startY: number;
  dropIdx: number;
  dropSide: 'above' | 'below' | null;
}
const dragState = ref<DragState>({ active: false, type: '', fromIdx: -1, startY: 0, dropIdx: -1, dropSide: null });
let suppressClick = false;

function onRowPointerDown(e: PointerEvent, type: 'page' | 'layer', idx: number) {
  if (e.button !== 0) return;
  // Don't start drag on interactive elements
  const tag = (e.target as HTMLElement).tagName;
  if (tag === 'INPUT' || tag === 'BUTTON') return;

  dragState.value = { active: false, type, fromIdx: idx, startY: e.clientY, dropIdx: -1, dropSide: null };
  suppressClick = false;
  window.addEventListener('pointermove', onDragMove);
  window.addEventListener('pointerup', onDragUp, { once: true });
}

function onDragMove(e: PointerEvent) {
  const ds = dragState.value;
  if (!ds.type) return;
  if (!ds.active && Math.abs(e.clientY - ds.startY) > 5) {
    ds.active = true;
    suppressClick = true;
    document.body.style.cursor = 'grabbing';
  }
  if (!ds.active) return;

  const els = ds.type === 'page' ? pageEls.value : layerEls.value;
  let bestIdx = -1, bestSide: 'above' | 'below' | null = null;
  for (const key in els) {
    const el = els[key as any];
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (e.clientX >= rect.left && e.clientX <= rect.right &&
        e.clientY >= rect.top - 6 && e.clientY <= rect.bottom + 6) {
      bestIdx = parseInt(key, 10);
      bestSide = e.clientY < rect.top + rect.height / 2 ? 'above' : 'below';
      break;
    }
  }
  ds.dropIdx = bestIdx;
  ds.dropSide = bestSide;
}

function onDragUp() {
  window.removeEventListener('pointermove', onDragMove);
  document.body.style.cursor = '';
  const ds = dragState.value;
  console.log('[dragUp]', JSON.stringify(ds));
  if (ds.active && ds.dropIdx >= 0 && ds.fromIdx !== ds.dropIdx) {
    let toIdx = ds.dropIdx;
    if (ds.dropSide === 'below') toIdx += 1;
    if (ds.fromIdx < toIdx) toIdx -= 1;
    console.log('[dragUp] calling', ds.type, 'from', ds.fromIdx, 'to', toIdx);
    if (ds.type === 'page') store.movePage(ds.fromIdx, toIdx);
    else store.moveComponent(ds.fromIdx, toIdx);
  }
  dragState.value = { active: false, type: '', fromIdx: -1, startY: 0, dropIdx: -1, dropSide: null };
}

// --- Row click (select page/component, suppressed after drag) ---
function onRowClick(type: 'page' | 'layer', idx: number) {
  if (suppressClick) { suppressClick = false; return; }
  if (type === 'page') {
    if (store.pages[idx]) store.switchPage(store.pages[idx].id);
  } else {
    if (store.pageComponents[idx]) store.selectComponent(store.pageComponents[idx].id);
  }
}

// --- Context Menu ---
const ctx = ref({ show: false, x: 0, y: 0, type: 'page' as 'page' | 'layer', idx: -1 });
const ctxMax = computed(() => ctx.value.type === 'page' ? store.pages.length - 1 : store.pageComponents.length - 1);

function openCtx(type: 'page' | 'layer', idx: number, e: MouseEvent) {
  ctx.value = { show: true, x: e.clientX, y: e.clientY, type, idx };
}

function ctxDo(action: 'up' | 'down' | 'top' | 'bottom' | 'delete' | 'duplicate') {
  const { type, idx } = ctx.value;
  if (action === 'delete') {
    if (type === 'page') {
      if (store.pages.length > 1) store.removePage(store.pages[idx].id);
    } else {
      store.removeComponent(store.pageComponents[idx].id);
    }
    ctx.value.show = false;
    return;
  }
  if (action === 'duplicate') {
    const comp = store.pageComponents[idx];
    if (!comp) return;
    const newComp = {
      ...comp, id: store.genId(),
      position: { x: comp.position.x + 20, y: comp.position.y + 20 },
      props: { ...comp.props }, animation: comp.animation ? { ...comp.animation } : undefined,
    };
    store.addComponent(newComp);
    ctx.value.show = false;
    return;
  }
  const move = type === 'page' ? store.movePage : store.moveComponent;
  const max = type === 'page' ? store.pages.length - 1 : store.pageComponents.length - 1;
  if (action === 'up') move(idx, idx - 1);
  else if (action === 'down') move(idx, idx + 1);
  else if (action === 'top') move(idx, 0);
  else if (action === 'bottom') move(idx, max);
  ctx.value.show = false;
}

// --- Rest ---
const currentFontValue = computed(() => {
  const match = FONT_PRESETS.find(f => f.value === store.pageStyle.fontFamily);
  return match ? match.value : store.pageStyle.fontFamily;
});

function getTypeLabel(type: string): string {
  return COMPONENT_DEFS.find(d => d.type === type)?.label || type;
}

function startRename(id: string) { editingPageId.value = id; }
function finishRename(e: Event, id: string) {
  const val = (e.target as HTMLInputElement).value.trim();
  if (val) store.renamePage(id, val);
  editingPageId.value = null;
}

function onBgChange(e: Event) {
  store.pageStyle = { ...store.pageStyle, background: (e.target as HTMLInputElement).value };
}
function onBgTextChange(e: Event) {
  store.pageStyle = { ...store.pageStyle, background: (e.target as HTMLInputElement).value };
}
function onFontChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value;
  const preset = FONT_PRESETS.find(f => f.value === val);
  store.pageStyle = { ...store.pageStyle, fontFamily: val, fontImport: preset?.importUrl || '' };
}
</script>

<style scoped>
.left-panel {
  width: 100%; height: 100%; background: #fafafa; border-right: 1px solid #e8e8e8;
  display: flex; flex-direction: column; overflow: hidden;
}
.panel-section { border-bottom: 1px solid #e8e8e8; }
.section-header {
  padding: 10px 12px; font-size: 13px; font-weight: 600; color: #333;
  background: #f5f5f5; cursor: pointer; display: flex; justify-content: space-between;
  align-items: center; user-select: none;
}
.section-header:hover { background: #eee; }
.arrow { transition: transform 0.2s; font-size: 14px; color: #999; }
.arrow.expanded { transform: rotate(90deg); }
.section-body { padding: 8px 12px; }
.add-btn {
  width: 22px; height: 22px; border: 1px solid #ccc; border-radius: 4px;
  background: #fff; cursor: pointer; font-size: 16px; color: #666;
  display: flex; align-items: center; justify-content: center; line-height: 1;
}
.add-btn:hover { background: #3498db; color: #fff; border-color: #3498db; }
.page-item { margin-bottom: 8px; }
.page-item label { font-size: 11px; color: #888; display: block; margin-bottom: 3px; }
.toggle-item { display: flex; align-items: center; justify-content: space-between; }
.toggle-item label { margin-bottom: 0; }
.toggle-item .switch-label { display: inline-flex; align-items: center; cursor: pointer; margin-bottom: 0; }
.switch-label input { display: none; }
.switch-track {
  width: 34px; height: 18px; background: #ccc; border-radius: 9px; position: relative;
  transition: background 0.2s;
}
.switch-track::after {
  content: ''; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px;
  background: #fff; border-radius: 50%; transition: transform 0.2s;
}
.switch-label input:checked + .switch-track { background: #3498db; }
.switch-label input:checked + .switch-track::after { transform: translateX(16px); }
.color-row { display: flex; gap: 6px; align-items: center; }
.color-swatch {
  width: 28px; height: 28px; border: 1px solid #ddd; border-radius: 4px;
  padding: 0; cursor: pointer; flex-shrink: 0;
}
.color-text {
  flex: 1; padding: 4px 6px; border: 1px solid #ddd; border-radius: 4px;
  font-size: 12px; outline: none; font-family: monospace;
}
.color-text:focus { border-color: #3498db; }
.font-select {
  width: 100%; padding: 4px 6px; border: 1px solid #ddd; border-radius: 4px;
  font-size: 12px; outline: none; background: #fff; cursor: pointer;
}
.font-select:focus { border-color: #3498db; }

/* Page List */
.page-list { padding: 4px 8px; max-height: 180px; overflow-y: auto; }
.page-item-row {
  display: flex; align-items: center; gap: 6px; padding: 5px 8px;
  border-radius: 4px; cursor: pointer; font-size: 12px;
  position: relative; border: 2px solid transparent;
}
.page-item-row:hover { background: #e8e8e8; }
.page-item-row.active { background: #d0e8ff; }
.page-item-row.drag-over-above { border-top-color: #3498db; }
.page-item-row.drag-over-below { border-bottom-color: #3498db; }
.drag-handle {
  cursor: grab; color: #bbb; font-size: 14px; flex-shrink: 0;
  line-height: 1; opacity: 0; transition: opacity 0.15s; touch-action: none;
  user-select: none; -webkit-user-select: none;
}
.page-item-row:hover .drag-handle,
.layer-item:hover .drag-handle { opacity: 1; }
.drag-handle:active { cursor: grabbing; }
.page-num {
  width: 20px; height: 20px; border-radius: 50%; background: #e0e0e0;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 600; color: #666; flex-shrink: 0;
}
.page-item-row.active .page-num { background: #3498db; color: #fff; }
.page-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.page-name-input {
  flex: 1; padding: 2px 4px; border: 1px solid #3498db; border-radius: 3px;
  font-size: 12px; outline: none;
}
.page-del {
  width: 18px; height: 18px; border: none; border-radius: 3px;
  background: transparent; cursor: pointer; font-size: 14px; color: #ccc;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.page-del:hover { background: #fee; color: #e74c3c; }

/* Layer List */
.panel-header {
  padding: 10px 12px; font-size: 13px; font-weight: 600; color: #333;
  border-bottom: 1px solid #e8e8e8; background: #f5f5f5;
}
.panel-body { flex: 1; overflow-y: auto; padding: 4px; min-height: 0; }
.layer-item {
  padding: 6px 10px; border-radius: 4px; cursor: pointer; display: flex;
  align-items: center; gap: 8px; font-size: 12px; position: relative;
  border: 2px solid transparent;
}
.layer-item:hover { background: #e8e8e8; }
.layer-item.selected { background: #d0e8ff; }
.layer-item.drag-over-above { border-top-color: #3498db; }
.layer-item.drag-over-below { border-bottom-color: #3498db; }
.layer-type {
  background: #3498db; color: white; padding: 1px 6px; border-radius: 3px;
  font-size: 10px; flex-shrink: 0;
}
.layer-name { color: #333; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty-hint { padding: 20px; text-align: center; color: #999; font-size: 13px; }

/* Context Menu */
.ctx-overlay {
  position: fixed; inset: 0; z-index: 9999;
}
.ctx-menu {
  position: fixed; z-index: 10000; background: #fff; border: 1px solid #ddd;
  border-radius: 6px; box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  padding: 4px 0; min-width: 140px;
}
.ctx-item {
  padding: 6px 14px; font-size: 12px; color: #333; cursor: pointer;
  white-space: nowrap;
}
.ctx-item:hover { background: #3498db; color: #fff; border-radius: 4px; margin: 0 4px; padding: 6px 10px; }
.ctx-danger { color: #e74c3c; }
.ctx-danger:hover { background: #e74c3c !important; }
.ctx-divider { height: 1px; background: #eee; margin: 4px 0; }

/* Notes textarea */
.notes-textarea {
  width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 4px;
  font-size: 12px; font-family: inherit; color: #333; resize: vertical;
  line-height: 1.5; outline: none; box-sizing: border-box;
}
.notes-textarea:focus { border-color: #3498db; }

/* Toggle switch */
.toggle-label { display: inline-flex; align-items: center; cursor: pointer; }
.toggle-input { display: none; }
.toggle-slider {
  width: 32px; height: 18px; background: #ccc; border-radius: 9px;
  position: relative; transition: background 0.2s; display: inline-block;
}
.toggle-slider::after {
  content: ''; position: absolute; top: 2px; left: 2px; width: 14px; height: 14px;
  background: #fff; border-radius: 50%; transition: transform 0.2s;
}
.toggle-input:checked + .toggle-slider { background: #3498db; }
.toggle-input:checked + .toggle-slider::after { transform: translateX(14px); }

/* Auto play rows */
.auto-play-row {
  display: flex; align-items: center; gap: 6px; padding: 3px 0;
  font-size: 12px; color: #555;
}
.auto-play-label { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.auto-play-input {
  width: 52px; padding: 2px 4px; border: 1px solid #ddd; border-radius: 3px;
  font-size: 12px; text-align: right;
}
.auto-play-unit { font-size: 11px; color: #999; }

/* Section group headers */
.section-group-header {
  display: flex; align-items: center; gap: 6px; padding: 4px 8px;
  font-size: 12px; font-weight: 600; color: #666; cursor: pointer;
  border-radius: 4px; margin-top: 2px; user-select: none;
}
.section-group-header:hover { background: #e8e8e8; }
.section-group-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.section-group-count {
  font-size: 10px; color: #999; background: #eee;
  padding: 0 6px; border-radius: 8px; flex-shrink: 0;
}

/* Hidden page styling */
.page-item-row.hidden { opacity: 0.5; }
.page-item-row.hidden .page-name { text-decoration: line-through; }

/* Page hide (eye) button */
.page-hide-btn {
  width: 18px; height: 18px; border: none; border-radius: 3px;
  background: transparent; cursor: pointer; font-size: 11px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; line-height: 1; padding: 0;
}
.page-hide-btn:hover { background: #ddd; }

/* Custom show section */
.custom-show-section {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px; border-top: 1px solid #e8e8e8;
  font-size: 12px; color: #555;
}
.custom-show-label { flex: 1; font-weight: 500; }
.custom-show-btns { display: flex; gap: 6px; flex-shrink: 0; }
.cs-btn {
  padding: 3px 10px; border: 1px solid #3498db; border-radius: 4px;
  background: transparent; color: #3498db; cursor: pointer; font-size: 11px;
  font-weight: 500; white-space: nowrap; transition: all 0.15s;
}
.cs-btn:hover { background: #3498db; color: #fff; }
.custom-show-pages {
  padding: 0 12px 8px; max-height: 120px; overflow-y: auto;
}
.custom-show-row {
  display: flex; align-items: center; gap: 6px;
  padding: 3px 4px; font-size: 12px; border-radius: 3px;
}
.custom-show-row:hover { background: #f0f0f0; }
.custom-show-cb { flex-shrink: 0; }
.custom-show-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #555; }
</style>
