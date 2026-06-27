<template>
  <div class="editor">
    <MenuBar @new-project="newProject" @open-project="openProject" @save-project="saveProject"
             @save-project-as="saveProjectAs"
             @export-html="exportHtml" @import-noah="importNoah" @paste-import="showPasteDialog = true"
             @undo="store.undo"
             @toggle-grid="store.showGrid = !store.showGrid"
             @toggle-panel="onTogglePanel"
             @start-fullscreen="startFullscreen" @start-presenter="startPresenterMode"
             @export-pdf="exportPdf"
             @export-image="exportImage"
             @export-all-images="exportAllImages"
             @import-pptx="importPptx"
             @export-pptx="exportPptx"
             @export-pptx-editable="exportPptxEditable"
             @help="showHelp" />
    <ComponentBar @add-component="addComponentFromBar" />

    <div class="dock-area">
      <!-- Left column -->
      <div class="dock-col dock-col-left" v-if="layout.leftPanels.value.length > 0"
           :style="{ width: leftColWidth + 'px' }">
        <DockPanel v-for="p in layout.leftPanels.value" :key="p.id" :panelId="p.id">
          <AiChatPanel v-if="p.id === 'ai-chat'" />
          <LeftPanel v-else />
        </DockPanel>
        <div class="splitter splitter-h" @mousedown="e => startSplitterDrag('left', e)"></div>
      </div>

      <!-- Canvas center -->
      <div class="dock-center" :style="{ paddingBottom: bottomHeight + 'px' }">
        <Canvas @start-fullscreen="startFullscreen" @start-presenter="startPresenterMode" />
      </div>

      <!-- Right column -->
      <div class="dock-col dock-col-right" v-if="layout.rightPanels.value.length > 0"
           :style="{ width: rightColWidth + 'px' }">
        <div class="splitter splitter-h" @mousedown="e => startSplitterDrag('right', e)"></div>
        <DockPanel v-for="p in layout.rightPanels.value" :key="p.id" :panelId="p.id">
          <AiChatPanel v-if="p.id === 'ai-chat'" />
          <PropertyPanel v-else />
        </DockPanel>
      </div>

      <!-- Bottom dock -->
      <div class="dock-row-bottom" v-if="layout.bottomPanels.value.length > 0"
           :style="{ height: bottomHeight + 'px' }">
        <div class="splitter splitter-v" @mousedown="e => startSplitterDrag('bottom', e)"></div>
        <DockPanel v-for="p in layout.bottomPanels.value" :key="p.id" :panelId="p.id">
          <AiChatPanel v-if="p.id === 'ai-chat'" />
          <CodeEditor v-else :code="currentCode" @update:code="onCodeEdit" />
        </DockPanel>
      </div>
    </div>

    <!-- Floating panels -->
    <DockPanel v-for="p in layout.floatPanels.value" :key="p.id" :panelId="p.id">
      <LeftPanel v-if="p.id === 'left-panel'" />
      <PropertyPanel v-if="p.id === 'property-panel'" />
      <CodeEditor v-if="p.id === 'code-editor'" :code="currentCode" @update:code="onCodeEdit" />
      <AiChatPanel v-if="p.id === 'ai-chat'" />
    </DockPanel>

    <CanvasSelector v-if="showSelector" :on-done="closeSelector" />

    <!-- Fullscreen -->
    <div v-if="isFullscreen" ref="fullscreenRef" class="fullscreen-overlay">
      <iframe ref="iframeRef" class="fullscreen-iframe" :srcdoc="currentCode" sandbox="allow-scripts allow-same-origin allow-presentation"></iframe>
    </div>

    <!-- Paste Import Dialog -->
    <div v-if="showPasteDialog" class="paste-overlay" @click.self="showPasteDialog = false">
      <div class="paste-dialog">
        <div class="paste-header">
          <span>粘贴导入 NOAH JSON</span>
          <button class="paste-close" @click="showPasteDialog = false">×</button>
        </div>
        <textarea class="paste-textarea" v-model="pasteText" placeholder='粘贴 AI 生成的 JSON，格式：{ "format": "noah-v1", ... }'></textarea>
        <div class="paste-footer">
          <span class="paste-hint">支持 format: "noah-v1" 格式</span>
          <div class="paste-actions">
            <button class="paste-btn cancel" @click="showPasteDialog = false">取消</button>
            <button class="paste-btn confirm" @click="doPasteImport">导入</button>
          </div>
        </div>
      </div>
    </div>

    <AiConfigPanel />

    <!-- Presenter mode -->
    <PresenterPanel v-if="presenterMode" :html-content="currentCode" :audience-window="audienceWindow" :session-dir="presenterSessionDir" @exit="exitPresenterMode" />
    <ProgressOverlay
      :visible="exportProgress.visible"
      :title="exportProgress.title"
      :current="exportProgress.current"
      :total="exportProgress.total"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useProjectStore } from '../stores/project';
