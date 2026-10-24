import { icon } from '../core/icons';
import { PdacBase, esc, md } from './base';

interface Tile {
  id: string;
  /** Short label on the face-down tile, e.g. the exhibit ("Exhibit B"). */
  label: string;
  head: string;
  body?: string;
  facts?: { k: string; v: string }[];
  /** Optional band for a colored chip: low, medium, high, critical, or urgent. */
  band?: string;
  tag?: string;
}
interface GridData { title?: string; unit?: string; tiles: Tile[]; cols?: number; foot?: string }

const BANDS: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Critical', urgent: 'Tell someone today' };

/**
 * <pdac-reveal-grid data-src="m4-findings.json"> a board of face-down tiles,
 * for debriefs where the room calls out what it found: click a tile to turn
 * it over (the counter shows how many the room found), the clicker turns the
 * next one, A turns them all, R turns them back. Clicking an open tile shows
 * its details in the panel below.
 */
export class PdacRevealGrid extends PdacBase {
  private data!: GridData;
  private open = new Set<string>();
  private picked: string | null = null;

  protected setup(): void {
    this.data = this.json<GridData>();
    this.style.setProperty('--rg-cols', String(this.data.cols ?? 4));
    this.innerHTML = `
      <div class="rg-grid" role="group" aria-label="${esc(this.data.title ?? 'Tiles')}"></div>
      <div class="rg-detail" aria-live="polite"></div>
      <div class="pdac-bar">
        <div class="pdac-bar__left">
          <button type="button" class="pdac-btn" data-act="all">${icon('eye')} Turn all over <span class="pdac-key">A</span></button>
          <button type="button" class="pdac-btn pdac-btn--quiet" data-act="reset">${icon('rotate-ccw')} Turn back <span class="pdac-key">R</span></button>
        </div>
        <p class="pdac-bar__status rg-count" aria-live="polite"></p>
      </div>`;
    this.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const tile = t.closest<HTMLElement>('[data-tile]');
      if (tile) {
        const id = tile.dataset.tile!;
        if (!this.open.has(id)) this.open.add(id);
        this.picked = id;
        return this.render();
      }
      const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'all') this.showAnswer();
      if (act === 'reset') this.reset();
    });
    this.render();
  }

  step(dir: 1 | -1): boolean {
    const tiles = this.data.tiles;
    if (dir === 1) {
      const next = tiles.find((t) => !this.open.has(t.id));
      if (!next) return false;
      this.open.add(next.id);
      this.picked = next.id;
      this.render();
      return true;
    }
    const lastOpen = [...tiles].reverse().find((t) => this.open.has(t.id));
    if (!lastOpen) return false;
    this.open.delete(lastOpen.id);
    this.picked = [...tiles].reverse().find((t) => this.open.has(t.id))?.id ?? null;
    this.render();
    return true;
  }

  private render(): void {
    this.$('.rg-grid').innerHTML = this.data.tiles.map((t, i) => {
      const on = this.open.has(t.id);
      const band = t.band ? `<span class="rg-band band-${esc(t.band)}">${esc(BANDS[t.band] ?? t.band)}</span>` : '';
      return `<button type="button" class="rg-tile ${on ? 'is-open' : ''} ${this.picked === t.id ? 'is-focus' : ''}" data-tile="${esc(t.id)}" aria-expanded="${on}">
          ${on
            ? `<span class="rg-top"><span class="rg-n">${i + 1}</span><span class="rg-label">${esc(t.label)}</span>${band}</span><span class="rg-head">${md(t.head)}</span>`
            : `<span class="rg-n">${i + 1}</span><span class="rg-label">${esc(t.label)}</span><span class="rg-hidden">${icon('search')} Found it?</span>`}
        </button>`;
    }).join('');
    const t = this.data.tiles.find((x) => x.id === this.picked && this.open.has(x.id));
    const box = this.$('.rg-detail');
    if (t && (t.body || t.facts?.length)) {
      box.innerHTML = `<p class="rg-detail__head">${md(t.head)}</p>
        ${t.facts?.length ? `<dl class="vr-facts">${t.facts.map((f) => `<dt>${esc(f.k)}</dt><dd>${md(f.v)}</dd>`).join('')}</dl>` : ''}
        ${t.body ? `<p class="vr-why">${md(t.body)}</p>` : ''}`;
      box.classList.add('is-on');
    } else {
      box.innerHTML = this.data.foot ? `<p class="rg-foot">${md(this.data.foot)}</p>` : '';
      box.classList.toggle('is-on', Boolean(this.data.foot));
    }
    this.$('.rg-count').innerHTML = `<b>${this.open.size} of ${this.data.tiles.length}</b> ${esc(this.data.unit ?? 'turned over')}`;
  }

  showAnswer(): void {
    this.data.tiles.forEach((t) => this.open.add(t.id));
    this.render();
  }

  reset(): void {
    this.open.clear();
    this.picked = null;
    this.render();
  }
}
