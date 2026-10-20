import { esc } from '../components/base';
import { icon } from '../core/icons';
import { linear, type Timeline } from './anim';

// An office network drawn in SVG: zones (internet, office, home), devices,
// cables, and packets that travel along the cables. The simulations drive it
// with set() (a device's state and a short label) and send() (animate a packet).

export type NodeState = 'idle' | 'focus' | 'ok' | 'warn' | 'bad' | 'off';
export type LinkState = 'idle' | 'hot' | 'bad' | 'ok' | 'off';
export type PacketKind = 'data' | 'attack' | 'secure' | 'leak';

export interface MapNode { id: string; label: string; sub?: string; icon: string; x: number; y: number; role?: 'attacker' | 'person' | 'device' | 'server' | 'cloud' | 'net' }
export interface MapLink { from: string; to: string; via?: [number, number][] }
export interface MapZone { id: string; label: string; x: number; y: number; w: number; h: number; tone?: 'internet' | 'office' | 'home' | 'vendor' }
export interface MapSpec { size: [number, number]; zones?: MapZone[]; nodes: MapNode[]; links: MapLink[] }
export interface PacketOpts { kind?: PacketKind; label?: string; blockAt?: string; ms?: number }

type Pt = [number, number];
const NS = 'http://www.w3.org/2000/svg';
const HALF = 46; // half the size of a device tile

/** A lucide icon as a nested <svg>, for use inside another SVG. */
export function svgIcon(name: string, x: number, y: number, size: number, cls = ''): string {
  const inner = icon(name).replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return `<svg class="${cls}" x="${x}" y="${y}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

/** A rounded label centred on (0, 0). Width is estimated: hidden slides cannot measure text. */
export function svgPill(text: string, tone: string, px = 24): string {
  const w = Math.round(text.length * px * 0.55 + 30);
  const h = Math.round(px * 1.75);
  return `<g class="nm-pill tone-${tone}"><rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${h / 2}"/><text y="${Math.round(px * 0.36)}" text-anchor="middle" font-size="${px}">${esc(text)}</text></g>`;
}

const linkKey = (a: string, b: string) => [a, b].sort().join('~');
const dist = (a: Pt, b: Pt) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const lengthOf = (pts: Pt[]) => pts.slice(1).reduce((sum, p, i) => sum + dist(pts[i], p), 0);

function along(pts: Pt[], d: number): Pt {
  for (let i = 1; i < pts.length; i++) {
    const seg = dist(pts[i - 1], pts[i]);
    if (d <= seg || i === pts.length - 1) {
      const t = seg ? Math.min(1, d / seg) : 1;
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * t, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * t];
    }
    d -= seg;
  }
  return pts[pts.length - 1];
}

/** Stop `by` pixels short of the last point (a blocked packet halts at the device's edge). */
function shorten(pts: Pt[], by: number): Pt[] {
  const total = lengthOf(pts);
  return [...pts.slice(0, -1), along(pts, Math.max(0, total - by))];
}

export class NetMap {
  readonly root: SVGSVGElement;
  private byId = new Map<string, MapNode>();
  private packets: SVGGElement;

  constructor(private spec: MapSpec, label: string) {
    spec.nodes.forEach((n) => this.byId.set(n.id, n));
    for (const l of spec.links) {
      if (!this.byId.has(l.from) || !this.byId.has(l.to)) throw new Error(`Map link ${l.from} → ${l.to} names an unknown device`);
    }
    const [w, h] = spec.size;
    const tpl = document.createElement('template');
    tpl.innerHTML = `<svg class="nm" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">${this.markup()}</svg>`;
    this.root = tpl.content.firstElementChild as SVGSVGElement;
    this.packets = this.root.querySelector<SVGGElement>('.nm-packets')!;
  }

  has(id: string): boolean {
    return this.byId.has(id);
  }

  private center(id: string): Pt {
    const n = this.byId.get(id);
    if (!n) throw new Error(`Unknown map device "${id}"`);
    return [n.x, n.y];
  }

  private linkPoints(l: MapLink): Pt[] {
    return [this.center(l.from), ...(l.via ?? []), this.center(l.to)];
  }