import { useAiStore } from '../stores/ai';
import { useCodeGenerator } from '../composables/useCodeGenerator';
import { useDockLayout } from '../composables/useDockLayout';
import { type ComponentInstance, type ComponentDef } from '../types/component';
import MenuBar from '../components/MenuBar.vue';
import ComponentBar from '../components/ComponentBar.vue';
import LeftPanel from '../components/LeftPanel.vue';
import Canvas from '../components/Canvas.vue';
import CanvasSelector from '../components/CanvasSelector.vue';
import PropertyPanel from '../components/PropertyPanel.vue';
import CodeEditor from '../components/CodeEditor.vue';
import DockPanel from '../components/DockPanel.vue';
import AiChatPanel from '../components/AiChatPanel.vue';
import AiConfigPanel from '../components/AiConfigPanel.vue';
import PresenterPanel from '../components/PresenterPanel.vue';
import ProgressOverlay from '../components/ProgressOverlay.vue';
import { save, open } from '@tauri-apps/plugin-dialog';
import { exportPDF, exportSlideAsImage, exportAllSlidesAsImages } from '../composables/useExport';
import { exportToPptx } from '../composables/usePptxExport';
import { exportToPptxEditable } from '../composables/usePptxEditableExport';
import { describePptxForAi } from '../composables/usePptxImport';
import { useAiChat } from '../composables/useAiChat';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { resourceDir, join } from '@tauri-apps/api/path';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
const store = useProjectStore();
const ai = useAiStore();
const { generatedCode } = useCodeGenerator();
const layout = useDockLayout();

const showSelector = ref(true);
const userCode = ref<string | null>(null);
const isFullscreen = ref(false);
const fullscreenRef = ref<HTMLDivElement | null>(null);
const iframeRef = ref<HTMLIFrameElement | null>(null);
const showPasteDialog = ref(false);
const pasteText = ref('');
const presenterMode = ref(false);
const audienceWindow = ref<Window | null>(null);

// Presenter session path (for Tauri file-based sync)
const presenterSessionDir = ref('');

// ── Export progress ──
const exportProgress = ref({ visible: false, title: '', current: 0, total: 0 });

// PPTX import

const currentCode = computed(() => userCode.value ?? generatedCode.value);

function onCodeEdit(code: string) {
  userCode.value = code;
}

watch(() => store.components.length, () => {
  userCode.value = null;
});

// ── Computed column sizes ──
const leftColWidth = computed(() => {
  const ps = layout.leftPanels.value;
  return ps.length > 0 ? ps.reduce((m, p) => Math.max(m, p.size), 0) : 0;
});
const rightColWidth = computed(() => {
  const ps = layout.rightPanels.value;
  return ps.length > 0 ? ps.reduce((m, p) => Math.max(m, p.size), 0) : 0;
});
const bottomHeight = computed(() => {
  const ps = layout.bottomPanels.value;
  return ps.length > 0 ? ps.reduce((m, p) => Math.max(m, p.size), 0) : 0;
});

// ── Splitter drag ──
let splitterEdge: 'left' | 'right' | 'bottom' | null = null;
let splitterStartPos = 0;
let splitterStartSize = 0;
let splitterPanelId = '';

function startSplitterDrag(edge: 'left' | 'right' | 'bottom', e: MouseEvent) {
  const panels = edge === 'left' ? layout.leftPanels.value
    : edge === 'right' ? layout.rightPanels.value
    : layout.bottomPanels.value;
  if (panels.length === 0) return;
  const panel = panels[0];
  splitterEdge = edge;
  splitterPanelId = panel.id;
  splitterStartSize = panel.size;
  splitterStartPos = edge === 'bottom' ? e.clientY : e.clientX;
  document.body.style.cursor = edge === 'bottom' ? 'ns-resize' : 'ew-resize';
  document.body.style.userSelect = 'none';
  window.addEventListener('mousemove', onSplitterMove);
  window.addEventListener('mouseup', onSplitterUp);
}

