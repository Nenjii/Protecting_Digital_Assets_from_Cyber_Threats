import { getData, hasData } from '../core/data';
import { slideText } from '../core/decorate';
import { SidePanel } from '../core/overlays';
import { esc, md } from './base';

export interface GlossaryEntry { id: string; term: string; plain: string; match?: string[]; it?: string }

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * <pdac-glossary-panel> (key G): plain meanings of the terms on the current
 * slide, from src/data/glossary.json (the learner guide's terms). Terms are
 * found automatically in the slide text; data-terms="id,id" adds more.
 */
export class PdacGlossaryPanel extends HTMLElement {
  private panel!: SidePanel;
  private entries: GlossaryEntry[] = [];
  private patterns: { entry: GlossaryEntry; re: RegExp }[] = [];

  connectedCallback(): void {
    if (this.panel) return;
    this.classList.add('pdac-ui');
    this.entries = hasData('glossary.json') ? getData<GlossaryEntry[]>('glossary.json') : [];
    this.patterns = this.entries.map((entry) => {
      const words = [entry.term, ...(entry.match ?? [])].map(escapeRe).join('|');
      return { entry, re: new RegExp(`(^|[^\\p{L}\\p{N}])(${words})(?=$|[^\\p{L}\\p{N}])`, 'iu') };
    });
    this.panel = new SidePanel('pdac-glossary', 'Glossary: this slide', (slide) => this.render(slide));
    this.panel.keyHint = 'G';
  }

  termsFor(slide: HTMLElement): GlossaryEntry[] {
    const explicit = (slide.dataset.terms ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    const text = slideText(slide);
    const found = this.patterns.filter((p) => p.re.test(text)).map((p) => p.entry);
    const extra = this.entries.filter((e) => explicit.includes(e.id));
    return [...new Map([...extra, ...found].map((e) => [e.id, e])).values()];
  }

  private render(slide: HTMLElement): string {
    if (!this.entries.length) return '<p class="pdac-panel__empty">The glossary file (src/data/glossary.json) is empty.</p>';
    const terms = this.termsFor(slide);
    if (!terms.length) return `<p class="pdac-panel__empty">No glossary terms on this slide.</p>`;
    return `<dl class="gl-list">${terms.map((t) => `
      <div class="gl-item"><dt>${esc(t.term)}</dt><dd>${md(t.plain)}</dd></div>`).join('')}</dl>`;
  }

  get isOpen(): boolean { return this.panel.isOpen; }
  toggle(slide: HTMLElement): void { this.panel.toggle(slide); }
  update(slide: HTMLElement): void { this.panel.update(slide); }
  close(): void { this.panel.close(); }
}
