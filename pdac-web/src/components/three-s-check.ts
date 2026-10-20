import { icon } from '../core/icons';
import { PdacBase, esc, md, verdict } from './base';

interface Scenario {
  id: string; text: string;
  sensitive: string; stolen: string; serious: string;
  decision: string; why: string; notify?: boolean;
}
interface Question { key: 'sensitive' | 'stolen' | 'serious'; label: string; plain: string }
interface CheckData { questions?: Question[]; scenarios?: Scenario[] }

const DEFAULT_QUESTIONS: Question[] = [
  { key: 'sensitive', label: 'Sensitive?', plain: 'Sensitive personal information, or information that could be used for identity fraud' },
  { key: 'stolen', label: 'Stolen?', plain: 'Reason to believe someone with no right to it has acquired it' },
  { key: 'serious', label: 'Serious?', plain: 'Likely to give rise to a real risk of serious harm to the people involved' },
];
const TEAM = [
  { id: 'yes', label: 'Yes' },
  { id: 'unsure', label: 'Not sure' },
  { id: 'no', label: 'No' },
];

/**
 * <pdac-three-s-check data-src="m1-notify.json">
 * A scenario and three switches (Sensitive, Stolen, Serious). Set the team's
 * answer from the front, then reveal the model answer and why.
 */
export class PdacThreeSCheck extends PdacBase {
  private scenarios: Scenario[] = [];
  private questions: Question[] = DEFAULT_QUESTIONS;
  private index = 0;
  private team: Record<string, string>[] = [];
  private decisions: (boolean | null)[] = [];
  private revealed: boolean[] = [];

  protected setup(): void {
    const data = this.json<Scenario[] | CheckData>();
    if (Array.isArray(data)) this.scenarios = data;
    else {
      this.scenarios = data.scenarios ?? [];
      if (data.questions?.length) this.questions = data.questions;
    }
    this.resetState();
    this.innerHTML = `
      <blockquote class="vr-case ts-case"></blockquote>
      <div class="ts-grid"></div>
      <div class="ts-decide">
        <span class="ts-decide__k">Team decision</span>
        <div class="ts-seg" role="group" aria-label="Team decision">
          <button type="button" data-decide="1">Notify</button>
          <button type="button" data-decide="0">Do not notify</button>
        </div>
        <button type="button" class="pdac-btn pdac-btn--primary" data-act="reveal">${icon('eye')} Reveal model answer <span class="pdac-key">A</span></button>
        <div class="vr-nav">
          <p class="vr-count" aria-live="polite"></p>
          <button type="button" class="pdac-btn pdac-btn--quiet pdac-btn--icon" data-act="prev" aria-label="Previous scenario">${icon('chevron-left')}</button>
          <button type="button" class="pdac-btn pdac-btn--quiet pdac-btn--icon" data-act="next" aria-label="Next scenario">${icon('chevron-right')}</button>
        </div>
      </div>
      <div class="vr-reveal ts-reveal" aria-live="polite"></div>`;
    this.addEventListener('click', (e) => this.onClick(e));
    this.render();
  }

  private resetState(): void {
    this.index = 0;
    this.team = this.scenarios.map(() => ({}));
    this.decisions = this.scenarios.map(() => null);
    this.revealed = this.scenarios.map(() => false);
  }

  private onClick(e: Event): void {
    const t = e.target as HTMLElement;
    const sw = t.closest<HTMLElement>('[data-q]');
    if (sw) {
      const cur = this.team[this.index][sw.dataset.q!];
      this.team[this.index][sw.dataset.q!] = cur === sw.dataset.v ? '' : sw.dataset.v!;
      return this.render();
    }
    const d = t.closest<HTMLElement>('[data-decide]');
    if (d) {
      const v = d.dataset.decide === '1';
      this.decisions[this.index] = this.decisions[this.index] === v ? null : v;
      return this.render();
    }
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'prev' && this.index > 0) { this.index--; this.render(); }
    if (act === 'next' && this.index < this.scenarios.length - 1) { this.index++; this.render(); }
    if (act === 'reveal') this.showAnswer();
  }

  step(dir: 1 | -1): boolean {
    if (dir === 1) {
      if (!this.revealed[this.index]) { this.showAnswer(); return true; }
      if (this.index < this.scenarios.length - 1) { this.index++; this.render(); return true; }
      return false;
    }
    if (this.revealed[this.index]) { this.revealed[this.index] = false; this.render(); return true; }
    if (this.index > 0) { this.index--; this.render(); return true; }
    return false;
  }

  private render(): void {
    const sc = this.scenarios[this.index];
    const revealed = this.revealed[this.index];
    this.$('.vr-count').textContent = `Scenario ${this.index + 1} of ${this.scenarios.length}`;
    this.$('.ts-case').innerHTML = md(sc.text);
    (this.querySelector('[data-act="prev"]') as HTMLButtonElement).disabled = this.index === 0;
    (this.querySelector('[data-act="next"]') as HTMLButtonElement).disabled = this.index === this.scenarios.length - 1;

    this.$('.ts-grid').innerHTML = this.questions.map((q, n) => {
      const pick = this.team[this.index][q.key] ?? '';
      const model = sc[q.key];
      return `<div class="ts-row">
          <div class="ts-q"><span class="ts-num">${n + 1}</span><span><b>${esc(q.label)}</b><span class="ts-plain">${esc(q.plain)}</span></span></div>
          <div class="ts-seg" role="group" aria-label="${esc(q.label)} team answer">
            ${TEAM.map((o) => `<button type="button" data-q="${q.key}" data-v="${o.id}" aria-pressed="${pick === o.id}">${o.label}</button>`).join('')}
          </div>
          <div class="ts-model">${revealed ? `<span class="ts-model__k">Model</span> <b>${esc(capital(model))}</b>` : ''}</div>
        </div>`;
    }).join('');

    this.$$('[data-decide]').forEach((b) => b.setAttribute('aria-pressed', String(this.decisions[this.index] === (b.dataset.decide === '1'))));

    const box = this.$('.ts-reveal');
    if (!revealed) { box.innerHTML = ''; box.classList.remove('is-on'); return; }
    const team = this.decisions[this.index];
    const notify = sc.notify ?? (/notif/i.test(sc.decision) && !/not notif|usually not/i.test(sc.decision));
    const same = team === null ? '' : verdict(team === notify, 'Same as the team', 'Different from the team');
    box.innerHTML = `<p class="vr-answer"><span class="vr-answer__k">Model decision</span> ${esc(sc.decision)} ${same}</p>
      <p class="vr-why"><span class="vr-why__k">Why:</span> ${md(sc.why)}</p>`;
    box.classList.add('is-on');
  }

  showAnswer(): void {
    this.revealed[this.index] = true;
    this.render();
  }

  reset(): void {
    this.resetState();
    this.render();
  }
}

function capital(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}
