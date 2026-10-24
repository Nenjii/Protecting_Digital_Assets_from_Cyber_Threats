// The white-cell (facilitator) dashboard. Sees everything: both sides of every
// match on one screen, the live map, scores with their reasons, and the
// controls (start, next, pause, inject, end). A separate Room view (V) is safe
// to project during play. Reaches the server with the secret key in the URL.
import './styles.ts';
import type { FocusView, MatchSummary, PreviewSide, RoundReview, RubricSection, ServerMessage, WcView, WcCommand } from '../wire.ts';
import { clearSession, joinAsWc, listen, saveSession, savedSession, sendCommand, useStore } from './net.ts';
import { BAND_CLASS, buildMap, esc, ic, mmss, qrSvg, toast } from './ui.ts';
import type { MapSpec } from '../../src/sim/netmap.ts';

useStore('range.wc');
const app = document.getElementById('app')!;
const KEY = new URLSearchParams(location.search).get('key') ?? '';

let wcv: WcView | null = null;
let mapApi: ReturnType<typeof buildMap> | null = null;
let roomMode = false;
type ModalKind = 'scoring' | 'preview';
let modal: ModalKind | null = null;   // a reference panel over whatever is on screen
let modalDrawn: ModalKind | null = null; // drawn once per opening: redrawing each snapshot would reset its scroll
const qrCache = new Map<string, string>();
// map animation bookkeeping
let animSeen = new Set<string>(); // attack-feed ids already animated
let lastFocus = '';
let pulseAt: Record<string, number> = {}; // last pulse time per in-flight move

// ---------- boot ----------
boot();
async function boot(): Promise<void> {
  if (!KEY) { app.innerHTML = `<p class="wc-err">Open the dashboard link from the server (it carries a key).</p>`; return; }
  if (!savedSession()) {
    const r = await joinAsWc(KEY);
    if ('error' in r) { app.innerHTML = `<p class="wc-err">${esc(r.error)}</p>`; return; }
    saveSession(r.s);
  }
  buildSkeleton();
  listen(onMessage);
}

function onMessage(m: ServerMessage): void {
  if (m.type === 'hello') { if (!mapApi && m.map) initMap(m.map as MapSpec); }
  else if (m.type === 'view' && m.view.kind === 'wc') { wcv = m.view; update(); }
  else if (m.type === 'bye') { clearSession(); void boot(); } // stream refused — sign in again
}

function initMap(spec: MapSpec): void {
  mapApi = buildMap(spec, 'RSSO network');
  const host = document.getElementById('wc-map');
  if (host) { host.innerHTML = ''; host.append(mapApi.root); }
}

// ---------- skeleton (built once; map lives inside and is never innerHTML'd) ----------
function buildSkeleton(): void {
  app.innerHTML = `
    <header id="wc-top" class="wc-top"></header>
    <section id="wc-lobby" class="wc-lobby" hidden></section>
    <section id="wc-play" class="wc-play" hidden>
      <div id="wc-focus-head" class="wc-focus-head"></div>
      <div class="wc-grid">
        <div class="wc-side atk"><h3>Attackers</h3><div id="wc-attack-feed" class="wc-feed"></div></div>
        <div class="wc-center"><div id="wc-map" class="wc-map"></div><div id="wc-ledger" class="wc-ledger"></div></div>
        <div class="wc-side def"><h3>Defenders</h3><div id="wc-defend-feed" class="wc-feed"></div><div id="wc-duties" class="wc-duties"></div></div>
      </div>
      <div id="wc-strip" class="wc-strip"></div>
    </section>
    <section id="wc-debrief" class="wc-debrief" hidden></section>
    <section id="wc-room" class="wc-room" hidden></section>
    <div id="wc-scoring" class="modal-wrap" data-wc="scoring" hidden></div>`;
  app.addEventListener('click', onClick);
  window.addEventListener('keydown', onKey);
}

// ---------- controls ----------
async function wc(cmd: WcCommand): Promise<void> {
  const err = await sendCommand({ type: 'wc', cmd });
  if (err) toast(err);
}

