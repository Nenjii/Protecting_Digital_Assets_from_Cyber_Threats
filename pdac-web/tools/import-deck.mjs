// Keeps the web slides in sync with the Slides deck (spec sections 1 and 16).
//
//   npm run import-deck                       extract every .pptx in ../source/ to ../source/extracted/
//   npm run import-deck -- --deck=<file.pptx> --module=1 --notes   copy speaker notes into the module, slide by slide
//   npm run import-deck -- --deck=<file.pptx> --module=1 --diff    report wording differences per slide
//   npm run import-deck -- --json=<file.json> --module=1 --notes   same, from a deck already extracted
//                                                                 to ../source/extracted/ (for example
//                                                                 from the deck's PDF with speaker notes)
//
// Slides are matched by position (deck slide n = web slide n), which is why the
// two must keep the same order. The diff lists words that appear on the deck
// slide but not on the web slide (and the reverse), so "same words" can be checked.
// --notes replaces each slide's notes with the deck's, labels (TIME, SAY, ASK…)
// in bold, and keeps any <p class="notes-web"> (how to drive the web slide).
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const root = fileURLToPath(new URL('..', import.meta.url));
const sourceDir = process.env.PDAC_SOURCE ?? resolve(root, '..', 'source');
const outDir = join(sourceDir, 'extracted');
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));

const MODULE_FILES = {
  1: 'm1-threats-legal.html', 2: 'm2-risk-threat-modeling.html', 3: 'm3-security-controls.html',
  4: 'm4-endpoint-workflows.html', 5: 'm5-incident-response.html',
};

const decode = (s) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&amp;/g, '&');

/** Paragraphs of an XML fragment: a:p → joined a:t runs, a:br → newline. */
function paragraphs(xml) {
  const out = [];
  for (const m of xml.matchAll(/<a:p>([\s\S]*?)<\/a:p>|<a:p [^>]*>([\s\S]*?)<\/a:p>/g)) {
    const inner = m[1] ?? m[2] ?? '';
    const text = [...inner.matchAll(/<a:t>([\s\S]*?)<\/a:t>|<a:t [^>]*>([\s\S]*?)<\/a:t>|<a:br\b[^>]*\/>/g)]
      .map((r) => (r[0].startsWith('<a:br') ? '\n' : decode(r[1] ?? r[2] ?? '')))
      .join('')
      .trim();
    if (text) out.push(text);
  }
  return out;
}

function shapes(xml) {
  const list = [];
  for (const m of xml.matchAll(/<p:(sp|graphicFrame)\b[\s\S]*?<\/p:\1>/g)) {
    const block = m[0];
    const name = block.match(/<p:cNvPr [^>]*name="([^"]*)"/)?.[1] ?? '';
    const ph = block.match(/<p:ph\b[^>]*type="([^"]+)"/)?.[1] ?? (/<p:ph\b/.test(block) ? 'body' : '');
    const paras = paragraphs(block);
    if (paras.length) list.push({ name: decode(name), placeholder: ph, paragraphs: paras });
  }
  return list;
}

