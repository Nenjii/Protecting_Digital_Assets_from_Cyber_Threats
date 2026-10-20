import { icon } from '../core/icons';
import { PdacBase, esc, md } from './base';

interface RecallQ { q: string; a: string; from?: string }
interface RecallSet { title?: string; questions: RecallQ[] }

/**
 * <pdac-recall data-src="recall.json" data-module="2">
 * Retrieval practice at the start of Modules 2 to 5: questions from earlier
 * modules, answers hidden and revealed one by one (clicker) or all at once (A).
 */
export class PdacRecall extends PdacBase {
  private set!: RecallSet;
  private shown = 0;

  protected setup(): void {
    const all = this.json<Record<string, RecallSet>>();
    const key = this.dataset.module ?? '';
    this.set = all[key];
    if (!this.set) throw new Error(`No recall set for module ${key} in ${this.dataset.src}`);
    this.innerHTML = `<ol class="rc-list"></ol>
      <div class="pdac-bar">
        <div class="pdac-bar__left">
          <button type="button" class="pdac-btn" data-act="one">${icon('eye')} Reveal next</button>
          <button type="button" class="pdac-btn pdac-btn--quiet" data-act="all">Reveal all <span class="pdac-key">A</span></button>
          <button type="button" class="pdac-btn pdac-btn--quiet" data-act="reset">${icon('rotate-ccw')} Hide all <span class="pdac-key">R</span></button>
        </div>
        <p class="pdac-bar__status">Answer out loud or on paper first</p>
      </div>`;
    this.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const card = t.closest<HTMLElement>('[data-i]');
      if (card) {
        const i = Number(card.dataset.i);
        this.shown = this.shown > i ? i : i + 1;
        return this.render();
      }
      const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'one') this.step(1);
      if (act === 'all') this.showAnswer();
      if (act === 'reset') this.reset();
    });
    this.render();
  }

  step(dir: 1 | -1): boolean {
    const n = this.set.questions.length;
    if (dir === 1 && this.shown < n) { this.shown++; this.render(); return true; }
    if (dir === -1 && this.shown > 0) { this.shown--; this.render(); return true; }
    return false;
  }

  private render(): void {
    this.$('.rc-list').innerHTML = this.set.questions.map((q, i) => {
      const on = i < this.shown;
      return `<li class="rc-item ${on ? 'is-on' : ''}">
          <button type="button" class="rc-card" data-i="${i}" aria-expanded="${on}">
            <span class="rc-num">${i + 1}</span>
            <span class="rc-q">${md(q.q)}</span>
            ${q.from ? `<span class="rc-from">From ${esc(q.from)}</span>` : ''}
            <span class="rc-a" aria-live="polite">${on ? `<span class="rc-a__k">Answer</span> ${md(q.a)}` : '<span class="rc-a__hidden">Answer hidden</span>'}</span>
          </button>
        </li>`;
    }).join('');
  }

  showAnswer(): void {
    this.shown = this.set.questions.length;
    this.render();
  }

  reset(): void {
    this.shown = 0;
    this.render();
  }
}
