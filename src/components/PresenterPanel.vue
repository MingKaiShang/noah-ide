<template>
  <div class="presenter-overlay" @keydown="onKeydown">
    <!-- Header: minimal info bar -->
    <div class="presenter-header">
      <div class="h-left">
        <div class="presenter-timer">{{ pm.formatTime(pm.elapsed.value) }}</div>
      </div>
      <div class="h-center">
        <div class="progress-wrap">
          <div class="progress-page">{{ pm.currentSlide.value + 1 }} / {{ pm.totalSlides.value }}</div>
          <div class="progress-bar-bg">
            <div class="progress-bar-fill" :style="{ width: barPercent + '%' }"></div>
          </div>
        </div>
      </div>
      <div class="h-right">
        <span class="audience-badge" :class="{ connected: pm.audienceConnected.value }">
          <span class="badge-dot"></span>
          {{ pm.audienceConnected.value ? '观众已连接' : '等待观众...' }}
        </span>
        <button class="exit-btn" @click="$emit('exit')" title="退出演示 (Esc)">✕</button>
      </div>
    </div>

    <!-- Body: main preview + side panel -->
    <div class="presenter-body">
      <!-- Current slide -->
      <div class="main-stage" @click="onPreviewClick">
        <div class="stage-label">当前</div>
        <div class="stage-frame">
          <iframe class="stage-iframe" :srcdoc="singleSlideHTML(pm.currentSlide.value)" />
        </div>
        <div class="stage-hint">点击左30% ← 上一页 · 右70% → 下一页</div>
      </div>

      <!-- Side panel -->
      <div class="side-panel" v-if="pm.currentSlide.value + 1 < pm.totalSlides.value || currentNotes">
        <!-- Next slide -->
        <div class="side-next" v-if="pm.currentSlide.value + 1 < pm.totalSlides.value" @click="onPreviewClick">
          <div class="side-label">下一张</div>
          <div class="side-frame-wrap">
            <iframe class="side-frame" :srcdoc="singleSlideHTML(pm.currentSlide.value + 1)" />
          </div>
        </div>

        <!-- Notes -->
        <div class="side-notes" v-if="currentNotes">
          <div class="side-label">
            <span>📝 备注</span>
          </div>
          <div class="notes-scroll">
            <div class="notes-text">{{ currentNotes }}</div>
          </div>
        </div>

        <!-- Empty state -->
        <div class="side-empty" v-if="!currentNotes && pm.currentSlide.value + 1 >= pm.totalSlides.value">
          <div class="empty-text">已是最后一页</div>
        </div>
      </div>
    </div>

    <!-- Bottom: navigation -->
    <div class="presenter-bottom">
      <button class="bottom-nav" @click="pm.prevSlide()" :disabled="pm.currentSlide.value <= 0">
        <span class="nav-arrow">◀</span>
        <span class="nav-label">上一页</span>
      </button>
      <div class="thumb-strip">
        <button v-for="i in pm.totalSlides.value" :key="i" class="thumb-dot"
          :class="{ active: i - 1 === pm.currentSlide.value }"
          @click="pm.navigateToSlide(i - 1)">
          {{ i }}
        </button>
      </div>
      <button class="bottom-nav" @click="pm.nextSlide()" :disabled="pm.currentSlide.value + 1 >= pm.totalSlides.value">
        <span class="nav-label">下一页</span>
        <span class="nav-arrow">▶</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { usePresenterMode } from '../composables/usePresenterMode';
import { useProjectStore } from '../stores/project';
import { useCodeGenerator } from '../composables/useCodeGenerator';

const props = defineProps<{
  htmlContent: string;
  audienceWindow: Window | null;
  sessionDir?: string;
}>();

const emit = defineEmits<{ exit: [] }>();

const pm = usePresenterMode();
const store = useProjectStore();
const { generatedCode } = useCodeGenerator();

