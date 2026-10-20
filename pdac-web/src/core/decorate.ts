import { fmt12, fromMinutes, moduleByKey, toMinutes } from './modules';
import type { SlideMeta } from './types';

const DARK_LAYOUTS = ['l-cover', 'l-statement', 'l-tiles', 'l-demo'];
const ACCENT_LAYOUTS = ['l-activity'];
const BG = { dark: '#14213D', accent: '#B5561A', light: '#F7F6F2' } as const;
const CAST = /\b(RSSO|Region Q|Director Eva|Carla|Ana|Ben|Dan|Sol)\b/;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, html?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (html !== undefined) node.innerHTML = html;
  return node;
}

function theme(section: HTMLElement): keyof typeof BG {
  const t = section.dataset.theme;
  if (t === 'dark' || t === 'accent' || t === 'light') return t;
  if (DARK_LAYOUTS.some((c) => section.classList.contains(c))) return 'dark';
  if (ACCENT_LAYOUTS.some((c) => section.classList.contains(c))) return 'accent';
  return 'light';
}

/** Visible slide text without notes, footers or IT depth: used for auto-detection. */
export function slideText(section: HTMLElement): string {
  const clone = section.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('aside.notes, .slide-footer, .it-depth, .slide-badges').forEach((n) => n.remove());
  return clone.textContent ?? '';
}

/**
 * Adds the parts every content slide shares (spec section 6): eyebrow, footer
 * with module, source and slide number, level and "fictional" badges, the slide
 * background, and a planned-time line at the top of the speaker notes.
 */
export function decorateSlides(root: HTMLElement): SlideMeta[] {
  const sections = [...root.querySelectorAll<HTMLElement>(':scope > section')];
  const byModule = new Map<string, HTMLElement[]>();
  for (const s of sections) {
    const key = s.dataset.module ?? '';
    if (!byModule.has(key)) byModule.set(key, []);
    byModule.get(key)!.push(s);
  }

  const metas: SlideMeta[] = [];
  for (const [key, list] of byModule) {
    const mod = moduleByKey(key);
    let clock = toMinutes(mod?.start ?? '08:00');
    list.forEach((s, i) => {
      if (!s.id) console.warn('[pdac] slide without id at position', i + 1, 'in module', key);
      const minutes = Number(s.dataset.min ?? 0);
      const breakAfter = Number(s.dataset.breakAfter ?? 0);
      const timer = Number(s.dataset.timer ?? 0);
      const meta: SlideMeta = {
        id: s.id, index: i, total: list.length, module: key, code: s.dataset.code ?? '',
        minutes, startMin: clock, endMin: clock + minutes, breakAfter, timer,
      };
      clock += minutes + breakAfter;
      metas.push(meta);

      const t = theme(s);
      s.classList.add(`is-${t}`);
      if (!s.hasAttribute('data-background-color')) s.setAttribute('data-background-color', BG[t]);

      // Eyebrow: syllabus code plus an optional topic, unless the slide has its own.
      if (!s.querySelector(':scope > .eyebrow, :scope .eyebrow') && (s.dataset.code || s.dataset.eyebrow)) {
        const text = [s.dataset.code, s.dataset.eyebrow].filter(Boolean).join(' · ');
        s.prepend(el('p', 'eyebrow', text));
      }

      // Badges: activity level and the "fictional" label whenever the RSSO appears.
      const badges: HTMLElement[] = [];
      if (s.dataset.level) badges.push(el('span', 'badge badge-level', `Level: ${s.dataset.level}`));
      const fictional = s.dataset.fictional ?? (CAST.test(slideText(s)) ? 'true' : 'false');
      if (fictional === 'true') badges.push(el('span', 'badge badge-fictional', 'Fictional office'));
      if (badges.length) {
        const wrap = el('div', 'slide-badges');
        badges.forEach((b) => wrap.append(b));
        s.append(wrap);
      }

      // Footer: module, source, slide number (numbers restart per module so they match the deck).
      if (s.dataset.footer !== 'none') {
        const label = mod?.number ? `Module ${mod.number} · ${mod.title}` : (mod?.title ?? '');
        const footer = el('footer', 'slide-footer');
        footer.append(el('span', 'f-module', label));
        if (s.dataset.source) footer.append(el('span', 'f-source', `Source: ${s.dataset.source}`));
        footer.append(el('span', 'f-num', `${i + 1} / ${list.length}`));
        s.append(footer);
      }

      // Speaker notes: planned time window and the keys that matter on this slide.
      let notes = s.querySelector<HTMLElement>(':scope > aside.notes');
      if (!notes) {
        notes = el('aside', 'notes');
        s.append(notes);
      }
      const bits: string[] = [];
      if (minutes) bits.push(`<b>Planned ${fmt12(fromMinutes(meta.startMin))} to ${fmt12(fromMinutes(meta.endMin))}</b> (${minutes} min)`);
      if (s.id) bits.push(`#${s.id}`);
      if (timer) bits.push(`T starts the ${timer}-minute timer`);
      if (s.querySelector('.pdac-interactive, [data-src], .answer')) bits.push('A shows the answer, R resets');
      if (s.querySelector('.it-depth')) bits.push('I opens IT depth');
      if (s.dataset.demo) bits.push('F plays the fallback clip');
      if (breakAfter) bits.push(`<b>Break next (${breakAfter} min): press K</b>`);
      notes.prepend(el('p', 'notes-meta', bits.join(' · ')));
    });
  }
  return metas;
}
