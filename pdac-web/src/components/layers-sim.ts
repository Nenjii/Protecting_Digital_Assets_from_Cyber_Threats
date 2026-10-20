import { icon } from '../core/icons';
import { Director, run, type Timeline } from '../sim/anim';
import { PdacBase, esc } from './base';

interface Layer { id: string; label: string; layer: string; icon: string }
interface Attack { id: string; label: string; short?: string; icon: string; stoppedBy: string[]; spoof?: boolean }
interface LayersData {
  layers: Layer[];
  attacks: Attack[];
  spoof?: { from: string; sentBy: string; checks: { name: string; plain: string; result: string }[] };
  scenes: { on: string[]; title: string; text: string }[];
}

/**
 * <pdac-layers-sim data-src="m2-layers.json"> defense in layers. Ten everyday
 * attacks fly at the office one after another; each is caught by the first
 * switched-on layer that can catch it, or lands. The trays show what each layer
 * caught. With the email filter on, the faked-address email shows its SPF, DKIM
 * and DMARC check. The clicker adds one layer per scene; A switches all on.
 */
export class PdacLayersSim extends PdacBase {
  private data!: LayersData;
  private on = new Set<string>();
  private caught = new Map<string, string>(); // attack id → layer id, or "office"
  private scene = -1;
  private playing = false;
  private director = new Director();

