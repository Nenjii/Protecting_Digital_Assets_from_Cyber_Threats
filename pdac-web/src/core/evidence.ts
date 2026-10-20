import QRCode from 'qrcode';
import { esc } from '../components/base';
import { getData, hasData } from './data';
import { icon } from './icons';

// Proof for the numbers: src/data/sources.json holds each source (publisher,
// date, link) and the exact quote behind each number. Tiles reference a proof
// with data-proof; the E key lists every proof on the slide with a QR code, so
// the room can open the page on their phones.

export interface Source { id: string; publisher: string; author?: string; title: string; date: string; url: string; checked: string }
export interface Proof { id: string; source: string; quote: string; short?: string; who?: string }
interface SourcesFile { sources: Source[]; proofs: Proof[] }

const file = (): SourcesFile => (hasData('sources.json') ? getData<SourcesFile>('sources.json') : { sources: [], proofs: [] });

export function proof(id: string): { proof: Proof; source: Source } {
  const f = file();
  const p = f.proofs.find((x) => x.id === id);
  if (!p) throw new Error(`No proof "${id}" in src/data/sources.json`);
  const s = f.sources.find((x) => x.id === p.source);
  if (!s) throw new Error(`Proof "${id}" names an unknown source "${p.source}"`);
  return { proof: p, source: s };
}

export function sourceById(id: string): Source | undefined {
  return file().sources.find((s) => s.id === id);
}

export const shortUrl = (url: string): string => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

const qrCache = new Map<string, Promise<string>>();

/** QR code for a link, drawn locally (nothing is sent anywhere). */
export function qrSvg(url: string): Promise<string> {
  if (!qrCache.has(url)) {
    qrCache.set(url, QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#14213D', light: '#FFFFFF' } }));
  }
  return qrCache.get(url)!;
}

/** Fill every [data-qr] placeholder under root with its QR code. */
export function hydrateQr(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>('[data-qr]:not([data-qr-done])').forEach((el) => {
    el.dataset.qrDone = '1';
    qrSvg(el.dataset.qr!).then((svg) => {
      el.innerHTML = svg;
      el.querySelector('svg')?.setAttribute('aria-hidden', 'true');
    }).catch((err: unknown) => console.error(err));
  });
}

/** A quote with the source line under it. `full` shows the whole quote instead of the short one. */
export function proofHtml(id: string, full = false): string {
  const { proof: p, source: s } = proof(id);
  const text = full || !p.short ? p.quote : p.short;
  const lead = !full && p.short && !p.quote.startsWith(p.short) ? '…' : '';
  const tail = !full && p.short && !p.quote.endsWith(p.short) ? '…' : '';
  return `<blockquote class="ev-quote">“${lead}${esc(text.replace(/^“|”$/g, ''))}${tail}”${p.who ? `<span class="ev-who">${esc(p.who)}</span>` : ''}</blockquote>
    <p class="ev-src">${esc(s.publisher)} · ${esc(s.date)}</p>`;
}

/** Everything the E panel shows for one slide: proofs grouped by source, each source with a QR code. */
export function evidenceFor(slide: HTMLElement): string {
  const ids = [
    ...[...slide.querySelectorAll<HTMLElement>('[data-proof]')].flatMap((el) => el.dataset.proof!.split(',')),
    ...(slide.dataset.proofs ?? '').split(','),
  ].map((s) => s.trim()).filter(Boolean);
  const unique = [...new Set(ids)];
  if (!unique.length) {
    return `<p class="pdac-panel__empty">No quoted sources on this slide. The footer names its source.</p>`;
  }
  const bySource = new Map<string, Proof[]>();
  for (const id of unique) {
    const { proof: p } = proof(id);
    if (!bySource.has(p.source)) bySource.set(p.source, []);
    if (!bySource.get(p.source)!.some((x) => x.quote === p.quote)) bySource.get(p.source)!.push(p);
  }
  return [...bySource].map(([sid, proofs]) => {
    const s = sourceById(sid)!;
    return `<article class="ev-item">
        <p class="ev-k">${esc(s.publisher)}${s.author ? ` · ${esc(s.author)}` : ''} · ${esc(s.date)}</p>
        <h3 class="ev-title">${esc(s.title)}</h3>
        ${proofs.map((p) => `<blockquote class="ev-quote">“${esc(p.quote.replace(/^“|”$/g, ''))}”${p.who ? `<span class="ev-who">${esc(p.who)}</span>` : ''}</blockquote>`).join('')}
        <div class="ev-link">
          <span class="ev-qr" data-qr="${esc(s.url)}" role="img" aria-label="QR code for ${esc(shortUrl(s.url))}"></span>
          <span class="ev-url">${icon('external-link')} <a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(shortUrl(s.url))}</a><span class="ev-checked">Quote checked ${esc(s.checked)}</span></span>
        </div>
      </article>`;
  }).join('');
}
