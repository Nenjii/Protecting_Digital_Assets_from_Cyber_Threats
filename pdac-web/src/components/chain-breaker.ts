import { getData, hasData } from '../core/data';
import { icon } from '../core/icons';
import { Director, run, type Timeline } from '../sim/anim';
import { PdacBase, esc } from './base';

interface ChainLink { id: string; name: string; plain: string; tactics: string[] }
interface Defense { id: string; label: string; layer: string; stops?: string; limits?: string }
interface ChainScene { title: string; text: string; on: string[] }
interface ChainData { title: string; links: ChainLink[]; defenses: Defense[]; scenes: ChainScene[] }
interface AttackFile { version: string; copyright: string; tactics: { id: string; name: string }[] }

type LinkLook = 'idle' | 'passed' | 'broken' | 'saved';

/**
 * <pdac-chain-breaker data-src="m2-chain.json"> the seven links of an attack.
 * Switch defenses on, then run the attack: it moves link by link and stops at
 * the first link a defense guards, so every later step never happens. Each
 * link names its MITRE ATT&CK tactic (src/data/attack.json, from MITRE's data
 * on GitHub). The clicker plays the prepared scenes; A turns every defense on
 * and runs; R resets.
 */
export class PdacChainBreaker extends PdacBase {
  private data!: ChainData;
  private tactics = new Map<string, string>();
  private attackNote = '';
  private on = new Set<string>();
  private looks: LinkLook[] = [];
  private scene = -1;
  private result: 'none' | 'full' | 'limited' | 'broken' = 'none';
  private brokenAt = -1;
  private playing = false;
  private director = new Director();

