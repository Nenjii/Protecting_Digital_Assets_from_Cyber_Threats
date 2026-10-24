import { getData, hasData } from '../core/data';
import type { PdacInteractive } from '../core/types';
// esc/md moved to core/esc.ts so NetMap can reuse them without bundling the
// answer data. Re-exported here so existing imports keep working.
export { esc, md } from '../core/esc';
import { esc } from '../core/esc';

/**
 * Base for every slide interactive. Subclasses implement setup(), reset() and
 * showAnswer(); the class adds .pdac-interactive so the A and R keys find it.
 * Facilitator-driven by design: no participant typing, nothing saved, nothing sent.
 */
export abstract class PdacBase extends HTMLElement implements PdacInteractive {
  private ready = false;
  protected live: HTMLElement | null = null;

  connectedCallback(): void {
    if (this.ready) return; // reveal.js print view moves nodes around; render once
    this.ready = true;
    this.classList.add('pdac-interactive', 'pdac-c');
    try {
      this.setup();
    } catch (err) {
      console.error(err);
      this.innerHTML = `<div class="pdac-error" role="alert"><b>This interactive could not load.</b> ${esc((err as Error).message ?? err)}<br>The deck has the static version of this activity.</div>`;
    }
    // After a mouse click, drop focus so Space and arrow keys keep driving the deck.
    this.addEventListener('click', (e) => {
      const btn = (e.target as Element).closest<HTMLElement | SVGElement>('button, [role="button"]');
      if (btn && e.detail > 0) btn.blur();
    });
  }

  protected abstract setup(): void;
  abstract reset(): void;
  abstract showAnswer(): void;

  /** Load the JSON named in data-src (or another data-* attribute). */
  protected json<T>(attr = 'src'): T {
    const name = this.dataset[attr];
    if (!name) throw new Error(`Missing data-${attr} attribute`);
    if (!hasData(name)) throw new Error(`Missing data file src/data/${name}`);
    return getData<T>(name);
  }

  /** Polite screen-reader announcement (aria-live region inside the component). */
  protected announce(message: string): void {
    if (!this.live) {
      this.live = document.createElement('p');
      this.live.className = 'pdac-sr';
      this.live.setAttribute('aria-live', 'polite');
      this.append(this.live);
    }
    this.live.textContent = message;
  }

  protected $(selector: string): HTMLElement {
    const node = this.querySelector<HTMLElement>(selector);
    if (!node) throw new Error(`Missing element ${selector}`);
    return node;
  }

  protected $$(selector: string): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>(selector)];
  }
}

/** "a:Label A|b:Label B" → [{id, label}] */
export function parseOptions(spec: string | undefined): { id: string; label: string }[] {
  if (!spec) return [];
  return spec.split('|').map((part) => {
    const [id, ...rest] = part.split(':');
    return { id: id.trim(), label: (rest.join(':') || id).trim() };
  });
}

/** Correct / Not quite labels: always a word plus color (spec 3.5). */
export function verdict(ok: boolean, okText = 'Correct', noText = 'Not quite'): string {
  return ok
    ? `<span class="pdac-verdict is-ok"><span aria-hidden="true">✓</span> ${okText}</span>`
    : `<span class="pdac-verdict is-no"><span aria-hidden="true">✗</span> ${noText}</span>`;
}
