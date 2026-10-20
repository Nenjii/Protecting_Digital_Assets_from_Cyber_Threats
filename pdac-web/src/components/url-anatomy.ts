import { icon } from '../core/icons';
import { PdacBase, esc, md } from './base';

interface UrlCase { url: string; owner?: string; verdict: 'real' | 'look-alike'; note: string }
interface UrlData { suffixes?: string[]; cases: UrlCase[] }

const DEFAULT_SUFFIXES = ['gov.ph', 'com.ph', 'org.ph', 'edu.ph', 'net.ph', 'ph', 'com', 'org', 'net', 'info', 'online', 'site', 'top', 'xyz', 'app', 'io', 'co'];

/**
 * <pdac-url-anatomy data-src="m4-urls.json">
 * Splits a link into its parts and finds who really owns it: the name just
 * before the ending (.gov.ph, .com…). A padlock means encrypted, not trustworthy.
 */
export class PdacUrlAnatomy extends PdacBase {
  private data!: UrlData;
  private index = 0;
  private revealed = false;

  protected setup(): void {
    this.data = this.json<UrlData>();
    this.innerHTML = `
      <div class="vr-top">
        <p class="vr-count" aria-live="polite"></p>
        <div class="vr-nav">
          <button type="button" class="pdac-btn pdac-btn--quiet" data-act="prev">${icon('chevron-left')} Previous</button>
          <button type="button" class="pdac-btn pdac-btn--quiet" data-act="next">Next ${icon('chevron-right')}</button>
        </div>
      </div>
      <div class="ua-bar"></div>
      <div class="ua-parts"></div>
      <div class="ua-reveal" aria-live="polite"></div>
      <div class="pdac-bar__left">
        <button type="button" class="pdac-btn pdac-btn--primary" data-act="reveal">${icon('scan-eye')} Who owns this link? <span class="pdac-key">A</span></button>
      </div>`;
    this.addEventListener('click', (e) => {
      const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'prev' && this.index > 0) { this.index--; this.revealed = false; this.render(); }
      if (act === 'next' && this.index < this.data.cases.length - 1) { this.index++; this.revealed = false; this.render(); }
      if (act === 'reveal') this.showAnswer();
    });
    this.render();
  }

  step(dir: 1 | -1): boolean {
    if (dir === 1) {
      if (!this.revealed) { this.showAnswer(); return true; }
      if (this.index < this.data.cases.length - 1) { this.index++; this.revealed = false; this.render(); return true; }
      return false;
    }
    if (this.revealed) { this.revealed = false; this.render(); return true; }
    if (this.index > 0) { this.index--; this.render(); return true; }
    return false;
  }

  private split(raw: string) {
    const m = raw.match(/^(https?:\/\/)?([^/?#]+)([^?#]*)(\?[^#]*)?(#.*)?$/i);
    const scheme = m?.[1] ?? '';
    const host = (m?.[2] ?? raw).toLowerCase();
    const suffixes = [...(this.data.suffixes ?? DEFAULT_SUFFIXES)].sort((a, b) => b.length - a.length);
    const suffix = suffixes.find((s) => host === s || host.endsWith(`.${s}`)) ?? host.split('.').slice(-1)[0];
    const before = host.slice(0, host.length - suffix.length - 1).split('.').filter(Boolean);
    const name = before.pop() ?? '';
    return { scheme, sub: before.join('.'), name, suffix, path: m?.[3] ?? '', query: m?.[4] ?? '', frag: m?.[5] ?? '' };
  }

  private render(): void {
    const c = this.data.cases[this.index];
    const p = this.split(c.url);
    this.$('.vr-count').textContent = `Link ${this.index + 1} of ${this.data.cases.length}`;
    (this.querySelector('[data-act="prev"]') as HTMLButtonElement).disabled = this.index === 0;
    (this.querySelector('[data-act="next"]') as HTMLButtonElement).disabled = this.index === this.data.cases.length - 1;
    const secure = p.scheme.toLowerCase() === 'https://';
    this.$('.ua-bar').innerHTML = `<span class="ua-lock ${secure ? 'is-on' : ''}">${icon(secure ? 'lock' : 'triangle-alert')}<span>${secure ? 'Padlock' : 'Not secure'}</span></span>
      <span class="ua-url">${esc(c.url)}</span>`;
    const part = (cls: string, text: string, label: string) => text ? `<span class="ua-part ${cls}"><span class="ua-text">${esc(text)}</span><span class="ua-label">${label}</span></span>` : '';
    this.$('.ua-parts').innerHTML = [
      part('is-scheme', p.scheme, secure ? 'Encrypted connection, not proof of who' : 'No encryption'),
      part('is-sub', p.sub ? `${p.sub}.` : '', 'Subdomain: the owner can write anything here'),
      part(`is-name ${this.revealed ? 'is-hot' : ''}`, p.name, 'Name: who owns the link'),
      part('is-suffix', `.${p.suffix}`, 'Ending'),
      part('is-path', p.path + p.query + p.frag, 'Page and details'),
    ].join('');
    const box = this.$('.ua-reveal');
    if (!this.revealed) { box.innerHTML = ''; box.classList.remove('is-on'); return; }
    const real = c.verdict === 'real';
    box.innerHTML = `<p class="vr-answer"><span class="vr-answer__k">Owner</span> ${esc(c.owner ?? `${p.name}.${p.suffix}`)}
        <span class="pdac-verdict ${real ? 'is-ok' : 'is-no'}">${real ? '✓ The real site' : '✗ Look-alike'}</span></p>
      <p class="vr-why">${md(c.note)}</p>`;
    box.classList.add('is-on');
  }

  showAnswer(): void {
    this.revealed = true;
    this.render();
  }

  reset(): void {
    this.index = 0;
    this.revealed = false;
    this.render();
  }
}
