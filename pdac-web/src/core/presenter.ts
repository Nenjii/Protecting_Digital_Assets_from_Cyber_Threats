import { unlockAudio } from './audio';
import { FallbackViewer, QrOverlay, SidePanel, toast } from './overlays';
import { isInteractive, type Deck, type PdacInteractive } from './types';
import type { PdacCountdown } from '../components/countdown';
import type { PdacGlossaryPanel } from '../components/glossary-panel';

/** Selector for a click that does something: matches base.ts's own click-to-blur selector. */
const CLICK_TARGET = '.pdac-interactive button, .pdac-interactive [role="button"]';

/** Index path from an interactive's root down to one of its descendants, by child position at each level. */
function pathFromRoot(root: Element, target: Element): number[] {
  const path: number[] = [];
  let node: Element | null = target;
  while (node && node !== root) {
    const parent: Element | null = node.parentElement;
    if (!parent) return []; // target wasn't inside root
    path.unshift(Array.prototype.indexOf.call(parent.children, node));
    node = parent;
  }
  return node === root ? path : [];
}

function elementAtPath(root: Element, path: number[]): HTMLElement | null {
  let node: Element = root;
  for (const i of path) {
    const child = node.children[i];
    if (!child) return null;
    node = child;
  }
  return node as HTMLElement;
}

/**
 * Presenter commands (spec section 7). Every command runs in the projected
 * window. In the speaker view, reveal.js forwards key presses to a preview
 * iframe instead, so that iframe relays our commands to the projected window
 * over a same-origin BroadcastChannel. A, R, T and the rest therefore work
 * whether focus is on the projector window or on the speaker view.
 */
export type Command =
  | 'next' | 'prev' | 'answer' | 'reset' | 'timer' | 'timer-stop' | 'break'
  | 'glossary' | 'itdepth' | 'evidence' | 'fallback' | 'jump' | 'poll' | `vote-${number}`;

const KEYS: Record<number, Command> = {
  65: 'answer',     // A
  82: 'reset',      // R
  84: 'timer',      // T
  88: 'timer-stop', // X
  75: 'break',      // K
  71: 'glossary',   // G
  73: 'itdepth',    // I
  69: 'evidence',   // E: the sources behind the numbers
  70: 'fallback',   // F (full screen when the slide has no fallback)
  74: 'jump',       // J
  76: 'poll',       // L: live poll QR (Slido or Mentimeter), when links.json has one
};
const NEXT_KEYS = [34, 39, 32, 78, 40]; // PgDn, →, Space, N, ↓
const PREV_KEYS = [33, 37, 80, 38];     // PgUp, ←, P, ↑
for (let d = 1; d <= 9; d++) KEYS[48 + d] = `vote-${d}`;

const CHANNEL = 'pdac-presenter';

interface PresenterParts {
  deck: Deck;
  countdown: PdacCountdown;
  glossary: PdacGlossaryPanel;
  itDepth: SidePanel;
  evidence: SidePanel;
  fallback: FallbackViewer;
  poll: QrOverlay;
}

function interactivesIn(slide: HTMLElement): PdacInteractive[] {
  return [...slide.querySelectorAll('.pdac-interactive')].filter(isInteractive);
}

function isTyping(e: KeyboardEvent): boolean {
  const t = (e.composedPath()[0] ?? e.target) as HTMLElement | null;
  if (!t || !(t instanceof HTMLElement)) return false;
  return t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
}

/** Speaker-view preview iframe: send every presenter key to the projected window. */
export function relayKeysFromReceiver(): Record<number, () => void> {
  const channel = new BroadcastChannel(CHANNEL);
  const send = (cmd: Command) => channel.postMessage({ type: 'cmd', cmd });
  const map: Record<number, () => void> = {};
  for (const [code, cmd] of Object.entries(KEYS)) map[Number(code)] = () => send(cmd);
  NEXT_KEYS.forEach((c) => (map[c] = () => send('next')));
  PREV_KEYS.forEach((c) => (map[c] = () => send('prev')));
  return map;
}