  protected setup(): void {
    this.data = this.json<ChainData>();
    if (hasData('attack.json')) {
      const a = getData<AttackFile>('attack.json');
      a.tactics.forEach((t) => this.tactics.set(t.id, t.name));
      this.attackNote = `Tactic names: MITRE ATT&CK v${a.version} (I for details)`;
    }
    for (const d of this.data.defenses) {
      const target = d.stops ?? d.limits;
      if (!this.data.links.some((l) => l.id === target)) throw new Error(`Defense "${d.id}" guards an unknown link "${target}"`);
    }
    this.looks = this.data.links.map(() => 'idle');
    this.innerHTML = `
      <div class="cb-track"><span class="cb-token">${icon('skull')}</span></div>
      <ol class="cb-chain">${this.data.links.map((l, i) => `
        <li class="cb-link" data-i="${i}">
          <span class="cb-head"><span class="cb-n">${i + 1}</span><b class="cb-name">${esc(l.name)}</b></span>
          <span class="cb-plain">${esc(l.plain)}</span>
          <span class="cb-tactic" title="${esc(this.attackNote)}">${l.tactics.map((t) => esc(this.tactics.get(t) ?? t)).join(' · ')}</span>
          <span class="cb-look" aria-live="polite"></span>
        </li>`).join('')}</ol>
      <div class="cb-bottom">
        <div class="cb-left">
          <div class="cb-scene" aria-live="polite"></div>
          <div class="pdac-bar__left">
            <button type="button" class="pdac-btn pdac-btn--primary" data-act="run">${icon('play')} Run the attack</button>
            <button type="button" class="pdac-btn pdac-btn--quiet" data-act="next">Next scene ${icon('chevron-right')}</button>
          </div>
        </div>
        <div class="cb-defenses" role="group" aria-label="Defenses">${this.data.defenses.map((d) => `
          <button type="button" class="cb-def" data-def="${d.id}" aria-pressed="false">
            <span class="cb-def__box" aria-hidden="true"></span>
            <span class="cb-def__label">${esc(d.label)}</span>
            <span class="cb-def__where"><b>${esc(d.layer)}</b> · ${d.stops ? 'guards' : 'limits'} ${this.linkLabel(d.stops ?? d.limits!)}</span>
          </button>`).join('')}</div>
      </div>`;
    this.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const def = t.closest<HTMLElement>('[data-def]');
      if (def) {
        const id = def.dataset.def!;
        if (this.on.has(id)) this.on.delete(id);
        else this.on.add(id);
        this.clearRun();
        this.render();
        return;
      }
      const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'run') this.runAttack();
      if (act === 'next') this.step(1);
    });
    this.render();
  }

  private linkName(id: string): string {
    return this.data.links.find((l) => l.id === id)?.name ?? id;
  }

  /** "3 Delivery": the link's number and name, without the soft hyphens used for line breaks. */
  private linkLabel(id: string): string {
    const i = this.data.links.findIndex((l) => l.id === id);
    return `${i + 1} ${esc(this.linkName(id).replace(/\u00ad/g, ''))}`;
  }

  private clearRun(): void {
    this.director.stop();
    this.playing = false;
    this.looks = this.data.links.map(() => 'idle');
    this.result = 'none';
    this.brokenAt = -1;
    this.moveToken(-1);
  }

  /** Where the attack stops with the current defenses, and how it ends. */
  private outcome(): { stop: number; limited: boolean } {
    const stop = this.data.links.findIndex((l) => this.data.defenses.some((d) => d.stops === l.id && this.on.has(d.id)));
    const limited = this.data.defenses.some((d) => d.limits && this.on.has(d.id));
    return { stop, limited };
  }

  private runAttack(): void {
    this.clearRun(); // before fresh(): clearRun stops the current timeline
    const tl = this.director.fresh();
    this.playing = true;
    this.render();
    run(this.march(tl).then(() => {
      this.playing = false;
      this.render();
    }));
  }

  private async march(tl: Timeline): Promise<void> {
    const { stop, limited } = this.outcome();
    const last = stop === -1 ? this.data.links.length - 1 : stop;
    for (let i = 0; i <= last; i++) {
      await this.glide(tl, i);
      if (i === stop) {
        this.finish(stop, limited);
        return;
      }
      this.looks[i] = 'passed';
      this.render();
      await tl.wait(380);
    }
    this.finish(-1, limited);
  }

  private finish(stop: number, limited: boolean): void {
    if (stop === -1) {
      this.looks = this.data.links.map(() => 'passed');
      this.result = limited ? 'limited' : 'full';
      this.brokenAt = -1;
      this.moveToken(this.data.links.length - 1);
    } else {
      this.looks = this.data.links.map((_, k) => (k < stop ? 'passed' : k === stop ? 'broken' : 'saved'));
      this.result = 'broken';
      this.brokenAt = stop;
      this.moveToken(stop);
    }
    this.playing = false;
    this.render();
  }

  private async glide(tl: Timeline, to: number): Promise<void> {
    const token = this.$('.cb-token');
    const from = Number(token.dataset.at ?? -1);
    await tl.tween(520, (p) => this.placeToken(from + (to - from) * p));
    token.dataset.at = String(to);
  }

  private moveToken(at: number): void {
    this.$('.cb-token').dataset.at = String(at);
    this.placeToken(at);
  }

  /** Token position: -1 is before the first link; i is over link i. */
  private placeToken(at: number): void {
    const n = this.data.links.length;
    const pct = at < 0 ? 0 : ((at + 0.5) / n) * 100;
    const token = this.$('.cb-token');
    token.style.left = `${pct}%`;
    token.classList.toggle('is-waiting', at < 0);
  }

  private render(): void {
    this.$$('.cb-link').forEach((li, i) => {
      const look = this.looks[i];
      li.className = `cb-link is-${look}`;
      li.querySelector('.cb-look')!.textContent =
        look === 'passed' ? '✗ Happened' : look === 'broken' ? '✓ Broken here' : look === 'saved' ? 'Never happens' : '';
      const guarded = this.data.defenses.some((d) => d.stops === this.data.links[i].id && this.on.has(d.id));
      li.classList.toggle('is-guarded', guarded);
    });
    this.$$('.cb-def').forEach((b) => b.setAttribute('aria-pressed', String(this.on.has(b.dataset.def!))));
    const s = this.scene >= 0 ? this.data.scenes[this.scene] : null;
    const verdict = this.result === 'broken'
      ? `<p class="cb-verdict is-ok">✓ Chain broken at ${this.brokenAt + 1} ${esc(this.data.links[this.brokenAt].name)}: ${this.data.links.length - this.brokenAt - 1} later steps never happen</p>`
      : this.result === 'limited'
        ? '<p class="cb-verdict is-warn">! The attack reached the end, but backups and least access limit the damage</p>'
        : this.result === 'full'
          ? '<p class="cb-verdict is-no">✗ The attack reached the end: data stolen, files locked</p>'
          : '';
    this.$('.cb-scene').innerHTML = `
      ${s ? `<p class="ns-k">Scene ${this.scene + 1} of ${this.data.scenes.length}</p><h3 class="ns-title">${esc(s.title)}</h3><p class="ns-text">${esc(s.text)}</p>`
        : '<p class="ns-k">Try it</p><h3 class="ns-title">Pick the defenses, then run the attack</h3><p class="ns-text">Or press → to play the prepared scenes.</p>'}
      ${verdict}`;
    this.classList.toggle('is-playing', this.playing);
  }

  private playScene(i: number, animate: boolean): void {
    this.scene = i;
    this.on = new Set(this.data.scenes[i].on);
    if (animate) {
      this.runAttack();
      return;
    }
    this.clearRun();
    const { stop, limited } = this.outcome();
    this.finish(stop, limited);
  }

  step(dir: 1 | -1): boolean {
    if (this.playing) {
      this.director.stop();
      const { stop, limited } = this.outcome();
      this.finish(stop, limited);
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
    this.director.stop();
    this.playScene(this.data.scenes.length - 1, false);
  }

  reset(): void {
    this.scene = -1;
    this.on.clear();
    this.clearRun();
    this.render();
  }
}
