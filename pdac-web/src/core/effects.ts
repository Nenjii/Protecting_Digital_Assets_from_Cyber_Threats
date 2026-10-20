import { toMinutes } from './modules';
import type { Deck } from './types';

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** <span data-countup="22000" data-suffix="+">22,000+</span> counts up when its slide appears. */
export function runCountUps(slide: HTMLElement): void {
  slide.querySelectorAll<HTMLElement>('[data-countup]').forEach((node) => {
    const target = Number(node.dataset.countup);
    const decimals = Number(node.dataset.decimals ?? 0);
    const prefix = node.dataset.prefix ?? '';
    const suffix = node.dataset.suffix ?? '';
    const format = (v: number) =>
      prefix + v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
    if (Number.isNaN(target)) return;
    if (reduceMotion() || document.documentElement.classList.contains('is-receiver')) {
      node.textContent = format(target);
      return;
    }
    const duration = 1100;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      node.textContent = format(target * eased);
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** Clock time used by the flow slides. ?now=09:10 overrides it for rehearsals. */
export function nowMinutes(): number {
  const override = new URLSearchParams(location.search).get('now');
  if (override && /^\d{1,2}:\d{2}$/.test(override)) return toMinutes(override);
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
}

/** Rows with data-start and data-end (HH:MM) get .is-now while the clock is inside them. */
export function highlightNow(root: ParentNode): void {
  const now = nowMinutes();
  root.querySelectorAll<HTMLElement>('[data-start][data-end]').forEach((row) => {
    const on = now >= toMinutes(row.dataset.start) && now < toMinutes(row.dataset.end);
    row.classList.toggle('is-now', on);
  });
}

/** Slides marked data-blackout-first open blacked out (B), so the room recalls first. */
export function blackoutFirst(deck: Deck): void {
  let last = deck.getIndices().h;
  deck.on('slidechanged', (() => {
    const { h } = deck.getIndices();
    const slide = deck.getCurrentSlide();
    if (h > last && slide.hasAttribute('data-blackout-first') && !deck.isPaused()) deck.togglePause(true);
    last = h;
  }) as EventListener);
}
