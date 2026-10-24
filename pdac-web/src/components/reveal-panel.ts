import { icon } from '../core/icons';
import { PdacBase, esc } from './base';

/**
 * <pdac-reveal-panel data-label="Show the model answer" data-title="Task A · a model rule set">
 *   …any slide HTML…
 * </pdac-reveal-panel>
 * An example or model answer kept off the slide until it is wanted: the button
 * (or A) opens it over the slide body, the close button, R or ← closes it. The
 * clicker's → still moves to the next slide, so a timed task never jumps to the
 * answer by accident.
 */
export class PdacRevealPanel extends PdacBase {
  private open = false;

  protected setup(): void {
    const label = this.dataset.label ?? 'Show an example';
    const title = this.dataset.title ?? label;
    const content = this.innerHTML;
    this.innerHTML = `
      <button type="button" class="pdac-btn rp-open" data-act="open">${icon('lightbulb')} ${esc(label)} <span class="pdac-key">A</span></button>
      <div class="rp-panel" role="region" aria-label="${esc(title)}" hidden>
        <div class="rp-head">
          <p class="rp-title">${icon('lightbulb')} ${esc(title)}</p>
          <button type="button" class="pdac-btn pdac-btn--quiet rp-close" data-act="close">${icon('x')} Close <span class="pdac-key">R</span></button>
        </div>
        <div class="rp-body">${content}</div>
      </div>`;
    this.addEventListener('click', (e) => {
      const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'open') this.showAnswer();
      if (act === 'close') this.reset();
    });
  }

  step(dir: 1 | -1): boolean {
    if (dir === -1 && this.open) { this.reset(); return true; }
    return false;
  }

  private render(): void {
    (this.querySelector('.rp-panel') as HTMLElement).hidden = !this.open;
    this.closest('section')?.classList.toggle('rp-is-open', this.open);
  }

  showAnswer(): void {
    this.open = true;
    this.render();
  }

  reset(): void {
    this.open = false;
    this.render();
  }
}
