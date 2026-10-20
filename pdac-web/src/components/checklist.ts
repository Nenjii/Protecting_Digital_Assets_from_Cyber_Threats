import { icon } from '../core/icons';
import { PdacBase, esc, md } from './base';

interface CheckItem { id: string; text: string; who?: string }
interface Band { min: number; label: string }
interface ChecklistData { title?: string; source?: string; items: CheckItem[]; bands?: Band[] }

/**
 * <pdac-checklist data-src="m1-readiness.json">
 * Yes/no items read aloud. The clicker moves the highlight down the list; the
 * count of yes answers appears at the end (or on A). Nothing is saved.
 */
export class PdacChecklist extends PdacBase {
  private data!: ChecklistData;
  private answers: (boolean | null)[] = [];
  private current = -1;
  private showTotal = false;

  protected setup(): void {
    this.data = this.json<ChecklistData>();
    this.answers = this.data.items.map(() => null);
    this.innerHTML = `<ol class="cl-list"></ol><div class="cl-total" aria-live="polite"></div>
      ${this.data.source ? `<p class="cl-src">${esc(this.data.source)}</p>` : ''}`;
    this.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-yn]');
      if (!b) return;
      const i = Number(b.dataset.i);
      const v = b.dataset.yn === 'yes';
      this.answers[i] = this.answers[i] === v ? null : v;
      this.current = i;
      if (this.answers.every((a) => a !== null)) this.showTotal = true;
      this.render();
    });
    this.render();
  }

  step(dir: 1 | -1): boolean {
    const n = this.data.items.length;
    if (dir === 1) {
      if (this.current < n - 1) { this.current++; this.render(); return true; }
      if (!this.showTotal) { this.showTotal = true; this.current = n; this.render(); return true; }
      return false;
    }
    if (this.showTotal) { this.showTotal = false; this.current = n - 1; this.render(); return true; }
    if (this.current >= 0) { this.current--; this.render(); return true; }
    return false;
  }

  private render(): void {
    this.$('.cl-list').innerHTML = this.data.items.map((it, i) => {
      const a = this.answers[i];
      return `<li class="cl-item ${i === this.current ? 'is-current' : ''}">
          <span class="cl-num">${i + 1}</span>
          <span class="cl-text">${md(it.text)}${it.who ? `<span class="cl-who">${esc(it.who)}</span>` : ''}</span>
          <span class="ts-seg cl-yn" role="group" aria-label="Item ${i + 1}">
            <button type="button" data-i="${i}" data-yn="yes" aria-pressed="${a === true}">Yes</button>
            <button type="button" data-i="${i}" data-yn="no" aria-pressed="${a === false}">No</button>
          </span>
        </li>`;
    }).join('');
    const total = this.$('.cl-total');
    if (!this.showTotal) { total.innerHTML = ''; total.classList.remove('is-on'); return; }
    const yes = this.answers.filter((a) => a === true).length;
    const n = this.data.items.length;
    const band = [...(this.data.bands ?? [])].sort((a, b) => b.min - a.min).find((b) => yes >= b.min);
    total.innerHTML = `${icon('clipboard-check')} <b>Yes to ${yes} of ${n}</b>${band ? ` <span>${md(band.label)}</span>` : ''}`;
    total.classList.add('is-on');
  }

  showAnswer(): void {
    this.showTotal = true;
    this.render();
  }

  reset(): void {
    this.answers = this.data.items.map(() => null);
    this.current = -1;
    this.showTotal = false;
    this.render();
  }
}
