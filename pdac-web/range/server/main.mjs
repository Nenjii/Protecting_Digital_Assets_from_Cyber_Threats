// RSSO Live game server. Node's built-in http only: no framework, no internet.
// - Serves the built team console (/) and white-cell console (/wc?key=...).
// - Teams join with an 8-char code; the white cell with a secret key.
// - Live updates over Server-Sent Events, filtered per role by the engine.
// - Commands arrive as small JSON POSTs; identity comes from the session, not
//   the body. Rules and reasons live here and never reach a participant device.
//
//   node range/server/main.mjs [--port 8080] [--resume]
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { networkInterfaces } from 'node:os';
import {
  loadScenario, attachAttackTags, newGame, makeMatches, startGame, nextPhase, pauseGame, resumeGame,
  endGame, resetGame, playTeam, triage, pushInject, setMatchName, tick,
  playerView, wcView,
} from '../engine/engine.ts';

const ROOT = fileURLToPath(new URL('..', import.meta.url)); // range/
const DIST = join(ROOT, '..', 'range-dist'); // built clients
const SAVE_DIR = join(ROOT, '..', 'range-save');
const SAVE_FILE = join(SAVE_DIR, 'state.json');

const args = process.argv.slice(2);
const PORT = Number(argVal('--port') ?? 8080);
const RESUME = args.includes('--resume');
function argVal(flag) { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined; }

const WC_KEY = process.env.RANGE_WC_KEY || randomBytes(9).toString('base64url');
const HOST_OVERRIDE = argVal('--host'); // force a specific interface if auto-pick is wrong
const ADDRS = lanAddresses();
const LAN = HOST_OVERRIDE || ADDRS[0]?.address || '127.0.0.1';
const HOST = `${LAN}:${PORT}`;

const scenario = loadScenario(JSON.parse(readFileSync(new URL('../scenario/portal-week.json', import.meta.url), 'utf8')));
// Tag the attack moves with real MITRE ATT&CK technique names + pages, from the
// data the deck already builds (npm run attack). Public info; safe to show all.
try {
  const attackData = JSON.parse(readFileSync(new URL('../../src/data/attack.json', import.meta.url), 'utf8'));
  attachAttackTags(scenario, attackData.techniques ?? {});
} catch { /* no attack.json yet: moves keep their fallback names */ }
let game = newGame(scenario, { joinHost: HOST });

// ---- sessions & live connections ----
const sessions = new Map(); // sessionId -> { role, matchId, side }
const clients = new Map(); // sessionId -> { res, role, matchId, side }

// ---- abuse guards ----
const ipFails = new Map(); // ip -> { count, until }
const cmdTimes = new Map(); // sessionId -> [timestamps]

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.json': 'application/json; charset=utf-8', '.ico': 'image/x-icon', '.map': 'application/json; charset=utf-8',
};

const CSP = [
  "default-src 'self'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data:",
  "font-src 'self'", "connect-src 'self'", "script-src 'self'", "frame-ancestors 'none'", "base-uri 'none'",
].join('; ');

function secureHeaders(extra = {}) {
  return {
    'Content-Security-Policy': CSP,
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control': 'no-store',
    ...extra,
  };
}

function send(res, status, body, headers = {}) {
  res.writeHead(status, secureHeaders(headers));
  res.end(body);
}
function sendJson(res, status, obj) {
  send(res, status, JSON.stringify(obj), { 'Content-Type': 'application/json; charset=utf-8' });
}

function clientIp(req) {
  return (req.socket.remoteAddress || 'unknown').replace(/^::ffff:/, '');
}

function constEq(a, b) {
  const ab = Buffer.from(String(a)); const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  try { return timingSafeEqual(ab, bb); } catch { return false; }
}

/** Find a match+side whose code equals the given one. Constant-time-ish: checks all. */
function matchByCode(code) {
  let found = null;
  for (const m of game.matches) {
    if (constEq(m.attackCode, code)) found = { matchId: m.id, side: 'attack' };
    if (constEq(m.defendCode, code)) found = { matchId: m.id, side: 'defend' };
  }
  return found;
}

