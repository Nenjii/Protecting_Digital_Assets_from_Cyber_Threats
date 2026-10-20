import { icon } from '../core/icons';
import { PdacBase, esc, md, verdict } from './base';

interface Cue { id: string; slam?: 'S' | 'L' | 'A' | 'M'; kind?: 'flag' | 'ok'; text: string }
interface Message {
  id: string;
  channel: 'email' | 'sms' | 'qr' | 'voice';
  answer: 'phish' | 'legit';
  /** The guide's verdict in words, e.g. "Phish (vishing)"; defaults to Phish or Legit. */
  verdict?: string;
  from?: string; to?: string; subject?: string; time?: string;
  sender?: string;
  caller?: string; duration?: string;
  body: string;
  link?: string; linkText?: string; attachment?: string;
  poster?: { title: string; body: string; place?: string };
  cues: Cue[];
  why: string;
}
interface MessagesData { options?: { id: string; label: string }[]; messages: Message[] }

const SLAM: Record<string, string> = { S: 'Sender', L: 'Links', A: 'Attachments', M: 'Message' };

/**
 * <pdac-phish-or-legit data-src="m2-messages.json" data-range="1-4">
 * Fictional email, SMS, voicemail and QR cards. The room votes Phish or Legit; reveal
 * marks the red-flag cues on the message itself, each with its SLAM letter.
 * Cue spans are written in the data as [[cueId|text]].
 */
export class PdacPhishOrLegit extends PdacBase {
  private all: Message[] = [];
  private items: Message[] = [];
  private offset = 0;
  private index = 0;
  private options = [{ id: 'phish', label: 'Phish' }, { id: 'legit', label: 'Legit' }];
  private tallies: number[][] = [];
  private revealed: boolean[] = [];

  protected setup(): void {
    const data = this.json<MessagesData>();
    this.all = data.messages;
    if (data.options?.length) this.options = data.options;
    const [from, to] = (this.dataset.range ?? '').split('-').map(Number);
    this.offset = from ? from - 1 : 0;
    this.items = from ? this.all.slice(from - 1, to || from) : this.all;
    this.resetState();
    this.innerHTML = `
      <div class="pl-wrap">
        <div class="pl-stage"></div>
        <div class="pl-side">
          <div class="vr-top">
            <p class="vr-count" aria-live="polite"></p>
            <div class="vr-nav">
              <button type="button" class="pdac-btn pdac-btn--quiet pdac-btn--icon" data-act="prev" aria-label="Previous message">${icon('chevron-left')}</button>
              <button type="button" class="pdac-btn pdac-btn--quiet pdac-btn--icon" data-act="next" aria-label="Next message">${icon('chevron-right')}</button>
            </div>
          </div>
          <div class="vr-options pl-options" role="group" aria-label="Room's tally"></div>
          <button type="button" class="pdac-btn pdac-btn--primary pl-reveal-btn" data-act="reveal">${icon('scan-eye')} Reveal the cues <span class="pdac-key">A</span></button>
          <div class="pl-reveal" aria-live="polite"></div>
        </div>
      </div>`;
    this.addEventListener('click', (e) => this.onClick(e));
    this.render();
  }

  private resetState(): void {
    this.index = 0;
    this.tallies = this.items.map(() => this.options.map(() => 0));
    this.revealed = this.items.map(() => false);
  }

  private onClick(e: Event): void {
    const t = e.target as HTMLElement;
    const opt = t.closest<HTMLElement>('[data-opt]');
    if (opt) return this.vote(Number(opt.dataset.opt) + 1);
    const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
    if (act === 'prev' && this.index > 0) { this.index--; this.render(); }
    if (act === 'next' && this.index < this.items.length - 1) { this.index++; this.render(); }
    if (act === 'reveal') this.showAnswer();
  }

  vote(option: number): void {
    const i = option - 1;
    if (i < 0 || i >= this.options.length || this.revealed[this.index]) return;
    this.tallies[this.index][i]++;
    this.render();
  }

