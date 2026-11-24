import { useEffect, useState, type RefObject } from 'react';
import { useMotionValueEvent, useScroll } from 'motion/react';
import Lenis from 'lenis';

/** Store links go through the Worker's redirects (cloudflare/src/index.ts, ../stores.json). */
export const GET_IOS = '/get/ios';
export const GET_ANDROID = '/get/android';

let lenis: Lenis | null = null;

/** Smooth scroll to an element (Lenis when it runs, the browser's own otherwise; instant with reduced motion). */
export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenis) lenis.scrollTo(el);
  else el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
  history.replaceState(null, '', `#${id}`);
}

export function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function saveData(): boolean {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  return !!c?.saveData;
}

/** false on the server and on the first client render (so hydration matches), then the real answer. */
export function useMotionOK(): boolean {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const set = () => setOk(!mq.matches);
    set();
    mq.addEventListener('change', set);
    return () => mq.removeEventListener('change', set);
  }, []);
  return ok;
}

/** Lenis smooth scroll. Off with reduced motion. */
export function startSmoothScroll(): () => void {
  if (reducedMotion()) return () => {};
  const l = new Lenis({ autoRaf: true, lerp: 0.11 });
  lenis = l;
  return () => { l.destroy(); if (lenis === l) lenis = null; };
}

type Offset = NonNullable<Parameters<typeof useScroll>[0]>['offset'];

/** Calls `cb` with 0..1 as `ref` scrolls through the window (motion's useScroll). Never runs with reduced motion. */
export function useProgress(ref: RefObject<HTMLElement | null>, cb: (p: number) => void, offset: Offset = ['start start', 'end end']) {
  const { scrollYProgress } = useScroll({ target: ref, offset });
  useMotionValueEvent(scrollYProgress, 'change', (p) => {
    if (!reducedMotion()) cb(p);
  });
  useEffect(() => {
    if (!reducedMotion()) cb(scrollYProgress.get());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Adds `in` to the element once it is on screen (CSS does the rest, only under html.js and no-preference). */
export function useInView(ref: RefObject<HTMLElement | null>, margin = '0px 0px -12% 0px') {
  useEffect(() => {
    const el = ref.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add('in'); io.disconnect(); }
    }, { rootMargin: margin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, margin]);
}

/** Words for the "words light up" line. Languages written without spaces get small even chunks instead. */
export function splitWords(text: string, code: string): string[] {
  if (['ja', 'zh-Hans', 'zh-Hant'].includes(code)) {
    const out: string[] = [];
    const chars = Array.from(text);
    for (let i = 0; i < chars.length; i += 3) out.push(chars.slice(i, i + 3).join(''));
    return out;
  }
  return text.split(/\s+/).filter(Boolean).map((w, i, a) => (i < a.length - 1 ? w + ' ' : w));
}