async function onClick(e: MouseEvent): Promise<void> {
  const t = (e.target as HTMLElement).closest<HTMLElement>('[data-wc]');
  if (!t) return;
  const a = t.dataset.wc!;
  if (a === 'make') await wc({ kind: 'makeMatches', count: Number(t.dataset.count) });
  else if (a === 'start') await wc({ kind: 'start' });
  else if (a === 'next') await wc({ kind: 'next' });
  else if (a === 'pause') await wc({ kind: 'pause' });
  else if (a === 'resume') await wc({ kind: 'resume' });
  else if (a === 'end') { if (confirm('End the game and show results?')) await wc({ kind: 'end' }); }
  else if (a === 'reset') { if (confirm('Reset everything? All matches and scores are cleared.')) await wc({ kind: 'reset' }); }
  else if (a === 'focus') await wc({ kind: 'focus', matchId: t.dataset.match! });
  else if (a === 'inject') await wc({ kind: 'inject', matchId: wcv?.focusId ?? '', injectId: t.dataset.inject });
  else if (a === 'room') { modal = null; roomMode = !roomMode; update(); }
  else if (a === 'scoring') { toggleModal('scoring'); }
  else if (a === 'preview') { toggleModal('preview'); }
  else if (a === 'modal-noop') { /* clicks inside the panel stay inside it */ }
}

function onKey(e: KeyboardEvent): void {
  if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
  if (e.key === '?' || e.key === '/') { e.preventDefault(); toggleModal('scoring'); return; }
  if (e.key === 'p' || e.key === 'P') { e.preventDefault(); toggleModal('preview'); return; }
  // while a panel is open it owns the keyboard, so no hotkey behind it can fire
  if (modal) { if (e.key === 'Escape') { modal = null; update(); } return; }
  if (e.key >= '1' && e.key <= '9') { const id = `m${e.key}`; if (wcv?.matches.some((m) => m.id === id)) wc({ kind: 'focus', matchId: id }); }
  else if (e.key === ' ') { e.preventDefault(); wcv?.paused ? wc({ kind: 'resume' }) : wc({ kind: 'pause' }); }
  else if (e.key === 'v' || e.key === 'V') { modal = null; roomMode = !roomMode; update(); }
  else if (e.key === 'n' || e.key === 'N') { wc({ kind: 'next' }); }
  else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') switchFocus(e.key === 'ArrowRight' ? 1 : -1);
}

/** Room view is on the projector, and both panels name controls, signs and
 *  moves. Never open one over the other. */
function toggleModal(kind: ModalKind): void {
  if (roomMode && modal !== kind) { toast('Room view is projected — press V first.'); return; }
  modal = modal === kind ? null : kind;
  update();
}

function switchFocus(dir: number): void {
  if (!wcv) return;
  const ids = wcv.matches.map((m) => m.id);
  const i = ids.indexOf(wcv.focusId ?? ids[0]);
  const next = ids[(i + dir + ids.length) % ids.length];
  if (next) wc({ kind: 'focus', matchId: next });
}

// ---------- update per snapshot ----------
function update(): void {
  if (!wcv) return;
  const v = wcv;
  show('wc-lobby', v.phase === 'lobby' && !roomMode);
  show('wc-play', v.phase !== 'lobby' && v.phase !== 'over' && !roomMode);
  show('wc-debrief', v.phase === 'over' && !roomMode);
  show('wc-room', roomMode);
  show('wc-scoring', !!modal);
  if (modal && modal !== modalDrawn) {
    setHtml('wc-scoring', modal === 'scoring' ? scoringHtml(v.rubric) : previewHtml(v.preview));
    modalDrawn = modal;
  } else if (!modal && modalDrawn) { setHtml('wc-scoring', ''); modalDrawn = null; }
  renderTop(v);
  if (roomMode) { renderRoom(v); return; }
  if (v.phase === 'lobby') renderLobby(v);
  else if (v.phase === 'over') renderDebrief(v);
  else renderPlay(v);
}

function show(id: string, on: boolean): void { const el = document.getElementById(id); if (el) el.hidden = !on; }

function renderTop(v: WcView): void {
  const started = v.phase !== 'lobby';
  const controls = v.phase === 'lobby'
    ? `${[1, 2, 3, 4, 5, 6].map((n) => `<button class="btn sm" data-wc="make" data-count="${n}">${n}</button>`).join('')}
       <span class="sep"></span><button class="btn" data-wc="preview" title="What the teams see (P)">Consoles</button>
       <button class="btn" data-wc="scoring" title="Scoring reference (?)">Scoring</button>
       <button class="btn go" data-wc="start">Start ▶</button>`
    : `<button class="btn" data-wc="preview" title="What the teams see (P)">Consoles</button>
       <button class="btn" data-wc="scoring" title="Scoring reference (?)">Scoring</button>
       <button class="btn" data-wc="next">Next ▸</button>
       <button class="btn" data-wc="${v.paused ? 'resume' : 'pause'}">${v.paused ? 'Resume' : 'Pause'}</button>
       <button class="btn" data-wc="room">Room view</button>
       <button class="btn warn" data-wc="end">End</button>
       <button class="btn warn" data-wc="reset">Reset</button>`;
  setHtml('wc-top', `
    <div class="wc-title">RSSO Live <span class="wc-phase">${esc(v.phaseLabel)}</span> ${v.paused ? '<span class="paused">Paused</span>' : ''}</div>
    <div class="wc-clock">${ic('clock')} ${esc(v.clock.fictional)} ${started && v.clock.realLeftSec ? `· ${mmss(v.clock.realLeftSec)}` : ''}</div>
    <div class="wc-controls">${controls}</div>`);
}

