import { unlockAudio } from './audio';
import { FallbackViewer, QrOverlay, SidePanel, toast } from './overlays';
import { isInteractive, type Deck, type PdacInteractive } from './types';
import type { PdacCountdown } from '../components/countdown';
import type { PdacGlossaryPanel } from '../components/glossary-panel';

/** A control reveal.js's components treat as clickable: a button, or anything
 *  carrying a data-* the component keys off (a sort chip, a drop-zone column,
 *  a diagram node). base.ts blurs buttons; these are what the relay replays. */
const CLICK_TARGET = 'button, [role="button"]';

/** The nearest actionable element from the click, within the interactive but not
 *  the interactive root itself (its data-src must not be mistaken for a control). */
function actionableFrom(start: Element | null, root: Element): HTMLElement | null {
  let node: Element | null = start;
  while (node && node !== root) {
    if (node instanceof HTMLElement || node instanceof SVGElement) {
      const el = node as HTMLElement;
      if (el.matches(CLICK_TARGET) || Object.keys(el.dataset).length > 0) return el;
    }
    node = node.parentElement;
  }
  return null;
}

const kebab = (s: string) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
const cssValue = (v: string) => v.replace(/(["\\])/g, '\\$1');

/** A selector that finds the same control on another copy of the slide: its
 *  data-* attributes, which name the item/category/action, not its position
 *  (which shifts as items move between pool and columns). Null if it has none. */
function signatureOf(el: HTMLElement): string | null {
  const keys = Object.keys(el.dataset);
  if (!keys.length) return null;
  return keys.map((k) => `[data-${kebab(k)}="${cssValue(el.dataset[k] ?? '')}"]`).join('');
}

/** Index path from an interactive's root down to one of its descendants, by child
 *  position at each level. The fallback when a control carries no data-* to match on. */
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

// A different id per page (projector window, each speaker-view preview iframe).
// Every message carries it so a handler can ignore messages this page sent,
// even when sender and receiver are two BroadcastChannel objects in one page.
const SELF = `${Date.now()}.${Math.random().toString(36).slice(2)}`;

// Commands that change an interactive's own state (not a panel or the timer),
// so they are the ones that must be mirrored to the speaker-view previews.
// vote-N is handled by its prefix.
const MIRROR_CMDS = new Set<Command>(['next', 'prev', 'answer', 'reset']);
const shouldMirror = (cmd: Command) => MIRROR_CMDS.has(cmd) || cmd.startsWith('vote-');

interface Msg {
  type: 'cmd' | 'click' | 'mirror';
  from: string;
  cmd?: Command;
  idx?: number;
  sel?: string | null;
  path?: number[];
  h?: number;
  v?: number;
}

function coordsOf(deck: Deck): { h: number; v: number } {
  const i = deck.getIndices();
  return { h: i.h ?? 0, v: i.v ?? 0 };
}

/** A mirrored action applies only on a page showing the same slide it happened on. */
function onSameSlide(deck: Deck, m: Msg): boolean {
  if (typeof m.h !== 'number') return true; // no coords: treat as current slide
  const c = coordsOf(deck);
  return c.h === m.h && c.v === (m.v ?? 0);
}

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
  const send = (cmd: Command) => channel.postMessage({ type: 'cmd', from: SELF, cmd } satisfies Msg);
  const map: Record<number, () => void> = {};
  for (const [code, cmd] of Object.entries(KEYS)) map[Number(code)] = () => send(cmd);
  NEXT_KEYS.forEach((c) => (map[c] = () => send('next')));
  PREV_KEYS.forEach((c) => (map[c] = () => send('prev')));
  return map;
}

/**
 * Broadcast a real mouse click on an interactive's own button (vote, next
 * case, check, run the attack...) so the same click replays on every other
 * page showing that slide: the projector and the speaker-view previews. Runs
 * on both the projector and the previews, so a click made on either side
 * reaches the other. Only trusted clicks are sent; a replayed (synthetic)
 * click is not re-sent, so there is no echo.
 */
function broadcastClicks(deck: Deck, channel: BroadcastChannel): void {
  document.addEventListener('click', (e) => {
    if (!e.isTrusted) return;
    const slide = deck.getCurrentSlide();
    const root = (e.target as Element | null)?.closest?.('.pdac-interactive');
    if (!root || !slide || !slide.contains(root)) return;
    const el = actionableFrom(e.target as Element | null, root);
    if (!el) return;
    const idx = [...slide.querySelectorAll('.pdac-interactive')].indexOf(root);
    if (idx === -1) return;
    const path = pathFromRoot(root, el);
    channel.postMessage({ type: 'click', from: SELF, idx, sel: signatureOf(el), path, ...coordsOf(deck) } satisfies Msg);
  }, true);
}

/** Replay a relayed click on this page's copy of the slide (projector or preview).
 *  Finds the control by its data-* signature (stable across the pool/column
 *  shuffling that moves items around), falling back to its position. */
function applyClick(deck: Deck, m: Msg): void {
  if (!onSameSlide(deck, m)) return;
  const root = [...deck.getCurrentSlide().querySelectorAll('.pdac-interactive')][m.idx!];
  if (!root) return;
  let target: HTMLElement | null = null;
  if (m.sel) {
    const matches = [...root.querySelectorAll<HTMLElement>(m.sel)];
    target = matches.find((x) => x.matches(CLICK_TARGET)) ?? matches[0] ?? null;
  }
  if (!target && m.path) target = elementAtPath(root, m.path);
  if (!target) return;
  unlockAudio();
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, composed: true }));
}