  step(dir: 1 | -1): boolean {
    if (dir === 1) {
      if (!this.revealed[this.index]) { this.showAnswer(); return true; }
      if (this.index < this.items.length - 1) { this.index++; this.render(); return true; }
      return false;
    }
    if (this.revealed[this.index]) { this.revealed[this.index] = false; this.render(); return true; }
    if (this.index > 0) { this.index--; this.render(); return true; }
    return false;
  }

  /** [[c1|text]] → numbered cue span (highlighted only after reveal). */
  private cues(text: string | undefined, msg: Message): string {
    if (!text) return '';
    const order = msg.cues.map((c) => c.id);
    return esc(text).replace(/\[\[([\w-]+)\|(.+?)\]\]/g, (_, id: string, inner: string) => {
      const n = order.indexOf(id) + 1;
      const kind = msg.cues.find((c) => c.id === id)?.kind ?? (msg.answer === 'legit' ? 'ok' : 'flag');
      return `<span class="pl-cue is-${kind}" data-n="${n || '•'}">${inner}</span>`;
    }).replace(/\n/g, '<br>');
  }

  private renderMessage(m: Message): string {
    if (m.channel === 'sms') {
      return `<div class="pl-phone" aria-label="Text message">
          <div class="pl-phone__top">${icon('smartphone')} <span class="pl-phone__sender">${this.cues(m.sender, m)}</span></div>
          <div class="pl-bubble">${this.cues(m.body, m)}</div>
          ${m.time ? `<p class="pl-phone__time">${esc(m.time)}</p>` : ''}
        </div>`;
    }
    if (m.channel === 'voice') {
      const bars = Array.from({ length: 34 }, (_, i) => 22 + Math.round(Math.abs(Math.sin(i * 1.7) * 30 + Math.sin(i * 0.6) * 18)));
      return `<div class="pl-phone pl-voice" aria-label="Voicemail with transcript">
          <div class="pl-phone__top">${icon('phone-call')} <span>Voicemail · <span class="pl-phone__sender">${this.cues(m.caller, m)}</span></span></div>
          <div class="pl-voice__player" aria-hidden="true">
            <span class="pl-voice__play">${icon('play')}</span>
            <span class="pl-voice__wave">${bars.map((h) => `<i style="height:${h}px"></i>`).join('')}</span>
            ${m.duration ? `<span class="pl-voice__len">${esc(m.duration)}</span>` : ''}
          </div>
          <p class="pl-voice__k">Transcript</p>
          <div class="pl-bubble">${this.cues(m.body, m)}</div>
          ${m.time ? `<p class="pl-phone__time">${esc(m.time)}</p>` : ''}
        </div>`;
    }
    if (m.channel === 'qr') {
      const p = m.poster ?? { title: '', body: '' };
      return `<div class="pl-poster" aria-label="Poster with a QR code">
          <p class="pl-poster__title">${this.cues(p.title, m)}</p>
          <p class="pl-poster__body">${this.cues(p.body, m)}</p>
          <div class="pl-poster__qr">${fakeQr(m.id)}<span class="pl-poster__sample">Sample · do not scan</span></div>
          ${m.body ? `<p class="pl-poster__small">${this.cues(m.body, m)}</p>` : ''}
          ${p.place ? `<p class="pl-poster__place">${icon('info')} ${this.cues(p.place, m)}</p>` : ''}
        </div>`;
    }
    return `<div class="pl-email" aria-label="Email">
        <div class="pl-email__head">
          <p><span class="pl-k">From</span> ${this.cues(m.from, m)}</p>
          ${m.to ? `<p><span class="pl-k">To</span> ${this.cues(m.to, m)}</p>` : ''}
          <p class="pl-email__subject"><span class="pl-k">Subject</span> ${this.cues(m.subject, m)}</p>
          ${m.time ? `<p class="pl-email__time">${esc(m.time)}</p>` : ''}
        </div>
        <div class="pl-email__body">${this.cues(m.body, m)}</div>
        ${m.link ? `<p class="pl-email__link">${icon('link')} <span class="pl-k">Link goes to</span> ${this.cues(m.link, m)}</p>` : ''}
        ${m.attachment ? `<p class="pl-email__att">${icon('paperclip')} ${this.cues(m.attachment, m)}</p>` : ''}
      </div>`;
  }

