<template>
  <div class="preview-container">
    <iframe ref="iframeRef" :srcdoc="html" sandbox="allow-scripts allow-same-origin" class="preview-iframe"></iframe>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps<{ html: string }>();
const iframeRef = ref<HTMLIFrameElement | null>(null);

watch(() => props.html, () => {
  // srcdoc reactivity handles the update
});
</script>

<style scoped>
.preview-container { width: 100%; height: 100%; background: white; }
.preview-iframe { width: 100%; height: 100%; border: none; }
</style>
