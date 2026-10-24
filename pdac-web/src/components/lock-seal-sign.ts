import { hasSubtle, sha256Hex } from '../core/hash';
import { icon } from '../core/icons';
import { PdacBase, esc, md } from './base';

type Act =
  | 'lock-encrypt' | 'lock-thief' | 'lock-owner'
  | 'seal-approve' | 'seal-tamper' | 'seal-password'
  | 'sign-sign' | 'sign-verify' | 'sign-changed' | 'sign-impostor';
type Part = 'lock' | 'seal' | 'sign';

interface Tool { title: string; picture: string; protects: string; example: string }
interface Scene { act: Act; title: string; text: string }
interface LssData {
  lock: Tool & { record: string };
  seal: Tool & { file: string; changed: string; password: string };
  sign: Tool & { file: string; changed: string; impostorFile: string };
  scenes: Scene[];
  closing?: string;
}

/** Everything the three cards show; rebuilt from scratch for each scene, so Back and A are exact. */
interface State {
  key?: CryptoKey; wrong?: CryptoKey; iv?: Uint8Array<ArrayBuffer>; cipher?: Uint8Array<ArrayBuffer>;
  lockOut?: { ok: boolean; text: string; who: string };
  h1?: string; h2?: string; pw?: string;
  pair?: CryptoKeyPair; sig?: Uint8Array<ArrayBuffer>;
  verify?: { ok: boolean; file: string; label: string };
  simulated?: boolean;
}

const PART_OF = (act: Act): Part => act.split('-')[0] as Part;
const enc = new TextEncoder();
const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const groups = (hex: string, n = 16) => hex.slice(0, n).replace(/(.{4})/g, '$1 ').trim();

/**
 * <pdac-lock-seal-sign data-src="m3-lock-seal-sign.json"> Lesson 3.2's three
 * tools, live in this browser with Web Crypto. Lock: AES-GCM on a backup record;
 * the custodian's key opens it, a thief's wrong key cannot. Seal: a SHA-256
 * fingerprint of the payout file; one changed digit gives a new fingerprint;
 * the portal keeps a password's hash, never the password. Sign: ECDSA P-256;
 * the e-wallet provider checks the RSSO's signature with its public key; a
 * changed file or an impostor's key fails. The clicker plays the scenes in
 * order; A shows the last one; R resets. Nothing leaves this computer.
 */
export class PdacLockSealSign extends PdacBase {
  private data!: LssData;
  private scene = -1;
  private state: State = {};
  private token = 0;

  protected setup(): void {
    this.data = this.json<LssData>();
    const parts: Part[] = ['lock', 'seal', 'sign'];
    const icons: Record<Part, string> = { lock: 'lock', seal: 'fingerprint', sign: 'signature' };
    this.innerHTML = `
      <div class="lss-cols">${parts.map((p) => `
        <div class="lss-col" data-part="${p}" role="group" aria-label="${esc(this.data[p].title)}">
          <header class="lss-head">
            <span class="lss-icon">${icon(icons[p])}</span>
            <div><h3>${esc(this.data[p].title)}</h3><p class="lss-pic">${esc(this.data[p].picture)}</p></div>
          </header>
          <p class="lss-protects"><span>Protects</span> ${esc(this.data[p].protects)}</p>
          <div class="lss-body" aria-live="polite"></div>
        </div>`).join('')}
      </div>
      <div class="lss-caption" aria-live="polite"></div>
      <div class="pdac-bar">
        <div class="pdac-bar__left">
          <button type="button" class="pdac-btn pdac-btn--quiet" data-act="prev">${icon('chevron-left')} Back</button>
          <button type="button" class="pdac-btn pdac-btn--primary" data-act="next">Next ${icon('chevron-right')}</button>
          <button type="button" class="pdac-btn" data-act="answer">${icon('eye')} All three <span class="pdac-key">A</span></button>
        </div>
        <p class="pdac-bar__status lss-status"></p>
      </div>
      ${hasSubtle() ? '' : '<p class="cv-warn">Live cryptography needs the deck opened as localhost or over HTTPS. Here the results are shown as they would come out.</p>'}`;
    this.addEventListener('click', (e) => {
      const act = (e.target as HTMLElement).closest<HTMLElement>('[data-act]')?.dataset.act;
      if (act === 'next') this.step(1);
      if (act === 'prev') this.step(-1);
      if (act === 'answer') this.showAnswer();
    });
    this.render();
  }

