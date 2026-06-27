<template>
  <div class="ai-chat">
    <!-- Toolbar -->
    <div class="ai-toolbar">
      <span class="ai-toolbar-title">AI 助手</span>
      <div class="ai-toolbar-actions">
        <button class="ai-tb-btn" @click="ai.showConfig = true" title="配置" aria-label="AI 配置">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16">
            <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
        <button class="ai-tb-btn" @click="toggleHistory" title="历史记录" aria-label="历史记录">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </button>
        <button class="ai-tb-btn" @click="ai.clearMessages()" title="清空对话" aria-label="清空对话">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16" height="16">
            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Messages -->
    <div class="ai-messages" ref="messagesRef">
      <!-- History panel -->
      <template v-if="ai.showHistoryPanel">
        <div class="ai-history-panel">
          <div class="ai-history-top">
            <span class="ai-history-title">历史记录</span>
            <button class="ai-history-back" @click="ai.showHistoryPanel = false" title="关闭">✕</button>
          </div>
          <button class="ai-history-new" @click="onNewChat">＋ 新建对话</button>
          <div class="ai-history-list">
            <div v-for="h in sortedHistories" :key="h.id"
                 class="ai-history-item"
                 :class="{ active: h.id === ai.currentHistoryId }"
                 @click="onLoadHistory(h.id)">
              <div class="ai-history-item-info">
                <div class="ai-history-item-title">{{ h.title }}</div>
                <div class="ai-history-item-meta">{{ h.messages.length }} 条消息 · {{ formatRelTime(h.updatedAt) }}</div>
              </div>
              <button class="ai-history-del" @click.stop="onDeleteHistory(h.id)" title="删除">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="12" height="12">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
            <div v-if="ai.histories.length === 0" class="ai-history-empty">
              暂无历史记录
            </div>
          </div>
        </div>
      </template>

      <!-- Normal chat view -->
      <template v-else>
        <div v-if="ai.messages.length === 0" class="ai-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40" class="ai-empty-icon">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          <div class="ai-empty-title">AI 助手</div>
          <div class="ai-empty-desc">告诉我你想创建什么样的幻灯片，AI 会自动生成并导入</div>
          <div class="ai-suggestions">
            <button class="ai-sug-btn" @click="sendSuggestion('做一个科技公司介绍的幻灯片，5页')">
              科技公司介绍
            </button>
            <button class="ai-sug-btn" @click="sendSuggestion('做一个数据分析仪表盘幻灯片')">
              数据仪表盘
            </button>
            <button class="ai-sug-btn" @click="sendSuggestion('做一个简洁的产品发布演示，深色主题')">
              产品发布
            </button>
          </div>
        </div>
        <div v-for="(msg, idx) in ai.messages" :key="idx" class="ai-msg" :class="msg.role">
          <div class="ai-msg-bubble" @contextmenu.prevent.stop="onMsgCtx($event, msg)">
            <div class="ai-msg-content" v-if="msg.role === 'user'">{{ msg.content }}</div>
            <div class="ai-msg-content ai-markdown" v-else v-html="renderMarkdown(msg.content)"></div>
            <!-- Import button: inline check, no streaming condition to avoid stuck state -->
            <button v-if="msg.role === 'assistant'" class="ai-import-btn"
                    :class="{ 'ai-import-disabled': ai.streaming }"
                    :disabled="ai.streaming"
                    @click="doImport(msg)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              一键导入
            </button>
          </div>
        </div>
        <div v-if="ai.streaming" class="ai-streaming">
          <span class="ai-dot"></span>
          <span class="ai-dot"></span>
          <span class="ai-dot"></span>
        </div>
        <div v-if="ai.continuationStatus" class="ai-cont-status">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 12a9 9 0 11-6.219-8.56"/></svg>
          {{ ai.continuationStatus }}
        </div>

        <!-- Scroll-to-bottom button -->
        <Transition name="ai-scroll-btn">
          <button v-if="userScrolledUp" class="ai-scroll-bottom-btn" @click="clickScrollBottom" aria-label="回到底部">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16">
              <path d="M6 9l6 6 6-6"/>
            </svg>
            <span v-if="ai.streaming" class="ai-scroll-label">新内容</span>
          </button>
        </Transition>
      </template>
    </div>

    <!-- Right-click context menu -->
    <Transition name="ai-ctx">
      <div v-if="ctxShow" class="ai-ctx-menu" :style="{ left: ctxX + 'px', top: ctxY + 'px' }">
        <button class="ai-ctx-item" @click="copySelection">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 012-2h2a2 2 0 012 2v0M8 5a2 2 0 002 2h2a2 2 0 002-2v0m-6 9l2 2 4-4"/></svg>
          复制选中文字
        </button>
        <button class="ai-ctx-item" @click="copyFullMsg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          复制全文
        </button>
        <button v-if="ctxHasCode" class="ai-ctx-item" @click="copyAllCode">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          复制代码
        </button>
      </div>
    </Transition>

    <!-- Toast -->
    <Transition name="ai-toast">
      <div v-if="toast.show" class="ai-toast" :class="'ai-toast--' + toast.type">
        <svg v-if="toast.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M20 6L9 17l-5-5"/></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        {{ toast.text }}
      </div>
    </Transition>

    <!-- Input -->
    <div class="ai-input-area">
      <textarea class="ai-input" ref="inputRef" v-model="inputText"
                placeholder="描述你想要的幻灯片..."
                rows="1"
                @keydown.enter.exact.prevent="doSend"
                @input="onInputResize"></textarea>
      <button class="ai-send-btn" :disabled="ai.streaming || !inputText.trim()" @click="doSend">
        <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
          <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onMounted, onUnmounted, computed } from 'vue';
