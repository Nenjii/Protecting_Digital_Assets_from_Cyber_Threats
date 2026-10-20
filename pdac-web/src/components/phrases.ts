import { getData } from '../core/data';
import { icon } from '../core/icons';
import { esc } from './base';

export interface Phrase {
  key: string; phrase: string; stands: string; slide: string; icons: string[];
  /** The deck's desk-card wording for recap slides (data-recap): a shorter phrase and what it is for. */
  recapPhrase?: string; recap?: string;
}

/**
 * <pdac-phrases data-keys="cia,doors,trust" data-cols="3" [data-bare | data-recap]>
 * Memory phrases rendered from src/data/phrases.json, so the words and the icon
 * are identical everywhere (spec 3.2 and 3.4). data-recap shows the deck's
 * desk-card wording instead of the full meaning. <pdac-phrase-icon data-key="cia">
 * gives just the icon group for use inside a slide heading or card.
 */
export class PdacPhrases extends HTMLElement {
  connectedCallback(): void {
    if (this.dataset.done) return;
    this.dataset.done = '1';
    const all = getData<Phrase[]>('phrases.json');
    const keys = (this.dataset.keys ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    const list = keys.length ? keys.map((k) => all.find((p) => p.key === k)).filter(Boolean) as Phrase[] : all;
    const missing = keys.filter((k) => !all.some((p) => p.key === k));
    if (missing.length) console.warn('[pdac] unknown phrase keys', missing);
    const recap = this.hasAttribute('data-recap');
    this.innerHTML = `<div class="phrases" style="--n:${this.dataset.cols ?? 3}">${list.map((p) => `
      <div class="phrase-card ${this.hasAttribute('data-fragments') ? 'fragment' : ''}">
        <span class="icon">${p.icons.map((i) => icon(i)).join('')}</span>
        <div><p class="p">${esc(recap ? p.recapPhrase ?? p.phrase : p.phrase)}</p>${this.hasAttribute('data-bare') ? '' : `<p class="s">${esc(recap ? p.recap ?? p.stands : p.stands)}</p>`}</div>
      </div>`).join('')}</div>`;
  }
}

export class PdacPhraseIcon extends HTMLElement {
  connectedCallback(): void {
    if (this.dataset.done) return;
    this.dataset.done = '1';
    const p = getData<Phrase[]>('phrases.json').find((x) => x.key === this.dataset.key);
    this.innerHTML = p ? `<span class="phrase-icon" title="${esc(p.phrase)}">${p.icons.map((i) => icon(i)).join('')}</span>` : '';
  }
}
