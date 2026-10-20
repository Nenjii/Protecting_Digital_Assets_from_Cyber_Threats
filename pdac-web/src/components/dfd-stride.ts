import { icon } from '../core/icons';
import { PdacBase, esc, md } from './base';

type NodeType = 'external' | 'process' | 'store';
interface DfdNode { id: string; type: NodeType; label: string; x: number; y: number; w?: number; h?: number; r?: number; note?: string }
interface DfdFlow {
  id: string; from: string; to: string;
  /** Text drawn on the arrow; leave out for an unlabelled arrow. */
  label?: string;
  /** Name in the side panel and for screen readers; defaults to label. */
  name?: string;
  offset?: number; lx?: number; ly?: number; note?: string;
  /** Corner points for an arrow that bends, e.g. a reply path along the bottom. */
  via?: [number, number][];
  /** Arrowheads at both ends. */
  both?: boolean;
}
interface Boundary { id: string; label: string; points: [number, number][]; lx: number; ly: number; anchor?: 'start' | 'middle' | 'end' }
interface Letter { letter: string; name: string; plain: string; breaks: string }
interface Threat { id: string; element: string; letter: string; threat: string; control: string; worked?: boolean }
interface DfdData {
  title: string;
  size: [number, number];
  nodes: DfdNode[];
  flows: DfdFlow[];
  boundaries: Boundary[];
  letters: Letter[];
  applies: Record<'external' | 'process' | 'store' | 'flow', string[]>;
  threats: Threat[];
}

/**
 * <pdac-dfd-stride data-src="m2-booking-dfd.json"> — the worked data flow map.
 * Click any shape or arrow to see which STRIDE threats apply there; A highlights
 * every element with a worked threat. data-view="threats" shows the worked
 * threats as a table, one row per clicker step.
 */
export class PdacDfdStride extends PdacBase {
  private data!: DfdData;
  private selected: string | null = null;
  private showAll = false;
  private rows = 0;