import { useAiStore } from '../stores/ai';
import { useAiChat } from '../composables/useAiChat';
import { useProjectStore } from '../stores/project';

const ai = useAiStore();
const store = useProjectStore();
const { sendMessage } = useAiChat();

const inputText = ref('');
const messagesRef = ref<HTMLDivElement | null>(null);
const inputRef = ref<HTMLTextAreaElement | null>(null);

const userScrolledUp = ref(false);
let scrollPending = false;

// Toast notification
const toast = ref({ show: false, text: '', type: 'success' as 'success' | 'error' });
let toastTimer = 0;
function showToast(text: string, type: 'success' | 'error' = 'success') {
  clearTimeout(toastTimer);
  toast.value = { show: true, text, type };
  toastTimer = window.setTimeout(() => { toast.value.show = false; }, 2000);
}

// Context menu
const ctxShow = ref(false);
const ctxX = ref(0);
const ctxY = ref(0);
const ctxMsg = ref<{ content: string } | null>(null);
const ctxHasCode = ref(false);

function onMsgCtx(e: MouseEvent, msg: { content: string }) {
  ctxMsg.value = msg;
  ctxHasCode.value = /```/.test(msg.content);
  // Position: keep within viewport
  const menuW = 160, menuH = ctxHasCode.value ? 110 : 76;
  ctxX.value = Math.min(e.clientX, window.innerWidth - menuW - 8);
  ctxY.value = Math.min(e.clientY, window.innerHeight - menuH - 8);
  ctxShow.value = true;
  e.preventDefault();
}

function closeCtx() {
  ctxShow.value = false;
}

function copySelection() {
  const sel = window.getSelection()?.toString().trim();
  if (sel) {
    navigator.clipboard.writeText(sel).catch(() => {});
    showToast('已复制');
  }
  closeCtx();
}

function copyFullMsg() {
  if (ctxMsg.value) {
    navigator.clipboard.writeText(ctxMsg.value.content).catch(() => {});
    showToast('已复制');
  }
  closeCtx();
}

function copyAllCode() {
  if (!ctxMsg.value) { closeCtx(); return; }
  const blocks: string[] = [];
  const re = /```\w*\n?([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(ctxMsg.value.content)) !== null) {
    blocks.push(m[1].trim());
  }
  if (blocks.length) {
    navigator.clipboard.writeText(blocks.join('\n\n')).catch(() => {});
    showToast('代码已复制');
  }
  closeCtx();
}

function onDocClick(e: MouseEvent) {
  if (ctxShow.value && !(e.target as HTMLElement).closest('.ai-ctx-menu')) {
    closeCtx();
  }
}

function doSend() {
  const text = inputText.value.trim();
  if (!text || ai.streaming) return;
  inputText.value = '';
  userScrolledUp.value = false;
  sendMessage(text);
}

function sendSuggestion(text: string) {
  inputText.value = text;
  doSend();
}

function onInputResize() {
  const el = inputRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 100) + 'px';
}

// ── Chat History ──

const sortedHistories = computed(() => {
  return [...ai.histories].sort((a, b) => b.updatedAt - a.updatedAt);
});

function toggleHistory() {
  ai.showHistoryPanel = !ai.showHistoryPanel;
  if (ai.showHistoryPanel) {
    // Refresh histories from storage
    ai.loadHistories();
  }
}

function onNewChat() {
  ai.newChat();
}

function onLoadHistory(id: string) {
  ai.loadHistory(id);
}

function onDeleteHistory(id: string) {
  ai.deleteHistory(id);
}

function formatRelTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(timestamp).toLocaleDateString('zh-CN');
}

function isAtBottom(): boolean {
  const el = messagesRef.value;
  if (!el) return true;
  return el.scrollHeight - el.scrollTop - el.clientHeight < 40;
}

