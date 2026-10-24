// End-to-end smoke test in the installed Chrome (spec sections 7 and 15):
// every slide renders without errors, A and R work on every interactive, the
// clicker steps inside components, T/X/K/G/I/F/J behave, the speaker-view relay
// reaches the projected window, and nothing is requested from the network.
//   npm run build && npm test
import { chromium } from 'playwright-core';
import { serveDist } from './serve-dist.mjs';

const CHROME = process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const { server, port } = await serveDist();
const base = `http://127.0.0.1:${port}/`;
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });

let failures = 0;
const missingMedia = new Set(); // fallback clips and QR images not produced yet: reported, not failed
const ok = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`);
  else { failures++; console.log(`  ✗ ${msg}`); }
};
const external = [];
context.on('request', (req) => {
  const u = new URL(req.url());
  if (!['127.0.0.1', 'localhost'].includes(u.hostname) && !u.protocol.startsWith('data') && u.protocol !== 'blob:') external.push(req.url());
});

async function open(url) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) errors.push(m.text()); });
  page.on('response', (r) => {
    if (r.status() < 400) return;
    const path = new URL(r.url()).pathname;
    if (/\/(fallback|qr)\//.test(path)) missingMedia.add(path);
    else errors.push(`${r.status()} ${path}`);
  });
  await page.goto(url);
  return { page, errors };
}
const ready = (page) => page.waitForFunction(() => document.querySelector('.reveal.ready') && window.pdacDeck);
const go = (page, id) => page.evaluate((target) => {
  const deck = window.pdacDeck;
  const idx = [...document.querySelectorAll('.reveal .slides > section')].findIndex((s) => s.id === target);
  deck.slide(idx);
  if (deck.isPaused()) deck.togglePause(false);
}, id);
const current = (page) => page.evaluate(() => window.pdacDeck.getCurrentSlide().id);

// 1. Launcher
{
  console.log('Launcher');
  const { page, errors } = await open(base);
  const cards = await page.locator('.lx-card').count();
  ok(cards === 6, `shows ${cards} module cards`);
  ok(errors.length === 0, `no errors${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await page.close();
}

// 2. Every slide of every module: render, A, R
for (const m of ['1', '2', '3', '4', '5', 'gallery']) {
  console.log(`Module ${m}: every slide, A then R on interactives`);
  const { page, errors } = await open(`${base}?m=${m}`);
  await ready(page);
  const ids = await page.evaluate(() => [...document.querySelectorAll('.reveal .slides > section')].map((s) => s.id));
  let interactive = 0;
  for (const id of ids) {
    await go(page, id);
    const has = await page.evaluate(() => Boolean(window.pdacDeck.getCurrentSlide().querySelector('.pdac-interactive, .answer')));
    if (has) {
      interactive++;
      await page.keyboard.press('a');
      await page.keyboard.press('r');
    }
  }
  const broken = await page.locator('.pdac-error').count();
  ok(ids.length > 0, `${ids.length} slides, ${interactive} with interactives`);
  ok(broken === 0, `no interactive failed to load (${broken})`);
  ok(errors.length === 0, `no errors${errors.length ? ': ' + [...new Set(errors)].join(' | ') : ''}`);
  await page.close();
}

