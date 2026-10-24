// Small DOM and rendering helpers shared by the two consoles. Reuses the deck's
// esc(), NetMap and icon set so the game looks like the rest of the course and
// stays offline. No answer data is imported here.
import QRCode from 'qrcode';
import { esc } from '../../src/core/esc.ts';
import { icon } from '../../src/core/icons.ts';
import { NetMap, type MapSpec } from '../../src/sim/netmap.ts';
import { Timeline } from '../../src/sim/anim.ts';
import type { Anim, Band } from '../wire.ts';

export { esc };

export function elFromHtml(html: string): HTMLElement {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
}

export function setHtml(target: HTMLElement | null, html: string): void {
  if (target) target.innerHTML = html;
}

/** A lucide icon inline (reused from the deck). */
export function ic(name: string): string {
  try { return icon(name); } catch { return ''; }
}

export const BAND_CLASS: Record<Band, string> = {
  info: 'b-info', warn: 'b-warn', alert: 'b-alert', ok: 'b-ok', bad: 'b-bad',
};

/** Build the network map once; returns helpers to update node states and to
 *  animate packets travelling across it (reuses the deck's NetMap + Timeline). */
export function buildMap(spec: MapSpec, label: string): {
  root: SVGSVGElement;
  apply: (states: Record<string, string>) => void;
  send: (anim: Anim) => void;
  resetAnims: () => void;
} {
  const map = new NetMap(spec, label);
  const ids = spec.nodes.map((n) => n.id);
  let tl = new Timeline();
  const apply = (states: Record<string, string>) => {
    for (const id of ids) {
      if (!map.has(id)) continue;
      const st = (states[id] ?? 'idle') as 'idle' | 'focus' | 'ok' | 'warn' | 'bad' | 'off';
      map.set(id, st);
    }
  };
  const send = (anim: Anim) => {
    const route = anim.route.filter((n) => map.has(n));
    if (route.length < 2) return;
    const blockAt = anim.blockAt && map.has(anim.blockAt) ? anim.blockAt : undefined;
    map.send(tl, route, { kind: anim.kind, blockAt }).catch(() => { /* cancelled on focus change */ });
  };
  const resetAnims = () => { tl.cancel(); tl = new Timeline(); };
  return { root: map.root, apply, send, resetAnims };
}

/** A self-contained SVG QR code (same qrcode API the deck uses). */
export async function qrSvg(text: string): Promise<string> {
  try {
    return await QRCode.toString(text, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  } catch {
    return '';
  }
}

/** Format seconds as m:ss. */
export function mmss(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function toast(msg: string): void {
  let host = document.getElementById('toast');
  if (!host) {
    host = document.createElement('div');
    host.id = 'toast';
    document.body.append(host);
  }
  const n = document.createElement('div');
  n.className = 'toast-item';
  n.textContent = msg;
  host.append(n);
  setTimeout(() => n.classList.add('go'), 2600);
  setTimeout(() => n.remove(), 3200);
}