function renderLobby(v: WcView): void {
  const rows = v.matches.map((m) => matchJoinCard(v.joinHost, m)).join('');
  setHtml('wc-lobby', `
    <div class="lobby-head">
      <h1>Teams join on <code>${esc(v.joinHost)}</code></h1>
      <p>Pick the number of matches above, then press Start. Each team enters its code, or scans its QR.</p>
    </div>
    <div class="lobby-grid">${rows || '<p class="muted">Choose how many matches (1–6) above.</p>'}</div>`);
  // fill QR images after the DOM exists
  for (const m of v.matches) { fillQr(`qr-${m.id}-a`, `http://${v.joinHost}/?code=${m.attackCode}`); fillQr(`qr-${m.id}-d`, `http://${v.joinHost}/?code=${m.defendCode}`); }
}

function matchJoinCard(host: string, m: MatchSummary): string {
  return `<div class="jcard">
    <h2>Match ${m.n}</h2>
    <div class="jside atk">
      <div class="jlabel">Attack · ${m.attackDevices} joined</div>
      <div class="jcode">${esc(m.attackCode)}</div>
      <div id="qr-${m.id}-a" class="jqr" role="img" aria-label="QR for attack code"></div>
    </div>
    <div class="jside def">
      <div class="jlabel">Defend · ${m.defendDevices} joined</div>
      <div class="jcode">${esc(m.defendCode)}</div>
      <div id="qr-${m.id}-d" class="jqr" role="img" aria-label="QR for defend code"></div>
    </div>
  </div>`;
}

async function fillQr(id: string, text: string): Promise<void> {
  let svg = qrCache.get(text);
  if (!svg) { svg = await qrSvg(text); qrCache.set(text, svg); }
  const host = document.getElementById(id);
  if (host && svg && !host.firstChild) host.innerHTML = svg;
}

function renderPlay(v: WcView): void {
  const f = v.focus;
  if (!f) { setHtml('wc-focus-head', '<p class="muted">No match selected.</p>'); return; }
  setHtml('wc-focus-head', `
    <div class="fh">
      <span class="fh-n">Match ${f.n}</span>
      <span class="fh-teams"><b class="atk">${esc(f.attackTeam)}</b> vs <b class="def">${esc(f.defendTeam)}</b></span>
      <span class="fh-score">Attack ${f.attackScore} · Defend ${f.defendScore}</span>
      <span class="fh-inject">${v.injects.map((i) => `<button class="btn sm" data-wc="inject" data-inject="${esc(i.id)}">${esc(i.label)}</button>`).join('')}</span>
    </div>`);
  setHtml('wc-attack-feed', feedHtml(f.attackFeed) + inflightHtml(f));
  setHtml('wc-defend-feed', feedHtml(f.defendFeed));
  setHtml('wc-duties', dutiesHtml(f));
  setHtml('wc-ledger', ledgerHtml(f));
  if (mapApi) {
    if (f.id !== lastFocus) { // switched match: reset the map's motion and history
      lastFocus = f.id;
      animSeen = new Set(f.attackFeed.map((x) => x.id));
      pulseAt = {};
      mapApi.resetAnims();
    }
    mapApi.apply(f.nodes);
    for (const item of f.attackFeed) { // a new attack line → fire its packet once
      if (item.anim && !animSeen.has(item.id)) { animSeen.add(item.id); mapApi.send(item.anim); }
    }
    const now = Date.now(); // keep running moves visibly alive
    for (const fl of f.inFlight) {
      if (fl.anim && now - (pulseAt[fl.id] ?? 0) > 1800) { pulseAt[fl.id] = now; mapApi.send(fl.anim); }
    }
  }
  setHtml('wc-strip', v.matches.map((m) => stripCard(m, m.id === f.id)).join(''));
}