function scrollToBottom() {
  const el = messagesRef.value;
  if (!el) return;
  // Instant scroll (no smooth) to avoid stuttering during streaming
  el.scrollTop = el.scrollHeight;
}

// Scroll to bottom after DOM update (skipped if user scrolled up)
function scheduleScroll() {
  if (userScrolledUp.value || scrollPending) return;
  scrollPending = true;
  nextTick(() => {
    scrollPending = false;
    if (!userScrolledUp.value) scrollToBottom();
  });
}

function onScroll() {
  userScrolledUp.value = !isAtBottom();
  if (ctxShow.value) closeCtx();
}

function clickScrollBottom() {
  userScrolledUp.value = false;
  scrollToBottom();
}

onMounted(() => {
  ai.loadHistories();
  messagesRef.value?.addEventListener('scroll', onScroll, { passive: true });
  document.addEventListener('click', onDocClick);
});

onUnmounted(() => {
  messagesRef.value?.removeEventListener('scroll', onScroll);
  document.removeEventListener('click', onDocClick);
});

// New message added → always scroll to bottom
watch(() => ai.messages.length, () => {
  userScrolledUp.value = false;
  nextTick(scrollToBottom);
});

// Content updating during streaming → scroll only if user hasn't scrolled up
watch(() => ai.messages[ai.messages.length - 1]?.content, () => {
  if (ai.streaming) {
    scheduleScroll();
  } else {
    nextTick(() => {
      if (!userScrolledUp.value) scrollToBottom();
    });
  }
});

function isValidNoahJson(obj: any): boolean {
  return obj && (obj.format === 'noah-v1' || obj.action === 'updatePage' || obj.action === 'updatePages');
}

function getImportLabel(_msg: { content: string }): string {
  return '一键导入';
}

function doImport(msg: { content: string }) {
  if (ai.streaming) return;
  const json = extractJson(msg.content);
  if (!json) {
    showToast('未找到可导入的数据', 'error');
    return;
  }
  try {
    if (json.action === 'updatePage' && json.pageIndex !== undefined) {
      store.updatePageFromJson(json.pageIndex, json.page ?? json.pageData);
    } else if (json.action === 'updatePages' && Array.isArray(json.pages)) {
      store.updatePagesFromJson(json.pages);
    } else {
      store.importNoahJson(json);
    }
    showToast('导入成功');
  } catch (e: any) {
    showToast('导入失败: ' + (e?.message || e), 'error');
  }
}

function repairJson(text: string): string | null {
  // Close unclosed braces/brackets in truncated JSON
  let inString = false;
  let escapeNext = false;
  const stack: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (escapeNext) { escapeNext = false; continue; }
    if (ch === '\\' && inString) { escapeNext = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') stack.push('}');
    else if (ch === '[') stack.push(']');
    else if ((ch === '}' || ch === ']') && stack.length > 0) {
      const expected = stack[stack.length - 1];
      if (ch === expected) stack.pop();
    }
  }

  if (stack.length === 0) return null; // already balanced, parsing already failed
  let repaired = text;
  for (let i = stack.length - 1; i >= 0; i--) {
    repaired += stack[i];
  }
  return repaired;
}

