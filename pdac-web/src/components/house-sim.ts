import { icon } from '../core/icons';
import { Director, run, type Timeline } from '../sim/anim';
import { svgIcon, svgPill } from '../sim/netmap';
import { PdacBase, esc } from './base';

type Pt = [number, number];
interface Weak { id: string; label: string; icon: string; at: Pt; control: string; controlIcon: string; /** Shorter control text for the drawing. */ pill?: string }
interface Reduce { id: string; label: string; icon: string; at: Pt; impact: number; why: string }
interface View {
  id: string; tab: string; building: 'house' | 'office';
  asset: { label: string; short?: string; icon: string; at: Pt; harm: string };
  threat: { label: string; short?: string; icon: string; at: Pt };
  impact: number; weak: Weak[]; reduce: Reduce[];
}
interface Scene { view: string; show: string[]; on: string[]; attempt?: boolean; title: string; text: string }
interface HouseData { views: View[]; scenes: Scene[] }

const L_BY_OPEN = [1, 3, 4, 5];
const L_WORDS = ['', 'Rare', 'Unlikely', 'Possible', 'Likely', 'Almost certain'];
const I_WORDS = ['', 'Minor', 'Moderate', 'Serious', 'Major', 'Severe'];

/** This course's 5 by 5 bands. */
export function band(score: number): { id: string; word: string } {
  if (score >= 20) return { id: 'critical', word: 'Critical' };
  if (score >= 10) return { id: 'high', word: 'High' };
  if (score >= 5) return { id: 'medium', word: 'Medium' };
  return { id: 'low', word: 'Low' };
}

const HOUSE = `<polygon class="hs-roof" points="240,205 510,72 780,205"/>
  <rect class="hs-wall" x="260" y="205" width="500" height="265"/>
  <rect class="hs-door" x="480" y="375" width="60" height="95" rx="4"/>`;
const OFFICE = `<rect class="hs-wall" x="260" y="140" width="500" height="330"/>
  <rect class="hs-roofline" x="246" y="126" width="528" height="20" rx="4"/>
  <text class="hs-sign" x="400" y="196" text-anchor="middle">RSSO</text>
  <rect class="hs-door" x="480" y="375" width="60" height="95" rx="4"/>`;

/**
 * <pdac-house-sim data-src="m2-house.json"> the house comparison, live. Each
 * weakness is a way in; its control closes it. Likelihood follows the ways in
 * still open, impact follows what is at stake (backups lower it), and the risk
 * score and band update as controls go on. "Try to get in" sends the threat
 * round the ways in. The clicker plays the scenes (house, then RSSO).
 */
export class PdacHouseSim extends PdacBase {
  private data!: HouseData;
  private view!: View;
  private show = new Set<string>(['asset', 'threat', 'weak']);
  private on = new Set<string>();
  private scene = -1;
  private result: 'none' | 'in' | 'out' = 'none';
  private playing = false;
  private pos: Pt = [0, 0];
  private director = new Director();