const barPercent = computed(() =>
  pm.totalSlides.value > 1 ? (pm.currentSlide.value / (pm.totalSlides.value - 1)) * 100 : 0
);

const currentNotes = computed(() => {
  const idx = pm.currentSlide.value;
  const page = store.pages[idx];
  return page?.notes || '';
});

function singleSlideHTML(idx: number): string {
  // Inject a script that shows only the Nth slide, and hide slide nav dots
  const injectScript = `
  <style>.slide-nav{display:none!important}</style>
  <script>
  (function() {
    var slides = document.querySelectorAll('.slide');
    slides.forEach(function(s, i) { s.classList.toggle('active', i === ${idx}); });
  })();
  <\/script>`;
  return props.htmlContent.replace('</body>', injectScript + '\n</body>');
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
    e.preventDefault();
    pm.nextSlide();
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    e.preventDefault();
    pm.prevSlide();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    emit('exit');
  }
}

function onPreviewClick(e: MouseEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  if (x > 0.3) {
    pm.nextSlide();
  } else {
    pm.prevSlide();
  }
}

/** Handle audience → presenter navigation messages */
function onAudienceMessage(e: MessageEvent) {
  if (e.data && e.data.type === 'noah-audience-navigate' && typeof e.data.slideIndex === 'number') {
    pm.navigateToSlide(e.data.slideIndex);
  }
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown);
  window.addEventListener('message', onAudienceMessage);
  // Start presenter mode with total slides count (respects customShow / hidden)
  const total = store.customShow
    ? store.pages.filter(p => store.customShow!.includes(p.id)).length
    : store.pages.filter(p => !p.hidden).length;
  pm.startPresenter(total);

  if (props.audienceWindow) {
    pm.setAudienceWindow(props.audienceWindow);
  } else if (props.sessionDir) {
    // Tauri mode: sync slides by writing to state.json
    pm.setAudienceConnected(true);
    pm.onNavigate(async (idx: number) => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('update_presenter_slide', {
          sessionDir: props.sessionDir,
          slideIndex: idx,
          totalSlides: total,
        });
      } catch (e) {
        console.error('Failed to sync slide:', e);
      }
    });
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', onKeydown);
  window.removeEventListener('message', onAudienceMessage);
  pm.setAudienceWindow(null);
  pm.stopPresenter();
});
</script>

<style scoped>
/* ── Root ── */
.presenter-overlay {
  position: fixed; inset: 0; z-index: 20000;
  background: #0b1121; color: #e2e8f0;
  display: flex; flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  user-select: none;
}

/* ── Header ── */
.presenter-header {
  display: flex; align-items: center; gap: 16px;
  padding: 10px 20px; background: #0f172a;
  border-bottom: 1px solid #1e293b;
  flex-shrink: 0;
}
.h-left { display: flex; align-items: center; min-width: 90px; }
.h-center { flex: 1; display: flex; justify-content: center; }
.h-right { display: flex; align-items: center; gap: 12px; }

.presenter-timer {
  font-size: 18px; font-weight: 700; font-family: 'SF Mono', 'Fira Code', monospace;
  color: #818cf8; letter-spacing: 0.5px;
}

