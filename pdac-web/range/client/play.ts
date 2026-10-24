// The team console (attacker or defender). Computer-first, folds to one column
// on a phone. The server sends only this team's own view; we render it and send
// button presses back. No rules, no opponent moves, ever arrive here.
import './styles.ts';
import type { ActionCard, PlayerView, ServerMessage } from '../wire.ts';
import { clearSession, joinWithCode, listen, saveSession, savedSession, sendCommand, useStore } from './net.ts';
import { BAND_CLASS, esc, ic, mmss, toast } from './ui.ts';

useStore('range.team');
const app = document.getElementById('app')!;
let view: PlayerView | null = null;
let expandReason: string | null = null; // duty id awaiting a reason
let es: EventSource | null = null;
// HUD bookkeeping: the server sends the time left but not the phase's length,
// so we remember the longest we have seen this phase and drain against that.
let barKey = '';
let barFull = 0;
let lastScore: number | null = null;
let scoreDelta = 0;

// Every move is irreversible and most spend a budget of 3–4, so nothing commits
// on a single tap: the move is held here and the team is asked to confirm it.
type Pending =
  | { kind: 'play'; action: string; label: string; isDuty: boolean; reason?: string; reasonText?: string }
  | { kind: 'triage'; card: string; asReal: boolean; label: string };
let pending: Pending | null = null;

// ---------- boot ----------
const urlCode = new URLSearchParams(location.search).get('code');
if (savedSession()) connect();
else if (urlCode) autoJoin(urlCode);
else renderJoin();

async function autoJoin(code: string): Promise<void> {
  const r = await joinWithCode(code.toUpperCase());
  if ('error' in r) { renderJoin(r.error); return; }
  saveSession(r.s);
  connect();
}

function connect(): void {
  es?.close();
  es = listen(onMessage);
  if (!es) { renderJoin(); return; }
}

function onMessage(m: ServerMessage): void {
  if (m.type === 'view' && m.view.kind === 'player') {
    // a held move belongs to the phase it was chosen in; drop it if time moved on
    if (view && pending && (view.phase !== m.view.phase || view.round !== m.view.round)) pending = null;
    view = m.view;
    render();
  }
  else if (m.type === 'bye') {
    es?.close();
    view = null; pending = null; expandReason = null; lastScore = null; scoreDelta = 0;
    clearSession();
    renderJoin('The game was reset. Enter your new code.');
  }
}

// ---------- join ----------
function renderJoin(msg = ''): void {
  app.innerHTML = `
    <div class="join">
      <div class="join-card">
        <h1>RSSO Live</h1>
        <p class="join-sub">Attack &amp; defend · a fictional office</p>
        ${msg ? `<p class="join-msg">${esc(msg)}</p>` : ''}
        <label for="code">Enter your team code</label>
        <input id="code" inputmode="latin" autocomplete="off" autocapitalize="characters"
               spellcheck="false" maxlength="8" placeholder="8 letters & numbers">
        <button id="joinBtn" class="btn big">Join</button>
        <p class="join-hint">Your facilitator shows the code on screen.</p>
      </div>
    </div>`;
  const input = document.getElementById('code') as HTMLInputElement;
  const go = async () => {
    const code = input.value.trim().toUpperCase();
    if (code.length < 4) { toast('Type your team code.'); return; }
    const r = await joinWithCode(code);
    if ('error' in r) { toast(r.error); return; }
    saveSession(r.s);
    connect();
  };
  document.getElementById('joinBtn')!.addEventListener('click', go);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  input.focus();
}

// ---------- game render ----------
app.addEventListener('click', onClick);

