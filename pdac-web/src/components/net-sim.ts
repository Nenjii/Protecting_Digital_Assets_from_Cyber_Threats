import { getData, hasData } from '../core/data';
import { hydrateQr, proofHtml } from '../core/evidence';
import { icon } from '../core/icons';
import { Director, run, type Timeline } from '../sim/anim';
import { NetMap, type LinkState, type MapSpec, type NodeState, type PacketKind } from '../sim/netmap';
import { PdacBase, esc, md } from './base';

interface SimSend { route: string[]; kind?: PacketKind; label?: string; blockAt?: string; with?: boolean }
/** Predict, then play: the room votes on the question before the clicker reveals the answer. */
interface SimAsk { q: string; options: string[]; answer: number | number[]; why?: string }
interface SimStep {
  title: string;
  text: string;
  pre?: Record<string, string>;   // device looks before the packets move: "bad|✗ Locked"
  set?: Record<string, string>;   // device looks after the packets arrive
  links?: Record<string, string>; // "pc>db": "hot"
  send?: SimSend[];
  screen?: { title: string; lines: string[] };
  close?: boolean;                // the office with its controls: starts from a clean map
  verdict?: { tone: 'bad' | 'ok'; text: string };
  widget?: 'password';
  proof?: string;
  ask?: SimAsk;
}
interface SimTrack { id: string; tab: string; label: string; breaks?: string[]; desk?: string; it?: string; steps: SimStep[] }
interface SimData { title: string; map: MapSpec | string; tracks: SimTrack[]; summary?: { head: string[]; rows: string[][] } }

const NODE_STATES = ['idle', 'focus', 'ok', 'warn', 'bad', 'off'];
const LINK_STATES = ['idle', 'hot', 'bad', 'ok', 'off'];
export const GOALS: Record<string, [string, string]> = {
  secret: ['lock', 'Secret'],
  correct: ['circle-check', 'Correct'],
  ready: ['power', 'Ready'],
};

export const goalChip = (id: string): string => {
  const [ic, label] = GOALS[id] ?? ['circle-help', id];
  return `<span class="goal-chip">${icon(ic)} ${esc(label)}</span>`;
};

/**
 * <pdac-net-sim data-src="m1-doors.json"> plays scenes on an office network map.
 * Each track (a tab) is a short story; each step moves packets between devices
 * and changes how devices look. The clicker plays the next step (or finishes the
 * one playing); Back shows the previous step without animation. A opens the
 * summary table, R starts over. A step with "ask" is a prediction: the room
 * votes (1 to 9, or tap an option), the clicker reveals the answer and why,
 * and the next press plays what happens.
 */
export class PdacNetSim extends PdacBase {
  private data!: SimData;
  private map!: NetMap;
  private seq: { t: number; s: number }[] = [];
  private index = 0;
  private playing = false;
  private summaryOn = false;
  private director = new Director();
  private tallies = new Map<number, number[]>(); // step index → votes per option
  private asked = new Set<number>();             // step indexes whose answer is revealed

