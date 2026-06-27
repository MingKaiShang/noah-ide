<template>
  <div class="canvas-selector-overlay">
    <div class="canvas-selector-dialog">
      <h2 class="dialog-title">选择画布</h2>
      <p class="dialog-desc">新建项目，请先选择画布尺寸</p>
      <div class="preset-grid">
        <div v-for="p in presets" :key="p.type" class="preset-card"
             :class="{ active: selectedType === p.type }"
             @click="selectPreset(p)">
          <div class="preset-preview" :style="getPreviewStyle(p)">
            <span class="preset-size">{{ p.width }}×{{ p.height }}</span>
          </div>
          <span class="preset-label">{{ p.label }}</span>
        </div>
      </div>
      <div v-if="selectedType === 'custom'" class="custom-inputs">
        <div class="custom-row">
          <label>宽度</label>
          <input type="number" v-model.number="customWidth" min="100" max="7680" class="custom-input" />
        </div>
        <div class="custom-row">
          <label>高度</label>
          <input type="number" v-model.number="customHeight" min="100" max="4320" class="custom-input" />
        </div>
      </div>
      <div class="dialog-actions">
        <button class="btn-primary" @click="handleConfirm">确定</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useProjectStore, CANVAS_PRESETS, type CanvasConfig } from '../stores/project';

const store = useProjectStore();
const presets = CANVAS_PRESETS;
const selectedType = ref<CanvasConfig['type']>('slide');
const customWidth = ref(800);
const customHeight = ref(600);

const props = defineProps<{
  onDone: () => void;
}>();

function selectPreset(p: typeof presets[0]) {
  selectedType.value = p.type;
}

function getPreviewStyle(p: typeof presets[0]) {
  const maxW = 120, maxH = 80;
  const ratio = p.width / p.height;
  let w = maxW, h = maxH;
  if (ratio > maxW / maxH) { h = w / ratio; } else { w = h * ratio; }
  return { width: w + 'px', height: h + 'px' };
}

function handleConfirm() {
  const preset = presets.find(p => p.type === selectedType.value);
  const config: CanvasConfig = {
    type: selectedType.value,
    width: selectedType.value === 'custom' ? customWidth.value : (preset?.width || 1280),
    height: selectedType.value === 'custom' ? customHeight.value : (preset?.height || 720),
  };
  store.canvasConfig = config;
  props.onDone();
}

function onCancel() {
  props.onDone();
}
</script>

<style scoped>
.canvas-selector-overlay {
  position: fixed; inset: 0; z-index: 10000;
  background: rgba(0,0,0,0.6); display: flex;
  align-items: center; justify-content: center;
  backdrop-filter: blur(4px);
}
.canvas-selector-dialog {
  background: #fff; border-radius: 12px; padding: 32px;
  width: 520px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}
.dialog-title { margin: 0 0 4px; font-size: 22px; color: #1a1a1a; }
.dialog-desc { margin: 0 0 24px; color: #888; font-size: 14px; }
.preset-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 20px; }
.preset-card {
  border: 2px solid #e8e8e8; border-radius: 8px; padding: 16px;
  cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 10px;
  transition: all 0.2s;
}
.preset-card:hover { border-color: #3498db; background: #f0f7ff; }
.preset-card.active { border-color: #3498db; background: #e8f4fd; }
.preset-preview {
  background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
}
.preset-size { font-size: 10px; color: #999; }
.preset-label { font-size: 14px; color: #333; font-weight: 500; }
.custom-inputs { display: flex; gap: 16px; margin-bottom: 20px; }
.custom-row { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.custom-row label { font-size: 13px; color: #666; }
.custom-input {
  padding: 8px 12px; border: 1px solid #d9d9d9; border-radius: 6px;
  font-size: 14px; outline: none;
}
.custom-input:focus { border-color: #3498db; }
.dialog-actions { display: flex; justify-content: flex-end; }
.btn-primary {
  padding: 10px 32px; background: #3498db; color: #fff; border: none;
  border-radius: 6px; font-size: 15px; cursor: pointer; transition: background 0.2s;
}
.btn-primary:hover { background: #2980b9; }
</style>
