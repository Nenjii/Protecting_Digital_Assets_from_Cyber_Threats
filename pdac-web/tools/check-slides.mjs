// Checks the module partials against the spec's slide map and the project's rules:
// same IDs in the same order as the deck, the planned minutes, no duplicate IDs,
// no nested <section> (reveal.js would treat it as a vertical slide), every
// data file and icon exists, and how much draft wording is still unverified.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const map = JSON.parse(readFileSync(join(root, 'tools/slide-map.json'), 'utf8'));
const iconSrc = readFileSync(join(root, 'src/core/icons.ts'), 'utf8');
const iconNames = new Set([...iconSrc.slice(iconSrc.indexOf('export const ICONS')).matchAll(/\b([A-Z][A-Za-z0-9]+)\b/g)].map((m) => m[1]));
const kebabToPascal = (k) => k.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());

const errors = [];
const warnings = [];
const allIds = new Map();

const modulesDir = join(root, 'src/modules');
for (const file of readdirSync(modulesDir).filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(join(modulesDir, file), 'utf8');
  const sections = [...html.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/g)].map((m) => ({
    attrs: m[1], body: m[2],
    id: m[1].match(/\bid="([^"]+)"/)?.[1] ?? '',
    min: Number(m[1].match(/\bdata-min="(\d+)"/)?.[1] ?? 0),
    breakAfter: Number(m[1].match(/\bdata-break-after="(\d+)"/)?.[1] ?? 0),
  }));
  for (const s of sections) {
    if (!s.id) errors.push(`${file}: a slide has no id`);
    if (allIds.has(s.id)) errors.push(`${file}: id "${s.id}" also used in ${allIds.get(s.id)} (IDs must be unique across modules)`);
    allIds.set(s.id, file);
    if (/<section\b/.test(s.body)) errors.push(`${file} #${s.id}: nested <section> (reveal.js makes it a vertical slide)`);
    for (const m of s.body.matchAll(/data-src="([^"]+)"/g)) {
      if (!existsSync(join(root, 'src/data', m[1]))) errors.push(`${file} #${s.id}: data file src/data/${m[1]} not found`);
    }
    for (const m of s.body.matchAll(/data-lucide="([^"]+)"/g)) {
      if (!iconNames.has(kebabToPascal(m[1]))) errors.push(`${file} #${s.id}: icon "${m[1]}" is not registered in src/core/icons.ts`);
    }
    for (const m of s.body.matchAll(/<a\b[^>]*href="(https?:[^"]+)"[^>]*>/g)) {
      if (!/target="_blank"/.test(m[0]) || !/noopener/.test(m[0])) warnings.push(`${file} #${s.id}: external link ${m[1]} should open in a new tab with rel="noopener"`);
    }
  }

  const entry = Object.entries(map).find(([k, v]) => !k.startsWith('_') && v.file === file);
  const verify = (html.match(/data-verify/g) ?? []).length;
  if (!entry) {
    console.log(`${file}: ${sections.length} slides (no slide map; not checked against the deck)${verify ? `, ${verify} to verify` : ''}`);
    continue;
  }
  const [key, spec] = entry;
  const ids = sections.map((s) => s.id);
  const expected = spec.slides.map(([id]) => id);
  if (ids.length !== expected.length) errors.push(`Module ${key}: ${ids.length} slides, the deck has ${expected.length}`);
  expected.forEach((id, i) => {
    if (ids[i] !== id) errors.push(`Module ${key} slide ${i + 1}: expected #${id}, found #${ids[i] ?? '(none)'}`);
  });
  spec.slides.forEach(([id, min]) => {
    const s = sections.find((x) => x.id === id);
    if (s && s.min !== min) errors.push(`Module ${key} #${id}: data-min="${s.min}", the plan says ${min}`);
  });
  for (const [id, mins] of Object.entries(spec.breaks)) {
    const s = sections.find((x) => x.id === id);
    if (s && s.breakAfter !== mins) errors.push(`Module ${key} #${id}: data-break-after="${s.breakAfter}", the plan says ${mins}`);
  }
  const total = sections.reduce((n, s) => n + s.min + s.breakAfter, 0);
  if (total !== spec.total) errors.push(`Module ${key}: minutes add up to ${total}, not ${spec.total}`);
  const noNotes = sections.filter((s) => !/<aside class="notes">/.test(s.body)).length;
  console.log(`Module ${key}: ${sections.length} slides, ${total} min, ${verify} draft item(s) to verify, ${noNotes} slide(s) without deck notes yet`);
}

for (const w of warnings) console.warn(`warning: ${w}`);
if (errors.length) {
  console.error(`\ncheck-slides: ${errors.length} problem(s):\n` + errors.map((e) => `  - ${e}`).join('\n'));
  process.exit(1);
}
console.log('check-slides: OK');