/**
 * Speaker-view preview iframe: mouse clicks on an interactive's own buttons
 * (vote, next case, check, run the attack...) used to stay local to the
 * preview and never reach the projected window. This relays them the same
 * way keys are relayed: find which interactive and which button was clicked,
 * by position, and send that over the same channel. The click still runs
 * locally too, so the preview keeps responding on its own.
 */
export function relayClicksFromReceiver(deck: Deck): void {
  const channel = new BroadcastChannel(CHANNEL);
  document.addEventListener('click', (e) => {
    if (!e.isTrusted) return; // never re-relay a click we dispatched ourselves
    const target = e.target as Element | null;
    const btn = target?.closest?.(CLICK_TARGET) as HTMLElement | null;
    if (!btn) return;
    const root = btn.closest('.pdac-interactive');
    const slide = deck.getCurrentSlide();
    if (!root || !slide || !slide.contains(root)) return;
    const interactives = [...slide.querySelectorAll('.pdac-interactive')];
    const idx = interactives.indexOf(root);
    if (idx === -1) return;
    const path = pathFromRoot(root, btn);
    if (!path.length) return; // btn should always be a descendant of root; bail if that ever isn't true
    channel.postMessage({ type: 'click', idx, path });
  }, true);
}

export function initPresenter(parts: PresenterParts): void {
  const { deck, countdown, glossary, itDepth, evidence, fallback, poll } = parts;
  const slide = () => deck.getCurrentSlide();

  const run = (cmd: Command, remote = false): boolean => {
    unlockAudio();
    const s = slide();
    switch (cmd) {
      case 'next':
      case 'prev': {
        const dir = cmd === 'next' ? 1 : -1;
        const stepper = interactivesIn(s).find((c) => typeof c.step === 'function');
        if (stepper?.step!(dir)) return true;
        if (remote) {
          if (dir === 1) deck.next();
          else deck.prev();
          return true;
        }
        return false; // let reveal.js move the slide
      }
      case 'answer': {
        const list = interactivesIn(s);
        const hasAnswers = s.querySelector('.answer');
        list.forEach((c) => c.showAnswer());
        if (hasAnswers) s.classList.add('answers-shown');
        if (!list.length && !hasAnswers) toast('Nothing to reveal on this slide');
        return true;
      }
      case 'reset': {
        const list = interactivesIn(s);
        list.forEach((c) => c.reset());
        s.classList.remove('answers-shown');
        if (!list.length && !s.querySelector('.answer')) toast('Nothing to reset on this slide');
        return true;
      }
      case 'timer': {
        const minutes = Number(s.dataset.timer ?? 0);
        countdown.toggle(minutes, s.dataset.timerLabel ?? s.querySelector('h2')?.textContent?.trim() ?? '', s.dataset.checkpoints ?? '');
        return true;
      }
      case 'timer-stop':
        countdown.stop();
        return true;
      case 'break': {
        const minutes = Number(s.dataset.breakAfter ?? 0) || 10;
        countdown.toggleBreak(minutes, s.dataset.breakLink);
        return true;
      }
      case 'poll':
        if (poll.isOpen) poll.close();
        else if (!poll.open()) toast('No live poll yet: add its link under "live-poll" in src/data/links.json, then npm run qr && npm run build', 4000);
        return true;
      case 'glossary':
        if (itDepth.isOpen) itDepth.close();
        if (evidence.isOpen) evidence.close();
        glossary.toggle(s);
        return true;
      case 'itdepth':
        if (glossary.isOpen) glossary.close();
        if (evidence.isOpen) evidence.close();
        itDepth.toggle(s);
        return true;
      case 'evidence':
        if (glossary.isOpen) glossary.close();
        if (itDepth.isOpen) itDepth.close();
        evidence.toggle(s);
        return true;
      case 'fallback': {
        if (fallback.isOpen) {
          fallback.close();
          return true;
        }
        const demo = s.dataset.demo;
        if (!demo) return false; // reveal.js full screen
        fallback.open(demo, s.querySelector('h2')?.textContent?.trim() ?? demo);
        return true;
      }
      case 'jump':
        if (remote) return true;
        deck.toggleJumpToSlide?.();
        return true;
      default: {
        if (cmd.startsWith('vote-')) {
          const n = Number(cmd.slice(5));
          const voter = interactivesIn(s).find((c) => typeof c.vote === 'function');
          if (!voter) return false;
          voter.vote!(n);
          return true;
        }
        return false;
      }
    }
  };

  // Keys pressed in the projected window. Capture phase, so we decide before reveal.js.
  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e)) return;
    if (e.key === 'Escape') {
      if (fallback.isOpen) { fallback.close(); stop(e); return; }
      if (poll.isOpen) { poll.close(); stop(e); return; }
      if (countdown.isBreakOn) { countdown.toggleBreak(0); stop(e); return; }
      if (glossary.isOpen) { glossary.close(); stop(e); return; }
      if (itDepth.isOpen) { itDepth.close(); stop(e); return; }
      if (evidence.isOpen) { evidence.close(); stop(e); return; }
      return;
    }
    if (deck.isOverview() || deck.isPaused()) return;
    if ((e.key === ' ' || e.key === 'Enter') && isControl(document.activeElement)) return; // activate the focused button
    if (e.shiftKey && e.keyCode !== 32) return; // Shift+Space is "previous" in reveal.js
    let cmd: Command | undefined = KEYS[e.keyCode];
    if (NEXT_KEYS.includes(e.keyCode)) cmd = e.shiftKey ? 'prev' : 'next';
    else if (PREV_KEYS.includes(e.keyCode)) cmd = 'prev';
    if (!cmd) return;
    if (run(cmd)) stop(e);
  }, true);

  // Space or Enter on a focused button presses it; keep reveal.js (listening on
  // document) from also treating it as "next slide".
  document.body.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && isControl(document.activeElement)) e.stopPropagation();
  });

  // Commands and clicks relayed from the speaker view.
  const channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = (ev: MessageEvent) => {
    const data = ev.data as { type?: string; cmd?: Command; idx?: number; path?: number[] };
    if (data?.type === 'click' && typeof data.idx === 'number' && Array.isArray(data.path)) {
      const interactives = [...slide().querySelectorAll('.pdac-interactive')];
      const root = interactives[data.idx];
      const target = root && elementAtPath(root, data.path);
      if (!target) return;
      unlockAudio();
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
      return;
    }
    if (data?.type !== 'cmd' || !data.cmd) return;
    if (deck.isPaused() && data.cmd !== 'next' && data.cmd !== 'prev') return;
    run(data.cmd, true);
  };

  // Keep panels in step with the slide.
  deck.on('slidechanged', (() => {
    if (glossary.isOpen) glossary.update(slide());
    if (itDepth.isOpen) itDepth.update(slide());
    if (evidence.isOpen) evidence.update(slide());
    if (fallback.isOpen) fallback.close();
  }) as EventListener);
}

function isControl(el: Element | null): boolean {
  if (!el || el === document.body || el === document.documentElement) return false;
  return el.matches('button, a[href], summary, [role="button"], [tabindex]:not([tabindex="-1"])');
}

function stop(e: KeyboardEvent): void {
  e.preventDefault();
  e.stopImmediatePropagation();
}

/** IT depth panel content: the slide's hidden .it-depth block. */
export function itDepthFor(slide: HTMLElement): string {
  const block = slide.querySelector('.it-depth');
  if (!block) return '<p class="pdac-panel__empty">No IT depth on this slide.</p>';
  return `<div class="pdac-panel__itdepth">${block.innerHTML}</div>`;
}