function onSplitterMove(e: MouseEvent) {
  if (!splitterEdge) return;
  let delta: number;
  if (splitterEdge === 'bottom') delta = splitterStartPos - e.clientY;
  else if (splitterEdge === 'left') delta = e.clientX - splitterStartPos;
  else delta = splitterStartPos - e.clientX;
  layout.resizePanel(splitterPanelId, splitterStartSize + delta);
}

function onSplitterUp() {
  splitterEdge = null;
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  window.removeEventListener('mousemove', onSplitterMove);
  window.removeEventListener('mouseup', onSplitterUp);
}

// ── Toggle panel from MenuBar ──
function onTogglePanel(id: string) {
  layout.togglePanel(id);
}

// ── Project operations ──
async function newProject() {
  if (store.components.length > 0 && !window.confirm('新建项目将丢失未保存的更改，确定继续？')) return;
  store.clearProject();
  showSelector.value = true;
}

function closeSelector() {
  showSelector.value = false;
}

async function openProject() {
  try {
    const selected = await open({ filters: [{ name: 'Noah Project', extensions: ['noah'] }, { name: 'All Files', extensions: ['*'] }] });
    if (!selected) return;
    const data = JSON.parse(await readTextFile(selected));
    store.loadProject(data);
    store.regenerateMediaBlobUrls();
    store.currentFilePath = selected;
    showSelector.value = false;
  } catch (e) { alert('打开文件失败: ' + String(e)); }
}

async function saveProject() {
  try {
    let filePath = store.currentFilePath;
    if (!filePath) {
      const selected = await save({ filters: [{ name: 'Noah Project', extensions: ['noah'] }], defaultPath: store.title + '.noah' });
      if (!selected) return;
      filePath = selected;
    }
    await writeTextFile(filePath!, JSON.stringify({
      format: 'noah-v1', title: store.title, components: store.components, pages: store.pages,
      mqttBrokerUrl: store.mqttBrokerUrl, showGrid: store.showGrid, showPageDots: store.showPageDots,
      canvasConfig: store.canvasConfig, pageStyle: store.pageStyle, fillMode: store.fillMode,
      autoPlay: store.autoPlay, customShow: store.customShow,
    }, null, 2));
    store.currentFilePath = filePath;
    store.markClean();
    alert('保存成功！');
  } catch (e) { alert('保存失败: ' + String(e)); }
}

async function saveProjectAs() {
  try {
    const selected = await save({ filters: [{ name: 'Noah Project', extensions: ['noah'] }], defaultPath: store.title + '.noah' });
    if (!selected) return;
    await writeTextFile(selected, JSON.stringify({
      format: 'noah-v1', title: store.title, components: store.components, pages: store.pages,
      mqttBrokerUrl: store.mqttBrokerUrl, showGrid: store.showGrid, showPageDots: store.showPageDots,
      canvasConfig: store.canvasConfig, pageStyle: store.pageStyle, fillMode: store.fillMode,
      autoPlay: store.autoPlay, customShow: store.customShow,
    }, null, 2));
    store.currentFilePath = selected;
    store.markClean();
    alert('另存为成功！');
  } catch (e) { alert('另存为失败: ' + String(e)); }
}

