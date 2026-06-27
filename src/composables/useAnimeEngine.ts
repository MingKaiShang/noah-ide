import type { ComponentAnimation } from '../types/component';
import { CDN_LINKS } from '../config/cdn';

// ── Anime.js lazy loader ──
let animeLoaded = false;
let animeApi: any = null;
let animeLoadPromise: Promise<void> | null = null;

export function loadAnime(): Promise<void> {
  if (animeLoaded) return Promise.resolve();
  if (animeLoadPromise) return animeLoadPromise;
  animeLoadPromise = new Promise((resolve) => {
    const s = document.createElement('script');
    s.src = CDN_LINKS.animejs;
    s.onload = () => { animeLoaded = true; animeApi = (window as any).anime; resolve(); };
    s.onerror = () => { console.warn('Anime.js failed to load'); resolve(); };
    document.head.appendChild(s);
  });
  return animeLoadPromise;
}

export function getAnimeApi() { return animeApi; }

// ── Loop animation type check ──
const LOOP_TYPES = ['drift', 'pulse', 'float', 'heartbeat', 'shake', 'morphColor', 'glow', 'spin', 'bounce', 'wobble', 'flash', 'wave'];
export function isLoopAnim(type: string): boolean {
  return LOOP_TYPES.includes(type);
}

// ── Get Anime.js animation properties by type ──
export function getAnimProps(anim: ComponentAnimation): Record<string, any> {
  switch (anim.type) {
    // ── Entrance ──
    case 'fadeIn':
      return { opacity: [0, 1] };
    case 'slideUp':
      return { translateY: [30, 0], opacity: [0, 1] };
    case 'slideDown':
      return { translateY: [-30, 0], opacity: [0, 1] };
    case 'slideLeft':
      return { translateX: [30, 0], opacity: [0, 1] };
    case 'slideRight':
      return { translateX: [-30, 0], opacity: [0, 1] };
    case 'scaleIn':
      return { scale: [0.8, 1], opacity: [0, 1] };
    case 'rotateIn':
      return { rotate: ['-90deg', '0deg'], opacity: [0, 1] };
    case 'bounceIn':
      return { scale: [0, 1], opacity: [0, 1] };
    case 'blurIn':
      return { filter: ['blur(10px)', 'blur(0px)'], opacity: [0, 1] };
    case 'swingIn':
      return { rotate: ['-15deg', '0deg'], translateX: [-30, 0], opacity: [0, 1] };
    case 'flipIn':
      return { rotateX: ['-90deg', '0deg'], opacity: [0, 1], perspective: 600 };
    case 'zoomIn':
      return { scale: [3, 1], opacity: [0, 1] };
    case 'revealLeft':
      return { clipPath: ['inset(0 100% 0 0)', 'inset(0 0 0 0)'], opacity: [0, 1] };
    case 'revealUp':
      return { clipPath: ['inset(100% 0 0 0)', 'inset(0 0 0 0)'], opacity: [0, 1] };
    case 'typewriter':
      return { width: ['0%', '100%'], opacity: [0, 1] };
    case 'lightSpeed':
      return { skewX: ['-30deg', '0deg'], translateX: [100, 0], opacity: [0, 1] };
    case 'fadeScale':
      return { scale: [0.6, 1], opacity: [0, 1], translateY: [20, 0] };

    // ── Loop ──
    case 'drift':
      return { translateX: [0, 40], translateY: [0, -30], scale: [1, 1.1] };
    case 'pulse':
      return { scale: [1, 1.05] };
    case 'float':
      return { translateY: [0, -10] };
    case 'heartbeat':
      return { scale: [1, 1.25, 1] };
    case 'shake':
      return { translateX: [0, -8, 8, -5, 5, 0] };
    case 'morphColor':
      return { backgroundColor: ['rgba(99,102,241,0.15)', 'rgba(139,92,246,0.15)', 'rgba(6,182,212,0.15)'] };
    case 'glow':
      return { boxShadow: ['0 0 0 rgba(99,102,241,0)', '0 0 20px rgba(99,102,241,0.5)', '0 0 0 rgba(99,102,241,0)'] };
    case 'spin':
      return { rotate: ['0deg', '360deg'] };
    case 'bounce':
      return { translateY: [0, -15, 0] };
    case 'wobble':
      return { skewX: [0, -5, 5, -3, 3, 0], translateX: [0, -3, 3, -1, 1, 0] };
    case 'flash':
      return { opacity: [1, 0, 1, 0, 1] };
    case 'wave':
      return { translateY: [0, -8, 0, 8, 0], rotate: [0, -3, 0, 3, 0] };

    default:
      return {};
  }
}

// ── Callback interface ──
export interface AnimationCallbacks {
  onBegin?: () => void;
  onComplete?: () => void;
  onLoopBegin?: () => void;
  onLoopComplete?: () => void;
}

