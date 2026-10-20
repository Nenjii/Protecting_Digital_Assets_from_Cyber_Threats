import { hasSubtle, sha256Hex, toHex } from '../core/hash';
import { icon } from '../core/icons';
import { Director, run, type Timeline } from '../sim/anim';
import { PdacBase, esc } from './base';

type GoalId = 'secret' | 'correct' | 'ready';
type Phase = 'idle' | 'attack' | 'defend';
interface Goal { id: GoalId; name: string; term: string; plain: string; example: string; icon: string }
interface Row { name: string; wallet: string; amount: string }
interface Texts { scene: string; attack: string; defend: string; bad: string; ok: string }
interface CiaData {
  goals: Goal[];
  secret: Texts & { message: string; spy: string };
  correct: Texts & { rows: Row[]; tamper: { row: number; wallet: string; amount: string } };
  ready: Texts;
}

/** The clicker's order: break each goal, then protect it. */
const ORDER: [GoalId, Phase][] = [
  ['secret', 'attack'], ['secret', 'defend'],
  ['correct', 'attack'], ['correct', 'defend'],
  ['ready', 'attack'], ['ready', 'defend'],
];
const PEOPLE = 8;

/**
 * <pdac-cia-lab data-src="m1-cia-lab.json"> Secret, Correct, Ready as three live
 * demos on RSSO data. Secret: the same message sent plain, then encrypted with
 * real AES-GCM in this browser. Correct: a payout is edited and its SHA-256
 * fingerprint no longer matches the approved one. Ready: ransomware locks the
 * portal, then the offline backup brings it back. The clicker breaks, then
 * protects, each goal in turn; A shows all three protected; R resets.
 */
export class PdacCiaLab extends PdacBase {
  private data!: CiaData;
  private done = 0;
  private phase: Record<GoalId, Phase> = { secret: 'idle', correct: 'idle', ready: 'idle' };
  private pending: [GoalId, Phase] | null = null;
  private director = new Director();
  private cipher = '';
  private real = hasSubtle();
  private fp = { approved: '', changed: '' };