function feedHtml(items: FocusView['attackFeed']): string {
  if (!items.length) return `<p class="muted">—</p>`;
  return `<ul class="feed">${[...items].reverse().map((f) => {
    const tag = f.tag
      ? (f.tagUrl ? ` <a class="att" href="${esc(f.tagUrl)}" target="_blank" rel="noreferrer" title="MITRE ATT&CK">${esc(f.tag)}</a>` : ` <span class="att">${esc(f.tag)}</span>`)
      : '';
    return `<li class="fitem ${BAND_CLASS[f.band]}"><span class="ft">${esc(f.t)}</span><span class="fx">${esc(f.text)}${tag}</span></li>`;
  }).join('')}</ul>`;
}
function inflightHtml(f: FocusView): string {
  if (!f.inFlight.length) return '';
  return `<div class="inflight">${f.inFlight.map((x) => `<div class="prog"><span>${esc(x.label)}</span><div class="bar"><i style="width:${x.pct}%"></i></div></div>`).join('')}</div>`;
}
function dutiesHtml(f: FocusView): string {
  const done = f.duties.filter((d) => d.done).length;
  return `<div class="duty-row"><b>Duties ${done}/${f.duties.length}</b> ${f.duties.map((d) => `<span class="duty-chip ${d.done ? 'done' : ''}">${d.done ? ic('check') : ''}${esc(d.label)}${d.note ? ` <i>${esc(d.note)}</i>` : ''}</span>`).join('')}</div>`;
}
function ledgerHtml(f: FocusView): string {
  const rows = f.ledger.length
    ? [...f.ledger].reverse().map((l) => `<li class="${l.who} ${l.pts < 0 ? 'neg' : 'pos'}"><span class="lp">${l.pts > 0 ? '+' : ''}${l.pts}</span> <span class="lr">${esc(l.reason)}</span>${l.link ? `<span class="ll">${esc(l.link)}</span>` : ''}</li>`).join('')
    : `<li class="muted">No points yet — the scoring, with its reason, shows here as teams play.</li>`;
  return `<div class="ledger"><h4>Scoring</h4><ul>${rows}</ul></div>`;
}

/** The after-game review: one panel per round, moves then points, so the
 *  facilitator can walk the room through the match without scrolling a feed. */
function reviewHtml(f: FocusView): string {
  if (!f.review?.length) return ledgerHtml(f);
  const running = { attack: 0, defend: 0 };
  const rounds = f.review.map((r) => {
    running.attack += r.attackPts;
    running.defend += r.defendPts;
    return roundPanel(r, { ...running });
  }).join('');
  return `<div class="review"><h3>Round by round</h3>${rounds}</div>`;
}

function roundPanel(r: RoundReview, after: { attack: number; defend: number }): string {
  const quiet = !r.moves.length && !r.scores.length;
  const side = (who: string) => (who === 'attack' ? 'atk' : 'def');
  const moves = r.moves.length
    ? `<ul class="rv-moves">${r.moves.map((x) => `<li class="${side(x.who)}"><span class="rv-t">${esc(x.t)}</span><span>${esc(x.label)}${x.note ? ` <i>— ${esc(x.note)}</i>` : ''}</span></li>`).join('')}</ul>`
    : '';
  const scores = r.scores.length
    ? `<ul class="rv-scores">${r.scores.map((l) => `<li class="${side(l.who)} ${l.pts < 0 ? 'neg' : 'pos'}"><span class="lp">${l.pts > 0 ? '+' : ''}${l.pts}</span><span class="lr">${esc(l.reason)}</span>${l.link ? `<span class="ll">${esc(l.link)}</span>` : ''}</li>`).join('')}</ul>`
    : '';
  return `<section class="rv">
    <header class="rv-head">
      <b class="rv-label">${esc(r.label)}</b>
      <span class="rv-pts"><b class="atk">${r.attackPts > 0 ? '+' : ''}${r.attackPts}</b> attack · <b class="def">${r.defendPts > 0 ? '+' : ''}${r.defendPts}</b> defend</span>
      <span class="rv-run">running ${after.attack} · ${after.defend}</span>
    </header>
    ${quiet ? `<p class="muted">Nothing played this round.</p>` : `${moves}${scores}`}
  </section>`;
}

function stripCard(m: MatchSummary, active: boolean): string {
  return `<button class="strip-card ${active ? 'on' : ''}" data-wc="focus" data-match="${esc(m.id)}">
    <span class="sc-n">${m.n}</span>
    <span class="sc-teams"><b class="atk">${esc(m.attackTeam)}</b><b class="def">${esc(m.defendTeam)}</b></span>
    <span class="sc-score">${m.attackScore}·${m.defendScore}</span>
    ${m.alertCount ? `<span class="sc-alert">${m.alertCount}</span>` : ''}
  </button>`;
}

/** The scoring reference. The rows arrive with the view; nothing about the
 *  rules is written into this bundle. */