  protected setup(): void {
    this.data = this.json<SimData>();
    const spec = typeof this.data.map === 'string' ? mapFrom(this.data.map) : this.data.map;
    this.map = new NetMap(spec, this.data.title);
    this.seq = this.data.tracks.flatMap((track, t) => track.steps.map((_, s) => ({ t, s })));
    if (!this.seq.length) throw new Error('The simulation has no steps');
    this.validate();
    const sum = this.data.summary;
    this.innerHTML = `
      <div class="ns-tabs" role="group" aria-label="Scenes">${this.data.tracks.map((tr, t) =>
        `<button type="button" class="ns-tab" data-track="${t}">${esc(tr.tab)}</button>`).join('')}
        <p class="pdac-bar__status ns-status" aria-live="polite"></p>
      </div>
      <div class="ns-main">
        <div class="ns-map"></div>
        <aside class="ns-panel" aria-live="polite"></aside>
        ${sum ? `<div class="ns-summary" hidden>
          <table class="t compact"><thead><tr>${sum.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
          <tbody>${sum.rows.map((r) => `<tr>${r.map((c) => `<td>${md(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
        </div>` : ''}
        <div class="pdac-bar ns-bar">
          <div class="pdac-bar__left">
            <button type="button" class="pdac-btn pdac-btn--quiet" data-act="prev">${icon('chevron-left')} Back</button>
            <button type="button" class="pdac-btn pdac-btn--primary" data-act="next">Play next ${icon('chevron-right')}</button>
            <button type="button" class="pdac-btn pdac-btn--quiet" data-act="replay">${icon('rotate-ccw')} Replay</button>
            ${sum ? `<button type="button" class="pdac-btn" data-act="summary">${icon('list-checks')} Summary <span class="pdac-key">A</span></button>` : ''}
          </div>
        </div>
      </div>`;
    this.$('.ns-map').append(this.map.root);
    this.addEventListener('click', (e) => this.onClick(e));
    this.goTo(0, false);
  }

  /** Catch data mistakes at load time, with a message that names the step. */
  private validate(): void {
    const check = (where: string, id: string) => {
      if (!this.map.has(id)) throw new Error(`${where}: unknown device "${id}"`);
    };
    this.data.tracks.forEach((tr) => tr.steps.forEach((st, i) => {
      const where = `${tr.id} step ${i + 1}`;
      for (const states of [st.pre, st.set]) {
        for (const [id, v] of Object.entries(states ?? {})) {
          check(where, id);
          if (!NODE_STATES.includes(v.split('|')[0])) throw new Error(`${where}: unknown look "${v}" for ${id}`);
        }
      }
      for (const [k, v] of Object.entries(st.links ?? {})) {
        k.split('>').forEach((id) => check(where, id));
        if (!LINK_STATES.includes(v)) throw new Error(`${where}: unknown cable state "${v}"`);
      }
      (st.send ?? []).forEach((p) => {
        p.route.forEach((id) => check(where, id));
        if (p.blockAt && !p.route.includes(p.blockAt)) throw new Error(`${where}: blockAt "${p.blockAt}" is not on the route`);
      });
    }));
  }

  private onClick(e: Event): void {
    const t = e.target as HTMLElement;
    const tab = t.closest<HTMLElement>('[data-track]');
    if (tab) {
      const first = this.seq.findIndex((x) => x.t === Number(tab.dataset.track));
      this.summaryOn = false;
      this.goTo(first, true);
      return;
    }
    const opt = t.closest<HTMLElement>('[data-opt]');
    if (opt) { this.vote(Number(opt.dataset.opt) + 1); return; }
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'reveal') { this.revealAsk(); return; }
    if (act === 'next') this.step(1);
    if (act === 'prev') this.step(-1);
    if (act === 'replay') { this.summaryOn = false; this.goTo(this.index, true); }
    if (act === 'summary') { this.summaryOn = !this.summaryOn; this.renderChrome(); }
  }

  private get current(): { track: SimTrack; step: SimStep; s: number } {
    const { t, s } = this.seq[this.index];
    const track = this.data.tracks[t];
    return { track, step: track.steps[s], s };
  }

  /** Steps marked close show the office with its controls, so they start from a clean map. */
  private startOf(track: SimTrack, s: number): number {
    for (let k = s; k >= 0; k--) if (track.steps[k].close) return k;
    return 0;
  }

  private applyStates(states?: Record<string, string>): void {
    for (const [id, v] of Object.entries(states ?? {})) {
      const [state, note = ''] = v.split('|');
      this.map.set(id, state as NodeState, note);
    }
  }

  private applyLinks(links?: Record<string, string>): void {
    for (const [k, v] of Object.entries(links ?? {})) {
      const [a, b] = k.split('>');
      this.map.link(a, b, v as LinkState);
    }
  }

  private applyStep(step: SimStep): void {
    this.applyStates(step.pre);
    this.applyLinks(step.links);
    this.applyStates(step.set);
  }

  /** Show step i. With animate, its packets move; otherwise it appears in its end state. */
  private goTo(i: number, animate: boolean): void {
    const tl = this.director.fresh();
    this.index = Math.max(0, Math.min(i, this.seq.length - 1));
    const { track, step, s } = this.current;
    this.map.reset();
    for (let k = this.startOf(track, s); k < s; k++) this.applyStep(track.steps[k]);
    this.renderPanel();
    if (!animate || !step.send?.length) {
      this.applyStep(step);
      this.playing = false;
      this.renderChrome();
      return;
    }
    this.applyStates(step.pre);
    this.applyLinks(step.links);
    this.playing = true;
    this.renderChrome();
    run(this.play(tl, step).then(() => {
      this.applyStates(step.set);
      this.playing = false;
      this.renderChrome();
    }));
  }

  private async play(tl: Timeline, step: SimStep): Promise<void> {
    const groups: SimSend[][] = [];
    for (const p of step.send ?? []) {
      if (p.with && groups.length) groups[groups.length - 1].push(p);
      else groups.push([p]);
    }
    for (const g of groups) {
      await Promise.all(g.map((p) => this.map.send(tl, p.route, { kind: p.kind, label: p.label, blockAt: p.blockAt })));
    }
  }

  /** Skip to the end of the step that is playing. */
  private finishNow(): void {
    this.director.stop();
    const { track, s } = this.current;
    this.map.reset();
    for (let k = this.startOf(track, s); k <= s; k++) this.applyStep(track.steps[k]);
    this.playing = false;
    this.renderChrome();
  }

  /** The current step's question, if it has one and its answer is not shown yet. */
  private get openAsk(): SimAsk | null {
    const ask = this.current.step.ask;
    return ask && !this.asked.has(this.index) ? ask : null;
  }

  vote(option: number): void {
    const ask = this.openAsk;
    if (!ask || option < 1 || option > ask.options.length) return;
    const tally = this.tallies.get(this.index) ?? ask.options.map(() => 0);
    tally[option - 1]++;
    this.tallies.set(this.index, tally);
    this.renderPanel();
  }

  private revealAsk(): void {
    if (!this.openAsk) return;
    this.asked.add(this.index);
    this.renderPanel();
    this.renderChrome();
  }

  step(dir: 1 | -1): boolean {
    if (this.summaryOn) {
      this.summaryOn = false;
      this.renderChrome();
      return true;
    }
    if (this.playing) {
      this.finishNow();
      if (dir === 1) return true;
    }
    if (dir === 1 && this.openAsk) {
      this.revealAsk();
      return true;
    }
    if (dir === -1 && this.current.step.ask && this.asked.has(this.index)) {
      this.asked.delete(this.index);
      this.renderPanel();
      this.renderChrome();
      return true;
    }
    if (dir === 1) {
      if (this.index >= this.seq.length - 1) return false;
      this.goTo(this.index + 1, true);
      return true;
    }
    if (this.index <= 0) return false;
    this.goTo(this.index - 1, false);
    return true;
  }

  private renderPanel(): void {
    const { track, step, s } = this.current;
    const verdict = step.verdict
      ? `<p class="ns-verdict is-${step.verdict.tone}">${step.verdict.tone === 'ok' ? '✓' : '✗'} ${esc(step.verdict.text)}</p>` : '';
    // What the door puts at risk: on the door's first step, and again when the damage is done.
    const breaks = !step.close && track.breaks?.length && (s === 0 || step.verdict?.tone === 'bad')
      ? `<p class="ns-breaks"><span class="ns-mini">Puts at risk</span>${track.breaks.map(goalChip).join('')}</p>` : '';
    const screen = step.screen
      ? `<div class="ns-screen"><p class="ns-screen__title">${icon('monitor')} ${esc(step.screen.title)}</p>${step.screen.lines.map((l) => `<p>${esc(l)}</p>`).join('')}</div>` : '';
    const sides = step.close && (track.desk || track.it) ? `<div class="ns-sides">
        ${track.desk ? `<div class="ns-side"><p class="ns-mini">${icon('laptop')} What it looks like at your desk</p><p>${md(track.desk)}</p></div>` : ''}
        ${track.it ? `<div class="ns-side"><p class="ns-mini">${icon('server')} What IT does</p><p>${md(track.it)}</p></div>` : ''}
      </div>` : '';
    const widget = step.widget === 'password' ? '<pdac-password-lab data-compact></pdac-password-lab>' : '';
    const proof = step.proof ? `<div class="ns-proof" data-proof="${esc(step.proof)}">${proofHtml(step.proof)}</div>` : '';
    const panel = this.$('.ns-panel');
    // On a "close it" step the desk and IT actions come right after the verdict: they are the takeaway.
    panel.innerHTML = `
      <p class="ns-k">${esc(track.label)}</p>
      <h3 class="ns-title">${md(step.title)}</h3>
      ${step.text ? `<p class="ns-text">${md(step.text)}</p>` : ''}
      ${step.ask ? this.askHtml(step.ask) : ''}
      ${verdict}${breaks}${sides}${screen}${widget}${proof}`;
    panel.classList.toggle('is-close', Boolean(step.close));
    hydrateQr(panel);
  }

  private askHtml(ask: SimAsk): string {
    const shown = this.asked.has(this.index);
    const tally = this.tallies.get(this.index) ?? ask.options.map(() => 0);
    const total = tally.reduce((a, b) => a + b, 0);
    const max = Math.max(...tally);
    const right = Array.isArray(ask.answer) ? ask.answer : [ask.answer];
    const roomTop = total ? tally.map((n, i) => (n === max ? i : -1)).filter((i) => i >= 0) : [];
    const roomRight = roomTop.length > 0 && roomTop.every((i) => right.includes(i));
    return `<div class="ns-ask ${shown ? 'is-shown' : ''}">
        <p class="ns-ask__q">${icon('circle-help')} ${md(ask.q)}</p>
        <div class="ns-ask__opts" role="group" aria-label="Room's prediction">${ask.options.map((o, i) => {
          const isAnswer = shown && right.includes(i);
          const pct = total ? Math.round((tally[i] / total) * 100) : 0;
          return `<button type="button" class="ns-opt ${isAnswer ? 'is-answer' : ''} ${shown && !isAnswer ? 'is-dim' : ''}" data-opt="${i}" ${shown ? 'aria-disabled="true"' : ''}>
              <span class="ns-opt__key">${i + 1}</span><span class="ns-opt__label">${esc(o)}</span>
              <span class="ns-opt__n">${tally[i] || ''}</span><span class="ns-opt__bar" style="width:${pct}%"></span>
            </button>`;
        }).join('')}</div>
        ${shown
          ? `${ask.why ? `<p class="ns-ask__why">${icon('check')} ${md(ask.why)}</p>` : ''}${total ? `<p class="ns-ask__room">${roomRight ? '✓ The room got it' : '✗ Not the room’s top pick'}</p>` : ''}`
          : `<button type="button" class="pdac-btn ns-ask__reveal" data-act="reveal">${icon('eye')} Reveal <span class="pdac-key">→</span></button>`}
      </div>`;
  }

  private renderChrome(): void {
    const { t } = this.seq[this.index];
    this.$$('.ns-tab').forEach((b, i) => b.setAttribute('aria-pressed', String(i === t)));
    const last = this.index >= this.seq.length - 1;
    (this.querySelector('[data-act="prev"]') as HTMLButtonElement).disabled = this.index === 0 && !this.playing;
    (this.querySelector('[data-act="next"]') as HTMLButtonElement).disabled = last && !this.playing;
    this.classList.toggle('is-playing', this.playing);
    const sum = this.querySelector<HTMLElement>('.ns-summary');
    if (sum) sum.hidden = !this.summaryOn;
    this.querySelector('[data-act="summary"]')?.setAttribute('aria-pressed', String(this.summaryOn));
    const { track, s } = this.current;
    const ask = this.openAsk;
    this.$('.ns-status').textContent = this.playing
      ? 'Playing… press → to finish the step'
      : ask
        ? `Vote: 1 to ${ask.options.length}, or tap · → reveals the answer`
        : `${track.tab}: step ${s + 1} of ${track.steps.length} · ${this.index + 1} of ${this.seq.length} in all`;
  }

  showAnswer(): void {
    if (this.playing) this.finishNow();
    if (this.openAsk) { this.revealAsk(); return; }
    if (!this.data.summary) return;
    this.summaryOn = true;
    this.renderChrome();
  }

  reset(): void {
    this.director.stop();
    this.summaryOn = false;
    this.tallies.clear();
    this.asked.clear();
    this.goTo(0, false);
  }
}

/** A map borrowed from another data file: "map": "m1-doors.json". */
function mapFrom(name: string): MapSpec {
  if (!hasData(name)) throw new Error(`Map file src/data/${name} not found`);
  const other = getData<{ map?: MapSpec | string }>(name).map;
  if (!other || typeof other === 'string') throw new Error(`src/data/${name} has no map of its own`);
  return other;
}