function extractJson(content: any): any | null {
  if (typeof content !== 'string') return null;

  // Strip <think> reasoning blocks — including unclosed ones from cut-off streaming
  let cleanContent = content.replace(/<think>[\s\S]*?(?:<\/think>|$)/g, '');

  // Strategy 1: try ALL code blocks (not just the first)
  const codeBlockRegex = /```(?:json)?\s*\n?([\s\S]*?)```/g;
  let match;
  const allBlocks: string[] = [];
  while ((match = codeBlockRegex.exec(cleanContent)) !== null) {
    const trimmed = match[1].trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (isValidNoahJson(parsed)) return parsed;
    } catch {}
    if (trimmed.startsWith('{')) allBlocks.push(trimmed);
  }

  // Strategy 1b: merge pages from multiple repaired code blocks
  // (handles low-token models where JSON is split across several ```json blocks)
  if (allBlocks.length > 1) {
    const merged: any = {};
    let hasBase = false;
    for (const block of allBlocks) {
      const repaired = repairJson(block);
      if (!repaired) continue;
      try {
        const obj = JSON.parse(repaired);
        if (!isValidNoahJson(obj)) continue;
        if (!hasBase) {
          Object.assign(merged, obj);
          merged.pages = [];
          hasBase = true;
        }
        if (obj.pages && Array.isArray(obj.pages)) {
          merged.pages.push(...obj.pages);
        }
      } catch {}
    }
    if (hasBase && merged.pages.length > 0) return merged;
  }

  // Strategy 2: try to find JSON directly (without code block markers)
  // Use matchAll with g flag to iterate ALL candidates, not just the first
  const nakedJsonRegex = /\{[\s\S]*?"format":\s*"noah-v1"[\s\S]*?\}/g;
  const nakedMatches = cleanContent.matchAll(nakedJsonRegex);
  for (const nakedMatch of nakedMatches) {
    try {
      const parsed = JSON.parse(nakedMatch[0]);
      if (isValidNoahJson(parsed)) return parsed;
    } catch {}
  }

  // Strategy 3: balanced brace matching, try EVERY '{' until we find a valid one
  for (let s = 0; s < cleanContent.length; s++) {
    if (cleanContent[s] !== '{') continue;
    let depth = 0;
    for (let i = s; i < cleanContent.length; i++) {
      if (cleanContent[i] === '{') depth++;
      else if (cleanContent[i] === '}') depth--;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(cleanContent.slice(s, i + 1));
          if (isValidNoahJson(parsed)) return parsed;
        } catch {}
        break; // this brace-pair failed, try next '{'
      }
    }
  }

  // Strategy 4: handle truncated JSON — count unclosed brackets and auto-close them
  const firstBrace = cleanContent.indexOf('{');
  if (firstBrace >= 0 && cleanContent.indexOf('"format"', firstBrace) >= firstBrace) {
    let inString = false;
    let escapeNext = false;
    const stack: string[] = [];
    for (let i = firstBrace; i < cleanContent.length; i++) {
      const ch = cleanContent[i];
      if (escapeNext) { escapeNext = false; continue; }
      if (ch === '\\' && inString) { escapeNext = true; continue; }
      if (ch === '"') { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') stack.push('}');
      else if (ch === '[') stack.push(']');
      else if ((ch === '}' || ch === ']') && stack.length > 0) {
        const expected = stack[stack.length - 1];
        if (ch === expected) stack.pop();
      }
    }
    if (stack.length > 0) {
      let repaired = cleanContent.slice(firstBrace);
      for (let i = stack.length - 1; i >= 0; i--) {
        repaired += stack[i];
      }
      try {
        const parsed = JSON.parse(repaired);
        if (isValidNoahJson(parsed)) return parsed;
      } catch {}
    }
  }

  // Strategy 5: extract individual pages by any "name" field.
  // This is the final fallback for severely corrupted JSON where the full
  // structure is unparseable. Instead of relying on a hardcoded list of page names,
  // it finds ALL "name": "..." patterns and extracts the surrounding object.
  {
    const pages: any[] = [];
    const nameRegex = /"name"\s*:\s*"([^"]+)"/g;
    let nameMatch;

    while ((nameMatch = nameRegex.exec(cleanContent)) !== null) {
      const pageName = nameMatch[1];
      const idx = nameMatch.index;

      // Forward scan: from before the "name" key, track depth to find matching }
      let depth = 0;
      let inStr = false;
      let esc = false;
      let objEnd = -1;

      for (let i = idx; i < cleanContent.length; i++) {
        const ch = cleanContent[i];
        if (esc) { esc = false; continue; }
        if (ch === '\\' && inStr) { esc = true; continue; }
        if (ch === '"') { inStr = !inStr; continue; }
        if (inStr) continue;
        if (ch === '{') depth++;
        else if (ch === '}') {
          if (depth === 0) { objEnd = i; break; }
          depth--;
        }
      }
      if (objEnd < 0) continue;

      // Backward scan: find the last { before idx that's not inside a string.
      let objStart = -1;
      {
        let bDepth = 0;
        let bInStr = false;
        let bEsc = false;
        for (let i = idx - 1; i >= 0; i--) {
          const ch = cleanContent[i];
          if (bEsc) { bEsc = false; continue; }
          if (ch === '\\' && bInStr) { bEsc = true; continue; }
          if (ch === '"') { bInStr = !bInStr; continue; }
          if (bInStr) continue;
          if (ch === '}') bDepth++;
          else if (ch === '{') {
            if (bDepth === 0) { objStart = i; break; }
            bDepth--;
          }
        }
      }
      if (objStart < 0) continue;

      // Try to parse the extracted page
      const pageStr = cleanContent.slice(objStart, objEnd + 1);
      try {
        const parsed = JSON.parse(pageStr);
        if (parsed && typeof parsed.name === 'string') {
          pages.push(parsed);
          continue;
        }
      } catch {}
      // Fallback: try repairJson
      const repaired = repairJson(pageStr);
      if (repaired) {
        try {
          const parsed = JSON.parse(repaired);
          if (parsed && typeof parsed.name === 'string') {
            pages.push(parsed);
          }
        } catch {}
      }
    }

    if (pages.length > 0) {
      const seen = new Set<string>();
      const uniquePages = pages.filter(p => {
        const key = p.name;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return {
        format: 'noah-v1',
        project: { title: '', canvas: { width: 1280, height: 720 }, background: '#ffffff' },
        pages: uniquePages,
        pageTransition: 'slide',
      };
    }
  }

  return null;
}

