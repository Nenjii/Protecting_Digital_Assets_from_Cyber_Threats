// Generates public/qr/<key>.svg for every link in src/data/links.json, locally
// (no remote QR service). Run before each run, after pasting the new form links:
//   npm run qr && npm run build
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const root = fileURLToPath(new URL('..', import.meta.url));
const links = JSON.parse(readFileSync(join(root, 'src/data/links.json'), 'utf8'));
const out = join(root, 'public/qr');
mkdirSync(out, { recursive: true });

let made = 0;
for (const [key, link] of Object.entries(links)) {
  if (key.startsWith('_')) continue;
  if (!link.url) {
    console.warn(`qr: skipped "${key}" (no url yet in src/data/links.json)`);
    continue;
  }
  const svg = await QRCode.toString(link.url, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 1,
    color: { dark: '#14213D', light: '#FFFFFF' },
  });
  writeFileSync(join(out, `${key}.svg`), svg);
  console.log(`qr: public/qr/${key}.svg → ${link.url}`);
  made++;
}
console.log(`qr: ${made} code(s) written. Rebuild (npm run build) so dist/ has them.`);
