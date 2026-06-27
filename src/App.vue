<template>
  <n-config-provider>
    <n-message-provider>
      <Editor />
    </n-message-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { NConfigProvider, NMessageProvider } from 'naive-ui';
import Editor from './views/Editor.vue';

// 全局禁用浏览器默认右键菜单
document.addEventListener('contextmenu', (e) => {
  const tag = (e.target as HTMLElement).tagName;
  // 输入框和文本区域保留右键
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;
  e.preventDefault();
});
</script>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body, #app { width: 100%; height: 100%; overflow: hidden; }
/* 禁止 UI 区域意外选中文本 */
body { user-select: none; -webkit-user-select: none; }
/* 输入框和文本区域允许选中 */
input, textarea, [contenteditable] { user-select: auto; -webkit-user-select: auto; }
</style>
