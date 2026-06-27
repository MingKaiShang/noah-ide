<template>
  <div class="code-editor">
    <div class="code-toolbar">
      <span class="toolbar-title">生成代码</span>
      <div class="toolbar-actions">
        <button class="copy-btn" @click="copyCode">{{ copied ? '已复制' : '复制代码' }}</button>
      </div>
    </div>
    <div ref="editorContainer" class="editor-container"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';

const props = defineProps<{ code: string }>();
const emit = defineEmits<{ 'update:code': [string] }>();

const editorContainer = ref<HTMLElement | null>(null);
const copied = ref(false);
let editor: any = null;
let monacoLoaded = false;
let suppressEmit = false;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function loadMonaco() {
  if (monacoLoaded) return;
  try {
    await loadScript('https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs/loader.min.js');
    await new Promise<void>((resolve) => {
      (window as any).require.config({
        paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs' }
      });
      (window as any).require(['vs/editor/editor.main'], () => {
        monacoLoaded = true;
        resolve();
      });
    });
  } catch (e) {
    console.error('Failed to load Monaco:', e);
  }
}

async function initEditor() {
  await loadMonaco();
  if (!editorContainer.value || !(window as any).monaco) return;
  const monaco = (window as any).monaco;
  editor = monaco.editor.create(editorContainer.value, {
    value: props.code || '',
    language: 'html',
    readOnly: false,
    theme: 'vs',
    minimap: { enabled: false },
    fontSize: 13,
    lineNumbers: 'on',
    scrollBeyondLastLine: false,
    automaticLayout: true,
    wordWrap: 'on',
    folding: true,
    tabSize: 2,
  });

  // Listen for user edits
  editor.onDidChangeModelContent(() => {
    if (!suppressEmit) {
      emit('update:code', editor.getValue());
    }
  });
}

onMounted(async () => {
  await nextTick();
  await initEditor();
});

watch(() => props.code, (newCode) => {
  if (editor && editor.getValue() !== newCode) {
    suppressEmit = true;
    editor.setValue(newCode || '');
    suppressEmit = false;
  }
});

onUnmounted(() => {
  if (editor) editor.dispose();
});

async function copyCode() {
  const text = editor ? editor.getValue() : props.code || '';
  try {
    await navigator.clipboard.writeText(text);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    copied.value = true;
    setTimeout(() => { copied.value = false; }, 2000);
  }
}
</script>

<style scoped>
.code-editor { display: flex; flex-direction: column; height: 100%; background: #fff; }
.code-toolbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 12px; background: #f5f5f5; border-bottom: 1px solid #e0e0e0; flex-shrink: 0;
}
.toolbar-title { font-size: 13px; font-weight: 600; color: #333; }
.toolbar-actions { display: flex; gap: 8px; }
.copy-btn {
  padding: 4px 12px; background: #3498db; color: white; border: none;
  border-radius: 4px; cursor: pointer; font-size: 12px;
}
.copy-btn:hover { background: #2980b9; }
.editor-container { flex: 1; min-height: 0; }
</style>