  private render(): void {
    const m = this.items[this.index];
    const revealed = this.revealed[this.index];
    const tally = this.tallies[this.index];
    const total = tally.reduce((a, b) => a + b, 0);
    const max = Math.max(...tally);
    const channel = { email: 'Email', sms: 'Text message', qr: 'QR poster', voice: 'Voicemail' }[m.channel];
    this.$('.vr-count').textContent = `Message ${this.offset + this.index + 1} of ${this.all.length} · ${channel}`;
    (this.querySelector('[data-act="prev"]') as HTMLButtonElement).disabled = this.index === 0;
    (this.querySelector('[data-act="next"]') as HTMLButtonElement).disabled = this.index === this.items.length - 1;

    const stage = this.$('.pl-stage');
    stage.innerHTML = this.renderMessage(m);
    stage.classList.toggle('is-revealed', revealed);
    // Once revealed, the reveal button gives its room to the explanation (A and R still work).
    this.$('.pl-side').classList.toggle('is-revealed', revealed);

    this.$('.pl-options').innerHTML = this.options.map((o, i) => {
      const isAnswer = revealed && o.id === m.answer;
      const pct = total ? Math.round((tally[i] / total) * 100) : 0;
      return `<button type="button" class="vr-opt ${isAnswer ? 'is-answer' : ''} ${revealed && !isAnswer ? 'is-dim' : ''}" data-opt="${i}">
          <span class="vr-opt__key">${i + 1}</span>
          <span class="vr-opt__label">${esc(o.label)}</span>
          <span class="vr-opt__count">${tally[i]}<span class="pdac-sr"> votes</span></span>
          <span class="vr-opt__bar" style="width:${pct}%"></span>
          ${isAnswer ? `<span class="vr-opt__tag">${icon('check')} Answer</span>` : ''}
        </button>`;
    }).join('');

    const box = this.$('.pl-reveal');
    if (!revealed) { box.innerHTML = ''; box.classList.remove('is-on'); return; }
    const top = total ? this.options.filter((_, i) => tally[i] === max) : [];
    const room = total ? `<p class="vr-room">${verdict(top.length === 1 && top[0].id === m.answer, 'The room got it', 'Not quite')}</p>` : '';
    const isPhish = m.answer === 'phish';
    box.innerHTML = `
      <p class="pl-verdict ${isPhish ? 'is-phish' : 'is-legit'}">${icon(isPhish ? 'triangle-alert' : 'shield-check')} ${esc(m.verdict ?? (isPhish ? 'Phish' : 'Legit'))}</p>
      <p class="pl-cues__k">${isPhish ? 'Red flags' : 'Why it checks out'}</p>
      <ol class="pl-cues">${m.cues.map((c) => `<li>${c.slam ? `<span class="pl-slam" title="${SLAM[c.slam]}">${c.slam}</span>` : ''}${md(c.text)}</li>`).join('')}</ol>
      <p class="vr-why">${md(m.why)}</p>${room}`;
    box.classList.add('is-on');
  }

  showAnswer(): void {
    this.revealed[this.index] = true;
    this.render();
  }

  reset(): void {
    this.resetState();
    this.render();
  }
}

/** A QR-looking pattern that encodes nothing (no format information), so phones cannot read it. */
function fakeQr(seed: string): string {
  const n = 25;
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
  const finder = (x: number, y: number) =>
    `<rect x="${x}" y="${y}" width="7" height="7" fill="#14213D"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="#fff"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="#14213D"/>`;
  const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
  let cells = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!inFinder(x, y) && rnd() > 0.52) cells += `<rect x="${x}" y="${y}" width="1" height="1"/>`;
  return `<svg viewBox="-2 -2 ${n + 4} ${n + 4}" role="img" aria-label="Sample QR pattern (not scannable)"><rect x="-2" y="-2" width="${n + 4}" height="${n + 4}" fill="#fff"/><g fill="#14213D">${cells}</g>${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}</svg>`;
}
