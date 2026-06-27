<template>
  <div class="menu-bar">
    <div class="menu-left">
      <input class="title-input" v-model="store.title" />
    </div>
    <div class="menu-right">
      <div class="menu-item" v-for="item in menuItems" :key="item.label">
        <span class="menu-label">{{ item.label }}</span>
        <div class="menu-dropdown">
          <template v-for="child in item.children" :key="child.label ?? 'divider'">
            <!-- Divider -->
            <div v-if="child.divider" class="dropdown-divider"></div>
            <!-- Item with sub-menu -->
            <div v-else-if="child.children" class="dropdown-item has-sub">
              <span class="dropdown-label">{{ child.label }}</span>
              <span class="sub-arrow">▶</span>
              <div class="sub-dropdown">
                <div v-for="sub in child.children" :key="sub.label" class="dropdown-item" @click="sub.action">
                  {{ sub.label }}
                  <span class="shortcut" v-if="sub.shortcut">{{ sub.shortcut }}</span>
                </div>
              </div>
            </div>
            <!-- Regular item -->
            <div v-else class="dropdown-item" @click="child.action">
              {{ child.label }}
              <span class="shortcut" v-if="child.shortcut">{{ child.shortcut }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useProjectStore } from '../stores/project';

const store = useProjectStore();
const emit = defineEmits<{
  newProject: []; openProject: []; saveProject: []; saveProjectAs: []; exportHtml: [];
  importNoah: []; pasteImport: [];
  importPptx: []; exportPptx: []; exportPptxEditable: [];
  undo: []; toggleGrid: []; togglePanel: [string]; startFullscreen: []; startPresenter: []; help: [];
  exportPdf: []; exportImage: []; exportAllImages: [];
}>();

const menuItems = computed(() => [
  { label: '文件', children: [
    { label: '新建', action: () => emit('newProject'), shortcut: '' },
    { label: '打开', action: () => emit('openProject'), shortcut: 'Ctrl+O' },
    { divider: true },
    { label: '保存', action: () => emit('saveProject'), shortcut: 'Ctrl+S' },
    { label: '另存为', action: () => emit('saveProjectAs'), shortcut: 'Ctrl+Shift+S' },
    { divider: true },
    { label: '导入', children: [
      { label: '导入NOAH', action: () => emit('importNoah') },
      { label: '粘贴导入', action: () => emit('pasteImport') },
      { label: '导入PPTX', action: () => emit('importPptx') },
    ]},
    { label: '导出', children: [
      { label: '导出PPTX (截图)', action: () => emit('exportPptx') },
      { label: '导出PPTX (可编辑)', action: () => emit('exportPptxEditable') },
      { label: '导出HTML', action: () => emit('exportHtml') },
      { label: '导出PDF', action: () => emit('exportPdf') },
      { label: '导出当前页为图片', action: () => emit('exportImage') },
      { label: '导出全部页为图片', action: () => emit('exportAllImages') },
    ]},
  ]},
  { label: '编辑', children: [
    { label: '撤销', action: () => emit('undo'), shortcut: 'Ctrl+Z' },
  ]},
  { label: '视图', children: [
    { label: '切换网格', action: () => emit('toggleGrid'), shortcut: '' },
    { label: '代码面板', action: () => emit('togglePanel', 'code-editor'), shortcut: '' },
    { label: '页面/图层', action: () => emit('togglePanel', 'left-panel'), shortcut: '' },
    { label: '属性面板', action: () => emit('togglePanel', 'property-panel'), shortcut: '' },
    { label: 'AI 助手', action: () => emit('togglePanel', 'ai-chat'), shortcut: '' },
  ]},
  { label: '运行', children: [
    { label: '开始', action: () => emit('startFullscreen'), shortcut: 'F6' },
    { label: '演示者模式', action: () => emit('startPresenter'), shortcut: 'F7' },
  ]},
  { label: '帮助', children: [
    { label: '关于 Noah', action: () => emit('help'), shortcut: '' },
  ]},
]);
</script>

<style scoped>
.menu-bar {
  height: 40px; background: #2c3e50; color: white; display: flex;
  align-items: center; justify-content: space-between; padding: 0 12px;
  user-select: none; flex-shrink: 0;
}
.menu-left { display: flex; align-items: center; }
.title-input {
  background: transparent; border: 1px solid transparent; color: white;
  font-size: 14px; padding: 2px 8px; border-radius: 3px; width: 200px;
}
.title-input:hover, .title-input:focus { border-color: #3498db; outline: none; }
.menu-right { display: flex; gap: 2px; }
.menu-item { position: relative; }
.menu-label { padding: 6px 12px; cursor: pointer; border-radius: 3px; font-size: 13px; }
.menu-label:hover { background: rgba(255,255,255,0.1); }
.menu-dropdown {
  display: none; position: absolute; top: 100%; left: 0; background: white;
  color: #333; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  min-width: 160px; z-index: 1000; padding: 4px 0; margin-top: 2px;
}
.menu-item:hover .menu-dropdown { display: block; }
.menu-item:last-child .menu-dropdown { left: auto; right: 0; }
.dropdown-item {
  padding: 7px 16px; cursor: pointer; font-size: 13px;
  display: flex; justify-content: space-between; align-items: center;
  white-space: nowrap; position: relative;
}
.dropdown-item:hover { background: #f0f0f0; }
.shortcut { color: #999; font-size: 11px; margin-left: 20px; }
.dropdown-divider { height: 1px; background: #e8e8e8; margin: 4px 8px; }
.has-sub { padding-right: 8px; }
.dropdown-label { flex: 1; }
.sub-arrow { font-size: 10px; color: #999; margin-left: 20px; }
.sub-dropdown {
  position: absolute; top: -4px; left: calc(100% - 5px);
  visibility: hidden; transition: visibility 0s 0.15s;
  background: white; color: #333; border-radius: 0 6px 6px 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
  min-width: 180px; z-index: 1001; padding: 4px 0;
}
.sub-dropdown .dropdown-item { font-size: 11.5px; padding: 4px 12px; }
.has-sub:hover .sub-dropdown { visibility: visible; transition: visibility 0s 0s; }
</style>
