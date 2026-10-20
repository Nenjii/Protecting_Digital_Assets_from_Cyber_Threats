import { proofHtml } from '../core/evidence';
import { icon } from '../core/icons';
import { Director, run, type Timeline } from '../sim/anim';
import { PdacBase, esc } from './base';
import { goalChip } from './net-sim';

interface Attacker {
  id: string; who: string; want: string; how: string; icon: string;
  scene: 'ransom' | 'scam' | 'deface' | 'spy' | 'insider' | 'vendor';
  hits: string[]; beats: [string, string, string]; proof?: string;
  /** Card text when "Wants: …" reads badly (the vendor wants nothing). */
  card?: string;
}
interface AttackerData { intro: string; note?: string; attackers: Attacker[] }

interface Scene {
  markup: () => string;
  /** Extra motion inside a beat, before the next beat's caption. */
  during?: (tl: Timeline, root: HTMLElement, beat: number) => Promise<void>;
}

const FILES = ['Applicants.xlsx', 'Payouts.xlsx', 'ID scans', 'Medical certs', 'Approvals.docx', 'Budget.xlsx', 'Minutes.docx', 'Photos'];

/** Each scene is plain HTML; the beat number on the scene drives what shows (see sims.css). */
const SCENES: Record<Attacker['scene'], Scene> = {
  ransom: {
    markup: () => `<div class="sc sc-ransom">
        <div class="sc-files">${FILES.map((f) => `<span class="sc-file"><span class="sc-file__icon">${icon('file-spreadsheet')}</span><b>${esc(f)}</b></span>`).join('')}</div>
        <div class="sc-note">${icon('lock')}<h4>Your files are locked</h4><p>Pay for the key within 72 hours.</p></div>
        <div class="sc-leak">${icon('globe')}<b>RSSO · 48,000 records</b><span>“Published unless you pay”</span></div>
      </div>`,
    during: async (tl, root, beat) => {
      if (beat !== 1) return;
      for (const f of root.querySelectorAll<HTMLElement>('.sc-file')) {
        f.classList.add('is-locked');
        f.querySelector('.sc-file__icon')!.innerHTML = icon('lock');
        await tl.wait(170);
      }
    },
  },
  scam: {
    markup: () => `<div class="sc sc-scam">
        <div class="sc-phone">
          <p class="sc-phone__top">${icon('message-circle')} Messages</p>
          <div class="sc-sms"><b>RSSO-AYUDA</b><p>Your ₱5,000 assistance is ready. Confirm at rsso-ayuda.claim.example</p></div>
          <div class="sc-form"><p class="sc-form__k">Confirm your payout</p><p class="sc-input">Mobile number <span>09•• ••• ••12</span></p><p class="sc-input">One-time PIN <span>• • • • • •</span></p></div>
          <div class="sc-alert">${icon('wallet')} ₱5,000 sent to an unknown account</div>
        </div>
        <p class="sc-side">${icon('shield-check')} Real offices never ask for your one-time PIN.</p>
      </div>`,
  },
  deface: {
    markup: () => `<div class="sc sc-deface">
        <div class="sc-browser">
          <p class="sc-bar"><span class="sc-dots"><i></i><i></i><i></i></span><span class="sc-url">${icon('lock')} assistance.rsso-regionq.gov.ph</span></p>
          <div class="sc-page">
            <div class="sc-page__ok"><h4>Assistance Portal</h4><p>Apply for assistance · Check your application</p><span class="sc-cta">Apply now</span></div>
            <div class="sc-page__bad"><h4>This site was hacked</h4><p>“Done to make a point.” The attackers' message replaces the real page.</p></div>
          </div>
        </div>
        <div class="sc-docs">${icon('file-text')}<b>internal_memo.pdf · budget_notes.pdf</b><span>posted online</span></div>
      </div>`,
  },
  spy: {
    markup: () => `<div class="sc sc-spy">
        <div class="sc-track"><span class="sc-fill"></span>
          <span class="sc-mark m1"><b>Day 1</b>A quiet way in</span>
          <span class="sc-mark m2"><b>Months</b>Data trickles out</span>
          <span class="sc-mark m3"><b>Found</b>Often from an outside tip</span>
        </div>
        <div class="sc-drips">${Array.from({ length: 14 }, () => `<span class="sc-drip">${icon('file-text')}</span>`).join('')}</div>
        <p class="sc-alarm">${icon('bell-off')} No alarms</p>
      </div>`,
    during: async (tl, root, beat) => {
      if (beat !== 2) return;
      const fill = root.querySelector<HTMLElement>('.sc-fill')!;
      const drips = [...root.querySelectorAll<HTMLElement>('.sc-drip')];
      drips.forEach((d) => d.classList.remove('is-out'));
      await tl.tween(2400, (p) => {
        fill.style.width = `${8 + p * 74}%`;
        drips.forEach((d, i) => d.classList.toggle('is-out', i < Math.round(p * drips.length)));
      });
    },
  },
  insider: {
    markup: () => `<div class="sc sc-insider">
        <div class="sc-mail">
          <p class="sc-row"><span>To</span><b class="sc-to">Ben Santos</b></p>
          <ul class="sc-auto">
            <li class="is-in">${icon('building-2')} Ben Santos · ben.santos@rsso-regionq.gov.ph</li>
            <li class="is-out">${icon('house')} Ben Santos · bensantos.home@regionq-mail.example</li>
          </ul>
          <p class="sc-row"><span>Attach</span><b>${icon('paperclip')} Beneficiaries_150.xlsx</b></p>
          <p class="sc-row sc-send-row"><span class="sc-send">${icon('send')} Send</span></p>
        </div>
        <div class="sc-out">${icon('triangle-alert')}<b>Sent outside the office</b><span>150 beneficiaries' names and ID numbers</span></div>
      </div>`,
  },
  vendor: {
    markup: () => `<div class="sc sc-vendor">
        <div class="sc-vchain">
          <div class="sc-vbox is-vendor">${icon('handshake')}<b>SMS vendor</b><span>Account: rsso-sms</span></div>
          <div class="sc-vlink"><span class="sc-vline"></span><span class="sc-vlabel">${icon('link')} Reaches the RSSO</span></div>
          <div class="sc-vbox is-rsso">${icon('database')}<b>Applicant list</b><span>Names · mobile numbers</span></div>
        </div>
        <div class="sc-vthief">${icon('key-round')}<b>Weak password, used on other sites</b><span>Someone else signs in as the vendor</span></div>
        <div class="sc-out">${icon('triangle-alert')}<b>Out through the vendor's door</b><span>48,000 applicants' names and mobile numbers</span></div>
      </div>`,
  },
};

