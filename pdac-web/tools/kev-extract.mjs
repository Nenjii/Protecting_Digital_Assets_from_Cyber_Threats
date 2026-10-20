// Snapshot of CISA's Known Exploited Vulnerabilities (KEV) catalog for the
// "Four habits for weaknesses" slide (M2 manage-vulns).
//   npm run kev                      downloads the current catalog (needs internet)
//   npm run kev -- --file=kev.json   uses a copy you downloaded
// Writes src/data/kev.json (counts and the newest entries only) and refreshes
// the "kev-count" quote in src/data/sources.json, so the E key shows the
// catalog's own header word for word. Run it before each run, then build.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FEED = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json';
const root = fileURLToPath(new URL('..', import.meta.url));
const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));

let raw;
if (args.file) {
  raw = readFileSync(args.file, 'utf8');
  console.log(`kev: reading ${args.file}`);
} else {
  console.log(`kev: downloading ${FEED}`);
  const res = await fetch(FEED, { headers: { 'user-agent': 'pdac-web kev snapshot' } });
  if (!res.ok) throw new Error(`kev: download failed (${res.status}). Download the file in a browser and use --file=`);
  raw = await res.text();
}

const kev = JSON.parse(raw);
const list = kev.vulnerabilities;
if (kev.title !== 'CISA Catalog of Known Exploited Vulnerabilities' || !Array.isArray(list) || kev.count !== list.length) {
  throw new Error('kev: this does not look like the CISA KEV feed (title, count or list missing)');
}

const released = new Date(kev.dateReleased);
const yearAgo = new Date(released.getTime() - 365 * 86_400_000).toISOString().slice(0, 10);
const vendors = {};
for (const v of list) vendors[v.vendorProject] = (vendors[v.vendorProject] ?? 0) + 1;
const newest = [...list].sort((a, b) => b.dateAdded.localeCompare(a.dateAdded)).slice(0, 3);
const days = (a, b) => Math.round((new Date(b) - new Date(a)) / 86_400_000);

const snapshot = {
  _readme: "Made by npm run kev from CISA's Known Exploited Vulnerabilities feed. Counts only; the full catalog stays at CISA. Shown by <pdac-kev-card> on M2 manage-vulns.",
  title: kev.title,
  catalogVersion: kev.catalogVersion,
  dateReleased: kev.dateReleased,
  count: kev.count,
  addedPastYear: list.filter((v) => v.dateAdded > yearAgo).length,
  ransomware: list.filter((v) => v.knownRansomwareCampaignUse === 'Known').length,
  topVendors: Object.entries(vendors).sort((a, b) => b[1] - a[1]).slice(0, 5),
  newest: newest.map((v) => ({
    vendor: v.vendorProject, product: v.product, dateAdded: v.dateAdded, dueDate: v.dueDate,
    daysToFix: days(v.dateAdded, v.dueDate),
  })),
  catalogPage: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
};
writeFileSync(join(root, 'src/data/kev.json'), JSON.stringify(snapshot, null, 2) + '\n');

// The proof: the feed's first four lines, word for word.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (d) => `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
const sourcesPath = join(root, 'src/data/sources.json');
const sources = JSON.parse(readFileSync(sourcesPath, 'utf8'));
const source = {
  id: 'cisa-kev',
  publisher: 'Cybersecurity and Infrastructure Security Agency (CISA)',
  title: 'Known Exploited Vulnerabilities Catalog (JSON feed)',
  date: longDate(released),
  url: FEED,
  checked: longDate(new Date()),
};
const quote = ['title', 'catalogVersion', 'dateReleased', 'count'].map((k) => `${JSON.stringify(k)}: ${JSON.stringify(kev[k])}`).join(', ');
const proof = { id: 'kev-count', source: 'cisa-kev', quote, short: `"count": ${kev.count}` };
const si = sources.sources.findIndex((s) => s.id === source.id);
if (si >= 0) sources.sources[si] = source; else sources.sources.push(source);
const pi = sources.proofs.findIndex((p) => p.id === proof.id);
if (pi >= 0) sources.proofs[pi] = proof; else sources.proofs.push(proof);
writeFileSync(sourcesPath, JSON.stringify(sources, null, 2) + '\n');

console.log(`kev: catalog ${kev.catalogVersion} (${longDate(released)}): ${kev.count} entries, ${snapshot.addedPastYear} added in the past year, ${snapshot.ransomware} with known ransomware use.`);
console.log(`kev: wrote src/data/kev.json and refreshed "kev-count" in src/data/sources.json. Now: npm run check && npm run build`);