async function onClick(e: MouseEvent): Promise<void> {
  const t = (e.target as HTMLElement).closest<HTMLElement>('[data-cmd]');
  if (!t || !view) return;
  const cmd = t.dataset.cmd;
  if (cmd === 'noop') return; // clicks inside the confirm sheet must not reach its backdrop
  if (cmd === 'rename') {
    const name = prompt('Team name', view.team);
    if (name) await sendCommand({ type: 'setName', name });
    return;
  }
  if (cmd === 'play') {
    const action = t.dataset.action!;
    const needReason = t.dataset.reason === '1';
    if (needReason) { expandReason = expandReason === action ? null : action; render(); return; }
    pending = { kind: 'play', action, label: t.dataset.label ?? action, isDuty: t.dataset.duty === '1' };
    render();
    return;
  }
  if (cmd === 'reason') {
    pending = {
      kind: 'play', action: t.dataset.duty!, label: t.dataset.label ?? t.dataset.duty!, isDuty: true,
      reason: t.dataset.sign!, reasonText: t.dataset.reasontext ?? '',
    };
    render();
    return;
  }
  if (cmd === 'triage') {
    pending = { kind: 'triage', card: t.dataset.card!, asReal: t.dataset.real === '1', label: t.dataset.label ?? '' };
    render();
    return;
  }
  if (cmd === 'cancel') { pending = null; expandReason = null; render(); return; }
  if (cmd === 'confirm') await commitPending();
}

/** Send the held move. Clears it either way; the server has the last word. */
async function commitPending(): Promise<void> {
  const p = pending;
  if (!p) return;
  pending = null;
  expandReason = null;
  render();
  const err = p.kind === 'triage'
    ? await sendCommand({ type: 'triage', card: p.card, asReal: p.asReal })
    : await sendCommand({ type: 'play', action: p.action, reason: p.reason });
  if (err) toast(err);
}

// Enter commits, Esc backs out — teams on laptops never have to reach for the mouse.
window.addEventListener('keydown', (e) => {
  if (!pending) return;
  if (e.key === 'Escape') { pending = null; render(); }
  else if (e.key === 'Enter') { e.preventDefault(); void commitPending(); }
});

function render(): void {
  if (!view) return;
  const v = view;
  const side = v.role === 'attack' ? 'attack' : 'defend';
  scoreDelta = lastScore === null ? 0 : v.score - lastScore;
  lastScore = v.score;
  app.className = `game side-${side}`;
  app.innerHTML = `
    ${header(v)}
    ${v.message ? `<section class="brief ${v.phase === 'brief' ? 'is-brief' : ''}">${esc(v.message)}</section>` : ''}
    <main class="board">
      <section class="col-actions">
        ${v.budget ? budget(v) : ''}
        ${side === 'defend' && v.duties ? duties(v) : ''}
        ${side === 'defend' && v.triage && v.triage.length ? triage(v) : ''}
        ${side === 'attack' && v.inFlight.length ? inflight(v) : ''}
        ${actions(v)}
      </section>
      <section class="col-feed">
        <h2>${side === 'attack' ? 'Your results' : 'What you see'}</h2>
        ${feed(v)}
      </section>
    </main>
    ${v.outcome ? outcome(v) : ''}
    ${pending ? sheet(v, pending) : ''}`;
}

/** The commit step. Asks in the team's own language and says what it costs,
 *  because no move here can be taken back. */
function sheet(v: PlayerView, p: Pending): string {
  let q: string;
  let yes: string;
  let cost: string;
  if (p.kind === 'triage') {
    q = 'Is this your call?';
    yes = p.asReal ? 'Yes — a sign' : 'Yes — normal';
    cost = 'This is scored, and you cannot change it afterwards.';
  } else if (p.isDuty) {
    q = 'Is this your response?';
    yes = 'Yes — do it';
    cost = `It goes in the record at ${v.clock.fictional}. Doing it on time is scored.`;
  } else if (v.role === 'attack') {
    q = 'Is this your attack?';
    yes = 'Yes — play it';
    cost = moveCost(v, 'move');
  } else if (v.phase === 'prepare') {
    q = 'Is this your fix?';
    yes = 'Yes — lock it in';
    cost = moveCost(v, 'pick');
  } else {
    q = 'Is this your response?';
    yes = 'Yes — play it';
    cost = moveCost(v, 'move');
  }
  return `<div class="sheet-wrap" data-cmd="cancel">
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(q)}" data-cmd="noop">
      <h2 class="sheet-q">${esc(q)}</h2>
      <p class="sheet-move">${esc(p.label)}</p>
      ${p.kind === 'play' && p.reasonText ? `<p class="sheet-because">because <b>${esc(p.reasonText)}</b></p>` : ''}
      <p class="sheet-cost">${esc(cost)}</p>
      <div class="sheet-btns">
        <button class="btn" data-cmd="cancel">Back</button>
        <button class="btn go" data-cmd="confirm">${esc(yes)}</button>
      </div>
      <p class="sheet-key">Enter to confirm · Esc to go back</p>
    </div>
  </div>`;
}