  protected setup(): void {
    this.data = this.json<LayersData>();
    const ids = new Set(this.data.layers.map((l) => l.id));
    for (const a of this.data.attacks) {
      const bad = a.stoppedBy.find((l) => !ids.has(l));
      if (bad) throw new Error(`Attack "${a.id}" names an unknown layer "${bad}"`);
    }
    const cols = this.data.layers.length + 2;
    this.style.setProperty('--cols', String(cols));
    this.style.setProperty('--layers', String(this.data.layers.length));
    // Three wide layer columns hold three tiles across; four narrower ones hold two.
    this.style.setProperty('--tray-cols', this.data.layers.length <= 3 ? '3' : '2');
    this.innerHTML = `
      <div class="ly-grid">
        <div class="ly-col ly-src"><p class="ly-head">${icon('skull')} Attacks</p><div class="ly-tray ly-queue"></div></div>
        ${this.data.layers.map((l) => `
          <div class="ly-col ly-layer" data-layer="${l.id}">
            <button type="button" class="ly-head ly-toggle" data-toggle="${l.id}" aria-pressed="false">
              <span class="ly-kind">${esc(l.layer)}</span>
              <span class="ly-name">${icon(l.icon)} ${esc(l.label)}</span>
              <span class="ly-state"></span>
            </button>
            <div class="ly-tray"></div>
          </div>`).join('')}
        <div class="ly-col ly-office"><p class="ly-head">${icon('building-2')} Lands at the RSSO</p><div class="ly-tray"></div></div>
        <div class="ly-flight" aria-hidden="true"></div>
      </div>
      <div class="ly-bottom">
        <div class="ly-caption" aria-live="polite"></div>
        <div class="ly-spoof" hidden></div>
      </div>
      <div class="pdac-bar">
        <div class="pdac-bar__left">
          <button type="button" class="pdac-btn pdac-btn--primary" data-act="fire">${icon('play')} Send the ten attacks</button>
          <button type="button" class="pdac-btn pdac-btn--quiet" data-act="next">Next scene ${icon('chevron-right')}</button>
        </div>
        <p class="pdac-bar__status ly-count" aria-live="polite"></p>
      </div>`;
    this.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const tog = t.closest<HTMLElement>('[data-toggle]');
      if (tog) {
        const id = tog.dataset.toggle!;
        if (this.on.has(id)) this.on.delete(id);
        else this.on.add(id);
        this.director.stop();
        this.playing = false;
        this.caught.clear();
        return this.render();
      }
      const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'fire') this.fire();
      if (act === 'next') this.step(1);
    });
    this.render();
  }

  /** The first switched-on layer, left to right, that catches this attack. */
  private catcher(a: Attack): string {
    return this.data.layers.find((l) => this.on.has(l.id) && a.stoppedBy.includes(l.id))?.id ?? 'office';
  }

  private fire(): void {
    const tl = this.director.fresh();
    this.caught.clear();
    this.playing = true;
    this.render();
    run(this.fly(tl).then(() => {
      this.playing = false;
      this.render();
    }));
  }

  private async fly(tl: Timeline): Promise<void> {
    const grid = this.$('.ly-grid');
    const flight = this.$('.ly-flight');
    for (const a of this.data.attacks) {
      const where = this.catcher(a);
      const target = where === 'office' ? this.$('.ly-office') : this.$(`.ly-layer[data-layer="${where}"]`);
      const g = grid.getBoundingClientRect();
      const scale = g.width / grid.offsetWidth || 1; // reveal.js scales the slide
      const startX = (this.$('.ly-src').getBoundingClientRect().right - g.left) / scale - 40;
      const r = target.getBoundingClientRect();
      const endX = (r.left - g.left) / scale + (where === 'office' ? 40 : 24);
      flight.innerHTML = `<span class="ly-token">${icon(a.icon)} ${esc(a.label)}</span>`;
      const token = flight.firstElementChild as HTMLElement;
      await tl.tween(560, (p) => (token.style.transform = `translateX(${startX + (endX - startX) * p}px)`));
      this.caught.set(a.id, where);
      flight.innerHTML = '';
      this.render();
      await tl.wait(90);
    }
  }

  /** Where every attack ends, without the flight (for jumps and Back). */
  private settle(): void {
    this.caught = new Map(this.data.attacks.map((a) => [a.id, this.catcher(a)]));
    this.$('.ly-flight').innerHTML = '';
  }

  private render(): void {
    const tile = (a: Attack, cls = '') =>
      `<span class="ly-tile ${cls}" title="${esc(a.label)}">${icon(a.icon)}<b>${esc(a.short ?? a.label)}</b><span class="pdac-sr">${esc(a.label)}</span></span>`;
    const count = (word: string, n: number) => `<p class="ly-n">${word} <b>${n}</b></p>`;
    const pending = this.data.attacks.filter((a) => !this.caught.has(a.id));
    this.$('.ly-queue').innerHTML = pending.map((a) => tile(a)).join('');
    for (const l of this.data.layers) {
      const col = this.$(`.ly-layer[data-layer="${l.id}"]`);
      const on = this.on.has(l.id);
      col.classList.toggle('is-on', on);
      col.querySelector('.ly-toggle')!.setAttribute('aria-pressed', String(on));
      col.querySelector('.ly-state')!.textContent = on ? '✓ On' : 'Off: click to add';
      const here = this.data.attacks.filter((a) => this.caught.get(a.id) === l.id);
      col.querySelector('.ly-tray')!.innerHTML = (on ? count('Caught', here.length) : '') + here.map((a) => tile(a, 'is-caught')).join('');
    }
    const landed = this.data.attacks.filter((a) => this.caught.get(a.id) === 'office');
    this.$('.ly-office .ly-tray').innerHTML = (this.caught.size ? count('Landed', landed.length) : '') + landed.map((a) => tile(a, 'is-land')).join('');

    const s = this.scene >= 0 ? this.data.scenes[this.scene] : null;
    this.$('.ly-caption').innerHTML = s
      ? `<p class="ns-k">Scene ${this.scene + 1} of ${this.data.scenes.length}</p><h3 class="ns-title">${esc(s.title)}</h3><p class="ns-text">${esc(s.text)}</p>`
      : '<p class="ns-k">Try it</p><h3 class="ns-title">Switch layers on, then send the attacks</h3><p class="ns-text">Or press → to add one layer per scene.</p>';

    const done = this.caught.size === this.data.attacks.length;
    this.$('.ly-count').innerHTML = done
      ? `<b>${landed.length} of ${this.data.attacks.length}</b> attacks landed · ${this.data.attacks.length - landed.length} caught`
      : this.playing ? 'Sending…' : `${this.on.size} of ${this.data.layers.length} layers on`;

    // The DMARC check, once the faked-address email has been caught (only the email filter can).
    const box = this.$('.ly-spoof');
    const spoof = this.data.attacks.find((a) => a.spoof);
    const by = spoof ? this.caught.get(spoof.id) : undefined;
    const show = Boolean(this.data.spoof && by && by !== 'office');
    box.hidden = !show;
    if (show && this.data.spoof) {
      const sp = this.data.spoof;
      box.innerHTML = `<p class="ns-mini">${icon('mail-warning')} Why the filter caught “${esc(spoof!.label)}”</p>
        <p class="ly-from">From <b>${esc(sp.from)}</b>, sent by ${esc(sp.sentBy)}</p>
        <ul class="ly-checks">${sp.checks.map((c) => `<li title="${esc(c.plain)}"><b>${esc(c.name)}</b><em>${esc(c.result)}</em></li>`).join('')}</ul>`;
    }
    this.classList.toggle('is-playing', this.playing);
  }

  private playScene(i: number, animate: boolean): void {
    this.director.stop();
    this.scene = i;
    this.on = new Set(this.data.scenes[i].on);
    if (animate) return this.fire();
    this.playing = false;
    this.settle();
    this.render();
  }

  step(dir: 1 | -1): boolean {
    if (this.playing) {
      this.director.stop();
      this.playing = false;
      this.settle();
      this.render();
      if (dir === 1) return true;
    }
    if (dir === 1) {
      if (this.scene >= this.data.scenes.length - 1) return false;
      this.playScene(this.scene + 1, true);
      return true;
    }
    if (this.scene < 0) return false;
    if (this.scene === 0) {
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
    this.director.stop();
    this.playing = false;
    this.scene = -1;
    this.on.clear();
    this.caught.clear();
    this.render();
  }
}