.progress-wrap {
  width: 360px; display: flex; flex-direction: column; gap: 4px;
}
.progress-page {
  font-size: 12px; color: #64748b; text-align: center; letter-spacing: 0.5px;
}
.progress-bar-bg {
  width: 100%; height: 4px; background: #1e293b; border-radius: 2px; overflow: hidden;
}
.progress-bar-fill {
  height: 100%; background: linear-gradient(90deg, #6366f1, #818cf8);
  border-radius: 2px; transition: width 0.3s ease;
}

.audience-badge {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: #64748b; padding: 4px 10px;
  border-radius: 20px; background: #1e293b; border: 1px solid #334155;
}
.audience-badge.connected { color: #22c55e; border-color: #22c55e40; background: #22c55e10; }
.badge-dot {
  width: 6px; height: 6px; border-radius: 50%; background: #ef4444;
}
.audience-badge.connected .badge-dot { background: #22c55e; }

.exit-btn {
  width: 30px; height: 30px; border: none; border-radius: 6px;
  background: transparent; color: #64748b; cursor: pointer; font-size: 16px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.exit-btn:hover { background: #ef444420; color: #ef4444; }

/* ── Body ── */
.presenter-body {
  flex: 1; display: flex; gap: 20px; padding: 20px 24px;
  overflow: hidden; justify-content: center; min-height: 0;
}

/* Main stage */
.main-stage {
  flex: 1; max-width: 68%; display: flex; flex-direction: column; gap: 6px;
  cursor: pointer; min-width: 0;
}
.stage-label {
  font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 1.5px;
  flex-shrink: 0;
}
.stage-frame {
  flex: 1; border: 1px solid #1e293b; border-radius: 10px; overflow: hidden;
  background: #fff; min-height: 0;
}
.stage-iframe {
  width: 100%; height: 100%; border: none; display: block; pointer-events: none;
}
.stage-hint {
  font-size: 11px; color: #334155; text-align: center; letter-spacing: 0.3px;
  flex-shrink: 0;
}

/* Side panel */
.side-panel {
  width: 300px; display: flex; flex-direction: column; gap: 12px;
  flex-shrink: 0; min-height: 0;
}
.side-label {
  font-size: 11px; color: #475569; text-transform: uppercase; letter-spacing: 1.5px;
  display: flex; align-items: center; gap: 6px;
}

/* Next preview */
.side-next {
  display: flex; flex-direction: column; gap: 6px;
  cursor: pointer; flex-shrink: 0;
}
.side-frame-wrap {
  height: 170px; border: 1px solid #1e293b; border-radius: 8px; overflow: hidden;
  background: #fff;
}
.side-frame {
  width: 100%; height: 100%; border: none; display: block; pointer-events: none;
}

/* Notes */
.side-notes {
  flex: 1; display: flex; flex-direction: column; gap: 6px; min-height: 0;
}
.notes-scroll {
  flex: 1; padding: 10px 12px; background: #0f172a; border-radius: 8px;
  border: 1px solid #1e293b; overflow-y: auto; min-height: 60px;
}
.notes-text {
  font-size: 13px; color: #94a3b8; line-height: 1.6; white-space: pre-wrap;
}

/* Empty state */
.side-empty {
  flex: 1; display: flex; align-items: center; justify-content: center;
  border: 1px dashed #1e293b; border-radius: 8px;
}
.empty-text { font-size: 13px; color: #334155; }

/* ── Bottom navigation ── */
.presenter-bottom {
  display: flex; align-items: center; gap: 16px;
  padding: 10px 24px; background: #0f172a; border-top: 1px solid #1e293b;
  justify-content: center; flex-shrink: 0;
}
.bottom-nav {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 14px; border: 1px solid #1e293b; border-radius: 6px;
  background: transparent; color: #64748b; cursor: pointer; font-size: 12px;
  transition: all 0.15s;
}
.bottom-nav:hover:not(:disabled) { background: #1e293b; color: #e2e8f0; }
.bottom-nav:disabled { opacity: 0.25; cursor: default; }
.nav-arrow { font-size: 14px; }

.thumb-strip {
  display: flex; gap: 5px; overflow-x: auto; padding: 2px 0;
}
.thumb-dot {
  width: 26px; height: 26px; border-radius: 50%; border: 1px solid #334155;
  background: transparent; color: #475569; cursor: pointer; font-size: 11px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s; flex-shrink: 0;
}
.thumb-dot:hover { background: #1e293b; color: #94a3b8; }
.thumb-dot.active { background: #6366f1; color: #fff; border-color: #6366f1; font-weight: 600; }
</style>