async function exportHtml() {
  try {
    const selected = await save({ filters: [{ name: 'HTML File', extensions: ['html'] }], defaultPath: store.title + '.html' });
    if (!selected) return;

    const { readFile, writeFile } = await import('@tauri-apps/plugin-fs');

    const mediaComps = store.components.filter(
      c => (c.type === 'Video' || c.type === 'Audio') && c.props?.filePath
    );

    let html = currentCode.value;
    const mimeMap: Record<string, string> = {
      mp4: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', mov: 'video/quicktime',
      avi: 'video/x-msvideo', mkv: 'video/x-matroska',
      mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', aac: 'audio/aac',
      flac: 'audio/flac', m4a: 'audio/mp4',
    };

    for (const comp of mediaComps) {
      const srcPath = comp.props.filePath;
      const ext = srcPath.split('.').pop()?.toLowerCase() || '';
      const mime = mimeMap[ext] || 'application/octet-stream';

      const data = await readFile(srcPath);
      let binary = '';
      const chunkSize = 8192;
      for (let i = 0; i < data.length; i += chunkSize) {
        binary += String.fromCharCode(...data.subarray(i, i + chunkSize));
      }
      const base64 = btoa(binary);
      const dataUri = `data:${mime};base64,${base64}`;

      const blobUrl = comp.props.src;
      if (blobUrl && html.includes(blobUrl)) {
        html = html.replaceAll(blobUrl, dataUri);
      }
    }

    // Encode as UTF-8 to handle Chinese characters
    const encoder = new TextEncoder();
    await writeFile(selected, encoder.encode(html));

    const msg = mediaComps.length > 0
      ? `导出成功！${mediaComps.length} 个媒体文件已内嵌到 HTML 中`
      : '导出成功！';
    alert(msg);
  } catch (e) { alert('导出失败: ' + String(e)); }
}

async function exportPdf() {
  if (!currentCode.value) { alert('没有可导出的内容'); return; }
  const total = store.pages.length;
  exportProgress.value = { visible: true, title: '正在导出 PDF…', current: 0, total };
  await nextTick();
  await exportPDF(currentCode.value, store.title, total,
    (c, t) => { exportProgress.value.current = c; exportProgress.value.total = t; });
  exportProgress.value.visible = false;
}

async function exportImage() {
  if (!currentCode.value) { alert('没有可导出的内容'); return; }
  const idx = store.currentPageIndex;
  const name = store.pages[idx]?.name || `slide-${idx + 1}`;
  exportProgress.value = { visible: true, title: '正在导出图片…', current: 0, total: 1 };
  await nextTick();
  await exportSlideAsImage(currentCode.value, idx, name);
  exportProgress.value.visible = false;
}

async function exportAllImages() {
  if (!currentCode.value) { alert('没有可导出的内容'); return; }
  const total = store.pages.length;
  exportProgress.value = { visible: true, title: '正在导出图片…', current: 0, total };
  await nextTick();
  try {
    await exportAllSlidesAsImages(currentCode.value, total,
      (c, t) => { exportProgress.value.current = c; exportProgress.value.total = t; });
  } catch (e: any) {
    alert(`导出图片失败: ${e?.message || '未知错误'}`);
  }
  exportProgress.value.visible = false;
}

async function exportPptx() {
  if (!currentCode.value) { alert('没有可导出的内容'); return; }
  const total = store.pages.length;
  exportProgress.value = { visible: true, title: '正在导出 PPTX (截图)…', current: 0, total };
  await nextTick();
  try {
    await exportToPptx(currentCode.value,
      (c, t) => { exportProgress.value.current = c; exportProgress.value.total = t; });
  } catch (e) {
    alert('导出 PPTX (截图) 失败: ' + String(e));
  }
  exportProgress.value.visible = false;
}

async function exportPptxEditable() {
  try {
    await exportToPptxEditable();
  } catch (e) {
    alert('导出 PPTX (可编辑) 失败: ' + String(e));
  }
}

async function importPptx() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.pptx';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const description = await describePptxForAi(file);
      layout.showPanel('ai-chat');
      const { sendMessage } = useAiChat();
      sendMessage(`我导入了一个 PPTX 文件，以下是提取的内容，请根据这些内容帮我重新设计生成 Noah 格式的演示文稿。先问我设计风格偏好，再生成。\n\n${description}`);
    } catch (e) {
      alert('PPTX 导入失败: ' + String(e));
    }
  };
  input.click();
}

async function importNoah() {
  try {
    const selected = await open({ filters: [{ name: 'NOAH JSON', extensions: ['json', 'noah.json'] }, { name: 'All Files', extensions: ['*'] }] });
    if (!selected) return;
    const data = JSON.parse(await readTextFile(selected));
    if (data.project) {
      store.importNoahJson(data);
    } else {
      // 兼容：当作旧版 .noah 文件加载
      store.loadProject(data);
      store.regenerateMediaBlobUrls();
    }
    showSelector.value = false;
  } catch (e) { alert('导入失败: ' + String(e)); }
}

