import { icon } from '../core/icons';
import { PdacBase, esc, md } from './base';

interface FlowStep { key: string; label: string; question: string; plain?: string }
interface Clock {
  start: string; startLabel?: string;
  deadlines: { at: string; hours?: number; days?: number; label: string; detail?: string }[];
  phrase?: string; note?: string;
  /** The deck's rule table (step, rule), shown under the clock in clock mode. */
  rules?: [string, string][];
}
interface FlowData {
  steps: FlowStep[];
  allYes: string;
  anyNo: string;
  unsure: { title: string; primary: string; factors: string[]; source?: string };
  clock: Clock;
  presets?: { label: string; value: string }[];
}

/**
 * <pdac-breach-flow data-src="m1-breach.json" data-part="3s|clock|full">
 * The 3S test as a flow you can walk through with a scenario, the "when unsure"
 * factors, and the 72-5 clock that starts at reasonable belief.
 */
export class PdacBreachFlow extends PdacBase {
  private data!: FlowData;
  private mode: '3s' | 'clock' | 'full' = 'full';
  private shown = 0;           // how many flow parts are visible (clicker steps)
  private answers: (boolean | null)[] = [];
  private startAt = '';        // ISO-like "YYYY-MM-DDTHH:MM" chosen for the clock

  protected setup(): void {
    this.data = this.json<FlowData>();
    this.mode = (this.dataset.part as typeof this.mode) ?? 'full';
    this.answers = this.data.steps.map(() => null);
    this.startAt = this.data.presets?.[0]?.value ?? '';
    this.innerHTML = `
      ${this.mode !== 'clock' ? '<div class="bf-flow"></div><div class="bf-unsure"></div>' : ''}
      ${this.mode !== '3s' ? '<div class="bf-clock"></div>' : ''}`;
    this.addEventListener('click', (e) => this.onClick(e));
    this.render();
  }

  private get maxSteps(): number {
    // 3S: one step per question, then the result, then the "when unsure" box. Clock: 1 + deadlines.
    const flow = this.mode !== 'clock' ? this.data.steps.length + 2 : 0;
    const clock = this.mode !== '3s' ? 1 + this.data.clock.deadlines.length : 0;
    return flow + clock;
  }

  private onClick(e: Event): void {
    const t = e.target as HTMLElement;
    const yn = t.closest<HTMLElement>('[data-yn]');
    if (yn) {
      const i = Number(yn.dataset.i);
      const v = yn.dataset.yn === 'yes';
      this.answers[i] = this.answers[i] === v ? null : v;
      // Walking a scenario reveals the flow as far as the answers go.
      this.shown = Math.max(this.shown, i + 2);
      return this.render();
    }
    const preset = t.closest<HTMLElement>('[data-preset]');
    if (preset) {
      this.startAt = preset.dataset.preset === 'now' ? localIso(new Date()) : preset.dataset.preset!;
      return this.render();
    }
  }

  step(dir: 1 | -1): boolean {
    if (dir === 1 && this.shown < this.maxSteps) { this.shown++; this.render(); return true; }
    if (dir === -1 && this.shown > 0) { this.shown--; this.render(); return true; }
    return false;
  }

  private render(): void {
    if (this.mode !== 'clock') this.renderFlow();
    if (this.mode !== '3s') this.renderClock();
    // Full mode has room for one lower panel: "when unsure" first, then the clock replaces it.
    this.classList.toggle('show-clock', this.mode === 'full' && this.shown > this.data.steps.length + 2);
  }