function readBody(req, cap = 4096) {
  return new Promise((resolve, reject) => {
    let data = ''; let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > cap) { reject(new Error('too big')); req.destroy(); return; }
      data += c;
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// ---- SSE ----
function sseOpen(req, res, session, sessionId) {
  res.writeHead(200, secureHeaders({
    'Content-Type': 'text/event-stream; charset=utf-8',
    Connection: 'keep-alive',
  }));
  res.write(`retry: 2000\n`);
  res.write(`data: ${JSON.stringify({ type: 'hello', role: session.role, map: scenario.map })}\n\n`);
  clients.set(sessionId, { res, ...session });
  pushOne(sessionId);
  req.on('close', () => { clients.delete(sessionId); });
}

function viewFor(session) {
  if (session.role === 'wc') return wcView(game, scenario, { deviceCounts: deviceCounts() });
  return playerView(game, scenario, { matchId: session.matchId, side: session.side });
}

function pushOne(sessionId) {
  const c = clients.get(sessionId);
  if (!c) return;
  const view = viewFor(c);
  if (!view) return;
  try { c.res.write(`data: ${JSON.stringify({ type: 'view', view })}\n\n`); } catch { clients.delete(sessionId); }
}

function broadcast() {
  for (const id of clients.keys()) pushOne(id);
}

function deviceCounts() {
  const out = {};
  for (const m of game.matches) out[m.id] = { attack: 0, defend: 0 };
  for (const c of clients.values()) {
    if (c.role === 'attack' || c.role === 'defend') {
      const row = out[c.matchId]; if (row) row[c.side] += 1;
    }
  }
  return out;
}

// ---- command handling ----
function rateOk(sessionId) {
  const now = Date.now();
  const arr = (cmdTimes.get(sessionId) ?? []).filter((t) => now - t < 3000);
  arr.push(now);
  cmdTimes.set(sessionId, arr);
  return arr.length <= 12; // <= 12 commands / 3s per session
}

function handleCommand(session, cmd) {
  if (session.role === 'wc') return handleWc(cmd?.cmd ?? cmd);
  if (!cmd || typeof cmd.type !== 'string') return 'Bad command.';
  if (cmd.type === 'setName') return setMatchName(game, session.matchId, session.side, cmd.name);
  if (cmd.type === 'triage') {
    if (session.side !== 'defend') return 'Only defenders classify events.';
    return triage(game, scenario, session.matchId, String(cmd.card), !!cmd.asReal);
  }
  if (cmd.type === 'play') {
    return playTeam(game, scenario, { matchId: session.matchId, side: session.side },
      { action: String(cmd.action), target: cmd.target, reason: cmd.reason });
  }
  return 'Unknown command.';
}

function handleWc(cmd) {
  if (!cmd || typeof cmd.kind !== 'string') return 'Bad white-cell command.';
  switch (cmd.kind) {
    case 'makeMatches': return makeMatches(game, scenario, Number(cmd.count) || 1);
    case 'start': return startGame(game, scenario);
    case 'next': return nextPhase(game, scenario);
    case 'pause': pauseGame(game); return null;
    case 'resume': resumeGame(game); return null;
    case 'focus': { const m = game.matches.find((x) => x.id === cmd.matchId); if (m) game.focusId = m.id; return null; }
    case 'inject': return pushInject(game, scenario, String(cmd.matchId), cmd.injectId, cmd.text);
    case 'force': return playTeam(game, scenario, { matchId: String(cmd.matchId), side: cmd.side }, { action: String(cmd.action), target: cmd.target }, { force: true });
    case 'end': endGame(game, scenario); return null;
    case 'reset': {
      resetGame(game, scenario);
      // End every team session, but keep the facilitator signed in — their own
      // Reset must not log them out of the dashboard.
      for (const [id, sess] of sessions) if (sess.role !== 'wc') sessions.delete(id);
      // Tell the teams on their open streams (a 401 body is never parsed by
      // EventSource, so a dead session has to be announced before it closes).
      for (const [id, c] of clients) {
        if (c.role === 'wc') continue;
        try { c.res.write(`data: ${JSON.stringify({ type: 'bye', reason: 'reset' })}\n\n`); c.res.end(); } catch { /* already gone */ }
        clients.delete(id);
      }
      return null;
    }
    default: return 'Unknown white-cell command.';
  }
}

// ---- static files ----
async function serveStatic(res, urlPath) {
  let rel = decodeURIComponent(urlPath);
  if (rel === '/' ) rel = '/play.html';
  if (rel === '/wc') rel = '/wc.html';
  let p = normalize(join(DIST, rel));
  if (!p.startsWith(DIST)) return send(res, 403, 'no');
  try {
    if ((await stat(p)).isDirectory()) p = join(p, 'index.html');
    const body = await readFile(p);
    res.writeHead(200, secureHeaders({ 'Content-Type': TYPES[extname(p)] ?? 'application/octet-stream' }));
    res.end(body);
  } catch {
    send(res, 404, 'Not found');
  }
}

// ---- request router ----
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const path = url.pathname;
  const ip = clientIp(req);

  if (path === '/favicon.ico') { res.writeHead(204, secureHeaders()); return res.end(); }

  // public: the network map (no answers)
  if (req.method === 'GET' && path === '/map') return sendJson(res, 200, scenario.map);

  // white-cell page requires the key
  if (req.method === 'GET' && (path === '/wc' || path === '/wc.html')) {
    if (!constEq(url.searchParams.get('key') ?? '', WC_KEY)) return send(res, 403, 'Forbidden');
    return serveStatic(res, '/wc.html');
  }

  // join
  if (req.method === 'POST' && path === '/join') {
    const block = ipFails.get(ip);
    if (block && block.until > Date.now()) return sendJson(res, 429, { error: 'Too many tries. Wait a minute.' });
    let body; try { body = JSON.parse(await readBody(req)); } catch { return sendJson(res, 400, { error: 'Bad request.' }); }
    if (body.wcKey !== undefined) {
      if (!constEq(body.wcKey, WC_KEY)) return fail(ip, res);
      const id = randomBytes(18).toString('base64url');
      sessions.set(id, { role: 'wc' });
      return sendJson(res, 200, { s: id, role: 'wc' });
    }
    const code = String(body.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    const hit = matchByCode(code);
    if (!hit) return fail(ip, res);
    ipFails.delete(ip);
    const id = randomBytes(18).toString('base64url');
    sessions.set(id, { role: hit.side, matchId: hit.matchId, side: hit.side });
    return sendJson(res, 200, { s: id, role: hit.side, matchId: hit.matchId });
  }

  // live events
  if (req.method === 'GET' && path === '/events') {
    const id = url.searchParams.get('s') ?? '';
    const session = sessions.get(id);
    if (!session) return send(res, 401, 'retry: 5000\ndata: {"type":"bye","reason":"unknown session"}\n\n', { 'Content-Type': 'text/event-stream' });
    return sseOpen(req, res, session, id);
  }

  // commands
  if (req.method === 'POST' && path === '/cmd') {
    const id = url.searchParams.get('s') ?? '';
    const session = sessions.get(id);
    if (!session) return sendJson(res, 401, { error: 'Session expired. Reload to rejoin.' });
    if (!rateOk(id)) return sendJson(res, 429, { error: 'Slow down.' });
    let cmd; try { cmd = JSON.parse(await readBody(req)); } catch { return sendJson(res, 400, { error: 'Bad request.' }); }
    const err = handleCommand(session, cmd);
    broadcast();
    return sendJson(res, 200, err ? { error: err } : { ok: true });
  }

  if (req.method === 'GET') return serveStatic(res, path);
  send(res, 405, 'Method not allowed');
});

function fail(ip, res) {
  const rec = ipFails.get(ip) ?? { count: 0, until: 0 };
  rec.count += 1;
  if (rec.count >= 10) { rec.until = Date.now() + 60_000; rec.count = 0; }
  ipFails.set(ip, rec);
  return sendJson(res, 403, { error: 'That code did not work.' });
}

// ---- ticking & autosave ----
setInterval(() => { tick(game, scenario, Date.now()); broadcast(); }, 500);
setInterval(saveState, 5000);
setInterval(() => { for (const c of clients.values()) { try { c.res.write(': ping\n\n'); } catch {} } }, 15000);

async function saveState() {
  try {
    await mkdir(SAVE_DIR, { recursive: true });
    await writeFile(SAVE_FILE, JSON.stringify({ game, savedAt: Date.now() }), 'utf8');
  } catch (e) { /* non-fatal */ }
}

if (RESUME && existsSync(SAVE_FILE)) {
  try {
    const saved = JSON.parse(readFileSync(SAVE_FILE, 'utf8'));
    if (saved.game) { game = saved.game; game.joinHost = HOST; game.clock.running = false; console.log('Resumed saved game (paused).'); }
  } catch { console.log('Could not read the saved game; starting fresh.'); }
}

/** Every non-internal IPv4 address, so the facilitator can pick the one teams
 *  can reach (Wi-Fi, Ethernet, or a phone hotspot). Hotspot-style ranges first. */
function lanAddresses() {
  const out = [];
  for (const [name, list] of Object.entries(networkInterfaces())) {
    for (const ni of list ?? []) {
      if (ni.family === 'IPv4' && !ni.internal) out.push({ name, address: ni.address });
    }
  }
  const score = (a) => (/^192\.168\.|^172\.20\./.test(a.address) ? 0 : 1); // hotspots are usually 192.168.x / 172.20.x
  return out.sort((a, b) => score(a) - score(b));
}

if (!existsSync(DIST)) {
  console.error(`\n  The clients are not built yet. Run:  npm run range:build\n  (looked in ${DIST})\n`);
}

server.listen(PORT, '0.0.0.0', () => {
  const line = '─'.repeat(54);
  console.log(`\n${line}`);
  console.log('  RSSO Live — attack & defend');
  console.log(line);
  console.log(`  Teams join on:   http://${HOST}`);
  console.log(`  Your dashboard:  http://${HOST}/wc?key=${WC_KEY}`);
  const others = ADDRS.filter((a) => a.address !== LAN);
  if (others.length) {
    console.log(`  If teams can't reach it, try another interface (same Wi-Fi):`);
    for (const a of others) console.log(`     http://${a.address}:${PORT}  (${a.name})  — then restart with --host ${a.address}`);
  }
  console.log(`  Tip: a phone hotspot works on ANY venue (no internet needed) and`);
  console.log(`       avoids "client isolation" that blocks device-to-device Wi-Fi.`);
  console.log(`${line}\n`);
});
