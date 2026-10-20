import { chime, isMuted, setMuted, unlockAudio } from '../core/audio';
import { fmt12, fromMinutes } from '../core/modules';
import { hasLink, toast } from '../core/overlays';

interface Checkpoint { at: number; label: string; done: boolean }

const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * <pdac-countdown> — one page-level timer for activities and quizzes (key T),
 * plus a full-screen break timer (key K). It keeps running across slides, so
 * one countdown can span two slides. Warns with color and words at 2 minutes.
 */
export class PdacCountdown extends HTMLElement {
  private total = 0;
  private endsAt = 0;
  private remaining = 0;
  private running = false;
  private label = '';
  private warned = false;
  private finished = false;
  private checkpoints: Checkpoint[] = [];
  private tick = 0;
  private breakEndsAt = 0;
  private breakTick = 0;
  private chip!: HTMLElement;
  private breakEl!: HTMLElement;

  connectedCallback(): void {
    if (this.chip) return;
    this.classList.add('pdac-ui');
    this.innerHTML = `
      <div class="cd-chip" hidden role="timer" aria-live="off">
        <button type="button" class="cd-time" title="Click to enlarge"></button>
        <span class="cd-label"></span>
        <span class="cd-state" aria-live="polite"></span>
        <button type="button" class="cd-mute" title="Sound on or off"></button>
      </div>
      <div class="cd-break" hidden role="dialog" aria-label="Break timer">
        <p class="cd-break__k">Break</p>
        <p class="cd-break__time"></p>
        <p class="cd-break__back"></p>
        <div class="cd-break__extra"></div>
        <p class="cd-break__hint">K or Esc closes · the session resumes on this slide</p>
      </div>`;
    this.chip = this.querySelector('.cd-chip')!;
    this.breakEl = this.querySelector('.cd-break')!;
    this.querySelector('.cd-time')!.addEventListener('click', () => this.chip.classList.toggle('is-big'));
    this.querySelector('.cd-mute')!.addEventListener('click', () => {
      setMuted(!isMuted());
      this.paint();
    });
  }

  get isRunning(): boolean { return this.running; }
  get isBreakOn(): boolean { return !this.breakEl.hidden; }

  /** T: start (with the slide's minutes) → pause → resume. */
  toggle(minutes: number, label: string, checkpoints: string): void {
    unlockAudio();
    if (this.running) {
      this.remaining = this.endsAt - Date.now();
      this.running = false;
      clearInterval(this.tick);
      this.paint();
      toast('Timer paused');
      return;
    }
    if (this.remaining > 0 && !this.finished && !this.chip.hidden) {
      this.endsAt = Date.now() + this.remaining;
      this.running = true;
      this.loop();
      toast('Timer resumed');
      return;
    }
    if (!minutes) {
      toast('No timer set for this slide (add data-timer)');
      return;
    }
    this.total = minutes * 60_000;
    this.endsAt = Date.now() + this.total;
    this.remaining = this.total;
    this.label = label;
    this.warned = minutes <= 2;
    this.finished = false;
    this.checkpoints = parseCheckpoints(checkpoints);
    this.running = true;
    this.chip.hidden = false;
    this.loop();
    toast(`Timer started: ${minutes} min`);
  }

  /** X: stop and hide. */
  stop(): void {
    clearInterval(this.tick);
    this.running = false;
    this.remaining = 0;
    this.finished = false;
    this.chip.hidden = true;
    this.chip.classList.remove('is-big', 'is-warn', 'is-over');
  }

  private loop(): void {
    clearInterval(this.tick);
    this.tick = window.setInterval(() => this.update(), 250);
    this.update();
  }

  private update(): void {
    if (!this.running) return;
    this.remaining = this.endsAt - Date.now();
    const elapsedMin = (this.total - this.remaining) / 60_000;
    for (const cp of this.checkpoints) {
      if (!cp.done && elapsedMin >= cp.at) {
        cp.done = true;
        chime('checkpoint');
        toast(`Checkpoint: ${cp.label}`, 6000);
      }
    }
    if (!this.warned && this.remaining <= 120_000) {
      this.warned = true;
      chime('warning');
    }
    if (this.remaining <= 0) {
      this.running = false;
      this.finished = true;
      clearInterval(this.tick);
      chime('end');
    }
    this.paint();
  }

  private paint(): void {
    const warn = this.remaining <= 120_000 && this.remaining > 0;
    const over = this.finished;
    this.chip.classList.toggle('is-warn', warn);
    this.chip.classList.toggle('is-over', over);
    this.chip.classList.toggle('is-paused', !this.running && !over);
    this.querySelector('.cd-time')!.textContent = over ? '0:00' : fmt(this.remaining);
    this.querySelector('.cd-label')!.textContent = this.label;
    this.querySelector('.cd-state')!.textContent = over ? 'Time is up' : !this.running ? 'Paused' : warn ? '2 minutes left' : '';
    this.querySelector('.cd-mute')!.textContent = isMuted() ? 'Sound off' : 'Sound on';
  }

  /**
   * K: full-screen break countdown with the time to come back. `link` (the slide's
   * data-break-link, a links.json key) adds a QR code for something to do on the break.
   */
  toggleBreak(minutes: number, link?: string): void {
    unlockAudio();
    if (this.isBreakOn || !minutes) {
      clearInterval(this.breakTick);
      this.breakEl.hidden = true;
      return;
    }
    const extra = this.querySelector<HTMLElement>('.cd-break__extra')!;
    extra.innerHTML = link && hasLink(link) ? `<p class="cd-break__tip">On your break, on your phone</p><pdac-qr-panel data-link="${link}"></pdac-qr-panel>` : '';
    this.breakEndsAt = Date.now() + minutes * 60_000;
    const back = new Date(this.breakEndsAt);
    this.querySelector('.cd-break__back')!.textContent =
      `Back at ${fmt12(fromMinutes(back.getHours() * 60 + back.getMinutes()))}`;
    this.breakEl.hidden = false;
    this.breakEl.classList.remove('is-over');
    const paintBreak = () => {
      const left = this.breakEndsAt - Date.now();
      this.querySelector('.cd-break__time')!.textContent = left > 0 ? fmt(left) : 'Welcome back';
      if (left <= 0) {
        clearInterval(this.breakTick);
        this.breakEl.classList.add('is-over');
        chime('end');
      }
    };
    clearInterval(this.breakTick);
    this.breakTick = window.setInterval(paintBreak, 250);
    paintBreak();
  }
}

/** "10:Map drafted|20:Threats listed" → checkpoints at elapsed minutes. */
function parseCheckpoints(spec: string): Checkpoint[] {
  if (!spec) return [];
  return spec.split('|').map((part) => {
    const [at, ...label] = part.split(':');
    return { at: Number(at), label: label.join(':').trim() || `${at} minutes`, done: false };
  }).filter((c) => !Number.isNaN(c.at));
}