  protected setup(): void {
    this.data = this.json<CiaData>();
    this.innerHTML = `<div class="cia-cols">${this.data.goals.map((g) => this.column(g)).join('')}</div>`;
    this.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-goal-act]');
      if (!b) return;
      const [goal, phase] = b.dataset.goalAct!.split(':') as [GoalId, Phase];
      this.done = ORDER.findIndex(([g, p]) => g === goal && p === phase) + 1;
      this.play(goal, phase);
    });
    run(this.prepare());
    this.renderAll();
  }

  private column(g: Goal): string {
    const t = this.data[g.id];
    return `<div class="cia-col" data-goal="${g.id}">
        <div class="cia-head"><span class="cia-icon">${icon(g.icon)}</span><h3>${esc(g.name)} <span class="term">(${esc(g.term)})</span></h3></div>
        <p class="cia-plain">${esc(g.plain)}</p>
        <p class="cia-example">${esc(g.example)}</p>
        <div class="cia-demo">
          <p class="cia-scene">${esc(t.scene)}</p>
          ${this.demo(g.id)}
        </div>
        <p class="cia-status" aria-live="polite"></p>
        <div class="cia-btns">
          <button type="button" class="cia-btn is-attack" data-goal-act="${g.id}:attack">${icon('triangle-alert')} ${esc(t.attack)}</button>
          <button type="button" class="cia-btn is-defend" data-goal-act="${g.id}:defend">${icon('shield-check')} ${esc(t.defend)}</button>
        </div>
      </div>`;
  }

  private demo(id: GoalId): string {
    if (id === 'secret') {
      return `<div class="cia-wire">
          <span class="cia-end">${icon('laptop')}<b>Ben</b></span>
          <span class="cia-line"><span class="cia-wifi">${icon('wifi')}</span><span class="cia-packet"></span></span>
          <span class="cia-end">${icon('app-window')}<b>Portal</b></span>
        </div>
        <p class="cia-k">${esc(this.data.secret.spy)}</p>
        <p class="cia-sniff"></p>`;
    }
    if (id === 'correct') {
      return `<table class="cia-pay"><thead><tr><th>Name</th><th>E-wallet</th><th>Amount</th></tr></thead><tbody></tbody></table>
        <div class="cia-fps">
          <p class="cia-fp"><span class="cia-k">Approved fingerprint</span><code class="cia-fp-a">…</code></p>
          <p class="cia-fp"><span class="cia-k">Fingerprint now</span><code class="cia-fp-b">…</code></p>
        </div>`;
    }
    return `<div class="cia-site">
        <div class="cia-people">${Array.from({ length: PEOPLE }, () => `<span class="cia-person">${icon('users')}</span>`).join('')}</div>
        <span class="cia-arrow">${icon('arrow-right')}</span>
        <div class="cia-server"><span class="cia-server__icon">${icon('server')}</span><b class="cia-server__state">Up</b></div>
      </div>
      <div class="cia-restore" aria-hidden="true"><span></span></div>
      <p class="cia-restore-k"></p>`;
  }

  /** Fingerprints of the approved and edited lists, and the message encrypted once. */
  private async prepare(): Promise<void> {
    const c = this.data.correct;
    const changed = c.rows.map((r, i) => (i === c.tamper.row ? { ...r, wallet: c.tamper.wallet, amount: c.tamper.amount } : r));
    const [a, b] = await Promise.all([sha256Hex(rowsText(c.rows)), sha256Hex(rowsText(changed))]);
    this.fp = { approved: a, changed: b };
    this.cipher = await encrypt(this.data.secret.message, this.real);
    this.renderAll();
  }

  private col(id: GoalId): HTMLElement {
    return this.$(`.cia-col[data-goal="${id}"]`);
  }

  // ---------- static views: what each goal looks like in each phase ----------

  private renderAll(): void {
    this.renderSecret();
    this.renderCorrect();
    this.renderReady();
    const active = this.pending?.[0] ?? (this.done ? ORDER[this.done - 1][0] : null);
    this.$$('.cia-col').forEach((c) => c.classList.toggle('is-active', c.dataset.goal === active));
  }

  private status(id: GoalId, phase: Phase): void {
    const t = this.data[id];
    const el = this.col(id).querySelector<HTMLElement>('.cia-status')!;
    el.className = `cia-status is-${phase}`;
    el.innerHTML = phase === 'attack' ? `<span class="pdac-verdict is-no">✗ ${esc(t.bad)}</span>`
      : phase === 'defend' ? `<span class="pdac-verdict is-ok">✓ ${esc(t.ok)}</span>` : '';
    this.col(id).dataset.phase = phase;
  }

  private renderSecret(): void {
    const p = this.phase.secret;
    const col = this.col('secret');
    const sniff = col.querySelector<HTMLElement>('.cia-sniff')!;
    col.querySelector<HTMLElement>('.cia-packet')!.style.left = p === 'idle' ? '0%' : '100%';
    sniff.className = `cia-sniff is-${p}`;
    if (p === 'idle') sniff.textContent = 'Nothing sent yet.';
    if (p === 'attack') sniff.textContent = this.data.secret.message;
    if (p === 'defend') sniff.innerHTML = `${esc(this.cipher || '…')}<span class="cia-how">${this.real ? 'Real AES-256, made in this browser' : 'Demo scrambling (real AES needs localhost)'}</span>`;
    this.status('secret', p);
  }

  private renderCorrect(): void {
    const p = this.phase.correct;
    const c = this.data.correct;
    const col = this.col('correct');
    col.querySelector('tbody')!.innerHTML = c.rows.map((r, i) => {
      const edited = p === 'attack' && i === c.tamper.row;
      return `<tr class="${edited ? 'is-changed' : ''}"><td>${esc(r.name)}</td><td>${esc(edited ? c.tamper.wallet : r.wallet)}</td><td>${esc(edited ? c.tamper.amount : r.amount)}</td></tr>`;
    }).join('');
    const a = short(this.fp.approved);
    const now = p === 'attack' ? short(this.fp.changed) : a;
    col.querySelector('.cia-fp-a')!.textContent = a || '…';
    const b = col.querySelector<HTMLElement>('.cia-fp-b')!;
    b.innerHTML = p === 'attack' ? markDiff(a, now) : esc(now || '…');
    b.className = `cia-fp-b is-${p === 'attack' ? 'bad' : p === 'defend' ? 'ok' : 'idle'}`;
    this.status('correct', p);
  }

  private renderReady(): void {
    const p = this.phase.ready;
    const col = this.col('ready');
    const server = col.querySelector<HTMLElement>('.cia-server')!;
    server.className = `cia-server is-${p}`;
    server.querySelector('.cia-server__icon')!.innerHTML = icon(p === 'attack' ? 'lock' : 'server');
    server.querySelector('.cia-server__state')!.textContent = p === 'attack' ? 'Locked' : 'Up';
    col.querySelectorAll<HTMLElement>('.cia-person').forEach((el) => (el.className = `cia-person ${p === 'attack' ? 'is-no' : p === 'defend' ? 'is-ok' : ''}`));
    col.querySelector<HTMLElement>('.cia-restore span')!.style.width = p === 'defend' ? '100%' : '0%';
    col.querySelector('.cia-restore-k')!.textContent = p === 'defend' ? 'Restored from the offline backup' : p === 'attack' ? 'Files on the server are encrypted' : '';
    this.status('ready', p);
  }

  // ---------- animations ----------

  private play(goal: GoalId, phase: Phase): void {
    const tl = this.director.fresh();
    this.pending = [goal, phase];
    this.renderAll();
    run(this.perform(tl, goal, phase).then(() => this.settle()));
  }

  /** End the animation that is playing and show its end state. */
  private settle(): void {
    if (!this.pending) return;
    this.director.stop();
    const [goal, phase] = this.pending;
    this.phase[goal] = phase;
    this.pending = null;
    this.renderAll();
  }

  private async perform(tl: Timeline, goal: GoalId, phase: Phase): Promise<void> {
    const col = this.col(goal);
    if (goal === 'secret') {
      const packet = col.querySelector<HTMLElement>('.cia-packet')!;
      const sniff = col.querySelector<HTMLElement>('.cia-sniff')!;
      packet.className = `cia-packet is-${phase}`;
      packet.innerHTML = phase === 'defend' ? icon('lock') : '';
      sniff.className = 'cia-sniff is-idle';
      sniff.textContent = 'Listening…';
      await tl.tween(1400, (p) => (packet.style.left = `${p * 100}%`));
      const text = phase === 'attack' ? this.data.secret.message : this.cipher;
      sniff.className = `cia-sniff is-${phase}`;
      await tl.tween(900, (p) => (sniff.textContent = text.slice(0, Math.ceil(text.length * p))));
      await tl.wait(300);
      return;
    }
    if (goal === 'correct') {
      const c = this.data.correct;
      const row = col.querySelectorAll<HTMLElement>('tbody tr')[c.tamper.row];
      const b = col.querySelector<HTMLElement>('.cia-fp-b')!;
      if (phase === 'attack') {
        row.classList.add('is-editing');
        await tl.wait(700);
        row.innerHTML = `<td>${esc(c.rows[c.tamper.row].name)}</td><td>${esc(c.tamper.wallet)}</td><td>${esc(c.tamper.amount)}</td>`;
        row.className = 'is-changed';
        await this.scramble(tl, b, short(this.fp.changed));
        return;
      }
      // Protect: compare the fingerprints before paying; if they differ, stop and restore.
      const wasEdited = this.phase.correct === 'attack';
      b.className = 'cia-fp-b is-idle';
      b.textContent = 'Checking…';
      await tl.wait(700);
      if (wasEdited) {
        this.col('correct').querySelector('.cia-status')!.innerHTML = `<span class="pdac-verdict is-no">✗ Different: payment stopped</span>`;
        b.innerHTML = markDiff(short(this.fp.approved), short(this.fp.changed));
        await tl.wait(1300);
        row.classList.add('is-restoring');
        await tl.wait(500);
      }
      return;
    }
    // Ready
    const people = [...col.querySelectorAll<HTMLElement>('.cia-person')];
    const server = col.querySelector<HTMLElement>('.cia-server')!;
    if (phase === 'attack') {
      for (const el of people.slice(0, 3)) {
        el.className = 'cia-person is-ok';
        await tl.wait(180);
      }
      server.className = 'cia-server is-attack';
      server.querySelector('.cia-server__icon')!.innerHTML = icon('lock');
      server.querySelector('.cia-server__state')!.textContent = 'Locked';
      await tl.wait(400);
      for (const el of people) {
        el.className = 'cia-person is-no';
        await tl.wait(120);
      }
      return;
    }
    const bar = col.querySelector<HTMLElement>('.cia-restore span')!;
    col.querySelector('.cia-restore-k')!.textContent = 'Restoring from the offline backup…';
    await tl.tween(1800, (p) => (bar.style.width = `${Math.round(p * 100)}%`));
    server.className = 'cia-server is-defend';
    server.querySelector('.cia-server__icon')!.innerHTML = icon('server');
    server.querySelector('.cia-server__state')!.textContent = 'Up';
    for (const el of people) {
      el.className = 'cia-person is-ok';
      await tl.wait(110);
    }
  }

  /** Characters roll until they settle on the new fingerprint. */
  private async scramble(tl: Timeline, el: HTMLElement, target: string): Promise<void> {
    const hex = '0123456789abcdef';
    el.className = 'cia-fp-b is-bad';
    await tl.tween(700, (p) => {
      const fixed = Math.floor(target.length * p);
      el.textContent = [...target].map((ch, i) => (i < fixed || ch === ' ' ? ch : hex[Math.floor(Math.random() * 16)])).join('');
    });
  }

  // ---------- presenter API ----------

  private phasesUpTo(n: number): void {
    this.phase = { secret: 'idle', correct: 'idle', ready: 'idle' };
    ORDER.slice(0, n).forEach(([g, p]) => (this.phase[g] = p));
  }

  step(dir: 1 | -1): boolean {
    if (this.pending) {
      this.settle();
      if (dir === 1) return true;
    }
    if (dir === 1) {
      if (this.done >= ORDER.length) return false;
      this.phasesUpTo(this.done);
      const [goal, phase] = ORDER[this.done];
      this.done++;
      this.play(goal, phase);
      return true;
    }
    if (this.done === 0) return false;
    this.done--;
    this.phasesUpTo(this.done);
    this.renderAll();
    return true;
  }

  showAnswer(): void {
    this.director.stop();
    this.pending = null;
    this.done = ORDER.length;
    this.phasesUpTo(this.done);
    this.renderAll();
  }

  reset(): void {
    this.director.stop();
    this.pending = null;
    this.done = 0;
    this.phasesUpTo(0);
    this.renderAll();
  }
}

const rowsText = (rows: Row[]) => rows.map((r) => `${r.name}|${r.wallet}|${r.amount}`).join('\n');

/** The first 16 hex characters of a SHA-256 fingerprint, in groups of four. */
const short = (hex: string) => (hex ? hex.slice(0, 16).match(/.{4}/g)!.join(' ') : '');

function markDiff(a: string, b: string): string {
  return [...b].map((ch, i) => (ch === a[i] ? esc(ch) : `<mark>${esc(ch)}</mark>`)).join('');
}

/** AES-GCM with a fresh 256-bit key (Web Crypto). Without a secure context, random bytes stand in. */
async function encrypt(text: string, real: boolean): Promise<string> {
  let bytes: Uint8Array;
  if (real) {
    const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    bytes = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text)));
  } else {
    bytes = crypto.getRandomValues(new Uint8Array(text.length + 16));
  }
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.length > 46 ? `${b64.slice(0, 46)}…` : b64 || toHex(bytes);
}