// 3. Presenter keys on Module 1
{
  console.log('Presenter keys (Module 1)');
  const { page, errors } = await open(`${base}?m=1`);
  await ready(page);

  await go(page, 'act2');
  await page.keyboard.press('PageDown');
  ok(await current(page) === 'act2' && await page.locator('#act2 .vr-reveal.is-on').count() === 1, 'PgDn reveals the answer inside the vote and stays on the slide');
  await page.keyboard.press('PageDown');
  ok((await page.locator('#act2 .vr-count').textContent()).includes('Case 2'), 'PgDn again moves to case 2');
  await page.keyboard.press('PageUp');
  await page.keyboard.press('PageUp');
  await page.keyboard.press('1'); await page.keyboard.press('1'); await page.keyboard.press('2');
  const tally = await page.locator('#act2 .vr-opt__count').allTextContents();
  ok(tally[0].startsWith('2') && tally[1].startsWith('1'), `number keys add votes (${tally.map((t) => t.replace(/\D+/g, '')).join('/')})`);
  await page.keyboard.press('r');

  await page.keyboard.press('t');
  await page.waitForTimeout(400);
  const chip = await page.locator('.cd-chip').isVisible();
  const time = chip ? await page.locator('.cd-time').textContent() : '';
  ok(chip && /^(10:00|9:5\d)$/.test(time), `T starts the slide's 10-minute timer (${time})`);
  await page.keyboard.press('x');
  ok(!(await page.locator('.cd-chip').isVisible()), 'X stops and hides the timer');

  await page.keyboard.press('k');
  ok(await page.locator('.cd-break').isVisible(), 'K opens the break screen');
  await page.keyboard.press('Escape');
  ok(!(await page.locator('.cd-break').isVisible()), 'Esc closes the break screen');

  await go(page, 'actors');
  await page.keyboard.press('g');
  await page.waitForTimeout(300);
  const terms = await page.locator('#pdac-glossary .gl-item dt').allTextContents();
  ok(terms.some((t) => /Ransomware/i.test(t)) && terms.some((t) => /Hacktivist/i.test(t)), `G shows this slide's terms (${terms.length}: ${terms.slice(0, 4).join(', ')}…)`);
  await page.keyboard.press('Escape');
  ok(!(await page.locator('#pdac-glossary').isVisible()), 'Esc closes the glossary');

  await go(page, 'numbers');
  await page.keyboard.press('i');
  ok((await page.locator('#pdac-itdepth .pdac-panel__body').textContent()).includes('Espionage'), 'I opens the IT depth panel with the slide\'s extras');
  await page.keyboard.press('i');

  await go(page, 'credentials');
  await page.keyboard.press('f');
  ok(await page.locator('.pdac-fallback').isVisible(), 'F opens the fallback viewer on a demo slide');
  await page.keyboard.press('Escape');
  ok(!(await page.locator('.pdac-fallback').isVisible()), 'Esc closes the fallback viewer');

  await page.keyboard.press('j');
  ok(await page.locator('.jump-to-slide-input').isVisible(), 'J opens jump-to-slide');
  await page.keyboard.type('notify');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  ok(await current(page) === 'notify', 'typing a slide id jumps to it');

  await go(page, 'home');
  await go(page, 'quiz1');
  await page.evaluate(() => window.pdacDeck.next());
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => window.pdacDeck.isPaused()), 'the recap slide opens blacked out');
  await page.keyboard.press('b');
  ok(!(await page.evaluate(() => window.pdacDeck.isPaused())), 'B reveals it');

  ok(errors.length === 0, `no errors${errors.length ? ': ' + [...new Set(errors)].join(' | ') : ''}`);

  // 4. Speaker-view relay: keys pressed in a receiver page act on the projected page.
  console.log('Speaker-view relay');
  await go(page, 'act1');
  const { page: rx } = await open(`${base}?m=1&receiver#/act1`);
  await ready(rx);
  ok(await rx.evaluate(() => document.documentElement.classList.contains('is-receiver')), 'receiver page hides presenter UI');
  await rx.keyboard.press('a');
  await page.waitForTimeout(400);
  ok(await page.locator('#act1 .mb-status').textContent() === '6 of 6 correct', 'A pressed in the speaker view shows the answer on the projector');
  await rx.keyboard.press('r');
  await page.waitForTimeout(300);
  await go(page, 'act2');
  await rx.keyboard.press('PageDown');
  await page.waitForTimeout(400);
  ok(await current(page) === 'act2' && await page.locator('#act2 .vr-reveal.is-on').count() === 1, 'PgDn in the speaker view steps inside the projector\'s interactive');

  // Mouse clicks on an interactive's own buttons, not just keys, must also relay.
  // (In real use the receiver iframe is kept on the same slide as the projector
  // by reveal.js's own notes-plugin sync; this test page stands alone, so move
  // it there first.)
  await go(rx, 'act2');
  const projectorCount = () => page.locator('#act2 .vr-count').textContent();
  const before = await projectorCount();
  await rx.locator('#act2 [data-act="next"]').click();
  await page.waitForTimeout(400);
  ok((await projectorCount()) !== before, `clicking "Next" in the speaker view moves the projector's interactive on too (was "${before}", now "${await projectorCount()}")`);
  const rxCount = await rx.locator('#act2 .vr-count').textContent();
  ok(rxCount === (await projectorCount()), 'the speaker view\'s own preview stays in step with the projector after that click');

  // The reverse direction: a demo button or in-slide key on the PROJECTOR must
  // show up in the speaker-view preview too (these fire no reveal.js event, so
  // the notes plugin alone never syncs them).
  await page.keyboard.press('r'); // reset the interactive on both pages
  await page.waitForTimeout(400);
  const previewCount = () => rx.locator('#act2 .vr-count').textContent();
  const beforeRev = await previewCount();
  await page.locator('#act2 [data-act="next"]').click();
  await page.waitForTimeout(400);
  ok((await previewCount()) !== beforeRev, `clicking "Next" on the projector advances the speaker view's preview too (was "${beforeRev}", now "${await previewCount()}")`);
  await page.keyboard.press('a');
  await page.waitForTimeout(400);
  ok(await rx.locator('#act2 .vr-reveal.is-on').count() === 1, 'A pressed on the projector reveals the answer in the speaker view');

  // Manual sorting on the match-board: clicking a chip then a column (a div, not
  // a button) must relay by the item's id, not its position, because placing an
  // item removes it from the pool and shifts the others. This is the real
  // facilitator action from the bug report.
  await go(page, 'sort');
  await go(rx, 'sort');
  await page.waitForTimeout(200);
  const readPlaced = (ctx) => ctx.evaluate(() => {
    const out = {};
    document.querySelectorAll('#sort .mb-cat').forEach((cat) => {
      const col = cat.getAttribute('data-cat');
      cat.querySelectorAll('[data-item]').forEach((chip) => { out[chip.getAttribute('data-item')] = col; });
    });
    return out;
  });
  const sortIds = await rx.evaluate(() => ({
    items: [...document.querySelectorAll('#sort .mb-pool [data-item]')].map((b) => b.getAttribute('data-item')),
    cols: [...document.querySelectorAll('#sort .mb-cat')].map((c) => c.getAttribute('data-cat')),
  }));
  const wantPlaced = {};
  for (let i = 0; i < 3; i++) {
    const item = sortIds.items[i], col = sortIds.cols[i % sortIds.cols.length];
    wantPlaced[item] = col;
    await rx.locator(`#sort [data-item="${item}"]`).first().click();
    await rx.waitForTimeout(120);
    await rx.locator(`#sort .mb-cat[data-cat="${col}"]`).first().click(); // the column drop zone
    await page.waitForTimeout(200);
  }
  await page.waitForTimeout(300);
  ok(JSON.stringify(await readPlaced(page)) === JSON.stringify(wantPlaced),
    `sorting items in the speaker view places the same items in the same columns on the projector (${JSON.stringify(await readPlaced(page))})`);
  await rx.close();
  await page.close();
}

