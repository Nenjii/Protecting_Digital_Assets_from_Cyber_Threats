import { hydrateQr, proof, proofHtml } from '../core/evidence';
import { icon } from '../core/icons';
import { PdacBase, esc } from './base';

/**
 * <pdac-stat-proof> wraps the number tiles of a slide. Each tile with
 * data-proof="<proof id>" (src/data/sources.json) gets a proof card: the exact
 * quote, who published it and when, and a QR code to the page. The clicker
 * shows one proof after another; A shows all; R hides them. Click a tile to
 * flip it. E opens the same sources in the side panel, with bigger QR codes.
 */
export class PdacStatProof extends PdacBase {
  private tiles: HTMLElement[] = [];
  private open: boolean[] = [];

  protected setup(): void {
    this.tiles = this.$$('[data-proof]');
    if (!this.tiles.length) throw new Error('No tile with data-proof inside <pdac-stat-proof>');
    this.tiles.forEach((tile, i) => {
      const ids = tile.dataset.proof!.split(',').map((s) => s.trim());
      const url = proof(ids[0]).source.url;
      tile.classList.add('sp-tile');
      tile.insertAdjacentHTML('beforeend', `
        <button type="button" class="sp-flip" data-i="${i}" aria-expanded="false">${icon('quote')} Show the source</button>
        <div class="sp-card" hidden>
          ${ids.map((id) => proofHtml(id)).join('')}
          <span class="sp-qr" data-qr="${esc(url)}" role="img" aria-label="QR code to the source"></span>
        </div>`);
    });
    this.open = this.tiles.map(() => false);
    this.addEventListener('click', (e) => {
      const flip = (e.target as HTMLElement).closest<HTMLElement>('.sp-flip, .sp-card');
      if (!flip) return;
      const tile = flip.closest<HTMLElement>('.sp-tile')!;
      const i = this.tiles.indexOf(tile);
      this.open[i] = !this.open[i];
      this.render();
    });
    hydrateQr(this);
    this.render();
  }

  step(dir: 1 | -1): boolean {
    if (dir === 1) {
      const next = this.open.indexOf(false);
      if (next === -1) return false;
      this.open[next] = true;
    } else {
      const last = this.open.lastIndexOf(true);
      if (last === -1) return false;
      this.open[last] = false;
    }
    this.render();
    return true;
  }

  private render(): void {
    this.tiles.forEach((tile, i) => {
      const on = this.open[i];
      tile.classList.toggle('is-proved', on);
      tile.querySelector<HTMLElement>('.sp-card')!.hidden = !on;
      const btn = tile.querySelector<HTMLElement>('.sp-flip')!;
      btn.hidden = on;
      btn.setAttribute('aria-expanded', String(on));
    });
    this.classList.toggle('has-proof', this.open.some(Boolean));
  }

  showAnswer(): void {
    this.open = this.tiles.map(() => true);
    this.render();
  }

  reset(): void {
    this.open = this.tiles.map(() => false);
    this.render();
  }
}
