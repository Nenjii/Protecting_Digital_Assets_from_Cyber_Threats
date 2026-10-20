// Hard constraint 4 (spec section 2): fictional data only, and no agency names
// for the two public case studies. Scans the slides and data for real-looking
// phone numbers, ID numbers and email addresses, and for banned names
// (tools/banned-terms.json). Not a guarantee: read the hits and judge.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const banned = JSON.parse(readFileSync(join(root, 'tools/banned-terms.json'), 'utf8'));
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(html|json|ts|css|md)$/.test(name)) files.push(p);
  }
})(join(root, 'src'));

// .example is reserved for documentation (RFC 2606), so it can never be a real mailbox.
const ALLOWED_EMAIL = [/@[\w.-]*regionq[\w.-]*$/i, /@[\w.-]+\.example$/i, /^admindbnms@privacy\.gov\.ph$/i];
const FAKE_DIGITS = /^(\d)\1+$|0000|1111|1234/;
const rules = [
  { name: 'PH mobile number', re: /(?<!\d)(?:\+?63|0)9\d{2}[\s-]?\d{3}[\s-]?\d{4}(?!\d)/g },
  { name: 'landline number', re: /\(0\d{1,2}\)\s?\d{3,4}[\s-]?\d{4}/g },
  { name: 'ID-like number', re: /(?<![\d.])\d{2,4}-\d{3,7}-\d{1,4}(?:-\d{1,4})?(?![\d.])/g, skip: (m) => FAKE_DIGITS.test(m.replace(/-/g, '')) || /^20\d\d-/.test(m) },
  { name: 'email address', re: /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, skip: (m) => ALLOWED_EMAIL.some((r) => r.test(m)) || /@(fontsource|vite|reveal)/.test(m) },
];

const hits = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const rel = relative(root, file);
  for (const rule of rules) {
    for (const m of text.matchAll(rule.re)) {
      if (rule.skip?.(m[0])) continue;
      hits.push(`${rel}: ${rule.name}: ${m[0]}`);
    }
  }
  for (const term of banned.terms) {
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    for (const m of text.matchAll(re)) hits.push(`${rel}: banned name: ${m[0]}`);
  }
}

// Proof for the numbers: each short excerpt must be part of its verbatim quote, and name a real source.
const sources = JSON.parse(readFileSync(join(root, 'src/data/sources.json'), 'utf8'));
const sourceIds = new Set(sources.sources.map((s) => s.id));
for (const p of sources.proofs) {
  if (!sourceIds.has(p.source)) hits.push(`src/data/sources.json: proof "${p.id}" names an unknown source "${p.source}"`);
  if (p.short && !p.quote.includes(p.short)) hits.push(`src/data/sources.json: proof "${p.id}": "short" is not word for word part of "quote"`);
}
const proofIds = new Set(sources.proofs.map((p) => p.id));
for (const file of files.filter((f) => f.endsWith('.html') || f.endsWith('.json'))) {
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/data-proofs?="([^"]+)"|"proof": "([^"]+)"/g)) {
    for (const id of (m[1] ?? m[2]).split(',').map((s) => s.trim())) {
      if (!proofIds.has(id)) hits.push(`${relative(root, file)}: proof "${id}" is not in src/data/sources.json`);
    }
  }
}

if (hits.length) {
  console.error(`check-data: ${hits.length} item(s) to review:\n` + hits.map((h) => `  - ${h}`).join('\n'));
  process.exit(1);
}
console.log(`check-data: OK, ${files.length} files scanned; no real-looking numbers, emails or banned names.`);