/**
 * <pdac-attackers data-src="m1-attackers.json"> the five attackers, each with a
 * three-beat scene of what their attack looks like at the RSSO. The clicker
 * plays the next attacker (or finishes the one playing); click a card to play
 * it. A shows the summary table (the slide's own table); R starts over.
 */
export class PdacAttackers extends PdacBase {
  private data!: AttackerData;
  private current = -1;
  private beat = 0;
  private playing = false;
  private summaryOn = false;
  private director = new Director();

  protected setup(): void {
    this.data = this.json<AttackerData>();
    const list = this.data.attackers;
    this.innerHTML = `
      <div class="at-wrap">
        <div class="at-list" role="group" aria-label="Attackers">${list.map((a, i) => `
          <button type="button" class="at-card" data-i="${i}">
            <span class="at-card__icon">${icon(a.icon)}</span>
            <span class="at-card__who">${esc(a.who)}</span>
            <span class="at-card__want">${esc(a.card ?? `Wants: ${a.want}`)}</span>
          </button>`).join('')}</div>
        <div class="at-stage">
          <div class="at-scene"></div>
          <div class="at-caption" aria-live="polite"></div>
          <div class="at-summary" hidden>
            <table class="t compact"><thead><tr><th>Who</th><th>What they want</th><th>What they usually do</th></tr></thead>
            <tbody>${list.map((a) => `<tr><td>${esc(a.who)}</td><td>${esc(a.want)}</td><td>${esc(a.how)}</td></tr>`).join('')}</tbody></table>
            ${this.data.note ? `<p class="at-note">${esc(this.data.note)}</p>` : ''}
          </div>
        </div>
      </div>`;
    this.addEventListener('click', (e) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>('.at-card');
      if (card) {
        this.summaryOn = false;
        this.play(Number(card.dataset.i));
      }
    });
    this.show(-1, 0);
  }

  /** Static view of attacker i at a beat (0 = scene only, 3 = everything). */
  private show(i: number, beat: number): void {
    this.current = i;
    this.beat = beat;
    const scene = this.$('.at-scene');
    const caption = this.$('.at-caption');
    this.$$('.at-card').forEach((c, k) => c.setAttribute('aria-pressed', String(k === i)));
    this.$('.at-summary').hidden = !this.summaryOn;
    if (i < 0) {
      scene.innerHTML = `<div class="sc sc-intro">${this.data.attackers.map((a) => `<span>${icon(a.icon)}</span>`).join('')}</div>`;
      caption.innerHTML = `<p class="at-intro">${esc(this.data.intro)}</p>`;
      return;
    }
    const a = this.data.attackers[i];
    if (scene.dataset.scene !== a.id) {
      scene.innerHTML = SCENES[a.scene].markup();
      scene.dataset.scene = a.id;
    }
    scene.firstElementChild!.className = `sc sc-${a.scene} beat-${beat}`;
    if (beat >= 3) this.endState(a, scene);
    caption.innerHTML = `
      <p class="at-how"><b>${esc(a.who)}</b> · ${esc(a.how)}</p>
      <ol class="at-beats">${a.beats.map((b, k) => `<li class="${k < beat ? 'is-on' : ''}">${esc(b)}</li>`).join('')}</ol>
      <p class="at-hits"><span class="ns-mini">Puts at risk</span>${a.hits.map(goalChip).join('')}</p>
      ${a.proof && beat >= 3 ? `<div class="at-proof" data-proof="${esc(a.proof)}"><span class="ns-mini">In the numbers</span>${proofHtml(a.proof)}</div>` : ''}`;
  }

  /** What the step-by-step effects leave behind, for jumps and Back. */
  private endState(a: Attacker, scene: HTMLElement): void {
    if (a.scene === 'ransom') {
      scene.querySelectorAll<HTMLElement>('.sc-file').forEach((f) => {
        f.classList.add('is-locked');
        f.querySelector('.sc-file__icon')!.innerHTML = icon('lock');
      });
    }
    if (a.scene === 'spy') {
      scene.querySelector<HTMLElement>('.sc-fill')!.style.width = '82%';
      scene.querySelectorAll('.sc-drip').forEach((d) => d.classList.add('is-out'));
    }
  }

  private play(i: number): void {
    const tl = this.director.fresh();
    const a = this.data.attackers[i];
    this.$('.at-scene').dataset.scene = '';
    this.show(i, 0);
    this.playing = true;
    this.classList.add('is-playing');
    run((async () => {
      const root = this.$('.at-scene');
      for (let beat = 1; beat <= 3; beat++) {
        await tl.wait(beat === 1 ? 300 : 1500);
        this.show(i, beat);
        await SCENES[a.scene].during?.(tl, root.firstElementChild as HTMLElement, beat);
      }
      this.playing = false;
      this.classList.remove('is-playing');
    })());
  }

  step(dir: 1 | -1): boolean {
    if (this.summaryOn) {
      this.summaryOn = false;
      this.show(this.current, this.beat);
      return true;
    }
    if (this.playing) {
      this.director.stop();
      this.playing = false;
      this.classList.remove('is-playing');
      this.show(this.current, 3);
      if (dir === 1) return true;
    }
    if (dir === 1) {
      if (this.current >= this.data.attackers.length - 1) return false;
      this.play(this.current + 1);
      return true;
    }
    if (this.current < 0) return false;
    this.show(this.current - 1, 3);
    return true;
  }

  showAnswer(): void {
    this.director.stop();
    this.playing = false;
    this.classList.remove('is-playing');
    this.summaryOn = true;
    this.show(this.current, this.current < 0 ? 0 : 3);
  }

  reset(): void {
    this.director.stop();
    this.playing = false;
    this.classList.remove('is-playing');
    this.summaryOn = false;
    this.$('.at-scene').dataset.scene = '';
    this.show(-1, 0);
  }
}