  protected setup(): void {
    this.data = this.json<HouseData>();
    if (!this.data.views.length) throw new Error('The house demo has no views');
    this.innerHTML = `
      <div class="hs-wrap">
        <div class="hs-scene"></div>
        <div class="hs-side">
          <div class="hs-tabs" role="group" aria-label="Where">${this.data.views.map((v) =>
            `<button type="button" class="ns-tab" data-view="${v.id}">${esc(v.tab)}</button>`).join('')}
            <button type="button" class="pdac-btn pdac-btn--primary hs-try" data-act="attempt">${icon('footprints')} Try to get in</button>
          </div>
          <div class="hs-caption" aria-live="polite"></div>
          <div class="hs-list"></div>
          <div class="hs-meter" aria-live="polite"></div>
        </div>
      </div>`;
    this.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const tab = t.closest<HTMLElement>('[data-view]');
      if (tab) return this.setView(tab.dataset.view!, ['asset', 'threat', 'weak'], [], null);
      const ctrl = t.closest<HTMLElement>('[data-ctrl]');
      if (ctrl) {
        const id = ctrl.dataset.ctrl!;
        if (this.on.has(id)) this.on.delete(id);
        else this.on.add(id);
        this.director.stop();
        this.result = 'none';
        this.placeThreat(this.view.threat.at);
        return this.render();
      }
      if (t.closest('[data-act="attempt"]')) this.attempt();
    });
    this.setView(this.data.views[0].id, ['asset', 'threat', 'weak'], [], null);
  }

  private setView(id: string, show: string[], on: string[], scene: number | null): void {
    this.director.stop();
    this.playing = false;
    const v = this.data.views.find((x) => x.id === id);
    if (!v) throw new Error(`No view "${id}" in the house data`);
    const changed = this.view !== v;
    this.view = v;
    this.show = new Set(show);
    this.on = new Set(on);
    this.scene = scene ?? -1;
    this.result = 'none';
    if (changed || !this.querySelector('.hs-svg')) this.$('.hs-scene').innerHTML = this.svg();
    this.placeThreat(v.threat.at);
    this.render();
  }

  private svg(): string {
    const v = this.view;
    const [ax, ay] = v.asset.at;
    const [tx, ty] = v.threat.at;
    return `<svg class="hs-svg" viewBox="0 0 900 540" preserveAspectRatio="xMidYMax meet" role="img" aria-label="${esc(v.tab)}: asset, threat, weaknesses and controls">
      <line class="hs-ground" x1="0" y1="470" x2="900" y2="470"/>
      ${v.building === 'house' ? HOUSE : OFFICE}
      <g class="hs-asset" transform="translate(${ax} ${ay})">
        <circle r="56"/>${svgIcon(v.asset.icon, -30, -30, 60, 'hs-asset__icon')}
        <g class="hs-harm" transform="translate(0 -84)"></g>
      </g>
      ${v.weak.map((w) => `<g class="hs-weak" data-w="${w.id}" transform="translate(${w.at[0]} ${w.at[1]})"></g>`).join('')}
      ${v.reduce.map((r) => `<g class="hs-reduce" data-r="${r.id}" transform="translate(${r.at[0]} ${r.at[1]})"></g>`).join('')}
      <g class="hs-threat" transform="translate(${tx} ${ty})">
        <circle r="50"/>${svgIcon(v.threat.icon, -28, -28, 56, 'hs-threat__icon')}
        <text y="84" text-anchor="middle" class="hs-label">${esc(v.threat.short ?? v.threat.label)}</text>
      </g>
      <text class="hs-label hs-asset__label" x="${ax}" y="${ay + 90}" text-anchor="middle">${esc(v.asset.short ?? v.asset.label)}</text>
    </svg>`;
  }

  private placeThreat(p: Pt): void {
    this.pos = p;
    this.querySelector('.hs-threat')?.setAttribute('transform', `translate(${p[0]} ${p[1]})`);
  }

  private get openWays(): Weak[] {
    return this.view.weak.filter((w) => !this.on.has(w.id));
  }

  private scores(): { l: number; i: number; r: number } {
    const l = L_BY_OPEN[Math.min(this.openWays.length, 3)];
    const cut = this.view.reduce.filter((r) => this.on.has(r.id)).map((r) => r.impact);
    const i = cut.length ? Math.min(...cut) : this.view.impact;
    return { l, i, r: l * i };
  }

  private render(): void {
    const v = this.view;
    this.$$('.hs-tabs .ns-tab').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === v.id)));
    const s = this.scene >= 0 ? this.data.scenes[this.scene] : null;
    this.$('.hs-caption').innerHTML = s
      ? `<p class="ns-k">Scene ${this.scene + 1} of ${this.data.scenes.length}</p><h3 class="ns-title">${esc(s.title)}</h3><p class="ns-text">${esc(s.text)}</p>`
      : `<p class="ns-k">${esc(v.tab)}</p><h3 class="ns-title">Close the ways in, then try again</h3><p class="ns-text">Click a weakness to add its control. Press → for the scenes.</p>`;

    // Scene: show or hide the parts, and draw each way in as open or closed.
    const svg = this.querySelector<SVGSVGElement>('.hs-svg')!;
    svg.classList.toggle('no-asset', !this.show.has('asset'));
    svg.classList.toggle('no-threat', !this.show.has('threat'));
    svg.classList.toggle('no-weak', !this.show.has('weak'));
    for (const w of v.weak) {
      const closed = this.on.has(w.id);
      svg.querySelector(`[data-w="${w.id}"]`)!.innerHTML = `
        <circle r="44" class="hs-ring ${closed ? 'is-closed' : 'is-open'}"/>
        ${svgIcon(closed ? w.controlIcon : w.icon, -24, -24, 48, 'hs-ring__icon')}
        <g transform="translate(0 70)">${svgPill(closed ? `✓ ${w.pill ?? cap(w.control)}` : '✗ Way in', closed ? 'ok' : 'bad', 22)}</g>`;
    }
    for (const r of v.reduce) {
      const on = this.on.has(r.id);
      svg.querySelector(`[data-r="${r.id}"]`)!.innerHTML = on
        ? `<rect x="-40" y="-36" width="80" height="72" rx="14" class="hs-reduce__box"/>${svgIcon(r.icon, -22, -22, 44, 'hs-ring__icon')}<g transform="translate(0 62)">${svgPill(`✓ ${r.label}`, 'ok', 22)}</g>`
        : '';
    }
    svg.querySelector('.hs-harm')!.innerHTML = this.result === 'in' ? svgPill(v.asset.harm, 'bad', 24) : this.result === 'out' ? svgPill('✓ Safe', 'ok', 24) : '';
    svg.classList.toggle('is-harmed', this.result === 'in');

    // Side list: one toggle per way in, then the impact controls.
    const open = this.openWays.length;
    this.$('.hs-list').innerHTML = `
      <p class="ns-mini">Ways in: ${open === 0 ? 'none open' : `${open} open`} · click one to add its control</p>
      ${v.weak.map((w) => {
        const closed = this.on.has(w.id);
        return `<button type="button" class="hs-toggle ${closed ? 'is-closed' : 'is-open'}" data-ctrl="${w.id}" aria-pressed="${closed}">
            <span class="hs-toggle__state">${closed ? '✓ Closed' : '✗ Open'}</span>
            <span class="hs-toggle__text"><b>${esc(w.label)}</b><span>${closed ? `Control: ${esc(w.control)}` : `Add ${esc(w.control)}`}</span></span>
          </button>`;
      }).join('')}
      ${v.reduce.map((r) => {
        const on = this.on.has(r.id);
        return `<button type="button" class="hs-toggle is-reduce ${on ? 'is-closed' : ''}" data-ctrl="${r.id}" aria-pressed="${on}">
            <span class="hs-toggle__state">${on ? '✓ On' : '+ Add'}</span>
            <span class="hs-toggle__text"><b>${esc(r.label)}</b><span>${esc(r.why)}</span></span>
          </button>`;
      }).join('')}`;

    const { l, i, r } = this.scores();
    const b = band(r);
    this.$('.hs-meter').innerHTML = `
      <div class="hs-m"><span>Likelihood</span><b>${l}</b><small>${L_WORDS[l]}</small></div>
      <span class="hs-op">×</span>
      <div class="hs-m"><span>Impact</span><b>${i}</b><small>${I_WORDS[i]}</small></div>
      <span class="hs-op">=</span>
      <div class="hs-m is-risk band-${b.id}"><span>Risk</span><b>${r}</b><small>${b.word}</small></div>`;
    this.classList.toggle('is-playing', this.playing);
  }

  private attempt(): void {
    const tl = this.director.fresh();
    this.result = 'none';
    this.show.add('threat');
    this.playing = true;
    this.placeThreat(this.view.threat.at);
    this.render();
    run(this.walk(tl).then(() => {
      this.playing = false;
      this.render();
    }));
  }

  private async walk(tl: Timeline): Promise<void> {
    const v = this.view;
    for (const w of v.weak) {
      await this.moveTo(tl, [w.at[0] - 70, w.at[1] + 10]);
      if (!this.on.has(w.id)) {
        await this.moveTo(tl, [v.asset.at[0] - 80, v.asset.at[1] + 30]);
        this.result = 'in';
        return;
      }
      await tl.wait(250);
    }
    await this.moveTo(tl, v.threat.at);
    this.result = 'out';
  }

  private async moveTo(tl: Timeline, to: Pt): Promise<void> {
    const from = this.pos;
    await tl.tween(650, (p) => this.placeThreat([from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p]));
  }

  /** The end state of the attempt, without the walk (for jumps and Back). */
  private settleAttempt(): void {
    const open = this.openWays;
    if (open.length) {
      this.result = 'in';
      this.placeThreat([this.view.asset.at[0] - 80, this.view.asset.at[1] + 30]);
    } else {
      this.result = 'out';
      this.placeThreat(this.view.threat.at);
    }
  }

  private playScene(i: number, animate: boolean): void {
    const s = this.data.scenes[i];
    this.setView(s.view, s.show, s.on, i);
    if (!s.attempt) return;
    if (animate) this.attempt();
    else {
      this.settleAttempt();
      this.render();
    }
  }

  step(dir: 1 | -1): boolean {
    if (this.playing) {
      this.director.stop();
      this.playing = false;
      this.settleAttempt();
      this.render();
      if (dir === 1) return true;
    }
    if (dir === 1) {
      if (this.scene >= this.data.scenes.length - 1) return false;
      this.playScene(this.scene + 1, true);
      return true;
    }
    if (this.scene <= 0) {
      if (this.scene < 0) return false;
      this.reset();
      return true;
    }
    this.playScene(this.scene - 1, false);
    return true;
  }

  showAnswer(): void {
    this.playScene(this.data.scenes.length - 1, false);
  }

  reset(): void {
    this.setView(this.data.views[0].id, ['asset', 'threat', 'weak'], [], null);
  }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