  private renderFlow(): void {
    const steps = this.data.steps;
    const firstNo = this.answers.findIndex((a) => a === false);
    const allYes = this.answers.every((a) => a === true);
    const visible = (i: number) => this.shown > i;
    const flow = this.$('.bf-flow');
    flow.innerHTML = steps.map((s, i) => {
      const a = this.answers[i];
      const blocked = firstNo !== -1 && i > firstNo;
      return `<div class="bf-step ${visible(i) ? 'is-on' : ''} ${blocked ? 'is-blocked' : ''}">
          <span class="bf-step__num">${i + 1}</span>
          <h3 class="bf-step__label">${esc(s.label)}</h3>
          <p class="bf-step__q">${md(s.question)}</p>
          ${s.plain ? `<p class="bf-step__plain">${md(s.plain)}</p>` : ''}
          <div class="ts-seg bf-step__yn" role="group" aria-label="${esc(s.label)}">
            <button type="button" data-i="${i}" data-yn="yes" aria-pressed="${a === true}">Yes</button>
            <button type="button" data-i="${i}" data-yn="no" aria-pressed="${a === false}">No</button>
          </div>
        </div>${i < steps.length - 1 ? `<span class="bf-arrow ${visible(i + 1) ? 'is-on' : ''}" aria-hidden="true">${icon('arrow-right')}</span>` : ''}`;
    }).join('') + `<span class="bf-arrow ${visible(steps.length) ? 'is-on' : ''}" aria-hidden="true">${icon('arrow-right')}</span>
      <div class="bf-result ${visible(steps.length) ? 'is-on' : ''} ${firstNo !== -1 ? 'is-no' : allYes ? 'is-yes' : ''}" aria-live="polite">
        <span class="bf-result__k">${firstNo !== -1 ? 'Stop here' : 'All three'}</span>
        <p>${md(firstNo !== -1 ? this.data.anyNo : this.data.allYes)}</p>
      </div>`;

    const u = this.data.unsure;
    const box = this.$('.bf-unsure');
    box.classList.toggle('is-on', visible(steps.length + 1));
    box.innerHTML = `<h3>${icon('circle-help')} ${esc(u.title)}</h3>
      <p class="bf-unsure__primary">${md(u.primary)}</p>
      <ul>${u.factors.map((f) => `<li>${md(f)}</li>`).join('')}</ul>
      ${u.source ? `<p class="bf-src">${esc(u.source)}</p>` : ''}`;
  }

  private renderClock(): void {
    const c = this.data.clock;
    const offset = this.mode === 'full' ? this.data.steps.length + 2 : 0;
    const visible = (i: number) => this.shown > offset + i;
    const start = this.startAt ? new Date(this.startAt) : null;
    const presets = this.data.presets ?? [];
    const box = this.$('.bf-clock');
    box.innerHTML = `
      <div class="bf-clock__line">
        <div class="bf-mark is-start ${visible(0) ? 'is-on' : ''}">
          <span class="bf-mark__dot">${icon('alarm-smoke')}</span>
          <span class="bf-mark__at">${esc(c.start)}</span>
          ${c.startLabel ? `<span class="bf-mark__label">${esc(c.startLabel)}</span>` : ''}
          ${start ? `<span class="bf-mark__when">${fmtWhen(start)}</span>` : ''}
        </div>
        ${c.deadlines.map((d, i) => {
          const when = start && d.hours ? fmtWhen(new Date(start.getTime() + d.hours * 3600_000)) : '';
          return `<div class="bf-mark ${visible(i + 1) ? 'is-on' : ''}">
              <span class="bf-mark__dot">${icon(i === 0 ? 'timer' : 'file-text')}</span>
              <span class="bf-mark__at">${esc(d.at)}</span>
              <span class="bf-mark__label">${esc(d.label)}</span>
              ${d.detail ? `<span class="bf-mark__detail">${md(d.detail)}</span>` : ''}
              ${when ? `<span class="bf-mark__when">${when}</span>` : ''}
            </div>`;
        }).join('')}
      </div>
      ${presets.length ? `<div class="bf-presets" role="group" aria-label="When was there reasonable belief?">
          <span>Reasonable belief at:</span>
          ${presets.map((p) => `<button type="button" class="pdac-btn pdac-btn--quiet" data-preset="${esc(p.value)}" aria-pressed="${p.value === this.startAt}">${esc(p.label)}</button>`).join('')}
          <button type="button" class="pdac-btn pdac-btn--quiet" data-preset="now">Now</button>
        </div>` : ''}
      ${c.phrase ? `<p class="bf-phrase">${md(c.phrase)}</p>` : ''}
      ${this.mode === 'clock' && c.rules?.length ? `<table class="t compact bf-rules">
          <thead><tr><th>Step</th><th>Rule</th></tr></thead>
          <tbody>${c.rules.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${md(v)}</td></tr>`).join('')}</tbody>
        </table>` : ''}
      ${c.note ? `<p class="bf-src">${md(c.note)}</p>` : ''}`;
  }

  showAnswer(): void {
    this.shown = this.maxSteps;
    this.render();
  }

  reset(): void {
    this.shown = 0;
    this.answers = this.data.steps.map(() => null);
    this.startAt = this.data.presets?.[0]?.value ?? '';
    this.render();
  }
}

function localIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function fmtWhen(d: Date): string {
  return d.toLocaleString('en-PH', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}