async function extract(file) {
  const zip = await JSZip.loadAsync(readFileSync(file));
  const read = async (p) => (zip.file(p) ? zip.file(p).async('string') : '');
  const pres = await read('ppt/presentation.xml');
  const presRels = await read('ppt/_rels/presentation.xml.rels');
  const relTarget = (rels, id) => rels.match(new RegExp(`Id="${id}"[^>]*Target="([^"]+)"`))?.[1]
    ?? rels.match(new RegExp(`Target="([^"]+)"[^>]*Id="${id}"`))?.[1];
  const ids = [...pres.matchAll(/<p:sldId [^>]*r:id="([^"]+)"/g)].map((m) => m[1]);
  const slides = [];
  for (const [i, rid] of ids.entries()) {
    const target = relTarget(presRels, rid).replace(/^\/?(ppt\/)?/, '');
    const path = `ppt/${target}`;
    const xml = await read(path);
    const rels = await read(path.replace('slides/', 'slides/_rels/') + '.rels');
    const notesTarget = rels.match(/Target="([^"]*notesSlide[^"]*)"/)?.[1];
    let notes = [];
    if (notesTarget) {
      const nxml = await read(`ppt/${notesTarget.replace(/^(\.\.\/)+/, '')}`);
      notes = shapes(nxml).filter((s) => s.placeholder === 'body').flatMap((s) => s.paragraphs);
    }
    const sh = shapes(xml);
    const titleShape = sh.find((s) => s.placeholder === 'title' || s.placeholder === 'ctrTitle');
    const hidden = /<p:sld\b[^>]*show="0"/.test(xml);
    slides.push({
      n: i + 1,
      title: titleShape?.paragraphs.join(' ') ?? sh[0]?.paragraphs[0] ?? '',
      hidden,
      shapes: sh,
      text: sh.flatMap((s) => s.paragraphs),
      notes,
    });
  }
  return slides;
}

function toMarkdown(name, slides) {
  return `# ${name}\n\n` + slides.map((s) => [
    `## ${s.n}. ${s.title}${s.hidden ? ' (hidden)' : ''}`,
    ...s.shapes.map((sh) => `- **${sh.name || sh.placeholder || 'shape'}**: ${sh.paragraphs.join(' / ')}`),
    s.notes.length ? `\n> Notes: ${s.notes.join('\n> ')}` : '',
  ].join('\n')).join('\n\n') + '\n';
}

const escHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
/** One deck note paragraph; a leading label such as "TIME:" or "WATCH FOR:" is set in bold. */
const noteHtml = (p) => {
  const m = p.match(/^([A-Z][A-Z0-9 ,'’-]*(?: \([^)]*\))?):\s+([\s\S]*)$/);
  return m ? `<p><b>${escHtml(m[1])}:</b> ${escHtml(m[2])}</p>` : `<p>${escHtml(p)}</p>`;
};
const words = (s) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/&[a-z]+;|<[^>]+>/g, ' ').match(/[\p{L}\p{N}][\p{L}\p{N}'.%-]*/gu)?.map((w) => w.replace(/[.']+$/, '')) ?? [];
/** Every string inside a data file, so the diff also sees what the interactives show. */
const strings = (v) => (typeof v === 'string' ? [v] : Array.isArray(v) ? v.flatMap(strings)
  : v && typeof v === 'object' ? Object.entries(v).filter(([k]) => !k.startsWith('_')).flatMap(([, x]) => strings(x)) : []);
/** A web slide's visible words: body (without notes and IT depth), eyebrow, code, level, source, and its data files. */
function webWords(sec) {
  const body = sec.body.replace(/<aside class="notes">[\s\S]*?<\/aside>/g, '').replace(/<div class="it-depth">[\s\S]*?<\/div>/g, '');
  const attrs = [...sec.attrs.matchAll(/data-(?:eyebrow|code|level|source)="([^"]*)"/g)].map((m) => decode(m[1]));
  const data = [...body.matchAll(/data-src="([^"]+)"/g)].flatMap((m) => {
    const f = join(root, 'src/data', m[1]);
    return existsSync(f) ? strings(JSON.parse(readFileSync(f, 'utf8'))) : [];
  });
  return new Set(words([body, ...attrs, ...data].join(' ')));
}

function webSections(html) {
  return [...html.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/g)].map((m) => ({
    id: m[1].match(/\bid="([^"]+)"/)?.[1] ?? '',
    attrs: m[1],
    body: m[2],
    full: m[0],
  }));
}