  protected setup(): void {
    this.data = this.json<DfdData>();
    if (this.dataset.view === 'threats') return this.setupTable();
    const [w, h] = this.data.size;
    this.innerHTML = `
      <div class="dfd-wrap">
        <svg class="dfd-svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(this.data.title)}">${this.svg()}</svg>
        <aside class="dfd-panel" aria-live="polite"></aside>
      </div>
      <div class="dfd-legend">${this.legend()}</div>`;
    this.addEventListener('click', (e) => {
      const hit = (e.target as Element).closest<SVGElement>('[data-el]');
      if (hit) {
        this.selected = this.selected === hit.dataset.el ? null : hit.dataset.el!;
        this.showAll = false;
        this.paint();
      }
    });
    this.addEventListener('keydown', (e) => {
      const hit = (e.target as Element).closest<SVGElement>('[data-el]');
      if (hit && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        e.stopPropagation();
        hit.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });
    this.paint();
  }

  private node(id: string): DfdNode {
    const n = this.data.nodes.find((x) => x.id === id);
    if (!n) throw new Error(`Flow refers to unknown node ${id}`);
    return n;
  }

  private center(n: DfdNode): [number, number] {
    if (n.type === 'process') return [n.x, n.y];
    return [n.x + (n.w ?? 220) / 2, n.y + (n.h ?? 100) / 2];
  }

  /** Point where the line from n's center towards (tx, ty) leaves n's shape. */
  private edge(n: DfdNode, tx: number, ty: number): [number, number] {
    const [cx, cy] = this.center(n);
    const dx = tx - cx, dy = ty - cy;
    const len = Math.hypot(dx, dy) || 1;
    if (n.type === 'process') {
      const r = (n.r ?? 100) + 6;
      return [cx + (dx / len) * r, cy + (dy / len) * r];
    }
    const hw = (n.w ?? 220) / 2 + 6, hh = (n.h ?? 100) / 2 + 6;
    const t = Math.min(hw / Math.abs(dx || 1e-9), hh / Math.abs(dy || 1e-9));
    return [cx + dx * t, cy + dy * t];
  }

  private svg(): string {
    const d = this.data;
    const defs = `<defs><marker id="dfd-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" fill="currentColor"/></marker></defs>`;
    const bounds = d.boundaries.map((b) => `
      <g class="dfd-boundary">
        <polyline points="${b.points.map((p) => p.join(',')).join(' ')}" />
        <text x="${b.lx}" y="${b.ly}" text-anchor="${b.anchor ?? 'start'}" class="dfd-boundary__label">${esc(b.label)}</text>
      </g>`).join('');
    const flows = d.flows.map((f) => {
      const pts = this.flowPoints(f);
      const [x1, y1] = pts[0], [x2, y2] = pts[pts.length - 1];
      const lx = f.lx ?? (x1 + x2) / 2, ly = f.ly ?? (y1 + y2) / 2 - 14;
      const line = pts.map((p) => p.join(',')).join(' ');
      return `<g class="dfd-el dfd-flow" data-el="${f.id}" tabindex="0" role="button" aria-label="Data flow: ${esc(flowName(f))}">
          <polyline points="${line}" class="dfd-flow__hit"/>
          <polyline points="${line}" marker-end="url(#dfd-arrow)" ${f.both ? 'marker-start="url(#dfd-arrow)"' : ''} class="dfd-flow__line"/>
          ${f.label ? `<text x="${lx}" y="${ly}" text-anchor="middle" class="dfd-flow__label">${esc(f.label)}</text>` : ''}
        </g>`;
    }).join('');
    const nodes = d.nodes.map((n) => {
      const label = wrap(n.label, n.type === 'process' ? 14 : 18);
      const [cx, cy] = this.center(n);
      const text = `<text x="${cx}" y="${cy - (label.length - 1) * 17}" text-anchor="middle" class="dfd-node__label">${label.map((l, i) => `<tspan x="${cx}" dy="${i ? 34 : 0}">${esc(l)}</tspan>`).join('')}</text>`;
      let shape = '';
      if (n.type === 'external') shape = `<rect x="${n.x}" y="${n.y}" width="${n.w ?? 220}" height="${n.h ?? 100}" class="dfd-node__shape"/>`;
      if (n.type === 'process') shape = `<circle cx="${n.x}" cy="${n.y}" r="${n.r ?? 100}" class="dfd-node__shape"/>`;
      if (n.type === 'store') {
        const w = n.w ?? 280, h = n.h ?? 80;
        shape = `<rect x="${n.x}" y="${n.y}" width="${w}" height="${h}" class="dfd-node__fill"/>
          <path d="M${n.x} ${n.y} H${n.x + w} M${n.x} ${n.y + h} H${n.x + w}" class="dfd-node__shape dfd-store"/>`;
      }
      return `<g class="dfd-el dfd-node is-${n.type}" data-el="${n.id}" tabindex="0" role="button" aria-label="${n.type}: ${esc(n.label)}">${shape}${text}</g>`;
    }).join('');
    return defs + bounds + flows + nodes;
  }

  /** The arrow's points: straight between two shapes (shifted by offset), or bent through via. */
  private flowPoints(f: DfdFlow): [number, number][] {
    const a = this.node(f.from), b = this.node(f.to);
    if (f.via?.length) {
      const first = f.via[0], last = f.via[f.via.length - 1];
      return [this.edge(a, first[0], first[1]), ...f.via, this.edge(b, last[0], last[1])];
    }
    const [ax, ay] = this.center(a), [bx, by] = this.center(b);
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const off = f.offset ?? 0;
    const ox = (-(by - ay) / len) * off, oy = ((bx - ax) / len) * off;
    const [sx, sy] = this.edge(a, bx + ox, by + oy);
    const [ex, ey] = this.edge(b, ax + ox, ay + oy);
    return [[sx + ox, sy + oy], [ex + ox, ey + oy]];
  }

  private legend(): string {
    return `<span>${shapeIcon('external')} Person or system outside</span>
      <span>${shapeIcon('process')} Step (process)</span>
      <span>${shapeIcon('store')} Data store</span>
      <span>${shapeIcon('flow')} Data flow</span>
      <span>${shapeIcon('boundary')} Trust boundary</span>`;
  }

  private kindOf(id: string): 'external' | 'process' | 'store' | 'flow' {
    const n = this.data.nodes.find((x) => x.id === id);
    return n ? n.type : 'flow';
  }

  private labelOf(id: string): string {
    const flow = this.data.flows.find((x) => x.id === id);
    return this.data.nodes.find((x) => x.id === id)?.label ?? (flow ? flowName(flow) : id);
  }

  private paint(): void {
    const withThreats = new Set(this.data.threats.filter((t) => t.worked).map((t) => t.element));
    this.$$('.dfd-el').forEach((g) => {
      const id = g.getAttribute('data-el')!;
      g.classList.toggle('is-selected', id === this.selected);
      g.classList.toggle('is-flagged', this.showAll && withThreats.has(id));
      g.setAttribute('aria-pressed', String(id === this.selected));
    });
    const panel = this.$('.dfd-panel');
    if (this.showAll) {
      const worked = this.data.threats.filter((t) => t.worked);
      panel.innerHTML = `<p class="dfd-panel__k">Worked threats</p>
        <ol class="dfd-threats is-compact">${worked.map((t) => `<li>${this.letterTag(t.letter)} <b>${esc(this.labelOf(t.element))}:</b> ${md(t.threat)}
          <span class="dfd-control">${icon('shield-check')} ${md(t.control)}</span></li>`).join('')}</ol>`;
      return;
    }
    if (!this.selected) {
      panel.innerHTML = `<p class="dfd-panel__k">Click a shape or an arrow</p>
        <p class="dfd-panel__hint">Each kind of element attracts different STRIDE threats. Pick one to see which.</p>
        <p class="dfd-panel__hint">${icon('eye')} A shows the worked threats.</p>`;
      return;
    }
    const kind = this.kindOf(this.selected);
    const letters = this.data.applies[kind] ?? [];
    const threats = this.data.threats.filter((t) => t.element === this.selected);
    const kindName = { external: 'Outside person or system', process: 'Step (process)', store: 'Data store', flow: 'Data flow' }[kind];
    panel.innerHTML = `<p class="dfd-panel__k">${kindName}</p>
      <h3 class="dfd-panel__title">${esc(this.labelOf(this.selected))}</h3>
      ${threats.length
        // With threats to list below, the letters shrink to one STRIDE row (the ones that apply lit) so everything fits.
        ? `<p class="dfd-panel__sub">STRIDE that usually applies here:</p>
          <p class="dfd-stride-row">${this.data.letters.map((L) => `<span class="dfd-letter ${letters.includes(L.letter) ? '' : 'is-off'}" title="${esc(`${L.name}: ${L.plain}`)}">${esc(L.letter)}</span>`).join('')}</p>`
        : `<p class="dfd-panel__sub">STRIDE threats that usually apply here:</p>
          <ul class="dfd-letters">${letters.map((l) => {
            const L = this.data.letters.find((x) => x.letter === l);
            return `<li>${this.letterTag(l)} <span><b>${esc(L?.name ?? l)}</b> ${L ? `<span class="dfd-plain">${esc(L.plain)}</span>` : ''}</span></li>`;
          }).join('')}</ul>`}
      ${threats.length ? `<p class="dfd-panel__sub">On this map:</p><ul class="dfd-threats">${threats.map((t) => `<li>${this.letterTag(t.letter)} ${md(t.threat)}<span class="dfd-control">${icon('shield-check')} ${md(t.control)}</span></li>`).join('')}</ul>` : ''}`;
  }

  private letterTag(l: string): string {
    const L = this.data.letters.find((x) => x.letter === l);
    return `<span class="dfd-letter" title="${esc(L?.name ?? l)}">${esc(l)}</span>`;
  }

  // ---- table view (worked-threats slide) ----
  private setupTable(): void {
    const worked = this.data.threats.filter((t) => t.worked);
    this.innerHTML = `<table class="t dfd-table">
        <thead><tr><th>Where on the map</th><th>STRIDE</th><th>What can go wrong</th><th>What we do about it</th></tr></thead>
        <tbody>${worked.map((t) => {
          const L = this.data.letters.find((x) => x.letter === t.letter);
          return `<tr class="dfd-row"><td>${esc(this.labelOf(t.element))}</td><td>${this.letterTag(t.letter)} ${esc(L?.name ?? '')}</td><td>${md(t.threat)}</td><td>${md(t.control)}</td></tr>`;
        }).join('')}</tbody></table>`;
    this.paintRows();
  }

  private paintRows(): void {
    this.$$('.dfd-row').forEach((r, i) => r.classList.toggle('is-on', i < this.rows));
  }

  step(dir: 1 | -1): boolean {
    if (this.dataset.view !== 'threats') return false;
    const n = this.data.threats.filter((t) => t.worked).length;
    if (dir === 1 && this.rows < n) { this.rows++; this.paintRows(); return true; }
    if (dir === -1 && this.rows > 0) { this.rows--; this.paintRows(); return true; }
    return false;
  }

  showAnswer(): void {
    if (this.dataset.view === 'threats') {
      this.rows = this.data.threats.filter((t) => t.worked).length;
      return this.paintRows();
    }
    this.showAll = true;
    this.selected = null;
    this.paint();
  }

  reset(): void {
    if (this.dataset.view === 'threats') {
      this.rows = 0;
      return this.paintRows();
    }
    this.showAll = false;
    this.selected = null;
    this.paint();
  }
}

function flowName(f: DfdFlow): string {
  return f.name ?? f.label ?? f.id;
}

function wrap(text: string, max: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > max && line) {
      lines.push(line);
      line = w;
    } else line = (line + ' ' + w).trim();
  }
  if (line) lines.push(line);
  return lines;
}

function shapeIcon(kind: string): string {
  const s = 'class="dfd-key" viewBox="0 0 48 32" aria-hidden="true"';
  switch (kind) {
    case 'external': return `<svg ${s}><rect x="4" y="4" width="40" height="24" fill="none" stroke="currentColor" stroke-width="3"/></svg>`;
    case 'process': return `<svg ${s}><circle cx="24" cy="16" r="13" fill="none" stroke="currentColor" stroke-width="3"/></svg>`;
    case 'store': return `<svg ${s}><path d="M4 6h40M4 26h40" fill="none" stroke="currentColor" stroke-width="3"/></svg>`;
    case 'flow': return `<svg ${s}><path d="M4 16h34" stroke="currentColor" stroke-width="3"/><path d="M34 9l9 7-9 7z" fill="currentColor"/></svg>`;
    default: return `<svg ${s}><path d="M4 16h40" stroke="#B5561A" stroke-width="3" stroke-dasharray="7 5"/></svg>`;
  }
}
