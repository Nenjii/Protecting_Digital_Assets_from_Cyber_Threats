import { icon } from '../core/icons';
import { PdacBase, esc, md } from './base';

interface Band { label: string; min: number; max: number; cls: string }
interface Risk { id: string; label: string; likelihood: number; impact: number; note?: string }
interface MatrixData {
  likelihood: string[]; // 1..5 labels
  impact: string[];     // 1..5 labels
  bands: Band[];
  risks: Risk[];
  caption?: string;
}

/**
 * <pdac-risk-matrix data-src="m2-risks.json" data-risks="r1,r2">
 * 5 by 5 grid, likelihood × impact. Every cell shows its score and band in words.
 * Click a risk, then a cell, to place it live; A places each at its model position.
 */
export class PdacRiskMatrix extends PdacBase {
  private data!: MatrixData;
  private risks: Risk[] = [];
  private placed = new Map<string, [number, number]>(); // id → [likelihood, impact]
  private selected: string | null = null;
  private answered = false;

  protected setup(): void {
    this.data = this.json<MatrixData>();
    const pick = (this.dataset.risks ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    this.risks = pick.length ? this.data.risks.filter((r) => pick.includes(r.id)) : this.data.risks;
    this.innerHTML = `
      <div class="rm-wrap">
        <div class="rm-grid-wrap">
          <div class="rm-ylabel"><span>Likelihood</span></div>
          <div class="rm-grid" role="grid" aria-label="Likelihood by impact"></div>
          <div class="rm-xlabel">Impact</div>
        </div>
        <div class="rm-side">
          <p class="rm-k">Risks to place</p>
          <div class="rm-risks"></div>
          <div class="rm-bands">${this.data.bands.map((b) => `<span class="rm-band ${b.cls}"><b>${esc(b.label)}</b> ${b.min} to ${b.max}</span>`).join('')}</div>
          ${this.data.caption ? `<p class="rm-caption">${md(this.data.caption)}</p>` : ''}
          <div class="pdac-bar__left">
            <button type="button" class="pdac-btn" data-act="answer">${icon('eye')} Show answer <span class="pdac-key">A</span></button>
            <button type="button" class="pdac-btn pdac-btn--quiet" data-act="reset">${icon('rotate-ccw')} Reset <span class="pdac-key">R</span></button>
          </div>
        </div>
      </div>`;
    this.addEventListener('click', (e) => this.onClick(e));
    this.render();
  }

  band(score: number): Band | undefined {
    return this.data.bands.find((b) => score >= b.min && score <= b.max);
  }

  private onClick(e: Event): void {
    const t = e.target as HTMLElement;
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'answer') return this.showAnswer();
    if (act === 'reset') return this.reset();
    const r = t.closest<HTMLElement>('[data-risk]');
    if (r) {
      this.selected = this.selected === r.dataset.risk ? null : r.dataset.risk!;
      return this.render();
    }
    const cell = t.closest<HTMLElement>('[data-l]');
    if (cell && this.selected) {
      this.placed.set(this.selected, [Number(cell.dataset.l), Number(cell.dataset.i)]);
      const risk = this.risks.find((x) => x.id === this.selected)!;
      const score = Number(cell.dataset.l) * Number(cell.dataset.i);
      this.announce(`${risk.label}: ${score}, ${this.band(score)?.label ?? ''}`);
      this.selected = null;
      this.answered = false;
      this.render();
    }
  }

  private render(): void {
    const grid = this.$('.rm-grid');
    let html = '';
    for (let l = 5; l >= 1; l--) {
      html += `<div class="rm-rowhead" role="rowheader"><b>${l}</b> ${esc(this.data.likelihood[l - 1] ?? '')}</div>`;
      for (let i = 1; i <= 5; i++) {
        const score = l * i;
        const b = this.band(score);
        const here = this.risks.filter((r) => {
          const p = this.placed.get(r.id);
          return p && p[0] === l && p[1] === i;
        });
        html += `<button type="button" class="rm-cell ${b?.cls ?? ''} ${this.selected ? 'is-target' : ''} ${here.length ? 'has-pin' : ''}" data-l="${l}" data-i="${i}" role="gridcell"
            aria-label="Likelihood ${l}, impact ${i}: ${score} ${b?.label ?? ''}">
            <span class="rm-score">${score}</span><span class="rm-word">${esc(b?.label ?? '')}</span>
            ${here.length ? `<span class="rm-pins">${here.map((r) => `<span class="rm-pin">${esc(short(r))}</span>`).join('')}</span>` : ''}
          </button>`;
      }
    }
    html += `<div class="rm-corner"></div>${[1, 2, 3, 4, 5].map((i) => `<div class="rm-colhead"><b>${i}</b> ${esc(this.data.impact[i - 1] ?? '')}</div>`).join('')}`;
    grid.innerHTML = html;

    this.$('.rm-risks').innerHTML = this.risks.map((r) => {
      const p = this.placed.get(r.id);
      const score = p ? p[0] * p[1] : 0;
      const b = p ? this.band(score) : undefined;
      const model = this.answered ? `<span class="rm-risk__why">${md(r.note ?? '')}</span>` : '';
      return `<button type="button" class="rm-risk ${this.selected === r.id ? 'is-selected' : ''}" data-risk="${esc(r.id)}" aria-pressed="${this.selected === r.id}">
          <span class="rm-risk__tag">${esc(short(r))}</span>
          <span class="rm-risk__label">${esc(r.label)}</span>
          ${p ? `<span class="rm-risk__score ${b?.cls ?? ''}">L${p[0]} × I${p[1]} = ${score} ${esc(b?.label ?? '')}</span>` : '<span class="rm-risk__score">Not placed</span>'}
          ${model}
        </button>`;
    }).join('');
  }

  showAnswer(): void {
    this.risks.forEach((r) => this.placed.set(r.id, [r.likelihood, r.impact]));
    this.selected = null;
    this.answered = true;
    this.render();
  }

  reset(): void {
    this.placed.clear();
    this.selected = null;
    this.answered = false;
    this.render();
  }
}

function short(r: Risk): string {
  return r.id.toUpperCase();
}