async function main() {
  if (!existsSync(sourceDir)) {
    console.error(`No source folder at ${sourceDir}`);
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });
  const decks = args.json ? [resolve(outDir, args.json)]
    : args.deck ? [resolve(sourceDir, args.deck)]
    : readdirSync(sourceDir).filter((f) => f.endsWith('.pptx') && !f.startsWith('~$')).map((f) => join(sourceDir, f));
  if (!decks.length) {
    console.log(`No .pptx files in ${sourceDir}. Export each module's deck there first.`);
    return;
  }
  for (const file of decks) {
    const fromJson = file.endsWith('.json');
    const slides = fromJson ? JSON.parse(readFileSync(file, 'utf8')) : await extract(file);
    const name = basename(file, fromJson ? '.json' : '.pptx');
    if (fromJson) {
      console.log(`import-deck: ${name}: ${slides.length} slides from source/extracted/${name}.json`);
    } else {
      writeFileSync(join(outDir, `${name}.json`), JSON.stringify(slides, null, 2));
      writeFileSync(join(outDir, `${name}.md`), toMarkdown(name, slides));
      console.log(`import-deck: ${name}: ${slides.length} slides → source/extracted/${name}.{json,md}`);
    }

    if (!args.module) continue;
    const modFile = join(root, 'src/modules', MODULE_FILES[args.module]);
    if (!existsSync(modFile)) {
      console.error(`Module file not found: ${modFile}`);
      continue;
    }
    let html = readFileSync(modFile, 'utf8');
    const sections = webSections(html);
    if (sections.length !== slides.length) {
      console.warn(`  ! deck has ${slides.length} slides, web module has ${sections.length}. Matching by position for the first ${Math.min(sections.length, slides.length)}.`);
    }

    if (args.notes) {
      let changed = 0;
      sections.forEach((sec, i) => {
        const deck = slides[i];
        if (!deck || !deck.notes.length) return;
        const keep = sec.full.match(/<aside class="notes">([\s\S]*?)<\/aside>/)?.[1].match(/<p class="notes-web">[\s\S]*?<\/p>/g) ?? [];
        const notesHtml = `<aside class="notes">\n    ${[...deck.notes.map(noteHtml), ...keep].join('\n    ')}\n  </aside>`;
        const updated = /<aside class="notes">[\s\S]*?<\/aside>/.test(sec.full)
          ? sec.full.replace(/<aside class="notes">[\s\S]*?<\/aside>/, notesHtml)
          : sec.full.replace(/<\/section>$/, `  ${notesHtml}\n</section>`);
        if (updated !== sec.full) {
          html = html.replace(sec.full, updated);
          changed++;
        }
      });
      writeFileSync(modFile, html);
      console.log(`  notes: ${changed} slide(s) updated in src/modules/${MODULE_FILES[args.module]}`);
    }

    if (args.diff) {
      const lines = [`# Wording check: ${name} vs src/modules/${MODULE_FILES[args.module]}`, ''];
      let flagged = 0;
      sections.forEach((sec, i) => {
        const deck = slides[i];
        if (!deck) return;
        const w = webWords(sec);
        const d = new Set(words(deck.text.join(' ')));
        const missing = [...d].filter((x) => !w.has(x));
        const extra = [...w].filter((x) => !d.has(x));
        if (missing.length || extra.length) {
          flagged++;
          lines.push(`## ${i + 1}. #${sec.id} · deck: “${deck.title}”`);
          if (missing.length) lines.push(`- On the deck, not on the web slide: ${missing.join(', ')}`);
          if (extra.length) lines.push(`- On the web slide, not on the deck: ${extra.join(', ')}`);
          lines.push('');
        }
      });
      lines.splice(1, 0, `${flagged} of ${Math.min(sections.length, slides.length)} slides differ. The web side counts the slide's text, eyebrow, source and the data files its interactives use (all of a file, so shared files can hide a missing word).`);
      const report = join(outDir, `m${args.module}-wording.md`);
      writeFileSync(report, lines.join('\n'));
      console.log(`  diff: ${flagged} slide(s) differ → source/extracted/m${args.module}-wording.md`);
    }
  }
}

await main();
