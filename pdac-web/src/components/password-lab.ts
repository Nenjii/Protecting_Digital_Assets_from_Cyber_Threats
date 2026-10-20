import type { ZxcvbnResult } from '@zxcvbn-ts/core';
import { icon } from '../core/icons';
import { PdacBase, esc } from './base';

type Check = (password: string) => ZxcvbnResult;
let loading: Promise<Check> | null = null;

/** zxcvbn-ts (MIT, github.com/zxcvbn-ts/zxcvbn) is bundled and loaded on first use: no network. */
function loadChecker(): Promise<Check> {
  loading ??= Promise.all([
    import('@zxcvbn-ts/core'),
    import('@zxcvbn-ts/language-common'),
    import('@zxcvbn-ts/language-en'),
  ]).then(([core, common, en]) => {
    const factory = new core.ZxcvbnFactory({
      dictionary: { ...common.dictionary, ...en.dictionary },
      graphs: common.adjacencyGraphs,
      translations: en.translations,
    });
    return (password: string) => factory.check(password);
  });
  return loading;
}

const SAMPLES = ['rsso2026', 'Password@123', 'Mango-Season-Jeepney-44'];
const WORDS = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];

/**
 * <pdac-password-lab [data-samples="a|b|c"] [data-compact]>
 * How fast a sample password falls to guessing, estimated on this computer by
 * zxcvbn: at a login page that slows guessers down, and against a stolen copy
 * guessed offline at full speed. A shows the strongest sample; R clears it.
 */
export class PdacPasswordLab extends PdacBase {
  private check: Check | null = null;
  private value = '';
  private samples: string[] = [];

  protected setup(): void {
    this.samples = (this.dataset.samples ?? SAMPLES.join('|')).split('|');
    this.classList.toggle('is-compact', this.hasAttribute('data-compact'));
    this.innerHTML = `
      <div class="pw-top">
        <label class="pw-field"><span class="pw-k">Sample password</span>
          <input type="text" class="pw-input" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type a sample, never a real one">
        </label>
        <div class="pw-samples" role="group" aria-label="Samples">${this.samples.map((s) =>
          `<button type="button" class="pw-sample" data-pw="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      </div>
      <div class="pw-out" aria-live="polite"><p class="pw-wait">Loading the checker…</p></div>
      <p class="pw-note">${icon('shield-check')} Estimated on this computer by zxcvbn, an open-source checker. Nothing is saved or sent.</p>`;
    const input = this.querySelector<HTMLInputElement>('.pw-input')!;
    input.addEventListener('input', () => {
      this.value = input.value;
      this.render();
    });
    // Enter hands the keyboard back to the presentation.
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') input.blur();
    });
    this.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-pw]');
      if (b) this.use(b.dataset.pw!);
    });
    loadChecker()
      .then((c) => {
        this.check = c;
        this.render();
      })
      .catch((err: unknown) => {
        console.error(err);
        this.$('.pw-out').innerHTML = '<p class="pw-wait">The checker could not load.</p>';
      });
  }

  private use(password: string): void {
    this.value = password;
    this.querySelector<HTMLInputElement>('.pw-input')!.value = password;
    this.render();
  }

  private render(): void {
    this.$$('.pw-sample').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.pw === this.value)));
    if (!this.check) return;
    const out = this.$('.pw-out');
    if (!this.value) {
      out.innerHTML = '<p class="pw-wait">Pick a sample or type one.</p>';
      return;
    }
    const r = this.check(this.value);
    const online = r.crackTimes.onlineThrottlingXPerHour.display;
    const offline = r.crackTimes.offlineFastHashingXPerSecond.display;
    const warn = r.feedback.warning ? `<p class="pw-warn">${icon('triangle-alert')} ${esc(r.feedback.warning)}</p>` : '';
    out.innerHTML = `
      <div class="pw-score s${r.score}" role="img" aria-label="Strength ${r.score + 1} of 5: ${WORDS[r.score]}">
        ${[0, 1, 2, 3, 4].map((i) => `<span class="${i <= r.score ? 'is-on' : ''}"></span>`).join('')}
        <b>${WORDS[r.score]}</b>
      </div>
      <dl class="pw-times">
        <div><dt>Guessing at the login page, which slows guessers down</dt><dd>${esc(online)}</dd></div>
        <div><dt>Guessing a stolen copy offline, at full speed</dt><dd>${esc(offline)}</dd></div>
      </dl>
      ${warn}`;
  }

  showAnswer(): void {
    this.use(this.samples[this.samples.length - 1]);
  }

  reset(): void {
    this.use('');
  }
}
