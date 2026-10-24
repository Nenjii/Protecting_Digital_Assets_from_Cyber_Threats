import { icon } from '../core/icons';
import { PdacBase } from './base';

/**
 * <pdac-checks class="body"><ol class="checks"><li><b>Question</b>
 *   <span class="answer"><span class="answer-label">Answer:</span> …</span></li>…</ol></pdac-checks>
 * Check yourself with the answers on demand: the room answers from memory, then
 * the clicker reveals the next answer (← hides it again), a click on a question
 * shows or hides its own answer, A reveals all, R hides all. The list's own
 * markup is kept, so the slide still reads the same in print and in notes.
 */
export class PdacChecks extends PdacBase {
  private items: HTMLElement[] = [];
  private shown: boolean[] = [];

  protected setup(): void {
    const list = this.querySelector<HTMLOListElement>('ol.checks');
    if (!list) throw new Error('pdac-checks needs an <ol class="checks"> inside');
    this.items = [...list.querySelectorAll<HTMLElement>(':scope > li')];
    this.shown = this.items.map(() => false);
    this.items.forEach((li, i) => {
      li.dataset.check = String(i);
      li.setAttribute('role', 'button');
      li.setAttribute('tabindex', '0');
      li.classList.add('ck-item');
      li.querySelector('b')?.insertAdjacentHTML('beforeend', `<span class="ck-hint" aria-hidden="true">${icon('eye')}</span>`);
    });
    this.insertAdjacentHTML('beforeend', `
      <div class="pdac-bar ck-bar">
        <div class="pdac-bar__left">
          <button type="button" class="pdac-btn pdac-btn--primary" data-act="next">${icon('eye')} Reveal the next answer <span class="pdac-key">→</span></button>
          <button type="button" class="pdac-btn" data-act="all">All answers <span class="pdac-key">A</span></button>
          <button type="button" class="pdac-btn pdac-btn--quiet" data-act="hide">${icon('rotate-ccw')} Hide <span class="pdac-key">R</span></button>
        </div>
        <p class="pdac-bar__status ck-status" aria-live="polite"></p>
      </div>`);
    this.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'next') { this.step(1); return; }
      if (act === 'all') { this.showAnswer(); return; }
      if (act === 'hide') { this.reset(); return; }
      const li = t.closest<HTMLElement>('[data-check]');
      if (li) this.toggle(Number(li.dataset.check));
    });
    this.addEventListener('keydown', (e) => {
      const li = (e.target as HTMLElement).closest?.('[data-check]') as HTMLElement | null;
      if (li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); this.toggle(Number(li.dataset.check)); }
    });
    this.render();
  }

  private toggle(i: number): void {
    this.shown[i] = !this.shown[i];
    this.render();
  }

  step(dir: 1 | -1): boolean {
    if (dir === 1) {
      const next = this.shown.indexOf(false);
      if (next < 0) return false;
      this.shown[next] = true;
      this.render();
      return true;
    }
    const last = this.shown.lastIndexOf(true);
    if (last < 0) return false;
    this.shown[last] = false;
    this.render();
    return true;
  }

  private render(): void {
    this.items.forEach((li, i) => {
      li.classList.toggle('is-revealed', this.shown[i]);
      li.setAttribute('aria-expanded', String(this.shown[i]));
    });
    const n = this.shown.filter(Boolean).length;
    const all = n === this.items.length;
    // The slide-level class is what A and R toggle elsewhere; keep it in step.
    this.closest('section')?.classList.toggle('answers-shown', all);
    this.$('.ck-status').textContent = n
      ? `${n} of ${this.items.length} answers shown`
      : 'Answer from memory first, then reveal';
    (this.querySelector('[data-act="next"]') as HTMLButtonElement).disabled = all;
  }

  showAnswer(): void {
    this.shown = this.items.map(() => true);
    this.render();
  }

  reset(): void {
    this.shown = this.items.map(() => false);
    this.render();
  }
}