function doPasteImport() {
  try {
    const data = JSON.parse(pasteText.value);
    if (data.project) {
      store.importNoahJson(data);
      showPasteDialog.value = false;
      pasteText.value = '';
      showSelector.value = false;
    } else {
      store.loadProject(data);
      store.regenerateMediaBlobUrls();
      showPasteDialog.value = false;
      pasteText.value = '';
      showSelector.value = false;
    }
  } catch (e) {
    alert('JSON 格式错误，请检查内容');
  }
}

function addComponentFromBar(def: ComponentDef) {
  const comp: ComponentInstance = {
    id: store.genId(), pageId: store.currentPageId, type: def.type,
    position: { x: 100, y: 100 }, size: { ...def.defaultSize }, props: { ...def.defaultProps }
  };
  store.addComponent(comp);
}

function showHelp() {
  alert('Noah IDE v0.1.0\n\n可视化 Web 演示文稿设计工具\n支持拖拽组件、AI 生成、动画引擎、数据绑定\n\n快捷键:\nCtrl+S 保存  Ctrl+Z 撤销  Delete 删除\nF6 全屏  ESC 退出全屏\n\nGitHub: https://github.com/MingKaiShang');
}

function startFullscreen() {
  if (ai.streaming) {
    alert('AI 正在生成中，请等待完成后再开始演示');
    return;
  }
  if (!currentCode.value || currentCode.value.trim() === '') {
    alert('没有可预览的内容，请先添加组件');
    return;
  }
  isFullscreen.value = true;
  nextTick(() => {
    const el = fullscreenRef.value;
    if (el?.requestFullscreen) {
      el.requestFullscreen();
    }
  });
}

function exitFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  isFullscreen.value = false;
}

async function startPresenterMode() {
  if (ai.streaming) {
    alert('AI 正在生成中，请等待完成后再开始演示');
    return;
  }
  // Exit fullscreen if active (e.g., right-click → presenter from fullscreen view)
  if (isFullscreen.value) exitFullscreen();
  if (!currentCode.value || currentCode.value.trim() === '') {
    alert('没有可演示的内容，请先添加组件');
    return;
  }
  if (presenterMode.value) return;

  // Wrap slides HTML with presenter-audience sync script
  const audienceHtml = buildAudienceHTML(currentCode.value);

  // Count visible pages matching current filter (customShow or hidden)
  const total = store.customShow
    ? store.pages.filter(p => store.customShow!.includes(p.id)).length
    : store.pages.filter(p => !p.hidden).length;
  if (total === 0) { alert('没有可显示的页面'); return; }

  // Check if running in Tauri
  const isTauri = !!(window as any).isTauri;
  if (isTauri) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const sessionDir = await invoke('start_presenter_session', { html: audienceHtml, totalSlides: total }) as string;
      presenterSessionDir.value = sessionDir;
    } catch (e) {
      console.error('Failed to open browser:', e);
      alert('无法打开浏览器');
      return;
    }
  } else {
    // Browser: open audience window at screen size
    const win = window.open('about:blank', 'noah-audience',
      `width=${screen.availWidth},height=${screen.availHeight},top=0,left=0`);
    if (!win) {
      alert('请允许弹出窗口以打开观众视图');
      return;
    }
    // document.write() populates the child window synchronously
    win.document.write(audienceHtml);
    win.document.close();
    // Parent still has user activation here — call fullscreen on the child's document
    // directly. This works because blob/about:blank windows are same-origin.
    try { win.document.documentElement.requestFullscreen(); } catch (_) {}
    audienceWindow.value = win;
  }
  presenterMode.value = true;
}