function renderMarkdown(text: string): string {
  try {
    // Extract closed thinking blocks first (<think>...</think>)
  const thinkRegex = new RegExp('<think>([\\s\\S]*?)' + '<' + '/think>', 'g');
  let processed = text;
  const thinkBlocks: string[] = [];

  processed = processed.replace(thinkRegex, (_m, content) => {
    const idx = thinkBlocks.length;
    thinkBlocks.push(content.trim());
    return `%%THINK_${idx}%%`;
  });

  // Also handle open/incomplete thinking block (still streaming)
  let openThinkHtml = '';
  const openThinkMatch = processed.match(new RegExp('<think>([\\s\\S]*)$'));
  if (openThinkMatch) {
    processed = processed.slice(0, openThinkMatch.index);
    const escaped = openThinkMatch[1].trim()
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    openThinkHtml = `<details class="ai-think-block ai-thinking" open><summary class="ai-think-summary ai-thinking-summary">思考中...</summary><div class="ai-think-content">${escaped}</div></details>`;
  }

  // Escape HTML (must happen BEFORE code block extraction)
  let html = processed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks — extract COMPLETE blocks first
  const codeBlocks: string[] = [];
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_m, lang, code) => {
    const idx = codeBlocks.length;
    const trimmed = code.trim();
    const label = lang || 'code';
    codeBlocks.push(trimmed);
    return `%%CODE_${idx}_${label}%%`;
  });

  // Handle INCOMPLETE code blocks (streaming: opening ``` without closing)
  // Match remaining ``` that weren't consumed above
  let openCodeHtml = '';
  const openCodeMatch = html.match(/```(\w*)\n?([\s\S]*)$/);
  if (openCodeMatch) {
    html = html.slice(0, openCodeMatch.index);
    const lang = openCodeMatch[1] || 'code';
    const escapedCode = openCodeMatch[2]
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    openCodeHtml = `<div class="ai-code-wrap"><div class="ai-code-header"><span class="ai-code-lang">${lang}</span></div><pre class="ai-code-block ai-code-streaming"><code>${escapedCode}</code></pre></div>`;
  }

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Line breaks
  html = html.replace(/\n/g, '<br>');

  // Restore complete code blocks
  codeBlocks.forEach((code, i) => {
    const marker = new RegExp(`%%CODE_${i}_(\\w+)%%`);
    html = html.replace(marker, (_m, lang) => {
      return `<div class="ai-code-wrap"><div class="ai-code-header"><span class="ai-code-lang">${lang}</span><button class="ai-copy-btn" onclick="navigator.clipboard.writeText(this.closest('.ai-code-wrap').querySelector('code').textContent).then(()=>{this.textContent='已复制';setTimeout(()=>this.textContent='复制',1500)})">复制</button></div><pre class="ai-code-block"><code>${code}</code></pre></div>`;
    });
  });

  // Restore think blocks
  thinkBlocks.forEach((content, i) => {
    const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    html = html.replace(
      `%%THINK_${i}%%`,
      `<details class="ai-think-block"><summary class="ai-think-summary">思考过程</summary><div class="ai-think-content">${escaped}</div></details>`
    );
  });

  if (openCodeHtml) html = html + openCodeHtml;
  if (openThinkHtml) html = html + openThinkHtml;
  return html;
  } catch { return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>'); }
}
</script>

<style scoped>
.ai-chat {
  display: flex; flex-direction: column; height: 100%;
  background: linear-gradient(180deg, #fafbfc 0%, #f4f5f7 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* Toolbar */
.ai-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 8px 12px; border-bottom: 1px solid #e2e4e8;
  background: #fff; flex-shrink: 0;
}
.ai-toolbar-title {
  font-size: 13px; font-weight: 600; color: #1e293b;
  letter-spacing: 0.01em;
}
.ai-toolbar-actions { display: flex; gap: 4px; }
.ai-tb-btn {
  width: 28px; height: 28px; border: none; border-radius: 6px;
  background: transparent; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: #94a3b8;
  transition: color 0.2s ease, background-color 0.2s ease, transform 0.15s ease;
}
.ai-tb-btn:hover {
  background: #f1f5f9; color: #475569;
}
.ai-tb-btn:active { transform: scale(0.92); }
.ai-tb-btn:focus-visible {
  outline: 2px solid #6366f1; outline-offset: 1px;
}

/* Messages */
.ai-messages {
  flex: 1; overflow-y: auto; padding: 12px;
  display: flex; flex-direction: column; gap: 10px;
  min-height: 0; position: relative;
}
.ai-empty {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  gap: 12px; padding: 24px 20px; text-align: center;
}
.ai-empty-icon {
  color: #cbd5e1;
}
.ai-empty-title {
  font-size: 15px; font-weight: 600; color: #1e293b;
}
.ai-empty-desc {
  font-size: 12px; color: #94a3b8; max-width: 220px; line-height: 1.7;
}
.ai-suggestions {
  display: flex; flex-direction: column; gap: 6px; margin-top: 8px;
}
.ai-sug-btn {
  padding: 7px 18px; border: 1px solid #e2e8f0; border-radius: 20px;
  background: #fff; cursor: pointer; font-size: 12px; color: #64748b;
  transition: all 0.2s ease;
}
.ai-sug-btn:hover {
  border-color: #6366f1; color: #6366f1; background: #f5f3ff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.12);
}
.ai-sug-btn:active { transform: translateY(0); }
.ai-sug-btn:focus-visible {
  outline: 2px solid #6366f1; outline-offset: 2px;
}

/* Message entrance — instant text visibility */
.ai-msg {
  display: flex;
}
.ai-msg.user { justify-content: flex-end; }
.ai-msg.assistant { justify-content: flex-start; }

.ai-msg-bubble {
  max-width: 85%; display: flex; flex-direction: column; gap: 6px;
}
.ai-msg-content {
  padding: 9px 13px; border-radius: 12px; font-size: 13px; line-height: 1.65;
  word-break: break-word;
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
}
.ai-msg.user .ai-msg-content {
  background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
  color: #fff; border-bottom-right-radius: 3px;
  box-shadow: 0 2px 8px rgba(99, 102, 241, 0.25);
}
.ai-msg.assistant .ai-msg-content {
  background: #fff; color: #334155;
  border: 1px solid #e2e4e8; border-bottom-left-radius: 3px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

/* Markdown in assistant messages — text always readable, no animation on text */
.ai-markdown {
  font-size: 14px; line-height: 1.7;
  color: #1e293b;
}
.ai-markdown :deep(.ai-code-wrap) {
  position: relative; margin: 8px 0; border-radius: 8px;
  overflow: hidden; border: 1px solid #1e293b;
}
.ai-markdown :deep(.ai-code-header) {
  display: flex; align-items: center; justify-content: space-between;
  padding: 5px 10px; background: #1e293b;
  position: sticky; top: 0; z-index: 2;
}
.ai-markdown :deep(.ai-code-lang) {
  font-size: 11px; color: #94a3b8; font-weight: 500; text-transform: uppercase;
}
.ai-markdown :deep(.ai-copy-btn) {
  padding: 2px 10px; border: 1px solid #334155; border-radius: 4px;
  background: transparent; color: #94a3b8; font-size: 11px; cursor: pointer;
  transition: none;
}
.ai-markdown :deep(.ai-copy-btn:hover) {
  background: #334155; color: #e2e8f0;
}
.ai-markdown :deep(pre.ai-code-block) {
  background: #0f172a; color: #e2e8f0;
  padding: 10px 14px; margin: 0;
  overflow-x: auto; font-size: 13px;
  max-height: 300px; overflow-y: auto;
  line-height: 1.6;
}
.ai-markdown :deep(pre.ai-code-block code) {
  font-family: 'Cascadia Code', 'Fira Code', monospace;
}
.ai-markdown :deep(.ai-code-streaming) {
  border-left: 3px solid #6366f1;
}
.ai-markdown :deep(code.ai-inline-code) {
  background: #f1f5f9; color: #6366f1;
  padding: 2px 6px; border-radius: 4px; font-size: 13px;
}
.ai-markdown :deep(p) { margin: 4px 0; }
.ai-markdown :deep(strong) { font-weight: 700; color: #0f172a; }
.ai-markdown :deep(ul), .ai-markdown :deep(ol) { padding-left: 20px; margin: 4px 0; }
.ai-markdown :deep(li) { margin: 2px 0; }
.ai-markdown :deep(h1), .ai-markdown :deep(h2), .ai-markdown :deep(h3),
.ai-markdown :deep(h4) { margin: 10px 0 4px; font-weight: 600; color: #0f172a; }
.ai-markdown :deep(h1) { font-size: 16px; }
.ai-markdown :deep(h2) { font-size: 15px; }
.ai-markdown :deep(h3) { font-size: 14px; }
.ai-markdown :deep(h4) { font-size: 13px; }
.ai-markdown :deep(blockquote) {
  margin: 6px 0; padding: 6px 12px; border-left: 3px solid #6366f1;
  background: #f8fafc; border-radius: 0 4px 4px 0;
  color: #475569; font-size: 13px;
}
.ai-markdown :deep(a) { color: #6366f1; text-decoration: underline; }
.ai-markdown :deep(hr) { border: none; border-top: 1px solid #e2e8f0; margin: 10px 0; }
.ai-markdown :deep(table) { border-collapse: collapse; width: 100%; margin: 6px 0; font-size: 13px; }
.ai-markdown :deep(th), .ai-markdown :deep(td) {
  padding: 6px 10px; border: 1px solid #e2e8f0; text-align: left;
}
.ai-markdown :deep(th) { background: #f1f5f9; font-weight: 600; }

/* Thinking block — no animation, always readable */
.ai-markdown :deep(.ai-think-block) {
  margin: 6px 0; border: 1px solid #e2e8f0; border-radius: 8px;
  background: #f8fafc; overflow: hidden;
}
.ai-markdown :deep(.ai-think-summary) {
  padding: 6px 10px; font-size: 11px; font-weight: 600;
  color: #94a3b8; cursor: pointer; user-select: none;
  list-style: none; display: flex; align-items: center; gap: 4px;
}
.ai-markdown :deep(.ai-think-summary)::-webkit-details-marker { display: none; }
.ai-markdown :deep(.ai-think-summary::before) {
  content: '▶'; font-size: 8px; transition: none;
}
.ai-markdown :deep(.ai-think-block[open] .ai-think-summary::before) {
  transform: rotate(90deg);
}
.ai-markdown :deep(.ai-think-content) {
  padding: 8px 12px; font-size: 13px; color: #475569;
  line-height: 1.7; border-top: 1px solid #e2e8f0;
}
.ai-markdown :deep(.ai-thinking) {
  border-color: #6366f1;
}
.ai-markdown :deep(.ai-thinking-summary) {
  color: #6366f1 !important;
  /* NO animation on text */
}

/* Import button */
.ai-import-btn {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 16px; border: 1px solid #6366f1; border-radius: 8px;
  background: #f5f3ff; color: #6366f1; cursor: pointer; font-size: 12px;
  font-weight: 500; align-self: flex-start;
  transition: background 0.15s ease, color 0.15s ease;
}
.ai-import-btn:hover {
  background: #6366f1; color: #fff;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  transform: translateY(-1px);
  animation: none;
}
.ai-import-btn:active { transform: translateY(0); }
.ai-import-btn:focus-visible {
  outline: 2px solid #6366f1; outline-offset: 2px;
}
.ai-import-disabled {
  opacity: 0.4; cursor: not-allowed; animation: none;
  pointer-events: none;
}

/* Streaming dots */
.ai-streaming {
  display: flex; gap: 5px; padding: 6px 0 6px 4px;
}
.ai-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: #94a3b8;
  animation: ai-bounce 1.4s ease-in-out infinite;
}
.ai-dot:nth-child(2) { animation-delay: 0.16s; }
.ai-dot:nth-child(3) { animation-delay: 0.32s; }

/* Continuation status */
.ai-cont-status {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 10px; font-size: 12px; color: #6366f1;
  background: #f5f3ff; border-radius: 8px; border: 1px solid #e0e7ff;
  animation: ai-cont-pulse 2s ease-in-out infinite;
  align-self: flex-start;
}
.ai-cont-status svg { animation: ai-cont-spin 1.5s linear infinite; }
@keyframes ai-cont-spin { to { transform: rotate(360deg); } }
@keyframes ai-cont-pulse { 0%, 100% { opacity: 0.85; } 50% { opacity: 1; } }
@keyframes ai-bounce {
  0%, 80%, 100% { opacity: 0.25; transform: scale(0.75); }
  40% { opacity: 1; transform: scale(1); }
}

/* Input */
.ai-input-area {
  display: flex; align-items: flex-end; gap: 8px;
  padding: 10px 12px; border-top: 1px solid #e2e4e8;
  background: #fff; flex-shrink: 0;
}
.ai-input {
  flex: 1; padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 10px;
  font-size: 13px; outline: none; resize: none; font-family: inherit;
  line-height: 1.5; min-height: 38px; max-height: 100px; overflow: hidden;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.ai-input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}
.ai-send-btn {
  width: 38px; height: 38px; border: none; border-radius: 10px;
  background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
  color: #fff; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);
}
.ai-send-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}
.ai-send-btn:active { transform: scale(0.95); }
.ai-send-btn:disabled {
  background: #c7d2fe; cursor: not-allowed;
  box-shadow: none; transform: none;
}
.ai-send-btn:focus-visible {
  outline: 2px solid #6366f1; outline-offset: 2px;
}


/* Scroll-to-bottom button */
.ai-scroll-bottom-btn {
  position: absolute; bottom: 6px; left: 50%;
  transform: translateX(-50%);
  display: flex; align-items: center; gap: 4px;
  padding: 5px 14px; border: 1px solid #e2e8f0; border-radius: 20px;
  background: #fff; color: #64748b; cursor: pointer;
  font-size: 11px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  z-index: 5;
  transition: all 0.2s ease;
}
.ai-scroll-bottom-btn:hover {
  background: #6366f1; color: #fff; border-color: #6366f1;
  box-shadow: 0 4px 14px rgba(99,102,241,0.3);
}
.ai-scroll-label { font-weight: 500; }

.ai-scroll-btn-enter-active { transition: all 0.2s ease; }
.ai-scroll-btn-leave-active { transition: all 0.15s ease; }
.ai-scroll-btn-enter-from,
.ai-scroll-btn-leave-to { opacity: 0; transform: translateX(-50%) translateY(6px); }

/* Context menu */
.ai-ctx-menu {
  position: fixed; z-index: 9999;
  background: #fff; border: 1px solid #e2e8f0; border-radius: 10px;
  padding: 4px; min-width: 150px;
  box-shadow: 0 6px 24px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06);
}
.ai-ctx-item {
  display: flex; align-items: center; gap: 8px;
  width: 100%; padding: 7px 12px; border: none; border-radius: 6px;
  background: transparent; cursor: pointer; font-size: 12px; color: #334155;
  text-align: left; white-space: nowrap;
  transition: background 0.12s ease;
}
.ai-ctx-item:hover {
  background: #f1f5f9; color: #6366f1;
}
.ai-ctx-item svg { flex-shrink: 0; color: #94a3b8; }
.ai-ctx-item:hover svg { color: #6366f1; }

.ai-ctx-enter-active { transition: all 0.12s ease; }
.ai-ctx-leave-active { transition: all 0.1s ease; }
.ai-ctx-enter-from,
.ai-ctx-leave-to { opacity: 0; transform: scale(0.95); }

/* Toast notification */
.ai-toast {
  position: absolute; bottom: 70px; left: 50%; transform: translateX(-50%);
  display: flex; align-items: center; gap: 6px;
  padding: 7px 16px; border-radius: 20px;
  font-size: 12px; font-weight: 500; white-space: nowrap;
  z-index: 20; pointer-events: none;
  box-shadow: 0 4px 16px rgba(0,0,0,0.15);
}
.ai-toast--success {
  background: #065f46; color: #d1fae5;
}
.ai-toast--error {
  background: #991b1b; color: #fecaca;
}
.ai-toast-enter-active { transition: all 0.25s ease; }
.ai-toast-leave-active { transition: all 0.2s ease; }
.ai-toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(10px); }
.ai-toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(-10px); }

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .ai-dot { animation: none; opacity: 0.5; }
  .ai-sug-btn,
  .ai-send-btn,
  .ai-scroll-bottom-btn,
  .ai-input {
    transition: none;
  }
}

/* ── History Panel ── */
.ai-history-panel {
  position: absolute; inset: 0;
  background: #fff; z-index: 10;
  display: flex; flex-direction: column;
  overflow: hidden;
}
.ai-history-top {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px 8px;
}
.ai-history-title {
  font-size: 14px; font-weight: 600; color: #1e293b;
}
.ai-history-back {
  width: 26px; height: 26px; border: none; border-radius: 6px;
  background: transparent; color: #94a3b8; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  font-size: 14px;
  transition: all 0.15s;
}
.ai-history-back:hover { background: #f1f5f9; color: #475569; }

.ai-history-new {
  margin: 4px 14px 8px; padding: 8px 0;
  border: 1px dashed #cbd5e1; border-radius: 8px;
  background: transparent; color: #6366f1; cursor: pointer;
  font-size: 13px; font-weight: 500;
  transition: all 0.15s;
}
.ai-history-new:hover { background: #f5f3ff; border-color: #6366f1; }

.ai-history-list {
  flex: 1; overflow-y: auto; padding: 0 10px 10px;
}
.ai-history-item {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 10px; border-radius: 8px;
  cursor: pointer; transition: background 0.12s;
}
.ai-history-item:hover { background: #f1f5f9; }
.ai-history-item.active { background: #f5f3ff; }
.ai-history-item-info { flex: 1; min-width: 0; }
.ai-history-item-title {
  font-size: 13px; font-weight: 500; color: #1e293b;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.ai-history-item-meta {
  font-size: 11px; color: #94a3b8; margin-top: 2px;
}
.ai-history-del {
  width: 26px; height: 26px; border: none; border-radius: 6px;
  background: transparent; color: #cbd5e1; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: all 0.12s;
  flex-shrink: 0;
}
.ai-history-item:hover .ai-history-del { opacity: 1; }
.ai-history-del:hover { background: #fee2e2; color: #ef4444; }
.ai-history-empty {
  text-align: center; padding: 40px 20px;
  font-size: 13px; color: #94a3b8;
}
</style>
