import { icon } from '../core/icons';
import { PdacBase, esc, md, verdict } from './base';

interface Category { id: string; label: string; term?: string; icon?: string; hint?: string }
interface Item { id: string; text: string; answer: string | string[]; why: string }
interface BoardData { prompt?: string; categories: Category[]; items: Item[] }

/**
 * <pdac-match-board data-src="m1-assets.json">
 * Click an item, then a category. "Check" marks what is placed; A places every
 * item in its right category, each with its one-line reason.
 */
export class PdacMatchBoard extends PdacBase {
  private data!: BoardData;
  private placed = new Map<string, string>(); // item id → category id
  private selected: string | null = null;
  private checked = false;
  private compact = false;

  protected setup(): void {
    this.data = this.json<BoardData>();
    const n = this.data.categories.length;
    this.compact = this.hasAttribute('data-compact') || n > 4 || this.data.items.length > 9;
    this.classList.toggle('is-compact', this.compact);
    this.style.setProperty('--cats', String(n > 4 ? Math.ceil(n / 2) : n));
    this.innerHTML = `
      ${this.data.prompt ? `<p class="mb-prompt">${md(this.data.prompt)}</p>` : ''}
      <div class="mb-pool" role="group" aria-label="Items to sort"></div>
      <div class="mb-cats"></div>
      <div class="pdac-bar">
        <div class="pdac-bar__left">
          <button type="button" class="pdac-btn" data-act="check">${icon('list-checks')} Check</button>
          <button type="button" class="pdac-btn" data-act="answer">${icon('eye')} Show answer <span class="pdac-key">A</span></button>
          <button type="button" class="pdac-btn pdac-btn--quiet" data-act="reset">${icon('rotate-ccw')} Reset <span class="pdac-key">R</span></button>
        </div>
        <p class="pdac-bar__status mb-status" aria-live="polite"></p>
      </div>
      ${this.compact ? '<p class="mb-detail" aria-live="polite"></p>' : ''}`;
    this.addEventListener('click', (e) => this.onClick(e));
    this.render();
  }

  private answers(item: Item): string[] {
    return Array.isArray(item.answer) ? item.answer : [item.answer];
  }

  private onClick(e: Event): void {
    const t = e.target as HTMLElement;
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'check') return this.check();
    if (act === 'answer') return this.showAnswer();
    if (act === 'reset') return this.reset();

    const itemBtn = t.closest<HTMLElement>('[data-item]');
    if (itemBtn) {
      const id = itemBtn.dataset.item!;
      if (this.compact && this.checked && this.placed.has(id)) this.showDetail(id);
      this.selected = this.selected === id ? null : id;
      this.render();
      return;
    }
    const cat = t.closest<HTMLElement>('[data-cat]');
    if (cat && this.selected) {
      this.placed.set(this.selected, cat.dataset.cat!);
      const item = this.data.items.find((i) => i.id === this.selected)!;
      const label = this.data.categories.find((c) => c.id === cat.dataset.cat)!.label;
      this.announce(`Placed “${item.text}” in ${label}`);
      this.selected = null;
      this.checked = false;
      this.render();
      return;
    }
    if (t.closest('.mb-pool') && this.selected && this.placed.has(this.selected)) {
      this.placed.delete(this.selected);
      this.selected = null;
      this.checked = false;
      this.render();
    }
  }

  private showDetail(id: string): void {
    const item = this.data.items.find((i) => i.id === id);
    const box = this.querySelector('.mb-detail');
    if (item && box) box.innerHTML = `<b>${esc(item.text)}:</b> ${md(item.why)}`;
  }

  private chip(item: Item): string {
    const where = this.placed.get(item.id);
    const isSel = this.selected === item.id;
    let state = '';
    let badge = '';
    let why = '';
    if (this.checked && where) {
      const ok = this.answers(item).includes(where);
      state = ok ? 'is-ok' : 'is-no';
      const right = this.answers(item).map((a) => this.data.categories.find((c) => c.id === a)?.label).join(' or ');
      badge = ` ${verdict(ok)}${ok ? '' : ` <span class="mb-chip__right">Answer: ${esc(right)}</span>`}`;
      why = this.compact ? '' : `<span class="mb-chip__why">${md(item.why)}</span>`;
    }
    return `<button type="button" class="mb-chip ${state} ${isSel ? 'is-selected' : ''}" data-item="${esc(item.id)}" aria-pressed="${isSel}">
        <span class="mb-chip__text">${esc(item.text)}${badge}</span>${why}
      </button>`;
  }

  private render(): void {
    const pool = this.$('.mb-pool');
    const unplaced = this.data.items.filter((i) => !this.placed.has(i.id));
    pool.innerHTML = unplaced.length
      ? unplaced.map((i) => this.chip(i)).join('')
      : `<p class="mb-pool__empty">${this.checked ? 'All placed and checked.' : 'All items placed. Press Check, or A for the answer.'}</p>`;
    pool.classList.toggle('is-target', Boolean(this.selected && this.placed.has(this.selected)));
    pool.classList.toggle('is-empty', unplaced.length === 0);

    const cats = this.$('.mb-cats');
    cats.innerHTML = this.data.categories.map((c) => {
      const items = this.data.items.filter((i) => this.placed.get(i.id) === c.id);
      return `<div class="mb-cat ${this.selected ? 'is-target' : ''}" data-cat="${esc(c.id)}">
          <button type="button" class="mb-cat__head" data-cat="${esc(c.id)}" ${this.selected ? '' : 'tabindex="-1"'}>
            ${c.icon ? icon(c.icon) : ''}<span class="mb-cat__label">${esc(c.label)}</span>
            ${c.term ? `<span class="mb-cat__term">(${esc(c.term)})</span>` : ''}
          </button>
          ${c.hint ? `<p class="mb-cat__hint">${md(c.hint)}</p>` : ''}
          <div class="mb-cat__items">${items.map((i) => this.chip(i)).join('')}</div>
        </div>`;
    }).join('');

    const placedCount = this.placed.size;
    const total = this.data.items.length;
    let status = `${placedCount} of ${total} placed`;
    if (this.checked) {
      const right = this.data.items.filter((i) => this.answers(i).includes(this.placed.get(i.id) ?? '')).length;
      status = `${right} of ${total} correct`;
    } else if (this.selected) {
      status = 'Now click a category';
    }
    this.$('.mb-status').textContent = status;
    this.classList.toggle('is-checked', this.checked);
  }

  private check(): void {
    this.checked = true;
    this.selected = null;
    this.render();
    const right = this.data.items.filter((i) => this.answers(i).includes(this.placed.get(i.id) ?? '')).length;
    this.announce(`${right} of ${this.data.items.length} correct`);
  }

  showAnswer(): void {
    this.data.items.forEach((i) => this.placed.set(i.id, this.answers(i)[0]));
    this.checked = true;
    this.selected = null;
    this.render();
    this.announce('All items placed in their right category');
  }

  reset(): void {
    this.placed.clear();
    this.selected = null;
    this.checked = false;
    const box = this.querySelector('.mb-detail');
    if (box) box.textContent = '';
    this.render();
  }
}