  step(dir: 1 | -1): boolean {
    const last = this.data.scenes.length - 1;
    if (dir === 1) {
      if (this.scene >= last) return false;
      void this.goTo(this.scene + 1);
      return true;
    }
    if (this.scene < 0) return false;
    if (this.scene === 0) { this.reset(); return true; }
    void this.goTo(this.scene - 1);
    return true;
  }

  /** Replays every scene up to i on a fresh state (each takes milliseconds), then shows it. */
  private async goTo(i: number): Promise<void> {
    const token = ++this.token;
    const st: State = { simulated: !hasSubtle() };
    try {
      for (let k = 0; k <= i; k++) {
        await this.act(this.data.scenes[k].act, st);
        if (token !== this.token) return;
      }
    } catch (err) {
      console.error(err);
      st.simulated = true;
    }
    this.state = st;
    this.scene = i;
    this.render();
  }

  private async act(act: Act, st: State): Promise<void> {
    const d = this.data;
    const live = !st.simulated;
    switch (act) {
      case 'lock-encrypt': {
        if (live) {
          st.key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
          st.wrong = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
          st.iv = crypto.getRandomValues(new Uint8Array(12));
          st.cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: st.iv }, st.key, enc.encode(d.lock.record)));
        } else {
          st.cipher = crypto.getRandomValues(new Uint8Array(enc.encode(d.lock.record).length + 16));
        }
        st.lockOut = undefined;
        break;
      }
      case 'lock-thief':
      case 'lock-owner': {
        const thief = act === 'lock-thief';
        let ok = !thief;
        let text = thief ? '' : d.lock.record;
        if (live && st.key && st.wrong && st.iv && st.cipher) {
          try {
            const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: st.iv }, thief ? st.wrong : st.key, st.cipher);
            ok = true;
            text = new TextDecoder().decode(plain);
          } catch {
            ok = false;
            text = '';
          }
        }
        st.lockOut = { ok, text, who: thief ? 'A thief with the drive, but not the key' : 'Ana, the key custodian, with the right key' };
        break;
      }
      case 'seal-approve': st.h1 = await sha256Hex(d.seal.file); st.h2 = undefined; break;
      case 'seal-tamper': st.h2 = await sha256Hex(d.seal.changed); break;
      case 'seal-password': st.pw = await sha256Hex(d.seal.password); break;
      case 'sign-sign': {
        if (live) {
          st.pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
          st.sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, st.pair.privateKey, enc.encode(d.sign.file)));
        } else {
          st.sig = crypto.getRandomValues(new Uint8Array(64));
        }
        st.verify = undefined;
        break;
      }
      case 'sign-verify':
      case 'sign-changed':
      case 'sign-impostor': {
        const label = { 'sign-verify': 'The file as the RSSO signed it', 'sign-changed': 'The same file, one amount changed on the way', 'sign-impostor': "A file signed with someone else's key" }[act];
        const file = act === 'sign-verify' ? d.sign.file : act === 'sign-changed' ? d.sign.changed : d.sign.impostorFile;
        let ok = act === 'sign-verify';
        if (live && st.pair && st.sig) {
          let sig = st.sig;
          if (act === 'sign-impostor') {
            const other = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
            sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, other.privateKey, enc.encode(file)));
          }
          ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, st.pair.publicKey, sig, enc.encode(file));
        }
        st.verify = { ok, file, label };
        break;
      }
    }
  }

  private render(): void {
    const st = this.state;
    const d = this.data;
    const current = this.scene >= 0 ? this.data.scenes[this.scene] : null;
    const active = current ? PART_OF(current.act) : null;
    const row = (k: string, v: string, cls = '') => `<p class="lss-row ${cls}"><span class="lss-k">${k}</span><span class="lss-v">${v}</span></p>`;
    const ok = (yes: boolean, okText: string, noText: string) =>
      `<p class="lss-verdict ${yes ? 'is-ok' : 'is-no'}">${yes ? '✓' : '✗'} ${esc(yes ? okText : noText)}</p>`;

    // Lock
    const lock: string[] = [row('Backup record', esc(d.lock.record))];
    if (st.cipher) lock.push(row('On the drive', `<span class="lss-mono">${esc(b64(st.cipher).slice(0, 72))}…</span>`, 'is-cipher'));
    if (st.lockOut) {
      lock.push(row('Opened by', esc(st.lockOut.who)));
      lock.push(st.lockOut.ok ? ok(true, 'Readable: the record comes back exactly', '') : ok(false, '', 'Cannot be read: the data stays scrambled'));
    }
    if (!st.cipher) lock.push(`<p class="lss-wait">${esc(d.lock.example)}</p>`);

    // Seal
    const seal: string[] = [row('Payout file', `<span class="lss-doc">${esc(d.seal.file)}</span>`)];
    if (st.h1) seal.push(row('Fingerprint', `<span class="lss-mono">${groups(st.h1)} …</span>`));
    if (st.h2 && st.h1) {
      seal.push(row('Changed', `<span class="lss-doc">${markDiff(d.seal.file, d.seal.changed)}</span>`));
      const diffHex = [...st.h2.slice(0, 16)].map((c, i) => (c === st.h1![i] ? c : `<mark>${c}</mark>`)).join('').replace(/((?:<mark>.<\/mark>|.){4})/g, '$1 ').trim();
      seal.push(row('Fingerprint', `<span class="lss-mono">${diffHex} …</span>`));
      seal.push(ok(false, '', 'Does not match the approved fingerprint: the change shows'));
    }
    if (st.pw) seal.push(row('Password store', `<span class="lss-mono">${groups(st.pw)} …</span> <span class="lss-note">a hash, never the password</span>`, 'is-pw'));
    if (!st.h1) seal.push(`<p class="lss-wait">${esc(d.seal.example)}</p>`);

    // Sign
    const sign: string[] = [row('Payout file', `<span class="lss-doc">${esc(d.sign.file)}</span>`)];
    if (st.sig) sign.push(row('RSSO signature', `<span class="lss-mono">${esc(b64(st.sig).slice(0, 40))}…</span> <span class="lss-note">made with the RSSO's private key</span>`));
    if (st.verify) {
      sign.push(row('Checked', `${esc(st.verify.label)}, with the RSSO's public key`));
      sign.push(ok(st.verify.ok, 'From the RSSO, and not changed', st.verify.label.startsWith('A file signed') ? 'Not signed by the RSSO: reject it' : 'Changed after signing: reject it'));
    }
    if (!st.sig) sign.push(`<p class="lss-wait">${esc(d.sign.example)}</p>`);

    const bodies: Record<Part, string[]> = { lock, seal, sign };
    for (const part of ['lock', 'seal', 'sign'] as Part[]) {
      const col = this.$(`.lss-col[data-part="${part}"]`);
      col.classList.toggle('is-active', active === part);
      col.querySelector('.lss-body')!.innerHTML = bodies[part].join('');
    }

    const last = this.scene === this.data.scenes.length - 1;
    this.$('.lss-caption').innerHTML = current
      ? `<p class="ns-k">Scene ${this.scene + 1} of ${this.data.scenes.length}</p><h3 class="ns-title">${md(current.title)}</h3><p class="ns-text">${md(current.text)}</p>`
      : '<p class="ns-k">Three tools, three jobs</p><h3 class="ns-title">Lock, seal, sign</h3><p class="ns-text">Press → to lock a backup record, seal a payout file and sign it, then watch what each one catches.</p>';
    (this.querySelector('[data-act="prev"]') as HTMLButtonElement).disabled = this.scene < 0;
    (this.querySelector('[data-act="next"]') as HTMLButtonElement).disabled = last;
    this.$('.lss-status').textContent = st.simulated && this.scene >= 0 ? 'Shown as the results would come out (no secure context)' : 'Computed live in this browser · nothing is sent';
  }

  showAnswer(): void {
    void this.goTo(this.data.scenes.length - 1);
  }

  reset(): void {
    this.token++;
    this.scene = -1;
    this.state = {};
    this.render();
  }
}

function markDiff(a: string, b: string): string {
  return [...b].map((ch, i) => (ch === a[i] ? esc(ch) : `<mark>${esc(ch)}</mark>`)).join('').replace(/\n/g, '<br>');
}
