import { chime, unlockAudio } from '../core/audio';
import { icon } from '../core/icons';
import { PdacBase, esc, md } from './base';

interface Inject { round: number; scenarioTime: string; atMinute: number; text: string }

const DAYS: Record<string, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };

function scenarioLabel(s: string): string {
  const [d, hm] = s.split(' ');
  const [h, m] = hm.split(':').map(Number);
  const h12 = ((h + 11) % 12) + 1;
  return `${DAYS[d] ?? d} ${h12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * <pdac-inject-clock data-src="m5-injects.json" data-rounds="25,30,25">
 * Tabletop driver: a big scenario clock (Friday 4:45 PM onward), a real-time
 * countdown per round, and inject cards pushed on schedule with a chime.
 * Facilitator material (TLP:AMBER): never put this on a participant-facing URL.
 */
export class PdacInjectClock extends PdacBase {
  private injects: Inject[] = [];
  private rounds: number[] = [];
  private round = 1;
  private sent = new Set<number>(); // indexes into injects
  private running = false;
  private elapsed = 0;   // ms elapsed in the current round
  private lastTick = 0;
  private timer = 0;

  protected setup(): void {
    this.injects = this.json<Inject[]>();
    this.rounds = (this.dataset.rounds ?? '25,30,25').split(',').map(Number);
    this.innerHTML = `
      <div class="ic-top">
        <div class="ic-clock"><span class="ic-k">Scenario time</span><span class="ic-time"></span></div>
        <div class="ic-round"><span class="ic-k ic-round__k"></span><span class="ic-left"></span><span class="ic-state" aria-live="polite"></span></div>
        <div class="ic-controls">
          <button type="button" class="pdac-btn pdac-btn--primary" data-act="toggle"></button>
          <button type="button" class="pdac-btn" data-act="push">${icon('siren')} Push next inject <span class="pdac-key">A</span></button>
          <button type="button" class="pdac-btn pdac-btn--quiet" data-act="round">Next round ${icon('chevron-right')}</button>
          <button type="button" class="pdac-btn pdac-btn--quiet" data-act="reset">${icon('rotate-ccw')} <span class="pdac-key">R</span></button>
        </div>
      </div>
      <ol class="ic-strip" aria-label="Injects in this round"></ol>
      <div class="ic-cards" aria-live="polite"></div>`;
    this.addEventListener('click', (e) => {
      unlockAudio();
      const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'toggle') this.toggle();
      if (act === 'push') this.showAnswer();
      if (act === 'round') this.nextRound();
      if (act === 'reset') this.reset();
    });
    this.render();
  }

  private roundInjects(): { inj: Inject; i: number }[] {
    return this.injects.map((inj, i) => ({ inj, i })).filter(({ inj }) => inj.round === this.round);
  }

  private toggle(): void {
    this.running = !this.running;
    this.lastTick = Date.now();
    clearInterval(this.timer);
    if (this.running) this.timer = window.setInterval(() => this.tick(), 250);
    this.render();
  }

  private tick(): void {
    const now = Date.now();
    this.elapsed += now - this.lastTick;
    this.lastTick = now;
    const minute = this.elapsed / 60_000;
    for (const { inj, i } of this.roundInjects()) {
      if (!this.sent.has(i) && minute >= inj.atMinute) this.send(i);
    }
    if (this.elapsed >= this.rounds[this.round - 1] * 60_000) {
      this.running = false;
      clearInterval(this.timer);
      chime('end');
    }
    this.render();
  }

  private send(i: number): void {
    this.sent.add(i);
    chime('inject');
  }

  /** A: push the next pending inject of this round now. */
  showAnswer(): void {
    unlockAudio();
    const next = this.roundInjects().find(({ i }) => !this.sent.has(i));
    if (next) this.send(next.i);
    this.render();
  }

  private nextRound(): void {
    if (this.round >= this.rounds.length) return;
    this.round++;
    this.elapsed = 0;
    this.running = false;
    clearInterval(this.timer);
    this.render();
  }

  private render(): void {
    const total = this.rounds[this.round - 1] * 60_000;
    const left = total - this.elapsed;
    const sentHere = this.roundInjects().filter(({ i }) => this.sent.has(i));
    const lastSent = [...this.sent].sort((a, b) => a - b).pop();
    const scenario = lastSent !== undefined ? this.injects[lastSent].scenarioTime : this.roundInjects()[0]?.inj.scenarioTime ?? 'Fri 16:45';
    this.$('.ic-time').textContent = scenarioLabel(scenario);
    this.$('.ic-round__k').textContent = `Round ${this.round} of ${this.rounds.length} · ${this.rounds[this.round - 1]} min`;
    this.$('.ic-left').textContent = left > 0 ? fmt(left) : '0:00';
    this.$('.ic-state').textContent = left <= 0 ? 'Round over: teams report out' : this.running ? '' : this.elapsed ? 'Paused' : 'Ready';
    this.$('[data-act="toggle"]').innerHTML = this.running ? `${icon('pause')} Pause` : `${icon('play')} ${this.elapsed ? 'Resume' : 'Start round'}`;
    (this.querySelector('[data-act="round"]') as HTMLButtonElement).disabled = this.round >= this.rounds.length;
    this.classList.toggle('is-over', left <= 0);

    this.$('.ic-strip').innerHTML = this.roundInjects().map(({ inj, i }) => `
      <li class="${this.sent.has(i) ? 'is-sent' : ''}"><span class="ic-strip__at">min ${inj.atMinute}</span>
      <span class="ic-strip__when">${esc(scenarioLabel(inj.scenarioTime))}</span>
      <span class="ic-strip__state">${this.sent.has(i) ? 'Sent' : 'Pending'}</span></li>`).join('');

    this.$('.ic-cards').innerHTML = [...sentHere].reverse().map(({ inj }, n) => `
      <article class="ic-card ${n === 0 ? 'is-latest' : ''}">
        <p class="ic-card__when">${icon('siren')} ${esc(scenarioLabel(inj.scenarioTime))}</p>
        <p class="ic-card__text">${md(inj.text)}</p>
      </article>`).join('') || '<p class="ic-empty">Injects appear here on schedule, or press A to push the next one.</p>';
  }

  reset(): void {
    clearInterval(this.timer);
    this.round = 1;
    this.sent.clear();
    this.running = false;
    this.elapsed = 0;
    this.render();
  }
}
