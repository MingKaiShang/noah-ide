<template>
  <div class="progress-overlay" v-if="visible">
    <div class="progress-mask"></div>
    <div class="progress-dialog">
      <div class="progress-title">{{ title || '导出中…' }}</div>
      <div class="progress-bar-track">
        <div class="progress-bar-fill" :style="{ width: percent + '%' }"></div>
      </div>
      <div class="progress-info">
        <span v-if="current !== total">{{ current }} / {{ total }}</span>
        <span v-else>处理完成</span>
        <span class="progress-pct">{{ percent }}%</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  visible: boolean;
  title?: string;
  current: number;
  total: number;
}>();

const percent = computed(() => {
  if (props.total <= 0) return 0;
  return Math.min(Math.round((props.current / props.total) * 100), 100);
});
</script>

<style scoped>
.progress-overlay {
  position: fixed; inset: 0; z-index: 99999;
  display: flex; align-items: center; justify-content: center;
}
.progress-mask {
  position: absolute; inset: 0; background: rgba(0,0,0,0.35);
}
.progress-dialog {
  position: relative; background: #fff; border-radius: 12px;
  padding: 28px 36px; min-width: 340px; box-shadow: 0 8px 32px rgba(0,0,0,0.2);
  text-align: center;
}
.progress-title {
  font-size: 16px; font-weight: 600; color: #1a1a1a;
  margin-bottom: 20px;
}
.progress-bar-track {
  width: 100%; height: 8px; background: #e8e8e8; border-radius: 4px;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%; background: linear-gradient(90deg, #6366F1, #8B5CF6);
  border-radius: 4px; transition: width 0.2s ease;
}
.progress-info {
  display: flex; justify-content: space-between; margin-top: 10px;
  font-size: 13px; color: #666;
}
.progress-pct { font-variant-numeric: tabular-nums; }
</style>
