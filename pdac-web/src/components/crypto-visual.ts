import { hasSubtle, sha256Hex, toHex } from '../core/hash';
import { icon } from '../core/icons';
import { PdacBase, esc } from './base';

/**
 * <pdac-crypto-visual data-text="..." data-changed="...">
 * Left: AES-GCM encryption and decryption of an invented sentence with the
 * browser's Web Crypto API (right key works, wrong key fails). Right: SHA-256 of
 * the sentence and of a one-character change — the whole hash changes.
 */
export class PdacCryptoVisual extends PdacBase {
  private text = '';
  private changed = '';
  private key: CryptoKey | null = null;
  private wrongKey: CryptoKey | null = null;
  private iv = new Uint8Array(12);
  private cipher: Uint8Array<ArrayBuffer> | null = null;

  protected setup(): void {
    this.text = this.dataset.text ?? 'Applicant: Juana Dela Paz, ID 0000-1111-2222 (fictional)';
    this.changed = this.dataset.changed ?? this.text.replace(/1/, '7');
    this.innerHTML = `
      <div class="cv-wrap">
        <div class="cv-panel">
          <h3>${icon('lock')} Encryption <span class="term">(AES-GCM, 256-bit key)</span></h3>
          <p class="cv-row"><span class="cv-k">Plain text</span><span class="cv-v cv-plain">${esc(this.text)}</span></p>
          <p class="cv-row"><span class="cv-k">Key</span><span class="cv-v cv-mono cv-key">Press Encrypt to make a key</span></p>
          <p class="cv-row"><span class="cv-k">Cipher text</span><span class="cv-v cv-mono cv-cipher">—</span></p>
          <p class="cv-row"><span class="cv-k">Decrypted</span><span class="cv-v cv-out" aria-live="polite">—</span></p>
          <div class="pdac-bar__left">
            <button type="button" class="pdac-btn pdac-btn--primary" data-act="encrypt">${icon('lock')} Encrypt</button>
            <button type="button" class="pdac-btn" data-act="decrypt">${icon('key-round')} Decrypt with the right key</button>
            <button type="button" class="pdac-btn pdac-btn--quiet" data-act="wrong">Try a wrong key</button>
          </div>
        </div>
        <div class="cv-panel">
          <h3>${icon('fingerprint')} Hash <span class="term">(SHA-256 fingerprint)</span></h3>
          <p class="cv-row"><span class="cv-k">Original</span><span class="cv-v">${esc(this.text)}</span></p>
          <p class="cv-row"><span class="cv-k">Hash</span><span class="cv-v cv-mono cv-h1">…</span></p>
          <p class="cv-row"><span class="cv-k">One change</span><span class="cv-v">${markDiff(this.text, this.changed)}</span></p>
          <p class="cv-row"><span class="cv-k">Hash</span><span class="cv-v cv-mono cv-h2">…</span></p>
          <p class="cv-diff" aria-live="polite"></p>
        </div>
      </div>
      ${hasSubtle() ? '' : '<p class="cv-warn">Live encryption needs the page opened as localhost or over HTTPS. The hash panel still works.</p>'}`;
    this.addEventListener('click', (e) => {
      const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'encrypt') void this.encrypt();
      if (act === 'decrypt') void this.decrypt(false);
      if (act === 'wrong') void this.decrypt(true);
    });
    void this.hashes();
  }

  private async hashes(): Promise<void> {
    const [a, b] = await Promise.all([sha256Hex(this.text), sha256Hex(this.changed)]);
    this.$('.cv-h1').textContent = a;
    this.$('.cv-h2').innerHTML = [...b].map((ch, i) => (ch === a[i] ? ch : `<mark>${ch}</mark>`)).join('');
    const diff = [...b].filter((ch, i) => ch !== a[i]).length;
    this.$('.cv-diff').textContent = `${diff} of 64 characters changed, from a one-character edit.`;
  }

  private async encrypt(): Promise<void> {
    if (!hasSubtle()) return;
    this.key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    this.wrongKey = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    crypto.getRandomValues(this.iv);
    const raw = new Uint8Array(await crypto.subtle.exportKey('raw', this.key));
    this.cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: this.iv }, this.key, new TextEncoder().encode(this.text)));
    this.$('.cv-key').textContent = `${toHex(raw).slice(0, 32)}… (secret: keep it apart from the data)`;
    this.$('.cv-cipher').textContent = btoa(String.fromCharCode(...this.cipher));
    this.$('.cv-out').textContent = '—';
  }

  private async decrypt(wrong: boolean): Promise<void> {
    if (!hasSubtle()) return;
    if (!this.cipher || !this.key || !this.wrongKey) await this.encrypt();
    const out = this.$('.cv-out');
    try {
      const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: this.iv }, wrong ? this.wrongKey! : this.key!, this.cipher!);
      out.innerHTML = `<span class="pdac-verdict is-ok">✓ Readable</span> ${esc(new TextDecoder().decode(plain))}`;
    } catch {
      out.innerHTML = '<span class="pdac-verdict is-no">✗ Cannot be read</span> Wrong key: the data stays scrambled.';
    }
  }

  showAnswer(): void {
    void this.decrypt(false);
  }

  reset(): void {
    this.key = this.wrongKey = null;
    this.cipher = null;
    this.$('.cv-key').textContent = 'Press Encrypt to make a key';
    this.$('.cv-cipher').textContent = '—';
    this.$('.cv-out').textContent = '—';
  }
}

function markDiff(a: string, b: string): string {
  return [...b].map((ch, i) => (ch === a[i] ? esc(ch) : `<mark>${esc(ch)}</mark>`)).join('');
}
