import { icon } from '../core/icons';
import { PdacBase, esc, md } from './base';

interface Rule { id: string; action: 'allow' | 'deny'; from: string; to: string; service: string; why?: string }
interface Flow { id: string; label: string; from: string; to: string; service: string; expect: 'allow' | 'deny' }
interface FirewallData {
  zones: Record<string, string>;
  rules: Rule[];
  flows: Flow[];
  start: string[];
  answer: string[];
  /** Rules switched off at the start, and in the answer (e.g. an "allow any" rule). */
  startOff?: string[];
  answerOff?: string[];
  lesson?: string;
  /** Shown after "Fix the rules" (A): what changed and why. */
  answerNote?: string;
}
interface Result { allowed: boolean; by: string; rule?: Rule }

/**
 * <pdac-firewall-sim data-src="m3-traffic-flows.json">
 * A rule table read top to bottom (first match wins) above a default deny.
 * "Send traffic" plays the flows; move rules up or down to show that order
 * matters, and switch a rule off (an "allow any" mistake) to see what it let
 * through. Every blocked connection is logged, for someone to review.
 */
export class PdacFirewallSim extends PdacBase {
  private data!: FirewallData;
  private order: string[] = [];
  private off = new Set<string>();
  private results = new Map<string, Result>();
  private playing = 0;
  private fixed = false;