/** Inject sync script + fullscreen hint into audience HTML */
function buildAudienceHTML(slidesHTML: string): string {
  const syncScript = `
<script>
(function(){
  window.__fromPresenter = false;

  // Message listener (runs first since this script is injected before slides' scripts)
  window.addEventListener('message', function(e) {
    if (!e.data) return;
    if (e.data.type === 'navigate' || e.data.type === 'sync') {
      window.__fromPresenter = true;
    }
  });

  // Wrap _noahGoToSlide for Tauri mode (HTTP polling)
  Object.defineProperty(window, '_noahGoToSlide', {
    configurable: true, enumerable: true,
    set: function(fn) {
      var wrapped = function(idx) {
        fn(idx);
        if (!window.__fromPresenter && window.opener) {
          window.opener.postMessage({ type: 'noah-audience-navigate', slideIndex: idx }, '*');
        }
        window.__fromPresenter = false;
      };
      Object.defineProperty(window, '_noahGoToSlide', {
        value: wrapped, writable: true, configurable: true
      });
    },
    get: function() { return undefined; }
  });

  // Poll for slide changes (catches all navigation: keyboard, click, dots)
  var initSlides = document.querySelectorAll('.slide');
  var initActive = document.querySelector('.slide.active');
  var lastIdx = initActive ? Array.prototype.indexOf.call(initSlides, initActive) : -1;
  setInterval(function() {
    var slides = document.querySelectorAll('.slide');
    var active = document.querySelector('.slide.active');
    if (active && slides.length > 0) {
      var idx = Array.prototype.indexOf.call(slides, active);
      if (idx !== lastIdx && idx >= 0) {
        lastIdx = idx;
        if (!window.__fromPresenter && window.opener) {
          window.opener.postMessage({ type: 'noah-audience-navigate', slideIndex: idx }, '*');
        }
        window.__fromPresenter = false;
      }
    }
  }, 200);
})();
<\/script>`;

  // Hint bar: show "双击打开全屏", after dblclick→fullscreen→"双击退出全屏", auto-hides after 3s
  const hintHTML = `
<div id="audience-hint">双击打开全屏</div>
<style>
#audience-hint {
  position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%);
  background: rgba(0,0,0,0.55); color: #fff; font-size: 13px;
  padding: 8px 20px; border-radius: 20px; z-index: 9999;
  pointer-events: none; user-select: none;
  animation: hintFadeOut 0.6s ease 2.5s forwards;
}
@keyframes hintFadeOut {
  to { opacity: 0; visibility: hidden; }
}
</style>
<script>
var hintEl = document.getElementById('audience-hint');
function updateHintText() {
  if (!hintEl) return;
  hintEl.textContent = document.fullscreenElement ? '双击退出全屏' : '双击打开全屏';
  hintEl.style.visibility = 'visible';
  hintEl.style.opacity = '1';
  hintEl.style.animation = 'none';
  void hintEl.offsetWidth;
  hintEl.style.animation = 'hintFadeOut 0.6s ease 2.5s forwards';
  setTimeout(function(){ if(hintEl && hintEl.parentNode) hintEl.parentNode.removeChild(hintEl); }, 4000);
}
document.addEventListener('dblclick', function(e) {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(function(){});
  } else {
    document.documentElement.requestFullscreen().catch(function(){});
  }
  updateHintText();
});
document.addEventListener('fullscreenchange', updateHintText);
setTimeout(function(){ if(hintEl && hintEl.parentNode) hintEl.parentNode.removeChild(hintEl); }, 3500);
<\/script>`;

  // Inject sync script before first <script>
  const firstIdx = slidesHTML.indexOf('<script');
  let result = firstIdx >= 0
    ? slidesHTML.slice(0, firstIdx) + syncScript + slidesHTML.slice(firstIdx)
    : slidesHTML + '\n' + syncScript;

  // Inject hint before </body>
  const bodyEnd = result.indexOf('</body>');
  if (bodyEnd >= 0) {
    result = result.slice(0, bodyEnd) + hintHTML + result.slice(bodyEnd);
  }
  return result;
}

async function closeAudienceWindow() {
  if ((window as any).isTauri) {
    presenterSessionDir.value = '';
  }
  if (audienceWindow.value && !audienceWindow.value.closed) {
    audienceWindow.value.close();
  }
  audienceWindow.value = null;
}

async function startSpectatorMode() {
  if (!currentCode.value || currentCode.value.trim() === '') {
    alert('没有可演示的内容，请先添加组件');
    return;
  }
  const html = currentCode.value;
  const isTauri = !!(window as any).isTauri;
  if (isTauri) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('open_html_in_browser', { html });
    } catch (e) {
      console.error('Failed to open browser:', e);
      alert('无法打开浏览器');
    }
  } else {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, 'noah-spectator', 'width=1280,height=720');
  }
}