function moveCost(v: PlayerView, word: 'move' | 'pick'): string {
  if (!v.budget) return 'You cannot take this back.';
  const after = Math.max(0, v.budget.left - 1);
  return `Uses 1 of your ${v.budget.total || v.budget.left} ${word}s — ${after} left afterwards. You cannot take it back.`;
}

function header(v: PlayerView): string {
  const timed = v.phase === 'round' || v.phase === 'prepare' || v.phase === 'brief';
  const key = `${v.phase}:${v.round}`;
  if (key !== barKey) { barKey = key; barFull = 0; }
  barFull = Math.max(barFull, v.clock.realLeftSec);
  const pct = barFull ? Math.max(0, Math.min(100, (v.clock.realLeftSec / barFull) * 100)) : 0;
  const urg = v.clock.realLeftSec <= 10 ? 'out' : v.clock.realLeftSec <= 30 ? 'low' : '';
  return `
  <header class="top">
    <div class="who">
      <span class="side-tag">${v.role === 'attack' ? 'Attackers' : 'Defenders'}</span>
      <button class="team" data-cmd="rename" title="Rename">${esc(v.team)} <span class="pen">${ic('pen-line')}</span></button>
      <span class="vs">vs ${esc(v.opponent)}</span>
    </div>
    <div class="status">
      <span class="phase">${esc(v.phaseLabel)}</span>
      ${v.paused ? `<span class="paused">Paused</span>` : ''}
      <span class="clock">${ic('clock')} ${esc(v.clock.fictional)}</span>
      ${timed ? `<span class="left ${urg}">${mmss(v.clock.realLeftSec)}</span>` : ''}
      ${v.clock.deadline ? `<span class="deadline">72h: ${esc(v.clock.deadline)}</span>` : ''}
      <span class="score ${scoreDelta ? 'bump' : ''}">Score <b>${v.score}</b>${scoreDelta ? `<span class="delta ${scoreDelta > 0 ? 'up' : 'down'}">${scoreDelta > 0 ? '+' : ''}${scoreDelta}</span>` : ''}</span>
    </div>
    ${timed ? `<div class="timer ${urg}"><i style="width:${pct}%"></i></div>` : ''}
  </header>`;
}

/** Moves left, drawn as pips you spend rather than a bare number. */
function budget(v: PlayerView): string {
  const b = v.budget!;
  const total = b.total || b.left;
  const pips = total > 0 && total <= 12
    ? `<span class="pips">${Array.from({ length: total }, (_, i) => `<span class="pip ${i < b.left ? 'on' : ''}"></span>`).join('')}</span>`
    : '';
  return `<div class="budget ${b.left === 0 ? 'spent' : ''}">
    <span class="blabel">Moves left</span>${pips}
    <span class="bcount">${b.left}${b.total ? ` / ${b.total}` : ''}</span>
  </div>`;
}

function groupBy(cards: ActionCard[]): Map<string, ActionCard[]> {
  const g = new Map<string, ActionCard[]>();
  for (const c of cards) { if (!g.has(c.group)) g.set(c.group, []); g.get(c.group)!.push(c); }
  return g;
}