// 5. Simulations and the sources panel
{
  console.log('Simulations and sources (E)');
  const { page, errors } = await open(`${base}?m=1`);
  await ready(page);

  await go(page, 'numbers');
  await page.keyboard.press('PageDown');
  ok(await current(page) === 'numbers' && await page.locator('#numbers .sp-card:not([hidden])').count() === 1, 'PgDn shows the first number\'s source and stays on the slide');
  await page.waitForTimeout(300);
  ok(await page.locator('#numbers .sp-card:not([hidden]) .sp-qr svg').count() === 1, 'the source card has a QR code, drawn locally');
  await page.keyboard.press('e');
  await page.waitForTimeout(400);
  const ev = await page.locator('#pdac-evidence .pdac-panel__body').textContent();
  ok(/Microsoft/.test(ev) && /Interaksyon/.test(ev) && /Quote checked/.test(ev), 'E lists the slide\'s sources with their quotes');
  ok(await page.locator('#pdac-evidence .ev-qr svg').count() >= 3, 'E shows a QR code for each source');
  await page.keyboard.press('Escape');
  ok(!(await page.locator('#pdac-evidence').isVisible()), 'Esc closes the sources panel');
  await page.keyboard.press('r');

  await go(page, 'cia');
  await page.keyboard.press('PageDown'); // plays "Secret broken"
  await page.keyboard.press('PageDown'); // finishes it
  ok(await current(page) === 'cia' && (await page.locator('#cia .cia-col[data-goal="secret"] .cia-status').textContent()).includes('Readable'), 'CIA lab: the clicker breaks Secret and stays on the slide');
  await page.keyboard.press('a');
  ok((await page.locator('#cia .cia-col[data-goal="ready"] .cia-status').textContent()).includes('back up'), 'CIA lab: A shows all three goals protected');
  const spill = await page.evaluate(() => [...document.querySelectorAll('#cia .cia-demo')].map((d) => {
    const box = d.getBoundingClientRect();
    return Math.max(...[...d.children].map((c) => c.getBoundingClientRect().bottom)) - box.bottom;
  }));
  ok(spill.every((px) => px <= 0), `CIA lab: every column's demo fits its box, nothing hidden under the verdict (${spill.map(Math.round).join(', ')} px)`);
  await page.keyboard.press('r');

  await go(page, 'paths');
  await page.keyboard.press('PageDown');
  ok(await current(page) === 'paths' && (await page.locator('#paths .ns-title').textContent()).includes('citizen opens'), 'Five doors: the clicker plays the next step on the map');
  await page.keyboard.press('a');
  ok(await page.locator('#paths .ns-summary').isVisible(), 'Five doors: A opens the summary table');
  await page.keyboard.press('r');
  ok(!(await page.locator('#paths .ns-summary').isVisible()) && (await page.locator('#paths .ns-title').textContent()).includes('Your office'), 'Five doors: R starts over');
  ok(errors.length === 0, `no errors${errors.length ? ': ' + [...new Set(errors)].join(' | ') : ''}`);
  await page.close();

  const m2 = await open(`${base}?m=2`);
  await ready(m2.page);
  await go(m2.page, 'attack-path');
  await m2.page.keyboard.press('PageDown');
  await m2.page.keyboard.press('PageDown');
  ok((await m2.page.locator('#attack-path .cb-verdict').textContent()).includes('reached the end'), 'Attack chain: with no defenses the attack reaches the end');
  await m2.page.keyboard.press('a');
  ok((await m2.page.locator('#attack-path .cb-verdict').textContent()).includes('Chain broken at 1'), 'Attack chain: with every defense on, it breaks at the first link');
  await go(m2.page, 'layers');
  await m2.page.keyboard.press('a');
  ok((await m2.page.locator('#layers .ly-count').textContent()).includes('0 of 10'), 'Layers: with every layer on, none of the ten attacks lands');

  // Module 2 activities follow the learner guide (Try it 2.1 and 2.3, worked example).
  await go(m2.page, 'spot');
  for (const key of ['PageDown', 'PageDown', 'PageDown']) await m2.page.keyboard.press(key); // reveal 1, case 2, reveal 2
  const both = await m2.page.locator('#spot .vr-opt.is-answer .vr-opt__label').allTextContents();
  ok(both.join(',') === 'People,Process' && (await m2.page.locator('#spot .vr-answer').textContent()).includes('People and process'), 'Spot the weakness: a two-part answer marks both options');
  await go(m2.page, 'phish-1');
  for (let i = 0; i < 7; i++) await m2.page.keyboard.press('PageDown'); // to message 4 and its reveal
  ok(await m2.page.locator('#phish-1 .pl-voice').count() === 1 && (await m2.page.locator('#phish-1 .pl-verdict').textContent()).includes('vishing'), 'Phish or legit: message 4 is a voicemail, revealed as vishing');
  await go(m2.page, 'worked-map');
  await m2.page.locator('#worked-map [data-el="p2"]').dispatchEvent('click');
  ok(await m2.page.locator('#worked-map .dfd-stride-row .dfd-letter:not(.is-off)').count() === 6 && await m2.page.locator('#worked-map .dfd-threats li').count() === 2, 'Booking map: a step lights all six STRIDE letters and lists its threats');
  await go(m2.page, 'report');
  await m2.page.keyboard.press('e');
  await m2.page.waitForTimeout(400);
  const ev2 = await m2.page.locator('#pdac-evidence .pdac-panel__body').textContent();
  ok(/Newsbytes/.test(ev2) && /LawPhil/.test(ev2) && await m2.page.locator('#pdac-evidence .ev-qr svg').count() === 2, 'E on "Where to report" quotes the ScamSafe article and RA 12010, with QR codes');
  await m2.page.keyboard.press('Escape');
  ok(m2.errors.length === 0, `no errors${m2.errors.length ? ': ' + [...new Set(m2.errors)].join(' | ') : ''}`);
  await m2.page.close();

  const g = await open(`${base}?m=gallery`);
  await ready(g.page);
  await go(g.page, 'g-password');
  await g.page.click('#g-password [data-pw="rsso2026"]');
  await g.page.waitForFunction(() => document.querySelector('#g-password .pw-times dd'), null, { timeout: 15000 });
  ok(await g.page.locator('#g-password .pw-score b').textContent() !== '', 'Password lab: zxcvbn loads from the local bundle and rates a sample');
  ok(g.errors.length === 0, `no errors${g.errors.length ? ': ' + [...new Set(g.errors)].join(' | ') : ''}`);
  await g.page.close();
}

