import { sha1Hex } from '../core/hash';
import { icon } from '../core/icons';
import { PdacBase, esc } from './base';

/**
 * <pdac-hash-prefix-demo data-passwords="Mango-Season-2026|ilovebatangas">
 * How a breached-password check can work without sending the password: SHA-1 is
 * computed on this laptop and only the first 5 hex characters would leave it
 * (k-anonymity). Nothing is sent anywhere by this component.
 */
export class PdacHashPrefixDemo extends PdacBase {
  private passwords: string[] = [];
  private current = '';
  private stage = 0;
  private hash = '';

  protected setup(): void {
    this.passwords = (this.dataset.passwords ?? 'Mango-Season-2026|BlueJeepney#44|Sampaguita2026!').split('|');
    this.current = this.passwords[0];
    this.innerHTML = `
      <div class="hp-pick" role="group" aria-label="Invented passwords">
        <span class="hp-k">Invented password</span>
        ${this.passwords.map((p, i) => `<button type="button" class="pdac-btn pdac-btn--quiet" data-pw="${i}">${esc(p)}</button>`).join('')}
        <span class="hp-actions">
          <button type="button" class="pdac-btn pdac-btn--primary" data-act="next">${icon('arrow-right')} Next step</button>
          <button type="button" class="pdac-btn" data-act="all">Show all <span class="pdac-key">A</span></button>
        </span>
      </div>
      <ol class="hp-steps"></ol>
      <p class="hp-note">${icon('lock')} Runs on this laptop only. Nothing is sent.</p>`;
    this.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const pw = t.closest<HTMLElement>('[data-pw]');
      if (pw) {
        this.current = this.passwords[Number(pw.dataset.pw)];
        this.stage = 0;
        void this.render();
        return;
      }
      const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'next') this.step(1);
      if (act === 'all') this.showAnswer();
    });
    void this.render();
  }

  step(dir: 1 | -1): boolean {
    if (dir === 1 && this.stage < 4) { this.stage++; void this.render(); return true; }
    if (dir === -1 && this.stage > 0) { this.stage--; void this.render(); return true; }
    return false;
  }

  private async render(): Promise<void> {
    this.hash = (await sha1Hex(this.current)).toUpperCase();
    const prefix = this.hash.slice(0, 5);
    const rest = this.hash.slice(5);
    this.$$('[data-pw]').forEach((b) => b.setAttribute('aria-pressed', String(this.passwords[Number(b.dataset.pw)] === this.current)));
    const steps = [
      `<span class="hp-n">1</span><div><b>Type it on your own device.</b> <span class="hp-mono">${esc(this.current)}</span></div>`,
      `<span class="hp-n">2</span><div><b>Your device turns it into a SHA-1 hash.</b><span class="hp-mono hp-hash">${this.hash}</span></div>`,
      `<span class="hp-n">3</span><div><b>Only the first 5 characters leave the device.</b>
        <span class="hp-mono hp-hash"><mark class="hp-sent">${prefix}</mark><span class="hp-kept">${rest}</span></span>
        <span class="hp-legend"><span class="hp-sent-k">${icon('share-2')} sent: ${prefix}</span> <span class="hp-kept-k">${icon('lock')} stays here: the other 35</span></span></div>`,
      `<span class="hp-n">4</span><div><b>The service sends back every hash that starts with ${prefix}.</b> Hundreds of people share that start, so it cannot tell which password you have.</div>`,
      `<span class="hp-n">5</span><div><b>Your device compares the list itself.</b> A match means the password has appeared in a breach: change it. No match does not mean strong.</div>`,
    ];
    this.$('.hp-steps').innerHTML = steps.map((s, i) => `<li class="hp-step ${i <= this.stage ? 'is-on' : ''}">${s}</li>`).join('');
  }

  showAnswer(): void {
    this.stage = 4;
    void this.render();
  }

  reset(): void {
    this.stage = 0;
    this.current = this.passwords[0];
    void this.render();
  }
}