function actions(v: PlayerView): string {
  if (!v.actions.length) return v.phase === 'brief' ? '' : `<p class="muted">Waiting for the next phase…</p>`;
  const groups = groupBy(v.actions);
  let out = '';
  for (const [name, cards] of groups) {
    out += `<div class="agroup"><h3>${esc(name)}</h3><div class="cards">`;
    for (const c of cards) {
      out += `<button class="card ${c.enabled ? '' : 'off'} ${c.picked ? 'picked' : ''}" data-cmd="play" data-action="${esc(c.id)}" data-label="${esc(c.label)}" ${c.enabled ? '' : 'disabled'}>
        <span class="card-label">${esc(c.label)}</span>
        ${c.note ? `<span class="card-note">${esc(c.note)}</span>` : ''}
        ${c.attack ? `<span class="att">${esc(c.attack.id)} · ${esc(c.attack.name)}</span>` : ''}
      </button>`;
    }
    out += `</div></div>`;
  }
  return out;
}

function inflight(v: PlayerView): string {
  return `<div class="inflight"><h3>Under way</h3>${v.inFlight.map((f) => `
    <div class="prog"><span>${esc(f.label)}</span><div class="bar"><i style="width:${f.pct}%"></i></div></div>`).join('')}</div>`;
}

function duties(v: PlayerView): string {
  const reasons = v.reasons ?? [];
  const all = v.duties!;
  const done = all.filter((d) => d.done).length;
  return `<div class="duties"><h3>Legal duties</h3>
    <div class="obj-bar"><b>${done}/${all.length}</b><span class="track"><i style="width:${all.length ? (done / all.length) * 100 : 0}%"></i></span></div>
    <div class="cards">${all.map((d) => {
    if (d.done) return `<div class="duty done">${ic('check')} ${esc(d.label)}${d.note ? ` <span class="duty-note">${esc(d.note)}</span>` : ''}</div>`;
    const expanded = expandReason === d.id;
    const picker = expanded ? `<div class="reasons">${reasons.length ? reasons.map((r) => `<button class="reason" data-cmd="reason" data-duty="${esc(d.id)}" data-label="${esc(d.label)}" data-reasontext="${esc(r.text)}" data-sign="${esc(r.id)}">${esc(r.text)}</button>`).join('') : `<span class="muted">No signs seen yet. Investigate first.</span>`}</div>` : '';
    return `<button class="duty" data-cmd="play" data-action="${esc(d.id)}" data-label="${esc(d.label)}" data-duty="1" data-reason="${d.needsReason ? 1 : 0}">
      ${esc(d.label)} ${d.needsReason ? `<span class="duty-note">${expanded ? 'pick a reason ▾' : 'needs a reason'}</span>` : ''}
    </button>${picker}`;
  }).join('')}</div></div>`;
}

function triage(v: PlayerView): string {
  return `<div class="triage"><h3>Event or incident?</h3>${v.triage!.map((c) => `
    <div class="tcard">
      <span class="tcard-text">${esc(c.text)}</span>
      <span class="tbtns">
        <button class="btn sm ok" data-cmd="triage" data-card="${esc(c.id)}" data-label="${esc(c.text)}" data-real="0">Normal</button>
        <button class="btn sm no" data-cmd="triage" data-card="${esc(c.id)}" data-label="${esc(c.text)}" data-real="1">A sign</button>
      </span>
    </div>`).join('')}</div>`;
}

function feed(v: PlayerView): string {
  if (!v.feed.length) return `<p class="muted">Nothing yet.</p>`;
  return `<ul class="feed">${[...v.feed].reverse().map((f) => `
    <li class="fitem ${BAND_CLASS[f.band]}"><span class="ft">${esc(f.t)}</span><span class="fx">${esc(f.text)}${f.tag ? ` <span class="att">${esc(f.tag)}</span>` : ''}</span></li>`).join('')}</ul>`;
}

function outcome(v: PlayerView): string {
  const o = v.outcome!;
  return `<section class="outcome">
    <h2>Result</h2>
    <ul>${o.lines.map((l) => `<li>${esc(l)}</li>`).join('')}</ul>
    <p class="scores">Attackers ${o.attackScore} · Defenders ${o.defendScore}</p>
  </section>`;
}