// 5b. Modules 3 and 4 (built from their learner guides, 21 October 2026)
{
  console.log('Modules 3 and 4: simulations and activities');
  const m3 = await open(`${base}?m=3`);
  await ready(m3.page);
  const p3 = m3.page;

  await go(p3, 'lock-seal-sign');
  await p3.keyboard.press('PageDown');
  await p3.waitForTimeout(500);
  ok(await current(p3) === 'lock-seal-sign' && (await p3.locator('#lock-seal-sign .lss-caption .ns-k').textContent()).includes('Scene 1 of 10'), 'Lock, seal, sign: the clicker steps inside the demo (no nested slides)');
  await p3.keyboard.press('a');
  await p3.waitForFunction(() => document.querySelector('#lock-seal-sign .lss-caption .ns-k')?.textContent.includes('Scene 10'), null, { timeout: 10000 }).catch(() => {});
  const lss = await p3.locator('#lock-seal-sign .lss-verdict').allTextContents();
  ok(lss.some((t) => /Readable/.test(t)) && lss.some((t) => /Does not match/.test(t)) && lss.some((t) => /Not signed by the RSSO/.test(t)), `Lock, seal, sign: A runs all ten scenes with live crypto (${lss.length} verdicts)`);
  await p3.keyboard.press('r');

  await go(p3, 'try-3-1');
  await p3.waitForTimeout(300);
  await p3.keyboard.press('1'); await p3.keyboard.press('1'); await p3.keyboard.press('2');
  const votes = await p3.locator('#try-3-1 .ns-opt__n').allTextContents();
  ok(votes[0] === '2' && votes[1] === '1', `Try it 3.1: number keys vote on the prediction (${votes.slice(0, 3).join('/')})`);
  await p3.keyboard.press('PageDown');
  ok(await current(p3) === 'try-3-1' && await p3.locator('#try-3-1 .ns-opt.is-answer').count() === 1, 'Try it 3.1: → reveals the guide\'s answer and stays on the slide');
  await p3.keyboard.press('PageDown');
  await p3.waitForTimeout(300);
  ok((await p3.locator('#try-3-1 .ns-title').textContent()).includes('Default deny'), 'Try it 3.1: → again plays the control on the map');
  await p3.keyboard.press('r');

  await go(p3, 'check-3-1');
  await p3.keyboard.press('PageDown');
  ok(await current(p3) === 'check-3-1' && await p3.locator('#check-3-1 .ck-item.is-revealed').count() === 1, 'Check yourself: → reveals the first answer and stays on the slide');
  await p3.locator('#check-3-1 [data-check="3"]').click();
  ok(await p3.locator('#check-3-1 .ck-item.is-revealed').count() === 2, 'Check yourself: a click on a question shows its own answer');
  await p3.keyboard.press('a');
  ok(await p3.locator('#check-3-1 .ck-item.is-revealed').count() === 5 && (await p3.locator('#check-3-1 .ck-status').textContent()).includes('5 of 5'), 'Check yourself: A reveals all five answers');
  await p3.keyboard.press('r');
  ok(await p3.locator('#check-3-1 .ck-item.is-revealed').count() === 0, 'Check yourself: R hides them again');

  await go(p3, 'ws-task-a');
  ok(await p3.locator('#ws-task-a .rp-panel').isHidden(), 'Workshop: the model answer is hidden at the start of the task');
  await p3.keyboard.press('a');
  ok(await p3.locator('#ws-task-a .rp-panel').isVisible() && (await p3.locator('#ws-task-a .rp-panel').textContent()).includes('Default deny'), 'Workshop: A opens the model rule set over the slide');
  await p3.keyboard.press('r');
  ok(await p3.locator('#ws-task-a .rp-panel').isHidden(), 'Workshop: R closes it');

  await go(p3, 'fw-rules');
  await p3.keyboard.press('a');
  await p3.waitForTimeout(3600);
  ok((await p3.locator('#fw-rules .fw-log').textContent()).includes('6 of 6 as intended'), 'Firewall: A fixes the rules and all six connections are handled as intended');
  await p3.keyboard.press('r');

  await go(p3, 'try-3-3');
  await p3.locator('#try-3-3 [data-role="clerk"][data-fn="encode"]').click();
  await p3.locator('#try-3-3 [data-role="clerk"][data-fn="approve"]').click();
  ok(await p3.locator('#try-3-3 .rb-cell.is-conflict').count() === 2, 'Roles: encode plus approve for one role lights a conflict');
  await p3.keyboard.press('a');
  ok((await p3.locator('#try-3-3 .rb-conflicts').textContent()).includes('No conflicts') && (await p3.locator('#try-3-3 .rb-note').allTextContents()).includes('Assigned cases'), "Roles: A shows the guide's answer, with its notes, and no conflicts");
  ok(m3.errors.length === 0, `no errors${m3.errors.length ? ': ' + [...new Set(m3.errors)].join(' | ') : ''}`);
  await p3.close();

  const m4 = await open(`${base}?m=4`);
  await ready(m4.page);
  const p4 = m4.page;
  await go(p4, 'baseline');
  await p4.keyboard.press('a');
  ok((await p4.locator('#baseline .ly-count').textContent()).includes('0 of 10'), 'Endpoint baseline: with update, protect, encrypt and lock on, none of the ten attacks lands');
  await go(p4, 'try-4-2a');
  ok(await p4.locator('#try-4-2a .pl-browser').count() === 1, 'Safe or suspicious: screen 1 is a browser window');
  await p4.keyboard.press('PageDown');
  ok((await p4.locator('#try-4-2a .pl-verdict').textContent()).includes('Suspicious'), 'Safe or suspicious: → reveals the verdict and the clues');
  await go(p4, 'shadow-it');
  await p4.keyboard.press('2');
  await p4.keyboard.press('PageDown');
  ok(await p4.locator('#shadow-it .ns-opt.is-answer').count() === 1, 'Shadow IT: the prediction reveals its answer');
  await go(p4, 'audit-debrief');
  await p4.locator('#audit-debrief [data-tile="f1"]').click();
  ok((await p4.locator('#audit-debrief .rg-count').textContent()).includes('1 of 12') && (await p4.locator('#audit-debrief .rg-detail').textContent()).includes('B10'), 'Debrief: clicking a tile turns it over, counts it, and shows its evidence');
  await p4.keyboard.press('a');
  ok((await p4.locator('#audit-debrief .rg-count').textContent()).includes('12 of 12'), 'Debrief: A turns over all twelve findings');
  await go(p4, 'tlp');
  await p4.keyboard.press('e');
  await p4.waitForTimeout(400);
  const ev4 = await p4.locator('#pdac-evidence .pdac-panel__body').textContent();
  ok(/FIRST/.test(ev4) && /AMBER\+STRICT/.test(ev4) && await p4.locator('#pdac-evidence .ev-qr svg').count() === 1, 'E on TLP quotes FIRST\'s TLP 2.0 definitions, with a QR code');
  await p4.keyboard.press('Escape');
  ok(m4.errors.length === 0, `no errors${m4.errors.length ? ': ' + [...new Set(m4.errors)].join(' | ') : ''}`);
  await p4.close();
}

