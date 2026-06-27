<template>
  <div class="component-bar">
    <button class="ai-trigger" @click="onAiClick" title="AI 助手">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="20" height="20">
        <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1.07A7 7 0 0 1 13 21v-1h-2v1a7 7 0 0 1-6.93-6H3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z"/>
        <circle cx="9" cy="14" r="1.5" fill="currentColor"/>
        <circle cx="15" cy="14" r="1.5" fill="currentColor"/>
      </svg>
    </button>
    <div class="tabs">
      <div v-for="cat in categories" :key="cat" class="tab"
           :class="{ active: activeCategory === cat }" @click="activeCategory = cat">
        {{ cat }}
      </div>
    </div>
    <div class="components">
      <div v-for="comp in filtered" :key="comp.type" class="comp-btn"
           @click="handleClick(comp)" @mousedown="onDragStart($event, comp)">
        <span class="comp-icon">{{ comp.icon }}</span>
        <span class="comp-label">{{ comp.label }}</span>
      </div>
    </div>
    <!-- Drag ghost -->
    <div v-if="dragging" class="drag-ghost" ref="ghostRef">
      <span class="ghost-icon">{{ dragging.icon }}</span>
      <span class="ghost-label">{{ dragging.label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useProjectStore } from '../stores/project';
import { useDockLayout } from '../composables/useDockLayout';
import { COMPONENT_DEFS, type ComponentDef } from '../types/component';

const store = useProjectStore();
const layout = useDockLayout();
const emit = defineEmits<{ addComponent: [ComponentDef]; dragStart: [ComponentDef]; }>();

const categories = ['基础', '展示', '形状', '背景', '数据', '图表', '特效'];
const activeCategory = ref('基础');
const filtered = computed(() => {
  return COMPONENT_DEFS.filter(c => c.category === activeCategory.value);
});

const dragging = ref<ComponentDef | null>(null);
const ghostRef = ref<HTMLDivElement | null>(null);

function handleClick(comp: ComponentDef) {
  emit('addComponent', comp);
}

function onAiClick() {
  layout.togglePanel('ai-chat');
}

function onDragStart(e: MouseEvent, comp: ComponentDef) {
  e.preventDefault();
  dragging.value = comp;
  store.dragComponentType = comp.type;
  document.addEventListener('mousemove', onDragMove);
  document.addEventListener('mouseup', onDragEnd);
}

function onDragMove(e: MouseEvent) {
  if (!ghostRef.value) return;
  ghostRef.value.style.left = e.clientX - 28 + 'px';
  ghostRef.value.style.top = e.clientY - 24 + 'px';
}

function onDragEnd(e: MouseEvent) {
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragEnd);
  if (!dragging.value) return;
  // Check if dropped on canvas
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (el) {
    const canvasEl = el.closest('.canvas-wrapper');
    if (canvasEl) {
      store.dragComponentType = dragging.value.type;
      // Dispatch a synthetic drop event on the canvas wrapper
      canvasEl.dispatchEvent(new CustomEvent('noah-drop', {
        detail: { clientX: e.clientX, clientY: e.clientY, type: dragging.value.type },
        bubbles: false,
      }));
    }
  }
  dragging.value = null;
}
</script>

<style scoped>
.component-bar {
  height: 60px; background: #fff; border-bottom: 1px solid #e8e8e8;
  display: flex; align-items: center; padding: 0 12px; gap: 12px; flex-shrink: 0;
  position: relative;
}
.ai-trigger {
  width: 36px; height: 36px; border: 1px solid #e2e8f0; border-radius: 8px;
  background: #fff; cursor: pointer; display: flex; align-items: center;
  justify-content: center; color: #6366f1; flex-shrink: 0;
  transition: all 0.2s ease;
}
.ai-trigger:hover {
  background: #f5f3ff; border-color: #6366f1;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.15);
  transform: translateY(-1px);
}
.ai-trigger:active { transform: translateY(0); }
.ai-trigger:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }
.tabs { display: flex; gap: 4px; flex-shrink: 0; }
.tab {
  padding: 6px 14px; cursor: pointer; border-radius: 4px; font-size: 13px;
  color: #666; transition: all 0.2s;
}
.tab:hover { background: #f0f0f0; }
.tab.active { background: #3498db; color: white; }
.components { display: flex; gap: 8px; flex: 1; overflow-x: auto; }
.comp-btn {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: 56px; height: 48px; border: 1px solid #e0e0e0; border-radius: 6px;
  cursor: grab; transition: all 0.2s; flex-shrink: 0; user-select: none;
}
.comp-btn:hover { border-color: #3498db; background: #f0f7ff; }
.comp-btn:active { cursor: grabbing; }
.comp-icon { font-size: 16px; font-weight: bold; color: #3498db; }
.comp-label { font-size: 10px; color: #666; margin-top: 2px; }
.drag-ghost {
  position: fixed; z-index: 100000; pointer-events: none;
  width: 56px; height: 48px; border-radius: 6px;
  background: #3498db; color: #fff;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  box-shadow: 0 4px 12px rgba(52,152,219,0.4);
  opacity: 0.9;
}
.ghost-icon { font-size: 16px; font-weight: bold; }
.ghost-label { font-size: 10px; margin-top: 2px; }
</style>
