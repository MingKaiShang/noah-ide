import { ref, onUnmounted } from 'vue';

export interface PresenterMessage {
  type: 'ping' | 'sync' | 'navigate';
  slideIndex?: number;
  totalSlides?: number;
}

export function usePresenterMode() {
  const isPresenter = ref(false);
  const currentSlide = ref(0);
  const totalSlides = ref(0);
  const elapsed = ref(0);
  const audienceConnected = ref(false);

  let timerHandle: ReturnType<typeof setInterval> | null = null;
  let navigateCb: ((idx: number) => void) | null = null;
  let audienceWin: Window | null = null;

  function formatTime(s: number): string {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  /** Set the audience window reference for postMessage communication */
  function setAudienceWindow(win: Window | null) {
    audienceWin = win;
    audienceConnected.value = win !== null;
  }

  function setAudienceConnected(connected: boolean) {
    audienceConnected.value = connected;
  }

  function startPresenter(total: number) {
    isPresenter.value = true;
    totalSlides.value = total;
    currentSlide.value = 0;
    elapsed.value = 0;

    timerHandle = setInterval(() => { elapsed.value++; }, 1000);
  }

  function navigateToSlide(idx: number) {
    if (idx < 0 || idx >= totalSlides.value) return;
    currentSlide.value = idx;

    // Send to audience window via postMessage
    if (audienceWin && !audienceWin.closed) {
      audienceWin.postMessage({
        type: 'navigate',
        slideIndex: idx,
        totalSlides: totalSlides.value,
      } satisfies PresenterMessage, '*');
    }

    navigateCb?.(idx);
  }

  function prevSlide() { navigateToSlide(currentSlide.value - 1); }
  function nextSlide() { navigateToSlide(currentSlide.value + 1); }

  function onNavigate(cb: (idx: number) => void) {
    navigateCb = cb;
  }

  function stopPresenter() {
    if (timerHandle) { clearInterval(timerHandle); timerHandle = null; }
    isPresenter.value = false;
    audienceConnected.value = false;
    audienceWin = null;
  }

  onUnmounted(() => {
    stopPresenter();
  });

  return {
    isPresenter, currentSlide, totalSlides, elapsed, audienceConnected,
    formatTime, setAudienceWindow, setAudienceConnected,
    startPresenter, navigateToSlide, prevSlide, nextSlide, onNavigate,
    stopPresenter,
  };
}
