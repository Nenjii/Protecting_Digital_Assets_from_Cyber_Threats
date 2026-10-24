// Layout audit: screenshots of every phase at the sizes the room will use, and
// a check that no page scrolls sideways (a common cut-off cause). PNGs land in
// range/shots/ for eyeballing.
//   node range/tools/range-shots.mjs
import { chromium } from 'playwright-core';
import { spawn, execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SHOTS = fileURLToPath(new URL('../shots', import.meta.url));
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8138;
const KEY = 'shotskey';
const base = `http://127.0.0.1:${PORT}`;
mkdirSync(SHOTS, { recursive: true });

const SIZES = { phone: { width: 390, height: 844 }, laptop: { width: 1366, height: 768 }, dash: { width: 1920, height: 1080 } };
let overflow = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// a move is held in a confirm sheet until the team says yes
async function play(page, action) {
  await page.click(`[data-action="${action}"]`).catch(() => {});
  await sleep(120);
  await page.click('[data-cmd="confirm"]').catch(() => {});
  await sleep(120);
}

if (!existsSync(new URL('../../range-dist/play.html', import.meta.url))) execSync('npx vite build --config vite.range.config.ts', { cwd: ROOT, stdio: 'inherit' });

const server = spawn('node', ['range/server/main.mjs', '--port', String(PORT)], { cwd: ROOT, env: { ...process.env, RANGE_WC_KEY: KEY }, stdio: ['ignore', 'ignore', 'inherit'] });
for (let i = 0; i < 50; i++) { try { if ((await fetch(`${base}/map`)).ok) break; } catch {} await sleep(100); }

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

async function shoot(page, name, size) {
  await page.setViewportSize(SIZES[size]);
  await sleep(300);
  const over = await page.evaluate(() => {
    const el = document.scrollingElement || document.documentElement;
    const bad = [];
    for (const n of document.querySelectorAll('*')) {
      const r = n.getBoundingClientRect();
      if (r.right > window.innerWidth + 1 && getComputedStyle(n).overflowX !== 'auto' && getComputedStyle(n).overflowX !== 'scroll') {
        if (n.scrollWidth > n.clientWidth + 2 || r.width > window.innerWidth + 1) bad.push(n.className || n.tagName);
      }
    }
    return { pageScroll: el.scrollWidth - el.clientWidth, sample: [...new Set(bad)].slice(0, 6) };
  });
  const horiz = over.pageScroll > 1;
  if (horiz) { overflow++; console.log(`  ✗ ${name} @ ${size}: horizontal scroll ${over.pageScroll}px  ${over.sample.join(', ')}`); }
  else console.log(`  ✓ ${name} @ ${size}`);
  await page.screenshot({ path: `${SHOTS}/${name}-${size}.png`, fullPage: false });
}

try {
  const ctx = await browser.newContext();
  const wc = await ctx.newPage();
  wc.on('dialog', (d) => d.accept());
  await wc.goto(`${base}/wc?key=${KEY}`);
  await wc.waitForSelector('.wc-title');
  await wc.click('[data-wc="make"][data-count="2"]');
  await wc.waitForSelector('.jcode');
  await shoot(wc, 'wc-lobby', 'dash');
  const [ac, dc] = await wc.evaluate(() => [...document.querySelectorAll('.jcard')].slice(0, 1).flatMap((c) => [...c.querySelectorAll('.jcode')].map((e) => e.textContent.trim())));

  await wc.click('[data-wc="start"]'); await sleep(200);
  await wc.click('[data-wc="next"]'); await sleep(200); // prepare
  const atk = await ctx.newPage(); await atk.goto(`${base}/?code=${ac}`); await atk.waitForSelector('.board');
  const def = await ctx.newPage(); await def.goto(`${base}/?code=${dc}`); await def.waitForSelector('.board');
  await shoot(def, 'defend-prepare', 'laptop');
  await shoot(def, 'defend-prepare', 'phone');
  // pick some fixes
  for (const f of ['mfa', 'patch', 'filter', 'alerts']) { await play(def, f); }

  await wc.click('[data-wc="next"]'); await sleep(300); // round 1
  await play(atk, 'phish');
  await play(atk, 'exploit_admin_open');
  await sleep(1500);
  await shoot(atk, 'attack-round1', 'laptop');
  await shoot(atk, 'attack-round1', 'phone');
  await shoot(def, 'defend-round1', 'laptop');
  await shoot(def, 'defend-round1', 'phone');
  await shoot(wc, 'wc-play', 'dash');
  await shoot(wc, 'wc-play', 'laptop');

  // room view
  await wc.keyboard.press('v'); await sleep(300);
  await shoot(wc, 'wc-room', 'dash');
  await wc.keyboard.press('v'); await sleep(200);

  // debrief
  await wc.click('[data-wc="end"]');
  await sleep(400);
  await shoot(wc, 'wc-debrief', 'dash');
  await shoot(def, 'defend-over', 'phone');
} finally {
  await browser.close();
  server.kill('SIGTERM');
}

console.log(`\nrange-shots: ${overflow ? overflow + ' overflow issue(s)' : 'no horizontal overflow'} · PNGs in range/shots/`);
process.exit(overflow ? 1 : 0);
