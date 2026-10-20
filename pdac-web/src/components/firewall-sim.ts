import { icon } from '../core/icons';
import { PdacBase, esc, md } from './base';

interface Rule { id: string; action: 'allow' | 'deny'; from: string; to: string; service: string; why?: string }
interface Flow { id: string; label: string; from: string; to: string; service: string; expect: 'allow' | 'deny' }
interface FirewallData { zones: Record<string, string>; rules: Rule[]; flows: Flow[]; start: string[]; answer: string[]; lesson?: string }
interface Result { allowed: boolean; by: string }

/**
 * <pdac-firewall-sim data-src="m3-traffic-flows.json">
 * A rule table read top to bottom (first match wins) above a default deny.
 * "Send traffic" plays six flows; move rules up or down to show that order matters.
 */
export class PdacFirewallSim extends PdacBase {
  private data!: FirewallData;
  private order: string[] = [];
  private results = new Map<string, Result>();
  private playing = 0;

  protected setup(): void {
    this.data = this.json<FirewallData>();
    this.order = [...this.data.start];
    this.innerHTML = `
      <div class="fw-wrap">
        <div class="fw-rules">
          <p class="fw-k">Rules, checked from the top. The first rule that matches decides.</p>
          <table class="t compact fw-table">
            <thead><tr><th>#</th><th>Action</th><th>From</th><th>To</th><th>Service</th><th><span class="pdac-sr">Move</span></th></tr></thead>
            <tbody></tbody>
          </table>
          <div class="pdac-bar__left fw-controls">
            <button type="button" class="pdac-btn pdac-btn--primary" data-act="run">${icon('play')} Send traffic</button>
            <button type="button" class="pdac-btn" data-act="answer">${icon('eye')} Fix the order <span class="pdac-key">A</span></button>
            <button type="button" class="pdac-btn pdac-btn--quiet" data-act="reset">${icon('rotate-ccw')} Reset <span class="pdac-key">R</span></button>
          </div>
          ${this.data.lesson ? `<p class="fw-lesson">${md(this.data.lesson)}</p>` : ''}
        </div>
        <div class="fw-flows">
          <p class="fw-k">Traffic</p>
          <ol class="fw-list"></ol>
        </div>
      </div>`;
    this.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const mv = t.closest<HTMLElement>('[data-move]');
      if (mv) return this.move(mv.dataset.id!, mv.dataset.move === 'up' ? -1 : 1);
      const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'run') this.run();
      if (act === 'answer') this.showAnswer();
      if (act === 'reset') this.reset();
    });
    this.render();
  }

  private zone(id: string): string {
    return id === 'any' ? 'Anywhere' : this.data.zones[id] ?? id;
  }

  private evaluate(f: Flow): Result {
    for (const [n, id] of this.order.entries()) {
      const r = this.data.rules.find((x) => x.id === id)!;
      const match = (r.from === 'any' || r.from === f.from) && (r.to === 'any' || r.to === f.to) && (r.service === 'Any' || r.service === f.service);
      if (match) return { allowed: r.action === 'allow', by: `rule ${n + 1}` };
    }
    return { allowed: false, by: 'the default deny' };
  }

  private move(id: string, dir: number): void {
    const i = this.order.indexOf(id);
    const j = i + dir;
    if (j < 0 || j >= this.order.length) return;
    [this.order[i], this.order[j]] = [this.order[j], this.order[i]];
    this.results.clear();
    this.render();
    this.announce(`Rule moved to position ${j + 1}`);
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
      return `<tr>
          <td>${n + 1}</td>
          <td><span class="fw-action is-${r.action}">${icon(r.action === 'allow' ? 'check' : 'ban')} ${r.action === 'allow' ? 'Allow' : 'Deny'}</span></td>
          <td>${esc(this.zone(r.from))}</td><td>${esc(this.zone(r.to))}</td><td>${esc(r.service)}</td>
          <td class="fw-move">
            <button type="button" class="pdac-btn pdac-btn--quiet pdac-btn--icon" data-move="up" data-id="${r.id}" aria-label="Move rule ${n + 1} up" ${n === 0 ? 'disabled' : ''}>↑</button>
            <button type="button" class="pdac-btn pdac-btn--quiet pdac-btn--icon" data-move="down" data-id="${r.id}" aria-label="Move rule ${n + 1} down" ${n === this.order.length - 1 ? 'disabled' : ''}>↓</button>
          </td>
        </tr>`;
    }).join('') + `<tr class="fw-default"><td>∞</td><td><span class="fw-action is-deny">${icon('ban')} Deny</span></td><td colspan="4">Default: everything no rule allows</td></tr>`;

    this.$('.fw-list').innerHTML = this.data.flows.map((f) => {
      const r = this.results.get(f.id);
      const intended = r ? r.allowed === (f.expect === 'allow') : null;
      return `<li class="fw-flow ${r ? (intended ? 'is-good' : 'is-bad') : ''}">
          <span class="fw-flow__label">${esc(f.label)}</span>
          <span class="fw-flow__meta">${esc(this.zone(f.from))} → ${esc(this.zone(f.to))} · ${esc(f.service)}</span>
          ${r ? `<span class="fw-flow__result"><span class="fw-action is-${r.allowed ? 'allow' : 'deny'}">${icon(r.allowed ? 'check' : 'ban')} ${r.allowed ? 'Allowed' : 'Blocked'}</span> by ${esc(r.by)}
            <span class="pdac-verdict ${intended ? 'is-ok' : 'is-no'}">${intended ? '✓ As intended' : '✗ Not as intended'}</span></span>` : ''}
        </li>`;
    }).join('');
  }

  showAnswer(): void {
    this.order = [...this.data.answer];
    this.run();
  }

  reset(): void {
    clearInterval(this.playing);
    this.order = [...this.data.start];
    this.results.clear();
    this.render();
  }
}