// 6. Bundled tools work offline, and the presenter keys that point to them
{
  console.log('Bundled tools (offline)');
  const b64 = (s) => encodeURIComponent(Buffer.from(s, 'utf8').toString('base64'));
  const chef = await open(`${base}tools/cyberchef/index.html#recipe=Defang_URL(true,true,true,%27Valid%20domains%20and%20full%20URLs%27)&input=${b64('https://dict-gov-ph.verify-portal.example/login')}`);
  await chef.page.waitForFunction(() => document.querySelector('#output-text .cm-content')?.innerText.includes('hxxps'), null, { timeout: 60000 }).catch(() => {});
  ok((await chef.page.locator('#output-text .cm-content').innerText().catch(() => '')).includes('hxxps[://]dict-gov-ph[.]verify-portal[.]example/login'), 'CyberChef runs from the laptop and defangs a link');
  await chef.page.close();

  const cvss = await open(`${base}tools/cvss-v4/index.html#CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N`);
  await cvss.page.waitForTimeout(800);
  ok(/9\.3\s*\/\s*Critical/.test(await cvss.page.locator('.score-line').innerText().catch(() => '')), 'CVSS 4.0 calculator runs from the laptop: the admin page scores 9.3 Critical');
  await cvss.page.close();

  const td = await context.request.get(`${base}tools/threat-dragon/rsso-booking-page.json`);
  const model = await td.json();
  const cells = model.detail.diagrams[0].cells;
  ok(model.version.startsWith('2.') && cells.flatMap((c) => c.data?.threats ?? []).length === 3 && cells.some((c) => c.shape === 'trust-boundary-box'), 'Threat Dragon model: the worked example with its three threats and both boundaries');

  const m2 = await open(`${base}?m=2`);
  await ready(m2.page);
  await go(m2.page, 'manage-vulns');
  ok(/^\d{1,3}(,\d{3})*$/.test((await m2.page.locator('#manage-vulns .kev-big b').textContent()).trim()), 'CISA known-exploited card shows the snapshot count');
  await go(m2.page, 'report');
  await m2.page.keyboard.press('k');
  await m2.page.waitForTimeout(300);
  ok(await m2.page.locator('.cd-break__extra pdac-qr-panel .qr-img').isVisible(), 'K after "Where to report": the break screen shows the phishing quiz QR code');
  await m2.page.keyboard.press('k');
  await m2.page.keyboard.press('l');
  await m2.page.waitForTimeout(200);
  const pollSet = JSON.parse((await import('node:fs')).readFileSync(new URL('../src/data/links.json', import.meta.url), 'utf8'))['live-poll']?.url;
  ok(pollSet ? await m2.page.locator('.pdac-qr-overlay').isVisible() : /No live poll yet/.test(await m2.page.locator('.pdac-toast').textContent()),
    pollSet ? 'L shows the live poll QR code' : 'L without a poll link says where to add it');
  ok(m2.errors.length === 0, `no errors${m2.errors.length ? ': ' + [...new Set(m2.errors)].join(' | ') : ''}`);
  await m2.page.close();
}

if (missingMedia.size) console.log(`Not recorded or generated yet (expected before the dry run): ${[...missingMedia].join(', ')}`);
console.log('Network');
ok(external.length === 0, `no requests left the machine${external.length ? ': ' + [...new Set(external)].join(', ') : ''}`);

await browser.close();
server.close();
console.log(failures ? `\nsmoke-test: ${failures} failure(s)` : '\nsmoke-test: all passed');
process.exit(failures ? 1 : 0);