/** Replay a mirrored in-slide command (step, answer, reset, vote) on a preview. */
function applyMirrorCmd(deck: Deck, m: Msg): void {
  if (!m.cmd || !onSameSlide(deck, m)) return;
  const s = deck.getCurrentSlide();
  const list = interactivesIn(s);
  unlockAudio();
  if (m.cmd === 'next' || m.cmd === 'prev') {
    list.find((c) => typeof c.step === 'function')?.step!(m.cmd === 'next' ? 1 : -1);
  } else if (m.cmd === 'answer') {
    list.forEach((c) => c.showAnswer());
    if (s.querySelector('.answer')) s.classList.add('answers-shown');
  } else if (m.cmd === 'reset') {
    list.forEach((c) => c.reset());
    s.classList.remove('answers-shown');
  } else if (m.cmd.startsWith('vote-')) {
    list.find((c) => typeof c.vote === 'function')?.vote!(Number(m.cmd.slice(5)));
  }
}

/**
 * Speaker-view preview iframe: keep this preview in step with the projector.
 * It replays the projector's clicks and in-slide commands (which fire no
 * reveal.js event, so the notes plugin never syncs them), and broadcasts its
 * own clicks back to the projector. Slide changes still sync through the
 * notes plugin as before.
 */
export function initReceiverMirror(deck: Deck): void {
  const channel = new BroadcastChannel(CHANNEL);
  channel.onmessage = (ev: MessageEvent) => {
    const m = ev.data as Msg;
    if (!m || m.from === SELF) return;
    if (m.type === 'click') applyClick(deck, m);
    else if (m.type === 'mirror') applyMirrorCmd(deck, m);
  };
  broadcastClicks(deck, channel);
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
    // run() returns true only when it acted in the slide (a component step,
    // answer, reset, vote). When it returns false for next/prev, reveal.js
    // moves the slide instead and the notes plugin syncs the previews, so we
    // mirror only the in-slide case.
    if (run(cmd)) { mirror(cmd); stop(e); }
  }, true);

  // Space or Enter on a focused button presses it; keep reveal.js (listening on
  // document) from also treating it as "next slide".
  document.body.addEventListener('keydown', (e) => {
    if ((e.key === ' ' || e.key === 'Enter') && isControl(document.activeElement)) e.stopPropagation();
  });

  // The projected window both sends and receives on this channel.
  const channel = new BroadcastChannel(CHANNEL);

  // Tell the speaker-view previews to replay an in-slide command. Slide moves
  // are left out: those reach the previews through the notes plugin instead.
  const mirror = (cmd: Command): void => {
    if (shouldMirror(cmd)) channel.postMessage({ type: 'mirror', from: SELF, cmd, ...coordsOf(deck) } satisfies Msg);
  };

  // Clicks made on the projector itself, mirrored to the previews.
  broadcastClicks(deck, channel);

  // Commands and clicks relayed from the speaker view.
  channel.onmessage = (ev: MessageEvent) => {
    const data = ev.data as Msg;
    if (!data || data.from === SELF) return;
    if (data.type === 'click') { applyClick(deck, data); return; }
    if (data.type !== 'cmd' || !data.cmd) return;
    if (deck.isPaused() && data.cmd !== 'next' && data.cmd !== 'prev') return;
    // Run the command here, then mirror it to the previews unless it moved the
    // slide (in which case the notes plugin syncs them). Comparing the slide
    // index before and after tells the two apart, since a remote next/prev
    // that can't step a component navigates instead.
    const before = coordsOf(deck);
    if (!run(data.cmd, true)) return;
    const after = coordsOf(deck);
    if (before.h === after.h && before.v === after.v) mirror(data.cmd);
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