  protected setup(): void {
    this.data = this.json<FirewallData>();
    const ids = new Set(this.data.rules.map((r) => r.id));
    for (const id of [...this.data.start, ...this.data.answer, ...(this.data.startOff ?? []), ...(this.data.answerOff ?? [])]) {
      if (!ids.has(id)) throw new Error(`Unknown rule "${id}" in ${this.dataset.src}`);
    }
    this.load(this.data.start, this.data.startOff);
    this.innerHTML = `
      <div class="fw-wrap">
        <div class="fw-rules">
          <p class="fw-k">Rules, checked from the top. The first rule that matches decides.</p>
          <table class="t compact fw-table">
            <thead><tr><th>#</th><th>Action</th><th>From</th><th>To</th><th>Service</th><th><span class="pdac-sr">Switch and move</span></th></tr></thead>
            <tbody></tbody>
          </table>
          <div class="pdac-bar__left fw-controls">
            <button type="button" class="pdac-btn pdac-btn--primary" data-act="run">${icon('play')} Send traffic</button>
            <button type="button" class="pdac-btn" data-act="answer">${icon('wrench')} Fix the rules <span class="pdac-key">A</span></button>
            <button type="button" class="pdac-btn pdac-btn--quiet" data-act="reset">${icon('rotate-ccw')} Reset <span class="pdac-key">R</span></button>
          </div>
        </div>
        <div class="fw-flows">
          <p class="fw-k">Traffic <span class="fw-log" aria-live="polite"></span></p>
          <ol class="fw-list"></ol>
          <p class="fw-lesson" aria-live="polite"></p>
        </div>
      </div>`;
    this.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const mv = t.closest<HTMLElement>('[data-move]');
      if (mv) return this.move(mv.dataset.id!, mv.dataset.move === 'up' ? -1 : 1);
      const sw = t.closest<HTMLElement>('[data-switch]');
      if (sw) return this.toggle(sw.dataset.switch!);
      const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'run') this.run();
      if (act === 'answer') this.showAnswer();
      if (act === 'reset') this.reset();
    });
    this.render();
  }

  private load(order: string[], off?: string[]): void {
    this.order = [...order];
    this.off = new Set(off ?? []);
  }

  private zone(id: string): string {
    return id === 'any' ? 'Anywhere' : this.data.zones[id] ?? id;
  }

  private evaluate(f: Flow): Result {
    let n = 0;
    for (const id of this.order) {
      n++;
      if (this.off.has(id)) continue;
      const r = this.data.rules.find((x) => x.id === id)!;
      const match = (r.from === 'any' || r.from === f.from) && (r.to === 'any' || r.to === f.to) && (r.service === 'Any' || r.service === f.service);
      if (match) return { allowed: r.action === 'allow', by: `rule ${n}`, rule: r };
    }
    return { allowed: false, by: 'default deny' };
  }

  private changed(): void {
    clearInterval(this.playing);
    this.results.clear();
    this.fixed = false;
    this.render();
  }

  private move(id: string, dir: number): void {
    const i = this.order.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= this.order.length) return;
    [this.order[i], this.order[j]] = [this.order[j], this.order[i]];
    this.changed();
    this.announce(`Rule moved to position ${j + 1}`);
  }

  private toggle(id: string): void {
    if (this.off.has(id)) this.off.delete(id);
    else this.off.add(id);
    this.changed();
    this.announce(`Rule ${this.order.indexOf(id) + 1} switched ${this.off.has(id) ? 'off' : 'on'}`);
  }

  private run(): void {
    clearInterval(this.playing);
    this.results.clear();
    this.render();
    let i = 0;
    const flows = this.data.flows;
    this.playing = window.setInterval(() => {
      const f = flows[i];
      this.results.set(f.id, this.evaluate(f));
      this.render();
      if (++i >= flows.length) {
        clearInterval(this.playing);
        const ok = flows.filter((x) => this.results.get(x.id)!.allowed === (x.expect === 'allow')).length;
        this.announce(`${ok} of ${flows.length} flows handled as intended`);
      }
    }, 450);
  }

  private render(): void {
    this.$('.fw-table tbody').innerHTML = this.order.map((id, n) => {
      const r = this.data.rules.find((x) => x.id === id)!;
      const isOff = this.off.has(id);
      return `<tr class="${isOff ? 'is-off' : ''}" ${r.why ? `title="${esc(r.why)}"` : ''}>
          <td>${n + 1}</td>
          <td><span class="fw-action is-${isOff ? 'off' : r.action}">${icon(isOff ? 'minus' : r.action === 'allow' ? 'check' : 'ban')} ${isOff ? 'Off' : r.action === 'allow' ? 'Allow' : 'Deny'}</span></td>
          <td>${esc(this.zone(r.from))}</td><td>${esc(this.zone(r.to))}</td><td>${esc(r.service)}</td>
          <td class="fw-move">
            <button type="button" class="pdac-btn pdac-btn--quiet fw-switch ${isOff ? 'is-off' : 'is-on'}" data-switch="${r.id}" aria-label="Rule ${n + 1} is ${isOff ? 'off: switch it on' : 'on: switch it off'}">${isOff ? 'Off' : 'On'}</button>
            <button type="button" class="pdac-btn pdac-btn--quiet pdac-btn--icon" data-move="up" data-id="${r.id}" aria-label="Move rule ${n + 1} up" ${n === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" class="pdac-btn pdac-btn--quiet pdac-btn--icon" data-move="down" data-id="${r.id}" aria-label="Move rule ${n + 1} down" ${n === this.order.length - 1 ? 'disabled' : ''}>↓</button>
          </td>
        </tr>`;
    }).join('') + `<tr class="fw-default"><td>∞</td><td><span class="fw-action is-deny">${icon('ban')} Deny</span></td><td colspan="4">Default: everything no rule allows</td></tr>`;

    this.$('.fw-list').innerHTML = this.data.flows.map((f) => {
      const r = this.results.get(f.id);
      const intended = r ? r.allowed === (f.expect === 'allow') : null;
      const mark = r ? `<span class="pdac-verdict fw-mark ${intended ? 'is-ok' : 'is-no'}">${intended ? '✓ Intended' : '✗ Not intended'}</span>` : '';
      return `<li class="fw-flow ${r ? (intended ? 'is-good' : 'is-bad') : ''}">
          <span class="fw-flow__label">${esc(f.label)}${mark}</span>
          <span class="fw-flow__row"><span class="fw-flow__meta">${esc(this.zone(f.from))} → ${esc(this.zone(f.to))} · ${esc(f.service)}</span>
          ${r ? `<span class="fw-flow__result"><span class="fw-action is-${r.allowed ? 'allow' : 'deny'}">${icon(r.allowed ? 'check' : 'ban')} ${r.allowed ? 'Allowed' : 'Blocked'}</span> by ${esc(r.by)}</span>` : ''}</span>
        </li>`;
    }).join('');

    const done = this.results.size === this.data.flows.length;
    const blocked = [...this.results.values()].filter((r) => !r.allowed).length;
    const wrong = this.data.flows.filter((f) => { const r = this.results.get(f.id); return r && r.allowed !== (f.expect === 'allow'); }).length;
    this.$('.fw-log').innerHTML = this.results.size
      ? ` · ${icon('scroll-text')} ${blocked} blocked and logged for review${done ? ` · <b>${this.data.flows.length - wrong} of ${this.data.flows.length} as intended</b>` : ''}`
      : '';
    const lesson = this.fixed && this.data.answerNote ? this.data.answerNote : this.data.lesson ?? '';
    this.$('.fw-lesson').innerHTML = lesson ? md(lesson) : '';
  }

  showAnswer(): void {
    this.load(this.data.answer, this.data.answerOff);
    this.fixed = true;
    this.run();
  }

  reset(): void {
    clearInterval(this.playing);
    this.load(this.data.start, this.data.startOff);
    this.results.clear();
    this.fixed = false;
    this.render();
  }
}
