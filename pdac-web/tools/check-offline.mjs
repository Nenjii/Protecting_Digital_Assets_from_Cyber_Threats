// Hard constraint 1 (spec section 2): dist/ must not load anything from the network.
// Fails the build if any file in dist/ would fetch a remote script, style, font,
// image or frame. Plain <a href> links (opened by the presenter) are allowed.
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
if (!existsSync(dist)) {
  console.error('check-offline: dist/ not found. Run npm run build first.');
  process.exit(1);
}

const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
})(dist);

const rules = [
  { ext: ['.html'], re: /<(script|link|img|iframe|source|video|audio|embed|object)\b[^>]*\b(src|href|data)\s*=\s*["']\s*(https?:)?\/\//gi, what: 'remote resource tag' },
  { ext: ['.css', '.html'], re: /url\(\s*["']?\s*(https?:)?\/\//gi, what: 'remote url() in CSS' },
  { ext: ['.css', '.html'], re: /@import\s+(url\()?\s*["']?(https?:)?\/\//gi, what: 'remote @import' },
  { ext: ['.js'], re: /\bfetch\(\s*[`'"]https?:\/\//g, what: 'fetch() to a remote URL' },
  { ext: ['.js'], re: /\bimport\(\s*[`'"]https?:\/\//g, what: 'dynamic import from a remote URL' },
  { ext: ['.js', '.html', '.css'], re: /fonts\.(googleapis|gstatic)\.com/g, what: 'Google Fonts' },
  { ext: ['.js', '.html', '.css'], re: /\/\/(cdn\.jsdelivr\.net|unpkg\.com|cdnjs\.cloudflare\.com|code\.jquery\.com|cdn\.tailwindcss\.com)\//g, what: 'CDN reference' },
  { ext: ['.js', '.html'], re: /googletagmanager|google-analytics|gtag\(|plausible\.io|clarity\.ms/g, what: 'analytics' },
];

// Bundled tools (public/tools/) work offline, but CyberChef mentions a CDN inside two
// optional operations the course never runs. Only these exact files and hosts are
// excused; anything else in them still fails the build.
const EXCUSED = [
  { file: 'dist/tools/cyberchef/modules/OCR.js', host: /cdn\.jsdelivr\.net/, why: 'CyberChef "Optical Character Recognition" operation' },
  { file: 'dist/tools/cyberchef/assets/tesseract/worker.min.js', host: /cdn\.jsdelivr\.net/, why: 'the same OCR operation' },
  { file: 'dist/tools/cyberchef/modules/Hashing.js', host: /unpkg\.com/, why: 'CyberChef "Show on map" operation' },
];

const problems = [];
const excused = new Set();
for (const file of files) {
  const ext = extname(file);
  if (!['.html', '.css', '.js'].includes(ext)) continue;
  const text = readFileSync(file, 'utf8');
  const rel = relative(root, file).split('\\').join('/');
  for (const rule of rules) {
    if (!rule.ext.includes(ext)) continue;
    for (const m of text.matchAll(rule.re)) {
      const ok = EXCUSED.find((x) => x.file === rel && x.host.test(m[0]));
      if (ok) { excused.add(`${rel} (${ok.why})`); continue; }
      const at = text.slice(Math.max(0, m.index - 60), m.index + 80).replace(/\s+/g, ' ');
      problems.push(`${rel}: ${rule.what}: …${at}…`);
    }
  }
}

const total = files.reduce((n, f) => n + statSync(f).size, 0);
if (problems.length) {
  console.error(`check-offline: ${problems.length} problem(s):\n` + problems.map((p) => `  - ${p}`).join('\n'));
  process.exit(1);
}
console.log(`check-offline: OK, ${files.length} files (${(total / 1048576).toFixed(1)} MB) and nothing loads from the network.`);
if (excused.size) console.log(`  Excused (optional online features of bundled tools, unused in class): ${[...excused].join('; ')}`);
