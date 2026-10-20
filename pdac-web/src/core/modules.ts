import { getData } from './data';
import type { ModuleInfo } from './types';

interface ModulesFile {
  course: string;
  program: string;
  resourcePerson: string;
  runs: { label: string; dates: string }[];
  modules: Omit<ModuleInfo, 'html'>[];
}

// Module partials are bundled as raw strings (one HTML file per module).
const partials = import.meta.glob('../modules/*.html', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>;

export const course = getData<ModulesFile>('modules.json');

export const modules: ModuleInfo[] = course.modules.map((m) => ({
  ...m,
  html: partials[`../modules/${m.file}`] ?? null,
}));

const available = () => modules.filter((m) => m.html);

function slideIds(html: string): string[] {
  return [...html.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map((x) => x[1]);
}

/** Which module to show: ?m=1, ?m=all, ?m=gallery, or the module that owns #/slide-id. */
export function pickModule(): ModuleInfo | null {
  const params = new URLSearchParams(location.search);
  const m = params.get('m');
  if (m === 'all') {
    const parts = available().filter((x) => x.number !== null);
    return {
      key: 'all', number: null, file: '', title: 'All modules',
      html: parts.map((x) => wrapModule(x)).join('\n'),
    };
  }
  if (m) {
    const found = available().find((x) => x.key === m);
    return found ? { ...found, html: wrapModule(found) } : null;
  }
  const hashId = decodeURIComponent(location.hash.replace(/^#\/?/, '').split('/')[0] || '');
  if (hashId && !/^\d+$/.test(hashId)) {
    const owner = available().find((x) => slideIds(x.html!).includes(hashId));
    if (owner) {
      // Keep the URL honest so a reload lands in the same module.
      const url = new URL(location.href);
      url.searchParams.set('m', owner.key);
      history.replaceState(null, '', url);
      return { ...owner, html: wrapModule(owner) };
    }
  }
  return null;
}

/** Tag every section with its module key so numbering and footers work in ?m=all. */
function wrapModule(m: ModuleInfo): string {
  return (m.html ?? '').replace(/<section\b/g, `<section data-module="${m.key}"`);
}

export function moduleByKey(key: string): ModuleInfo | undefined {
  return modules.find((m) => m.key === key);
}

export function renderLauncher(root: HTMLElement): void {
  const cards = modules.map((m) => {
    const ids = m.html ? slideIds(m.html) : [];
    const ready = Boolean(m.html) && ids.length > 0;
    const when = m.day ? `Day ${m.day} · ${m.session} · ${fmt12(m.start)} to ${fmt12(m.end)}` : '';
    const label = m.number ? `Module ${m.number}` : 'Tools';
    return `
      <a class="lx-card ${ready ? '' : 'is-pending'}" ${ready ? `href="?m=${m.key}"` : 'aria-disabled="true"'}>
        <span class="lx-k">${label}</span>
        <span class="lx-title">${m.title}</span>
        ${m.subtitle ? `<span class="lx-sub">${m.subtitle}</span>` : ''}
        <span class="lx-when">${when}</span>
        <span class="lx-status">${ready ? `${ids.length} slides` : 'Deck not built yet'}</span>
        ${ready && m.status ? `<span class="lx-draft">${m.status}</span>` : ''}
      </a>`;
  }).join('');

  root.innerHTML = `
    <div class="lx">
      <header class="lx-head">
        <p class="lx-eyebrow">${course.program}</p>
        <h1>${course.course}</h1>
        <p class="lx-runs">${course.runs.map((r) => `<span><b>${r.label}:</b> ${r.dates}</span>`).join('')}</p>
      </header>
      <nav class="lx-grid" aria-label="Modules">${cards}</nav>
      <section class="lx-keys" aria-label="Keyboard map">
        <h2>Keys while presenting</h2>
        <dl>
          <div><dt>→ ← PgDn PgUp</dt><dd>Next or previous (steps inside an interactive first)</dd></div>
          <div><dt>S</dt><dd>Speaker view with notes and timer</dd></div>
          <div><dt>B or .</dt><dd>Blackout</dd></div>
          <div><dt>A / R</dt><dd>Show answer / reset the interactive</dd></div>
          <div><dt>T / X</dt><dd>Start or pause the activity timer / stop it</dd></div>
          <div><dt>K</dt><dd>Break timer</dd></div>
          <div><dt>G / I</dt><dd>Glossary / IT depth panel</dd></div>
          <div><dt>E</dt><dd>Sources behind the numbers: exact quotes and QR codes</dd></div>
          <div><dt>F</dt><dd>Fallback clip on demo slides (full screen elsewhere)</dd></div>
          <div><dt>J</dt><dd>Jump to a slide by number, ID or word</dd></div>
          <div><dt>1 to 9</dt><dd>Add one vote to that option</dd></div>
          <div><dt>O or Esc</dt><dd>Overview</dd></div>
          <div><dt>?</dt><dd>All keys</dd></div>
        </dl>
      </section>
      <footer class="lx-foot">Resource person: ${course.resourcePerson} · Fictional data only · Works offline</footer>
    </div>`;
  root.hidden = false;
  document.title = course.course;
}

export function fmt12(hhmm?: string): string {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  if (h === 12 && m === 0) return '12:00 NN';
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function toMinutes(hhmm?: string): number {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function fromMinutes(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = Math.round(total % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
