// End-to-end test of the whole game in the installed Chrome: a white cell plus
// two team consoles play real moves over the real server. Checks the things
// that matter for a live room:
//   - the dashboard updates from Server-Sent Events
//   - a defender console never receives attacker move text, and the reverse
//   - a <script> team name is shown as text, not run
//   - wrong codes are rejected and then locked out
//   - the security headers are set
//   - nothing is requested from outside the machine
//   node range/tools/range-e2e.mjs   (expects: npm run range:build already ran, or builds)
import { chromium } from 'playwright-core';
import { spawn, execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8137;
const KEY = 'testkey123';
const base = `http://127.0.0.1:${PORT}`;

let failures = 0;
const ok = (cond, msg) => { if (cond) console.log(`  ✓ ${msg}`); else { failures++; console.log(`  ✗ ${msg}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

if (!existsSync(new URL('../../range-dist/play.html', import.meta.url))) {
  console.log('Building range clients…');
  execSync('npx vite build --config vite.range.config.ts', { cwd: ROOT, stdio: 'inherit' });
}

// ---- start the server ----
const server = spawn('node', ['range/server/main.mjs', '--port', String(PORT)], {
  cwd: ROOT, env: { ...process.env, RANGE_WC_KEY: KEY }, stdio: ['ignore', 'pipe', 'pipe'],
});
server.stderr.on('data', (d) => process.stderr.write(d));
await waitForServer();

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`${base}/map`); if (r.ok) return; } catch { /* not up yet */ }
    await sleep(100);
  }
  throw new Error('server did not start');
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });

// watch for any request leaving the machine
const external = [];
context.on('request', (req) => {
  const u = new URL(req.url());
  if (!['127.0.0.1', 'localhost'].includes(u.hostname) && !u.protocol.startsWith('data') && u.protocol !== 'blob:') external.push(req.url());
});

try {
  // ---- security headers ----
  {
    const r = await fetch(`${base}/map`);
    ok((r.headers.get('content-security-policy') || '').includes("default-src 'self'"), 'CSP header is set');
    ok(r.headers.get('x-content-type-options') === 'nosniff', 'nosniff header is set');
  }

  // ---- white cell: make 2 matches, read codes, start ----
  const wc = await context.newPage();
  const wcErrors = [];
  wc.on('pageerror', (e) => wcErrors.push(e.message));
  await wc.goto(`${base}/wc?key=${KEY}`);
  await wc.waitForSelector('#wc-top .wc-title', { timeout: 5000 });
  await wc.click('[data-wc="make"][data-count="2"]');
  await wc.waitForSelector('.jcode', { timeout: 5000 });
  const codes = await wc.evaluate(() => [...document.querySelectorAll('.jcard')].slice(0, 1).flatMap((card) => [...card.querySelectorAll('.jcode')].map((e) => e.textContent.trim())));
  const [attackCode, defendCode] = codes;
  ok(/^[A-Z0-9]{8}$/.test(attackCode) && /^[A-Z0-9]{8}$/.test(defendCode), `read join codes (${attackCode}/${defendCode})`);
  await wc.click('[data-wc="start"]'); // -> brief
  await sleep(300);
  await wc.click('[data-wc="next"]'); // -> prepare
  await sleep(300);
  await wc.click('[data-wc="next"]'); // -> round 1
  await sleep(400);

  // ---- open the two team consoles ----
  const atk = await context.newPage();
  const atkErrors = []; atk.on('pageerror', (e) => atkErrors.push(e.message));
  await atk.goto(`${base}/?code=${attackCode}`);
  const def = await context.newPage();
  const defErrors = []; def.on('pageerror', (e) => defErrors.push(e.message));
  await def.goto(`${base}/?code=${defendCode}`);
  await atk.waitForSelector('.board', { timeout: 5000 });
  await def.waitForSelector('.board', { timeout: 5000 });
  ok(true, 'both team consoles joined and rendered');

  // ---- XSS: a script team name is shown as text, not executed ----
  await atk.evaluate(async () => {
    const s = sessionStorage.getItem('range.team');
    await fetch(`/cmd?s=${encodeURIComponent(s)}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'setName', name: '<script>window.__XSS=1<\/script><img src=x onerror="window.__XSS=1">' }) });
  });
  await sleep(600);
  const xssAtk = await atk.evaluate(() => window.__XSS);
  const xssWc = await wc.evaluate(() => window.__XSS);
  ok(!xssAtk && !xssWc, 'a <script>/<img> team name does not execute');
  ok((await wc.evaluate(() => document.body.innerText)).includes('<script>'), 'the dangerous name is shown as literal text');

  // ---- attacker plays phish; check the one-way mirror ----
  // nothing commits on one tap: the move is held until the team confirms it
  await atk.click('[data-action="phish"]');
  await sleep(250);
  ok(await atk.evaluate(() => !!document.querySelector('.sheet')), 'a move opens the confirm sheet first');
  ok(await atk.evaluate(() => (document.querySelector('.sheet-q')?.textContent ?? '').includes('your attack')), 'the attacker is asked if this is their attack');
  await atk.click('.sheet-btns [data-cmd="cancel"]');
  await sleep(250);
  ok(await atk.evaluate(() => !document.querySelector('.sheet')), 'backing out closes the sheet');
  ok(!(await atk.evaluate(() => document.body.innerText)).includes('under way'), 'a cancelled move is never played');
  await atk.click('[data-action="phish"]');
  await sleep(200);
  await atk.click('[data-cmd="confirm"]');
  await sleep(1200); // SSE round trip + sign reveal

  const defText = await def.evaluate(() => document.body.innerText);
  const atkText = await atk.evaluate(() => document.body.innerText);
  const wcText = await wc.evaluate(() => document.body.innerText);

  ok(defText.includes('Ben reports a suspicious'), 'defender sees the phishing report (a sign)');
  ok(!defText.includes('payroll update') || !defText.includes('under way'), 'defender does NOT see the attacker move wording');
  ok(!/Copy applicant records/i.test(defText), 'defender never sees other attack move names');
  ok(atkText.toLowerCase().includes('payroll'), 'attacker sees its own move');
  ok(!atkText.includes('Ben reports a suspicious'), 'attacker does NOT see the defenders\' alerts');
  ok(!atkText.includes('Legal duties'), 'attacker console has no defender duties');
  ok(wcText.includes('Ben reports a suspicious') && wcText.toLowerCase().includes('payroll'), 'white cell sees both sides');
  ok(atkText.includes('T1566') && wcText.includes('T1566'), 'MITRE ATT&CK tag (T1566 Phishing) shows for attacker and dashboard');
  ok(!defText.includes('T1566'), 'defender does not see the ATT&CK tag');

  // ---- dashboard updated from SSE (focus feed grew) ----
  ok(await wc.evaluate(() => document.querySelectorAll('#wc-attack-feed .fitem, #wc-defend-feed .fitem').length > 0), 'dashboard feeds updated live');

  ok(wcErrors.length === 0 && atkErrors.length === 0 && defErrors.length === 0, `no page errors${[...wcErrors, ...atkErrors, ...defErrors].join(' | ')}`);
  ok(external.length === 0, `no request left the machine${external.length ? ': ' + external.join(', ') : ''}`);

  // ---- wrong codes get locked out (LAST: this locks out 127.0.0.1 for a minute) ----
  {
    let sawLock = false, saw403 = false;
    for (let i = 0; i < 12; i++) {
      const r = await fetch(`${base}/join`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: 'ZZZZZZZZ' }) });
      if (r.status === 403) saw403 = true;
      if (r.status === 429) sawLock = true;
    }
    ok(saw403, 'a wrong code is refused (403)');
    ok(sawLock, 'repeated wrong codes get locked out (429)');
  }
} finally {
  await browser.close();
  server.kill('SIGTERM');
}

console.log(`\nrange-e2e: ${failures ? failures + ' FAILED' : 'all checks passed'}`);
process.exit(failures ? 1 : 0);