// ── Build full anime() params ──
function buildAnimeParams(anim: ComponentAnimation, targets: any, callbacks?: AnimationCallbacks): Record<string, any> {
  const props = getAnimProps(anim);
  const isLoop = isLoopAnim(anim.type);
  const params: Record<string, any> = {
    targets,
    ...props,
    duration: Math.round(anim.duration * 1000),
    delay: Math.round(anim.delay * 1000),
    easing: anim.easing || 'easeOutQuad',
    autoplay: false,
  };

  // Apply stagger
  if (anim.stagger > 0) {
    params.delay = anim.stagger;
  }

  // Handle loop
  if (isLoop) {
    if (anim.iterationCount === 'infinite' || anim.iterationCount === -1) {
      params.loop = true;
    } else {
      params.loop = anim.iterationCount > 1 ? anim.iterationCount : true;
    }
    params.direction = anim.direction || 'alternate';
  } else {
    // For entrance animations, support alternate direction too
    if (anim.direction && anim.direction !== 'normal') {
      params.direction = anim.direction;
    }
  }

  // Apply callbacks
  if (callbacks) {
    if (callbacks.onBegin) params.begin = callbacks.onBegin;
    if (callbacks.onComplete) params.complete = callbacks.onComplete;
    if (callbacks.onLoopBegin) params.loopBegin = callbacks.onLoopBegin;
    if (callbacks.onLoopComplete) params.loopComplete = callbacks.onLoopComplete;
  }

  return params;
}

// ── Timeline step ──
export interface TimelineStep {
  anim: ComponentAnimation;
  targets: any;
  offset: string; // e.g. "+500" for 500ms after previous, "0" for parallel
}

// ── Build anime.timeline ──
export function buildTimeline(steps: TimelineStep[]): any {
  if (!animeApi) return null;
  const tl = animeApi.timeline({ autoplay: false, easing: 'easeOutQuad' });
  steps.forEach(step => {
    const props = getAnimProps(step.anim);
    const params: Record<string, any> = {
      targets: step.targets,
      ...props,
      duration: Math.round(step.anim.duration * 1000),
      easing: step.anim.easing || 'easeOutQuad',
    };
    if (step.anim.stagger > 0) {
      params.delay = animeApi.stagger(step.anim.stagger);
    } else {
      params.delay = Math.round(step.anim.delay * 1000);
    }
    tl.add(params, step.offset);
  });
  return tl;
}

// ── Play animation on a DOM element (for canvas preview) ──
export function playCanvasPreview(el: HTMLElement, anim: ComponentAnimation, callbacks?: AnimationCallbacks): any {
  if (!animeApi || !anim || anim.type === 'none') return null;
  // Reset transforms
  el.style.opacity = '';
  el.style.transform = '';
  el.style.filter = '';
  el.style.backgroundColor = '';
  const params = buildAnimeParams(anim, el, callbacks);
  const instance = animeApi(params);
  instance.play();
  return instance;
}

// ── Generate JS code string for exported HTML ──
export function generateAnimeExportJS(compId: string, anim: ComponentAnimation): string {
  if (!anim || anim.type === 'none') return '';

  const props = getAnimProps(anim);
  const isLoop = isLoopAnim(anim.type);
  const dur = Math.round(anim.duration * 1000);
  const delay = anim.stagger > 0 ? anim.stagger : Math.round(anim.delay * 1000);
  const easing = anim.easing || 'easeOutQuad';

  let loopVal: string | number | boolean = false;
  let dirVal = 'normal';
  if (isLoop) {
    loopVal = (anim.iterationCount === 'infinite' || anim.iterationCount === -1) ? true : (anim.iterationCount > 1 ? anim.iterationCount : true);
    dirVal = anim.direction || 'alternate';
  } else if (anim.direction && anim.direction !== 'normal') {
    dirVal = anim.direction;
  }

  // Only reset inline styles that the animation will actually animate
  const hasOpacity = 'opacity' in props;
  const hasFilter = 'filter' in props;
  const resetTransform = "el.style.transform='';";
  const resetOpacity = hasOpacity ? "el.style.opacity='';" : '';
  const resetFilter = hasFilter ? "el.style.filter='';" : '';

  // Build properties string
  const propEntries = Object.entries(props).map(([key, val]) => {
    if (Array.isArray(val)) {
      return `${key}: ${JSON.stringify(val)}`;
    }
    return `${key}: ${JSON.stringify(val)}`;
  }).join(', ');

  const staggerStr = anim.stagger > 0 ? `,delay:anime.stagger(${anim.stagger})` : '';

  const js = `window._noahAnims['${compId}']=function(){var el=document.querySelector('.${compId}');if(!el)return;${resetTransform}${resetOpacity}${resetFilter}return anime({targets:'.${compId}',${propEntries},duration:${dur},delay:${delay}${staggerStr ? ',' + staggerStr.substring(1) : ''},easing:'${easing}',loop:${loopVal},direction:'${dirVal}',autoplay:true});};`;
  return js;
}
