// Safety gate for the participant bundle (range-dist/). Three checks:
//  1. It ships NONE of the scenario's rules/answers, nor the deck's answer data
//     (src/data). The clients are generic renderers; content arrives at runtime,
//     already filtered for the device's role.
//  2. It loads nothing from the network (same rules as the deck's check-offline).
//  3. The scenario names nothing real (the deck's banned-terms list).
//   node range/tools/check-range.mjs
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const DIST = join(ROOT, 'range-dist');
const problems = [];

if (!existsSync(DIST)) {
  console.error('check-range: range-dist/ not found. Run: npm run range:build');
  process.exit(1);
}

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
})(DIST);
const textFiles = files.filter((f) => ['.js', '.html', '.css', '.json', '.map'].includes(extname(f)));
const blob = textFiles.map((f) => readFileSync(f, 'utf8')).join('\n');

// 1a. Distinctive scenario rule/answer strings that must never reach a device.
const scenario = JSON.parse(readFileSync(join(ROOT, 'range/scenario/portal-week.json'), 'utf8'));
const secretStrings = [
  // reasons / teaching links (server-only)
  ...scenario.attacks.flatMap((a) => [a.onSuccess?.result, ...(a.blockedBy ?? []).map((b) => b.reason)]).filter(Boolean),
  // defender-only sign texts
  ...scenario.signs.map((s) => s.text),
  // duty labels and reasons
  ...scenario.duties.flatMap((d) => (d.score ?? []).map((s) => s.reason)),
];
for (const str of dedupe(secretStrings)) {
  if (str && str.length > 12 && blob.includes(str)) problems.push(`scenario rule text is in the bundle: "${clip(str)}"`);
}

// 1b. The deck's answer data (src/data) must not be bundled either.
const SRC_DATA = join(ROOT, 'src/data');
const deckSecretSamples = [];
for (const f of ['m5-injects.json', 'm4-findings.json', 'recall.json']) {
  const p = join(SRC_DATA, f);
  if (existsSync(p)) deckSecretSamples.push(...longStrings(JSON.parse(readFileSync(p, 'utf8'))));
}
for (const str of dedupe(deckSecretSamples).slice(0, 400)) {
  if (blob.includes(str)) problems.push(`deck answer data is in the bundle: "${clip(str)}" (from src/data)`);
}

// 2. Nothing loads from the network.
const offlineRules = [
  { ext: ['.html'], re: /<(script|link|img|iframe|source|video|audio)\b[^>]*\b(src|href)\s*=\s*["']\s*(https?:)?\/\//gi, what: 'remote resource tag' },
  { ext: ['.css'], re: /url\(\s*["']?\s*(https?:)?\/\//gi, what: 'remote url() in CSS' },
  { ext: ['.css', '.html'], re: /@import\s+(url\()?\s*["']?(https?:)?\/\//gi, what: 'remote @import' },
  { ext: ['.js'], re: /\bfetch\(\s*[`'"]https?:\/\//g, what: 'fetch() to a remote URL' },
  { ext: ['.js', '.html', '.css'], re: /fonts\.(googleapis|gstatic)\.com|cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com/g, what: 'CDN / Google Fonts' },
];
for (const f of files) {
  const ext = extname(f);
  const rel = f.slice(ROOT.length + 1);
  for (const rule of offlineRules) {
    if (!rule.ext.includes(ext)) continue;
    const text = readFileSync(f, 'utf8');
    const m = text.match(rule.re);
    if (m) problems.push(`${rel}: ${rule.what} (${clip(m[0])})`);
  }
}

// 3. Banned real names (deck list) in the scenario or bundle.
const banned = JSON.parse(readFileSync(join(ROOT, 'tools/banned-terms.json'), 'utf8')).terms;
const scenarioText = readFileSync(join(ROOT, 'range/scenario/portal-week.json'), 'utf8');
for (const term of banned) {
  const re = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  if (re.test(scenarioText)) problems.push(`scenario names a banned term: ${term}`);
  if (re.test(blob)) problems.push(`bundle names a banned term: ${term}`);
}

function dedupe(a) { return [...new Set(a)]; }
function clip(s) { return s.length > 60 ? s.slice(0, 57) + '…' : s; }
function longStrings(obj, out = []) {
  if (typeof obj === 'string') { if (obj.length > 18) out.push(obj); }
  else if (Array.isArray(obj)) obj.forEach((x) => longStrings(x, out));
  else if (obj && typeof obj === 'object') Object.values(obj).forEach((x) => longStrings(x, out));
  return out;
}

if (problems.length) {
  console.error(`check-range: ${problems.length} problem(s):`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log(`check-range: OK. Participant bundle ships no scenario rules or deck answers, loads nothing from the network, and names nothing real (${files.length} files scanned).`);