function scoringHtml(rubric: RubricSection[]): string {
  const sections = rubric.map((sec) => `
    <section class="sc-sec">
      <h3>${esc(sec.title)}</h3>
      ${sec.blurb ? `<p class="sc-blurb">${esc(sec.blurb)}</p>` : ''}
      <ul class="sc-rows">${sec.rows.map((r) => `
        <li class="${r.who === 'attack' ? 'atk' : 'def'}">
          <span class="sc-v">${esc(r.value)}</span>
          <span class="sc-l">${esc(r.label)}${r.note ? `<i>${esc(r.note)}</i>` : ''}</span>
        </li>`).join('')}</ul>
    </section>`).join('');
  return `<div class="modal" role="dialog" aria-modal="true" aria-label="Scoring" data-wc="modal-noop">
    <header class="modal-head">
      <h2>Scoring</h2>
      <button class="btn sm" data-wc="scoring">Close</button>
    </header>
    <div class="modal-body">${sections}</div>
    <p class="modal-foot">Every point is awarded as it is earned, with its reason, and shows in the ledger. Esc or ? to close.</p>
  </div>`;
}

/** What each side sees and the choices it has to make, side by side. Same
 *  generic renderer as the rubric: the words all arrive with the view. */
function previewHtml(preview: PreviewSide[]): string {
  const cols = preview.map((p) => `
    <section class="pv ${p.key === 'attack' ? 'atk' : 'def'}">
      <h3>${esc(p.title)}</h3>
      <p class="pv-brief">${esc(p.brief)}</p>
      ${p.groups.map((g) => `
        <div class="pv-g">
          <h4>${esc(g.name)}</h4>
          <ul class="pv-rows">${g.rows.map((r) => `
            <li>
              <span class="pv-l">${esc(r.label)}</span>
              <span class="pv-v">${esc(r.value)}</span>
              ${r.note ? `<i>${esc(r.note)}</i>` : ''}
            </li>`).join('')}</ul>
        </div>`).join('')}
    </section>`).join('');
  return `<div class="modal wide" role="dialog" aria-modal="true" aria-label="What the teams see" data-wc="modal-noop">
    <header class="modal-head">
      <h2>What the teams see</h2>
      <button class="btn sm" data-wc="preview">Close</button>
    </header>
    <div class="modal-body pv-body">${cols}</div>
    <p class="modal-foot">Each side sees only its own console and its own briefing. Esc or P to close.</p>
  </div>`;
}

function renderDebrief(v: WcView): void {
  const lb = v.leaderboard;
  const f = v.focus;
  setHtml('wc-debrief', `
    <div class="debrief-grid">
      <div class="lb">
        <h2>Defenders</h2><ol>${(lb?.defend ?? []).map((r) => `<li><span>${esc(r.team)}</span><b>${r.score}</b></li>`).join('')}</ol>
        <h2>Attackers</h2><ol>${(lb?.attack ?? []).map((r) => `<li><span>${esc(r.team)}</span><b>${r.score}</b></li>`).join('')}</ol>
        <p class="muted">← → to review each match</p>
      </div>
      <div class="debrief-focus">
        ${f ? `<h2>Match ${f.n}: ${esc(f.attackTeam)} vs ${esc(f.defendTeam)}</h2>
        ${f.outcome ? `<ul class="outcome-lines">${f.outcome.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>` : ''}
        ${reviewHtml(f)}
        <div class="debrief-feeds"><div><h4>Attack</h4>${feedHtml(f.attackFeed)}</div><div><h4>Defend</h4>${feedHtml(f.defendFeed)}</div></div>` : ''}
      </div>
    </div>`);
}

function renderRoom(v: WcView): void {
  setHtml('wc-room', `
    <div class="room">
      <div class="room-phase">${esc(v.phaseLabel)} ${v.paused ? '· Paused' : ''}</div>
      <div class="room-clock">${esc(v.clock.fictional)}${v.clock.realLeftSec ? ` · ${mmss(v.clock.realLeftSec)}` : ''}</div>
      <div class="room-matches">${v.matches.map((m) => `
        <div class="room-card"><div class="rm-n">Match ${m.n}</div>
          <div class="rm-teams"><span class="atk">${esc(m.attackTeam)}</span><span class="vs">vs</span><span class="def">${esc(m.defendTeam)}</span></div>
          <div class="rm-score">${m.attackScore} · ${m.defendScore}</div></div>`).join('')}</div>
      <div class="room-hint">Press V for your full dashboard</div>
    </div>`);
}

function setHtml(id: string, html: string): void { const el = document.getElementById(id); if (el) el.innerHTML = html; }
