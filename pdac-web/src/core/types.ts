import type Reveal from 'reveal.js';

export type Deck = Reveal.Api & {
  toggleJumpToSlide?: (override?: boolean) => void;
  isOverview(): boolean;
  isPrintView(): boolean;
  isOverlayOpen?: () => boolean;
};

/** Shared behaviour every interactive implements (spec section 9). */
export interface PdacInteractive extends HTMLElement {
  /** Back to the start state (key R). */
  reset(): void;
  /** Reveal everything (key A). */
  showAnswer(): void;
  /** Clicker step inside the component. Return true if the step was used,
   *  false to let the deck move to the next or previous slide. */
  step?(dir: 1 | -1): boolean;
  /** Number keys 1 to 9 add one vote to that option (vote-style components). */
  vote?(option: number): void;
}

export interface ModuleInfo {
  key: string;
  number: number | null;
  file: string;
  title: string;
  subtitle?: string;
  day?: number;
  session?: string;
  start?: string;
  end?: string;
  status?: string;
  html: string | null;
}

export interface SlideMeta {
  id: string;
  index: number;
  total: number;
  module: string;
  code: string;
  minutes: number;
  startMin: number;
  endMin: number;
  breakAfter: number;
  timer: number;
}

export function isInteractive(el: Element): el is PdacInteractive {
  return el.classList.contains('pdac-interactive') && typeof (el as PdacInteractive).showAnswer === 'function';
}
