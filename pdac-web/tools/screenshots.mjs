// Screenshots every slide of a module at 1920×1080 with the installed Chrome.
//   npm run shots -- --m=1 [--out=dir] [--only=id1,id2] [--answer] [--size=1280x720]
// --answer also saves a second shot after pressing A on slides with interactives.
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { serveDist } from './serve-dist.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
const mod = args.m ?? '1';
const out = args.out ?? join(process.cwd(), 'shots', `m${mod}`);
const only = args.only ? String(args.only).split(',') : null;
const [w, h] = String(args.size ?? '1920x1080').split('x').map(Number);
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

mkdirSync(out, { recursive: true });
const { server, port } = await serveDist();
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });

await page.goto(`http://127.0.0.1:${port}/?m=${mod}${args.now ? `&now=${args.now}` : ''}`);
await page.waitForFunction(() => document.querySelector('.reveal.ready'));
await page.evaluate(() => document.fonts.ready);
const ids = await page.evaluate(() => [...document.querySelectorAll('.reveal .slides > section')].map((s) => s.id));

let n = 0;
for (const [i, id] of ids.entries()) {
  if (only && !only.includes(id)) continue;
  const wait = await page.evaluate(([idx, frags]) => {
    const deck = window.pdacDeck;
    deck.slide(idx, 0, frags ? 999 : undefined);
    if (deck.isPaused()) deck.togglePause(false);
    return deck.getCurrentSlide().querySelector('[data-countup]') ? 1400 : 700;
  }, [i, Boolean(args.fragments)]);
  await page.waitForTimeout(wait);
  const file = join(out, `${String(i + 1).padStart(2, '0')}-${id}.png`);
  await page.screenshot({ path: file });
  n++;
  if (args.answer) {
    const has = await page.evaluate(() => {
      const s = document.querySelector('.reveal .slides > section.present');
      return Boolean(s && (s.querySelector('.pdac-interactive') || s.querySelector('.answer')));
    });
    if (has) {
      await page.keyboard.press('a');
      await page.waitForTimeout(900);
      await page.screenshot({ path: file.replace('.png', '-answer.png') });
      await page.keyboard.press('r');
    }
  }
}
console.log(`shots: ${n} slide(s) → ${out}`);
if (errors.length) console.log('Console problems:\n' + [...new Set(errors)].map((e) => '  ' + e).join('\n'));
await browser.close();
server.close();