  private markup(): string {
    const zones = (this.spec.zones ?? []).map((z) => `
      <g class="nm-zone tone-${z.tone ?? 'office'}">
        <rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" rx="26"/>
        <text x="${z.x + 24}" y="${z.y + 40}" class="nm-zone__label">${esc(z.label)}</text>
      </g>`).join('');
    const links = this.spec.links.map((l) =>
      `<polyline class="nm-link" data-link="${linkKey(l.from, l.to)}" points="${this.linkPoints(l).map((p) => p.join(',')).join(' ')}"/>`).join('');
    const nodes = this.spec.nodes.map((n) => `
      <g class="nm-node role-${n.role ?? 'device'} is-idle" data-node="${n.id}" transform="translate(${n.x} ${n.y})">
        <rect class="nm-node__tile" x="${-HALF}" y="${-HALF}" width="${HALF * 2}" height="${HALF * 2}" rx="22"/>
        ${svgIcon(n.icon, -27, -27, 54, 'nm-node__icon')}
        <text class="nm-node__label" y="${HALF + 32}" text-anchor="middle">${esc(n.label)}</text>
        ${n.sub ? `<text class="nm-node__sub" y="${HALF + 60}" text-anchor="middle">${esc(n.sub)}</text>` : ''}
        <g class="nm-node__note" transform="translate(0 ${HALF + 66})"></g>
      </g>`).join('');
    return `<g class="nm-zones">${zones}</g><g class="nm-links">${links}</g><g class="nm-packets"></g><g class="nm-nodes">${nodes}</g>`;
  }

  private nodeEl(id: string): SVGGElement {
    const g = this.root.querySelector<SVGGElement>(`[data-node="${id}"]`);
    if (!g) throw new Error(`Unknown map device "${id}"`);
    return g;
  }

  /** A device's look (ok, bad, …) and an optional short label, shown under its name in place of the subtitle. */
  set(id: string, state: NodeState, note = ''): void {
    const g = this.nodeEl(id);
    g.setAttribute('class', `nm-node role-${this.byId.get(id)!.role ?? 'device'} is-${state}${note ? ' has-note' : ''}`);
    g.querySelector('.nm-node__note')!.innerHTML = note ? svgPill(note, state) : '';
  }

  link(a: string, b: string, state: LinkState): void {
    const el = this.root.querySelector(`[data-link="${linkKey(a, b)}"]`);
    if (!el) throw new Error(`No cable between "${a}" and "${b}" on the map`);
    el.setAttribute('class', `nm-link is-${state}`);
  }

  reset(): void {
    this.spec.nodes.forEach((n) => this.set(n.id, 'idle'));
    this.root.querySelectorAll('.nm-link').forEach((l) => l.setAttribute('class', 'nm-link'));
    this.packets.innerHTML = '';
  }

  /** The points a packet follows through the listed devices, along their cables. */
  private routePoints(route: string[]): Pt[] {
    const pts: Pt[] = [this.center(route[0])];
    for (let i = 1; i < route.length; i++) {
      const [a, b] = [route[i - 1], route[i]];
      const l = this.spec.links.find((x) => (x.from === a && x.to === b) || (x.from === b && x.to === a));
      let seg: Pt[] = l ? this.linkPoints(l) : [this.center(a), this.center(b)];
      if (l && l.from !== a) seg = [...seg].reverse();
      pts.push(...seg.slice(1));
    }
    return pts;
  }

  /** Animate one packet along a route. With blockAt, it stops at that device and shows a cross. */
  async send(tl: Timeline, route: string[], opts: PacketOpts = {}): Promise<void> {
    const kind = opts.kind ?? 'data';
    const cut = opts.blockAt ? route.indexOf(opts.blockAt) : -1;
    const pts = cut > 0 ? shorten(this.routePoints(route.slice(0, cut + 1)), HALF + 24) : this.routePoints(route);
    const total = lengthOf(pts);
    const g = document.createElementNS(NS, 'g');
    g.setAttribute('class', `nm-packet kind-${kind}`);
    g.innerHTML = `<circle class="nm-packet__dot" r="17"/>${kind === 'secure' ? svgIcon('lock', -10, -10, 20, 'nm-packet__lock') : ''}
      ${opts.label ? `<g transform="translate(0 -40)">${svgPill(opts.label, `packet-${kind}`, 24)}</g>` : ''}`;
    const [sx, sy] = pts[0];
    g.setAttribute('transform', `translate(${sx} ${sy})`);
    this.packets.append(g);
    try {
      await tl.tween(opts.ms ?? Math.max(800, (total / 520) * 1000), (p) => {
        const [x, y] = along(pts, p * total);
        g.setAttribute('transform', `translate(${x} ${y})`);
      }, linear);
      if (cut > 0) {
        g.insertAdjacentHTML('beforeend', '<g class="nm-block"><circle r="30"/><path d="M-13 -13 13 13M13 -13-13 13"/></g>');
        await tl.wait(650);
      }
    } finally {
      g.remove();
    }
  }
}