function exitPresenterMode() {
  presenterMode.value = false;
  closeAudienceWindow();
}

function handleKeydown(e: KeyboardEvent) {
  // If audience window is open but presenter mode didn't start, Escape closes it
  if (!presenterMode.value && (presenterSessionDir.value || (audienceWindow.value && !audienceWindow.value.closed))) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeAudienceWindow();
      return;
    }
  }

  // Presenter mode handles its own keys
  if (presenterMode.value) return;
  if (isFullscreen.value) {
    if (e.key === 'Escape') { exitFullscreen(); return; }
    if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', ' ', 'PageDown', 'PageUp', 'Home', 'End'].includes(e.key)) {
      e.preventDefault();
      iframeRef.value?.contentWindow?.postMessage({ type: 'keydown', key: e.key }, '*');
    }
    return;
  }

  // Prevent browser refresh (would lose project)
  if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
    e.preventDefault();
    return;
  }

  // Ctrl+S / Ctrl+Shift+S save
  if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
    e.preventDefault();
    if (e.shiftKey) { saveProjectAs(); } else { saveProject(); }
    return;
  }

  // Ctrl+O open
  if ((e.ctrlKey || e.metaKey) && (e.key === 'o' || e.key === 'O')) {
    e.preventDefault();
    openProject();
    return;
  }

  // Ctrl+Z undo
  if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    store.undo();
    return;
  }

  // Ctrl+Y or Ctrl+Shift+Z redo
  if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
    e.preventDefault();
    store.redo();
    return;
  }

  // Delete selected component
  if (e.key === 'Delete' && store.selectedComponentId) {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
    e.preventDefault();
    store.removeComponent(store.selectedComponentId);
    return;
  }

  // F6 fullscreen
  if (e.key === 'F6') { e.preventDefault(); startFullscreen(); return; }
  // F7 presenter mode
  if (e.key === 'F7') { e.preventDefault(); startPresenterMode(); return; }
}

function onFullscreenChange() {
  if (!document.fullscreenElement) {
    isFullscreen.value = false;
  }
}

function onMessage(e: MessageEvent) {
  if (e.data === 'noah-exit-fullscreen' && isFullscreen.value) {
    exitFullscreen();
  }
  if (e.data && e.data.type === 'noah-open-presenter') {
    startPresenterMode();
  }
  if (e.data && e.data.type === 'noah-debug') {
    console.log('[Noah]', e.data.msg);
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('message', onMessage);
  document.addEventListener('fullscreenchange', onFullscreenChange);
  loadDemoOnFirstRun();
  loadLaunchProject();

  // Hide AI chat panel by default on Linux
  try {
    invoke<string>('get_platform').then(p => {
      if (p === 'linux') {
        layout.togglePanel('ai-chat');
      }
    });
  } catch {} // ignore failures during dev

  // Listen for Rust close-with-save event
  const unlistenSave = listen('noah-close-with-save', async () => {
    try {
      let filePath = store.currentFilePath;
      if (!filePath) {
        const selected = await save({ filters: [{ name: 'Noah Project', extensions: ['noah'] }], defaultPath: store.title + '.noah' });
        if (!selected) return; // user cancelled save dialog → don't close
        filePath = selected;
      }
      await writeTextFile(filePath, JSON.stringify({
        format: 'noah-v1', title: store.title, components: store.components, pages: store.pages,
        mqttBrokerUrl: store.mqttBrokerUrl, showGrid: store.showGrid,
        showPageDots: store.showPageDots, canvasConfig: store.canvasConfig, pageStyle: store.pageStyle,
        fillMode: store.fillMode, autoPlay: store.autoPlay, customShow: store.customShow,
      }, null, 2));
      store.currentFilePath = filePath;
      store.markClean();
    } catch (e) {
      console.error('Save failed:', e);
      return; // save failed → don't close
    }
    await invoke('force_close');
  });
});

async function loadDemoOnFirstRun() {
  if (localStorage.getItem('noah-first-run')) return;
  localStorage.setItem('noah-first-run', '1');
  try {
    const resDir = await resourceDir();
    const demoPath = await join(resDir, 'demo-presentation.noah');
    const data = JSON.parse(await readTextFile(demoPath));
    store.loadProject(data);
    store.regenerateMediaBlobUrls();
    store.currentFilePath = null;
  } catch { /* demo file not found, skip */ }
}

// If the app was launched by double-clicking a .noah file, load it
async function loadLaunchProject() {
  try {
    // Method 1: Rust stored the launch content at startup
    const content = await invoke<string | null>('get_launch_project');
    if (content) {
      const data = JSON.parse(content);
      if (data.project) {
        store.importNoahJson(data);
      } else {
        store.loadProject(data);
        store.regenerateMediaBlobUrls();
      }
      showSelector.value = false;
      return;
    }

    // Method 2: Use get_launch_args to find a .noah file path
    const args = await invoke<string[]>('get_launch_args');
    console.log('[NOAH] launch args:', args);
    const noahArg = args.find(a => a.toLowerCase().endsWith('.noah'));
    if (noahArg) {
      const fileContent = await invoke<string>('read_noah_file', { path: noahArg });
      const data = JSON.parse(fileContent);
      if (data.project) {
        store.importNoahJson(data);
      } else {
        store.loadProject(data);
        store.regenerateMediaBlobUrls();
      }
      store.currentFilePath = noahArg;
      showSelector.value = false;
    }
  } catch { /* no launch project, ignore */ }
}
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('message', onMessage);
  document.removeEventListener('fullscreenchange', onFullscreenChange);
});
</script>

<style scoped>
.editor {
  display: flex; flex-direction: column; height: 100vh; width: 100vw;
  overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}
.dock-area {
  flex: 1; display: flex; overflow: hidden; min-height: 0; position: relative;
}
.dock-col {
  display: flex; flex-shrink: 0; overflow: hidden;
}
.dock-col-left { flex-direction: row; }
.dock-col-right { flex-direction: row-reverse; }
.dock-center {
  flex: 1; display: flex; overflow: hidden; min-width: 0; position: relative;
}
.dock-row-bottom {
  position: absolute; bottom: 0; left: 0; right: 0;
  display: flex; flex-direction: column; z-index: 5;
  background: #fff;
}
.splitter {
  flex-shrink: 0; background: transparent; z-index: 6;
  transition: background 0.15s;
}
.splitter:hover, .splitter:active { background: #3498db; }
.splitter-h { width: 4px; cursor: ew-resize; }
.splitter-v { height: 4px; cursor: ns-resize; }
.fullscreen-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  z-index: 99999; background: #000;
}
.fullscreen-iframe { width: 100%; height: 100%; border: none; }
:global(.fullscreen-overlay:fullscreen) { width: 100%; height: 100%; background: #000; }
.paste-overlay {
  position: fixed; inset: 0; z-index: 100000;
  background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;
}
.paste-dialog {
  width: 640px; max-width: 90vw; background: #fff; border-radius: 10px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.2); display: flex; flex-direction: column;
  max-height: 80vh;
}
.paste-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 14px 18px; border-bottom: 1px solid #eee; font-size: 15px; font-weight: 600; color: #333;
}
.paste-close {
  width: 28px; height: 28px; border: none; border-radius: 50%; background: #f1f5f9;
  cursor: pointer; font-size: 16px; color: #666; display: flex; align-items: center; justify-content: center;
}
.paste-close:hover { background: #e2e8f0; }
.paste-textarea {
  flex: 1; min-height: 300px; margin: 16px; padding: 12px; border: 1px solid #e2e8f0;
  border-radius: 6px; font-family: 'Cascadia Code', 'Fira Code', monospace; font-size: 13px;
  line-height: 1.6; resize: none; outline: none; color: #333;
}
.paste-textarea:focus { border-color: #6366f1; }
.paste-footer {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 18px; border-top: 1px solid #eee;
}
.paste-hint { font-size: 12px; color: #999; }
.paste-actions { display: flex; gap: 8px; }
.paste-btn {
  padding: 6px 20px; border-radius: 6px; border: 1px solid #e2e8f0; cursor: pointer;
  font-size: 13px; font-weight: 500;
}
.paste-btn.cancel { background: #fff; color: #666; }
.paste-btn.cancel:hover { background: #f8fafc; }
.paste-btn.confirm { background: #6366f1; color: #fff; border-color: #6366f1; }
.paste-btn.confirm:hover { background: #4f46e5; }
</style>
