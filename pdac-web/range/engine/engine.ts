// The game engine: pure functions over plain JSON state. Server-only.
// - loadScenario(raw): validate the incident file and cross-references.
// - newGame / makeMatches / start / next / pause / resume / end / reset.
// - playTeam / triage / duty / pushInject: commands, each returns an error or null.
// - tick(now): advance the clock, resolve in-flight attacks, reveal signs, fire
//   normal events, auto-advance timed phases. Pause freezes everything.
// - playerView / wcView: role-filtered snapshots. Raw rules never leave here.
import type {
  AttackCard, DutyDef, GameState, MatchState, Scenario, ScoreDelta,
  SignInstance, Side, RevealTag,
} from './types.ts';
import type {
  ActionCard, DutyCard, FeedItem, FocusView, MatchSummary, Outcome, Phase,
  PlayerView, PreviewGroup, PreviewSide, RoundReview, RubricRow, RubricSection, TriageCard, WcView,
} from '../wire.ts';
import { PHASE_LABEL, ROUND_LABEL } from '../wire.ts';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FEED_MAX = 40;

/** Scoring the engine applies itself, outside the scenario file. The rubric the
 *  dashboard shows is built from these same numbers, so the two cannot drift. */
export const ENGINE_SCORES = {
  triageCorrect: 2,
  triageWrong: -2,
  restoreEarlyDefend: -5,
  restoreEarlyAttack: 5,
  restoreClean: 6,
  exfilBeforeDeclare: 4,
} as const;

// ---------- small helpers ----------

export function makeCode(rng: () => number = Math.random): string {
  let s = '';
  for (let i = 0; i < 8; i++) s += CODE_ALPHABET[Math.floor(rng() * CODE_ALPHABET.length)];
  return s;
}

/** Evaluate one flag token against the flag bag. "x" truthy, "!x" absent, "x>=50" numeric. */
function tok(flags: Record<string, number>, t: string): boolean {
  if (t.startsWith('!')) return !(flags[t.slice(1)] > 0);
  const m = t.match(/^(.+?)(>=|<=|>|<|==)(-?\d+)$/);
  if (m) {
    const v = flags[m[1]] ?? 0;
    const n = Number(m[3]);
    switch (m[2]) {
      case '>=': return v >= n;
      case '<=': return v <= n;
      case '>': return v > n;
      case '<': return v < n;
      default: return v === n;
    }
  }
  return (flags[t] ?? 0) > 0;
}
/** AND of tokens. */
function all(flags: Record<string, number>, expr?: string[]): boolean {
  if (!expr || expr.length === 0) return true;
  return expr.every((t) => tok(flags, t));
}
/** OR of (AND of tokens). */
function any(flags: Record<string, number>, exprs?: string[][]): boolean {
  if (!exprs || exprs.length === 0) return false;
  return exprs.some((e) => all(flags, e));
}

function fmtFict(minTotal: number): string {
  const m = ((Math.floor(minTotal) % 10080) + 10080) % 10080; // within a week
  const day = DAYS[Math.floor(m / 1440) % 7];
  const hh = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  return `${day} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}
function fictAt(game: GameState, activeMs: number): number {
  return game.clock.startFict + Math.floor(activeMs / 1000) * game.clock.compression;
}
function fictNow(game: GameState): number {
  return fictAt(game, game.clock.activeMs);
}

function byId<T extends { id: string }>(list: T[], id: string): T | undefined {
  return list.find((x) => x.id === id);
}

// ---------- scenario loading / validation ----------

export function loadScenario(raw: unknown): Scenario {
  const s = raw as Scenario;
  const problems: string[] = [];
  const nodeIds = new Set(s.map?.nodes?.map((n) => n.id));
  const defIds = new Set(s.defends.map((d) => d.id));
  const signIds = new Set(s.signs.map((x) => x.id));
  const need = (cond: boolean, msg: string) => { if (!cond) problems.push(msg); };

  need(Array.isArray(s.map?.nodes) && s.map.nodes.length > 0, 'map.nodes missing');
  for (const a of s.attacks) {
    for (const b of a.blockedBy ?? []) need(defIds.has(b.control), `attack ${a.id}: blockedBy unknown control ${b.control}`);
    for (const sg of a.onStart?.signs ?? []) need(signIds.has(sg), `attack ${a.id}: onStart sign ${sg} unknown`);
    for (const sg of a.onSuccess?.signs ?? []) need(signIds.has(sg), `attack ${a.id}: onSuccess sign ${sg} unknown`);
  }
  for (const d of s.defends) for (const [n] of Object.entries(d.nodeState ?? {})) need(nodeIds.has(n), `defend ${d.id}: nodeState node ${n} unknown`);
  for (const sg of s.signs) if (sg.node) need(nodeIds.has(sg.node), `sign ${sg.id}: node ${sg.node} unknown`);
  for (const ev of s.normals) if (ev.node) need(nodeIds.has(ev.node), `normal ${ev.id}: node ${ev.node} unknown`);
  need(s.config.preparePicks > 0, 'config.preparePicks must be > 0');
  need(s.config.roundSeconds.length === 3, 'config.roundSeconds needs 3 entries');

  if (problems.length) throw new Error(`Scenario "${s.id ?? '?'}" is invalid:\n  - ${problems.join('\n  - ')}`);
  return s;
}

/** Fill each attack move's MITRE ATT&CK name and page from src/data/attack.json
 *  (built by `npm run attack` from github.com/mitre-attack/attack-stix-data). */
export function attachAttackTags(scenario: Scenario, techniques: Record<string, { name: string; url?: string }>): void {
  for (const a of scenario.attacks) {
    if (!a.attack) continue;
    const t = techniques[a.attack.id];
    if (t) { a.attack.name = t.name; a.attack.url = t.url; }
  }
}

/** The ATT&CK chip for an attacker-facing feed line. */
function tagOf(card?: AttackCard): { tag?: string; tagUrl?: string } {
  if (!card?.attack) return {};
  return { tag: `${card.attack.id} · ${card.attack.name}`, tagUrl: card.attack.url };
}

/** The dashboard packet for a feed line. When blocked/contained it stops at the
 *  firewall (or the node before the target). */
function animOf(card: AttackCard, block: boolean): { anim?: { route: string[]; kind: 'attack' | 'leak' | 'secure'; blockAt?: string } } {
  if (!card.anim) return {};
  const route = card.anim.route;
  const blockAt = block ? (route.includes('firewall') ? 'firewall' : route[Math.max(0, route.length - 2)]) : undefined;
  return { anim: { route, kind: card.anim.kind, blockAt } };
}

// ---------- game lifecycle ----------

export function newGame(scenario: Scenario, opts: { joinHost: string }): GameState {
  return {
    phase: 'lobby',
    round: 0,
    clock: {
      startFict: scenario.config.clock.startFict,
      compression: scenario.config.clock.compression,
      activeMs: 0,
      running: false,
      lastMs: 0,
      phaseEndsActiveMs: 0,
    },
    matches: [],
    focusId: null,
    joinHost: opts.joinHost,
  };
}

function freshMatch(scenario: Scenario, n: number, used: Set<string>): MatchState {
  let ac = makeCode();
  while (used.has(ac)) ac = makeCode();
  used.add(ac);
  let dc = makeCode();
  while (used.has(dc)) dc = makeCode();
  used.add(dc);
  const duties: MatchState['duties'] = {};
  for (const d of scenario.duties) duties[d.id] = { done: false };
  return {
    id: `m${n}`, n,
    attackCode: ac, defendCode: dc,
    attackTeam: `Team ${n} · Attack`, defendTeam: `Team ${n} · Defend`,
    flags: {},
    budgetAttack: 0, budgetDefend: 0,
    prepared: [], playedAttack: [], playedDefend: [], moves: [],
    inFlight: [], signs: [],
    feedAttack: [], feedDefend: [],
    duties,
    triagePending: [], triageDone: [], normalsFired: [],
    ledger: [], attackScore: 0, defendScore: 0,
    nodeState: {},
  };
}

export function makeMatches(game: GameState, scenario: Scenario, count: number): string | null {
  if (game.phase !== 'lobby') return 'Matches can only be made before the game starts.';
  const n = Math.max(1, Math.min(9, Math.floor(count)));
  const used = new Set<string>();
  game.matches = [];
  for (let i = 1; i <= n; i++) game.matches.push(freshMatch(scenario, i, used));
  game.focusId = game.matches[0]?.id ?? null;
  return null;
}

function enterTimedPhase(game: GameState, phase: Phase, seconds: number): void {
  game.phase = phase;
  game.clock.phaseEndsActiveMs = seconds > 0 ? game.clock.activeMs + seconds * 1000 : 0;
}

function resetBudgets(game: GameState, scenario: Scenario): void {
  const r = game.round;
  for (const m of game.matches) {
    if (game.phase === 'prepare') {
      m.budgetDefend = scenario.config.preparePicks;
      m.budgetAttack = 1; // recon only
    } else if (game.phase === 'round') {
      m.budgetDefend = scenario.config.defendBudget[r - 1] ?? 0;
      m.budgetAttack = scenario.config.attackBudget[r - 1] ?? 0;
    }
  }
}

export function startGame(game: GameState, scenario: Scenario): string | null {
  if (game.phase !== 'lobby') return 'The game has already started.';
  if (game.matches.length === 0) makeMatches(game, scenario, 1);
  game.clock.running = true;
  game.clock.lastMs = Date.now();
  enterTimedPhase(game, 'brief', scenario.config.briefSec);
  return null;
}

/** Advance brief -> prepare -> round1 -> round2 -> round3 -> over. */
export function nextPhase(game: GameState, scenario: Scenario): string | null {
  if (game.phase === 'lobby') return startGame(game, scenario);
  if (game.phase === 'brief') {
    game.round = 0;
    enterTimedPhase(game, 'prepare', scenario.config.prepareSec);
    resetBudgets(game, scenario);
    return null;
  }
  if (game.phase === 'prepare') {
    game.round = 1;
    enterTimedPhase(game, 'round', scenario.config.roundSeconds[0]);
    resetBudgets(game, scenario);
    return null;
  }
  if (game.phase === 'round') {
    if (game.round >= 3) { endGame(game, scenario); return null; }
    game.round += 1;
    enterTimedPhase(game, 'round', scenario.config.roundSeconds[game.round - 1]);
    resetBudgets(game, scenario);
    return null;
  }
  return 'The game is over.';
}

export function pauseGame(game: GameState): void {
  if (game.clock.running) { tick(game, undefined as unknown as Scenario, Date.now(), true); game.clock.running = false; }
}
export function resumeGame(game: GameState): void {
  if (!game.clock.running && game.phase !== 'lobby' && game.phase !== 'over') {
    game.clock.running = true;
    game.clock.lastMs = Date.now();
  }
}

export function endGame(game: GameState, scenario: Scenario): void {
  for (const m of game.matches) m.outcome = computeOutcome(game, scenario, m);
  game.phase = 'over';
  game.clock.running = false;
  game.clock.phaseEndsActiveMs = 0;
}

export function resetGame(game: GameState, scenario: Scenario): void {
  const host = game.joinHost;
  Object.assign(game, newGame(scenario, { joinHost: host }));
}

// ---------- scoring ----------

/** Which round a thing happened in: 'prepare', 'r1'..'r3', or the phase name. */
function phaseKeyOf(game: GameState): string {
  return game.phase === 'round' ? `r${game.round}` : game.phase;
}

function award(game: GameState, m: MatchState, deltas: ScoreDelta[] | undefined): void {
  if (!deltas) return;
  const t = fmtFict(fictNow(game));
  const phase = phaseKeyOf(game);
  for (const d of deltas) {
    if (d.who === 'attack') m.attackScore += d.pts; else m.defendScore += d.pts;
    m.ledger.push({ t, who: d.who, pts: d.pts, reason: d.reason, link: d.link, phase });
    if (m.ledger.length > 80) m.ledger.shift();
  }
}

/** Record a move for the round-by-round debrief. */
function note(game: GameState, m: MatchState, who: Side, label: string, extra?: string): void {
  if (!m.moves) m.moves = []; // a save written before this field existed
  m.moves.push({ t: fmtFict(fictNow(game)), who, phase: phaseKeyOf(game), label, note: extra });
  if (m.moves.length > 160) m.moves.shift();
}

function pushFeed(m: MatchState, side: Side, item: FeedItem): void {
  const feed = side === 'attack' ? m.feedAttack : m.feedDefend;
  feed.push(item);
  if (feed.length > FEED_MAX) feed.shift();
}

// ---------- signs ----------

function emitSign(game: GameState, m: MatchState, defId: string): void {
  const inst: SignInstance = {
    id: `${defId}@${m.signs.length}`,
    def: defId,
    availAtActiveMs: game.clock.activeMs,
    revealed: false,
  };
  m.signs.push(inst);
}

function tagUnlocked(m: MatchState, tag: RevealTag): boolean {
  const f = m.flags;
  switch (tag) {
    case 'auto': return true;
    case 'onAlerts': return f['ctrl.alerts'] > 0 || f['det.traffic'] > 0;
    case 'onCheckTraffic': return f['det.traffic'] > 0;
    case 'onCheckSignins': return f['det.signins'] > 0;
    case 'onCheckServer': return f['det.server'] > 0;
    case 'onAskStaff': return f['det.staff'] > 0;
    default: return false;
  }
}

function revealSigns(game: GameState, scenario: Scenario, m: MatchState): void {
  for (const inst of m.signs) {
    if (inst.revealed) continue;
    if (game.clock.activeMs < inst.availAtActiveMs) continue;
    const def = byId(scenario.signs, inst.def);
    if (!def) continue;
    if (!tagUnlocked(m, def.reveal)) continue;
    inst.revealed = true;
    inst.revealedAtActiveMs = game.clock.activeMs;
    pushFeed(m, 'defend', {
      id: inst.id, t: fmtFict(fictNow(game)), text: def.text, band: def.band, node: def.node,
    });
    if (def.real && m.firstRealSignActiveMs === undefined) m.firstRealSignActiveMs = game.clock.activeMs;
    if (def.real && def.points) {
      const delay = (inst.revealedAtActiveMs - inst.availAtActiveMs);
      const fast = delay <= def.points.fastSec * 1000;
      award(game, m, [{ who: 'defend', pts: fast ? def.points.fast : def.points.slow, reason: `${fast ? 'Spotted early' : 'Detected'}: ${def.text}`, link: 'Module 5: detect' }]);
    }
    if (def.triage) m.triagePending.push({ id: `tr-${inst.id}`, text: def.text, node: def.node, real: true });
  }
}

// ---------- in-flight attacks & normal events (tick) ----------

function resolveInFlight(game: GameState, scenario: Scenario, m: MatchState): void {
  const still: typeof m.inFlight = [];
  for (const fl of m.inFlight) {
    const card = byId(scenario.attacks, fl.cardId);
    if (!card) continue;
    // interrupted?
    if (card.interruptedBy && any(m.flags, card.interruptedBy)) {
      pushFeed(m, 'attack', { id: `a-int-${fl.cardId}-${game.clock.activeMs}`, t: fmtFict(fictNow(game)), text: `${card.label}: ${card.onInterrupt?.result ?? 'interrupted.'}`, band: 'bad', ...tagOf(card), ...animOf(card, true) });
      note(game, m, 'attack', card.label, 'cut off mid-move by the defenders');
      award(game, m, card.onInterrupt?.score);
      continue;
    }
    if (game.clock.activeMs - fl.startedActiveMs >= card.durationSec * 1000) {
      // complete -> success
      if (card.onSuccess?.set) for (const [k, v] of Object.entries(card.onSuccess.set)) m.flags[k] = v;
      for (const sg of card.onSuccess?.signs ?? []) emitSign(game, m, sg);
      extraAttackBonuses(game, m, card);
      pushFeed(m, 'attack', { id: `a-ok-${fl.cardId}-${game.clock.activeMs}`, t: fmtFict(fictNow(game)), text: `${card.label}: ${card.onSuccess?.result ?? 'done.'}`, band: 'ok', ...tagOf(card), ...animOf(card, false) });
      note(game, m, 'attack', card.label, 'succeeded');
      award(game, m, card.onSuccess?.score);
      continue;
    }
    still.push(fl);
  }
  m.inFlight = still;
}

/** A one-off bonus: records copied while the office had not declared the incident. */
function extraAttackBonuses(game: GameState, m: MatchState, card: AttackCard): void {
  if (card.id === 'exfil' && !m.duties['declare']?.done) {
    award(game, m, [{ who: 'attack', pts: ENGINE_SCORES.exfilBeforeDeclare, reason: 'Records left before the office declared the incident' }]);
  }
}

function fireNormals(game: GameState, scenario: Scenario, m: MatchState): void {
  if (game.phase !== 'round') return;
  const sinceRound1 = game.clock.activeMs; // normals use seconds from play; close enough across rounds
  for (const ev of scenario.normals) {
    if (m.normalsFired.includes(ev.id)) continue;
    if (sinceRound1 >= ev.atSec * 1000) {
      m.normalsFired.push(ev.id);
      m.triagePending.push({ id: `tr-${ev.id}`, text: ev.text, node: ev.node, real: false });
      pushFeed(m, 'defend', { id: `ev-${ev.id}`, t: fmtFict(fictNow(game)), text: ev.text, band: 'info', node: ev.node });
    }
  }
}

export function tick(game: GameState, scenario: Scenario, now: number, internal = false): void {
  if (game.clock.running) {
    const dt = Math.max(0, now - game.clock.lastMs);
    game.clock.activeMs += dt;
    game.clock.lastMs = now;
  }
  if (internal) return; // pause path only accumulates time
  if (game.phase === 'lobby' || game.phase === 'over') return;

  for (const m of game.matches) {
    resolveInFlight(game, scenario, m);
    revealSigns(game, scenario, m);
    fireNormals(game, scenario, m);
    trackOffline(game, m);
  }
  // auto-advance a timed phase
  if (game.clock.running && game.clock.phaseEndsActiveMs > 0 && game.clock.activeMs >= game.clock.phaseEndsActiveMs) {
    nextPhase(game, scenario);
  }
}

function trackOffline(game: GameState, m: MatchState): void {
  const off = m.flags['def.portalOffline'] > 0 || m.flags['def.isolatedServer'] > 0 || m.flags['def.poweredOff'] > 0;
  const reopened = m.flags['def.reopened'] > 0;
  if (off && m.flags['_offStart'] === undefined && !reopened) m.flags['_offStart'] = game.clock.activeMs;
}

// ---------- commands ----------

export function setMatchName(game: GameState, matchId: string, side: Side, name: string): string | null {
  const m = byId(game.matches, matchId);
  if (!m) return 'No such match.';
  const clean = String(name ?? '').replace(/\s+/g, ' ').trim().slice(0, 40);
  if (!clean) return 'Name is empty.';
  if (side === 'attack') m.attackTeam = clean; else m.defendTeam = clean;
  return null;
}

/** A team plays a card or a duty. side is the actor's own side. */
export function playTeam(
  game: GameState, scenario: Scenario,
  actor: { matchId: string; side: Side },
  cmd: { action: string; target?: string; reason?: string },
  opts: { force?: boolean } = {},
): string | null {
  const m = byId(game.matches, actor.matchId);
  if (!m) return 'No such match.';
  if (game.phase === 'lobby' || game.phase === 'over') return 'Not during this phase.';
  if (game.clock.running === false && !opts.force) return 'The game is paused.';

  if (actor.side === 'attack') return playAttack(game, scenario, m, cmd.action, opts.force);
  // defender: duty or card
  if (byId(scenario.duties, cmd.action)) return playDuty(game, scenario, m, cmd.action, cmd.reason);
  return playDefend(game, scenario, m, cmd.action, opts.force);
}

function playAttack(game: GameState, scenario: Scenario, m: MatchState, action: string, force?: boolean): string | null {
  const card = byId(scenario.attacks, action);
  if (!card) return 'Unknown move.';
  if (!cardInThisRound(card.rounds, game)) return 'That move is not available now.';
  if (m.inFlight.some((f) => f.cardId === card.id)) return 'That move is already running.';
  if (card.requires && !all(m.flags, card.requires)) return card.requiresNote ?? 'You cannot do that yet.';
  if (!force && m.budgetAttack <= 0) return 'No moves left this round.';
  if (!force) m.budgetAttack -= Math.max(1, card.cost);
  m.playedAttack.push(card.id);

  // onStart signs happen whether or not the move is blocked (the attempt leaves traces).
  for (const sg of card.onStart?.signs ?? []) emitSign(game, m, sg);

  // blocked at the door?
  if (card.blockedBy) {
    const hit = card.blockedBy.find((b) => m.flags[`ctrl.${b.control}`] > 0);
    if (hit) {
      pushFeed(m, 'attack', { id: `a-bl-${card.id}-${game.clock.activeMs}`, t: fmtFict(fictNow(game)), text: `${card.label}: ${hit.reason}`, band: 'bad', ...tagOf(card), ...animOf(card, true) });
      note(game, m, 'attack', card.label, `blocked — ${hit.link ?? 'a control held'}`);
      award(game, m, card.onBlocked?.score);
      return null;
    }
  }
  // starts running
  m.inFlight.push({ cardId: card.id, startedActiveMs: game.clock.activeMs });
  pushFeed(m, 'attack', { id: `a-go-${card.id}-${game.clock.activeMs}`, t: fmtFict(fictNow(game)), text: `${card.label}: under way…`, band: 'warn', ...tagOf(card), ...animOf(card, false) });
  note(game, m, 'attack', card.label, 'started');
  return null;
}

function playDefend(game: GameState, scenario: Scenario, m: MatchState, action: string, force?: boolean): string | null {
  const card = byId(scenario.defends, action);
  if (!card) return 'Unknown action.';
  const inPrepare = game.phase === 'prepare';
  if (inPrepare && card.phase !== 'prepare') return 'Only prepare fixes right now.';
  if (!inPrepare && card.phase === 'prepare') return 'Prepare is over.';
  if (!inPrepare && !cardInThisRound(card.rounds, game)) return 'That action is not available this round.';
  if (card.requires && !all(m.flags, card.requires)) return card.requiresNote ?? 'You cannot do that yet.';
  if (m.playedDefend.includes(card.id) && card.phase === 'prepare') return 'Already chosen.';
  if (!force && (inPrepare ? m.budgetDefend <= 0 : m.budgetDefend <= 0)) return inPrepare ? 'You have used all your prepare picks.' : 'No moves left this round.';
  if (!force) m.budgetDefend -= Math.max(1, card.cost);

  if (card.set) for (const [k, v] of Object.entries(card.set)) m.flags[k] = v;
  if (card.nodeState) for (const [n, st] of Object.entries(card.nodeState)) m.nodeState[n] = st;
  if (inPrepare) m.prepared.push(card.id);
  m.playedDefend.push(card.id);

  // restore before eradication brings the attacker back
  if (card.id === 'restore') {
    const eradicated = m.flags['def.backdoorRemoved'] > 0 && m.flags['def.passwordsReset'] > 0;
    if (!eradicated && m.flags['atk.backdoor'] > 0) {
      m.flags['atk.foothold'] = 1;
      award(game, m, [{ who: 'defend', pts: ENGINE_SCORES.restoreEarlyDefend, reason: 'Restored before eradication: the attacker is still inside', link: 'Module 5: restore only from clean backups' }]);
      award(game, m, [{ who: 'attack', pts: ENGINE_SCORES.restoreEarlyAttack, reason: 'The restore brought our way back in' }]);
    } else {
      award(game, m, [{ who: 'defend', pts: ENGINE_SCORES.restoreClean, reason: 'Restored from a clean backup, after eradication', link: 'Module 5: recover safely' }]);
    }
  }
  award(game, m, card.score);
  note(game, m, 'defend', card.label);
  pushFeed(m, 'defend', { id: `d-${card.id}-${game.clock.activeMs}`, t: fmtFict(fictNow(game)), text: card.result ?? card.label, band: 'ok', node: Object.keys(card.nodeState ?? {})[0] });
  return null;
}

function playDuty(game: GameState, scenario: Scenario, m: MatchState, dutyId: string, reason?: string): string | null {
  const duty = byId(scenario.duties, dutyId);
  if (!duty) return 'Unknown duty.';
  if (game.phase !== 'round') return 'Duties begin once the rounds start.';
  if (m.duties[dutyId]?.done) return 'Already done.';
  if (duty.needsReason) {
    const sign = reason ? m.signs.find((s) => s.id === reason && s.revealed) : undefined;
    const def = sign ? byId(scenario.signs, sign.def) : undefined;
    const cats = (duty.reasonCategory ?? '').split(',').map((c) => c.trim()).filter(Boolean);
    if (!def || !def.real || (cats.length > 0 && def.category && !cats.includes(def.category))) {
      return 'Pick a sign you have seen as the reason.';
    }
  }
  m.duties[dutyId] = { done: true, atFict: fictNow(game), reason };
  const why = reason ? byId(scenario.signs, byId(m.signs, reason)?.def ?? '')?.text : undefined;
  note(game, m, 'defend', `Duty: ${duty.label}`, why ? `because “${why}”` : undefined);
  award(game, m, applyDutyScore(game, m, duty));
  pushFeed(m, 'defend', { id: `duty-${dutyId}-${game.clock.activeMs}`, t: fmtFict(fictNow(game)), text: `Duty done: ${duty.label}`, band: 'ok' });
  if (dutyId === 'start_clock') m.clockStartedActiveMs = game.clock.activeMs;
  return null;
}

function applyDutyScore(game: GameState, m: MatchState, duty: DutyDef): ScoreDelta[] {
  const out: ScoreDelta[] = [];
  if (duty.timing) {
    const basis = duty.timing.basis === 'firstRealSign' ? m.firstRealSignActiveMs : m.clockStartedActiveMs;
    if (basis === undefined) {
      out.push({ who: 'defend', pts: duty.timing.late.pts, reason: duty.timing.late.reason, link: 'Module 5: smoke, not ashes' });
    } else {
      const delaySec = (game.clock.activeMs - basis) / 1000;
      const win = duty.timing.windows.find((w) => delaySec <= w.withinSec);
      if (win) out.push({ who: 'defend', pts: win.pts, reason: win.reason, link: 'Module 5: 72-5' });
      else out.push({ who: 'defend', pts: duty.timing.late.pts, reason: duty.timing.late.reason, link: 'Module 5: smoke, not ashes' });
    }
  }
  for (const sd of duty.score ?? []) {
    if (duty.deadlineSensitive && m.clockStartedActiveMs !== undefined) {
      const deadline = fictAt(game, m.clockStartedActiveMs) + scenarioDeadlineMin(game);
      if (fictNow(game) > deadline) { out.push({ who: sd.who, pts: Math.ceil(sd.pts / 2), reason: `${sd.reason} (after 72 hours)`, link: sd.link }); continue; }
    }
    out.push(sd);
  }
  return out;
}

function scenarioDeadlineMin(game: GameState): number {
  return 72 * 60; // deadlineHours; kept constant here, matches scenario
}

export function triage(game: GameState, scenario: Scenario, matchId: string, cardId: string, asReal: boolean): string | null {
  const m = byId(game.matches, matchId);
  if (!m) return 'No such match.';
  const idx = m.triagePending.findIndex((c) => c.id === cardId);
  if (idx < 0) return 'That card is gone.';
  const card = m.triagePending[idx];
  m.triagePending.splice(idx, 1);
  const correct = card.real === asReal;
  m.triageDone.push({ id: card.id, correct });
  note(game, m, 'defend', `Called "${card.text}" ${asReal ? 'a sign' : 'normal'}`, correct ? 'correct' : 'misread');
  award(game, m, [correct
    ? { who: 'defend', pts: ENGINE_SCORES.triageCorrect, reason: `Told apart correctly: ${card.text}`, link: 'Module 5: event or incident?' }
    : { who: 'defend', pts: ENGINE_SCORES.triageWrong, reason: `Misread: ${card.text}`, link: 'Module 5: event or incident?' }]);
  return null;
}

export function pushInject(game: GameState, scenario: Scenario, matchId: string, injectId?: string, text?: string): string | null {
  const m = byId(game.matches, matchId);
  if (!m) return 'No such match.';
  let body = text?.trim();
  let band: FeedItem['band'] = 'warn';
  if (injectId) {
    const inj = byId(scenario.injects, injectId);
    if (!inj) return 'Unknown inject.';
    body = inj.text; band = inj.band;
  }
  if (!body) return 'Nothing to send.';
  pushFeed(m, 'defend', { id: `inj-${Date.now()}`, t: fmtFict(fictNow(game)), text: body.slice(0, 200), band });
  return null;
}

function cardInThisRound(rounds: number[], game: GameState): boolean {
  if (game.phase === 'prepare') return rounds.includes(0);
  if (game.phase === 'round') return rounds.includes(game.round);
  return false;
}

// ---------- outcome ----------

function computeOutcome(game: GameState, scenario: Scenario, m: MatchState): Outcome {
  const records = m.flags['atk.exfilDone'] > 0;
  const defaced = m.flags['atk.defaced'] > 0 && !(m.flags['def.restored'] > 0);
  const evidenceKept = m.flags['def.preserved'] > 0 && !(m.flags['def.evidenceLost'] > 0) && !(m.flags['atk.logsErased'] > 0);
  let offlineHours = 0;
  if (m.flags['_offStart'] !== undefined) {
    const endMs = game.clock.activeMs;
    offlineHours = Math.round(((endMs - m.flags['_offStart']) / 1000) * game.clock.compression / 60);
  }
  const lines: string[] = [];
  lines.push(records ? 'Confidentiality: applicant records were copied out.' : 'Confidentiality: no records left the office.');
  if (m.flags['atk.peeked'] > 0 && !records) lines.push('Some applicant details were read from the public page.');
  lines.push(defaced ? 'Integrity: the portal page was changed and not restored.' : 'Integrity: the portal page was not left changed.');
  lines.push(offlineHours > 0 ? `Availability: about ${offlineHours} fictional hours offline.` : 'Availability: the portal stayed up.');
  lines.push(evidenceKept ? 'Evidence: preserved before clean-up.' : 'Evidence: not fully preserved.');
  const notified = m.duties['notify_npc']?.done && m.duties['notify_people']?.done;
  lines.push(notified ? 'Duties: the NPC and the people were notified.' : 'Duties: notification was not completed.');
  return { records, defaced, offlineHours, evidenceKept, lines, attackScore: m.attackScore, defendScore: m.defendScore };
}

// ---------- views ----------

function realLeftSec(game: GameState): number {
  if (game.clock.phaseEndsActiveMs <= 0) return 0;
  return Math.max(0, Math.round((game.clock.phaseEndsActiveMs - game.clock.activeMs) / 1000));
}

function phaseLabelOf(game: GameState): string {
  if (game.phase === 'round') return `Round ${game.round}: ${ROUND_LABEL[game.round]}`;
  if (game.phase === 'prepare') return 'Prepare';
  return PHASE_LABEL[game.phase];
}

function attackActions(game: GameState, scenario: Scenario, m: MatchState): ActionCard[] {
  return scenario.attacks
    .filter((a) => cardInThisRound(a.rounds, game))
    .map((a) => {
      const running = m.inFlight.some((f) => f.cardId === a.id);
      const reqOk = !a.requires || all(m.flags, a.requires);
      const budgetOk = m.budgetAttack > 0;
      let note: string | undefined;
      if (running) note = 'Running…';
      else if (!reqOk) note = a.requiresNote ?? 'Not available yet';
      else if (!budgetOk) note = 'No moves left';
      return { id: a.id, label: a.label, group: a.group, enabled: !running && reqOk && budgetOk, cost: a.cost, note, attack: a.attack };
    });
}

function defendActions(game: GameState, scenario: Scenario, m: MatchState): ActionCard[] {
  const inPrepare = game.phase === 'prepare';
  return scenario.defends
    .filter((d) => (inPrepare ? d.phase === 'prepare' : d.phase !== 'prepare' && cardInThisRound(d.rounds, game)))
    .map((d) => {
      const picked = inPrepare && m.prepared.includes(d.id);
      const reqOk = !d.requires || all(m.flags, d.requires);
      const budgetOk = m.budgetDefend > 0;
      let note: string | undefined;
      if (picked) note = 'Chosen';
      else if (!reqOk) note = d.requiresNote ?? 'Not available yet';
      else if (!budgetOk) note = inPrepare ? 'No picks left' : 'No moves left';
      else if (d.owner) note = d.owner;
      return { id: d.id, label: d.label, group: d.group, enabled: !picked && reqOk && budgetOk, cost: d.cost, note, picked };
    });
}

function dutyCards(scenario: Scenario, m: MatchState): DutyCard[] {
  return scenario.duties.map((d) => ({
    id: d.id, label: d.label, done: !!m.duties[d.id]?.done, needsReason: d.needsReason,
    note: m.duties[d.id]?.done && m.duties[d.id]?.atFict !== undefined ? `at ${fmtFict(m.duties[d.id]!.atFict!)}` : d.needsReason ? 'needs a reason' : undefined,
  }));
}

function reasonChoices(scenario: Scenario, m: MatchState): { id: string; text: string }[] {
  return m.signs
    .filter((s) => s.revealed)
    .map((s) => ({ s, def: byId(scenario.signs, s.def) }))
    .filter((x) => x.def?.real)
    .map((x) => ({ id: x.s.id, text: x.def!.text }));
}

export function playerView(game: GameState, scenario: Scenario, who: { matchId: string; side: Side }): PlayerView | null {
  const m = byId(game.matches, who.matchId);
  if (!m) return null;
  const common = {
    kind: 'player' as const,
    role: who.side,
    matchId: m.id,
    team: who.side === 'attack' ? m.attackTeam : m.defendTeam,
    opponent: who.side === 'attack' ? m.defendTeam : m.attackTeam,
    phase: game.phase,
    round: game.round,
    phaseLabel: phaseLabelOf(game),
    paused: !game.clock.running && game.phase !== 'lobby' && game.phase !== 'over',
    clock: {
      fictional: fmtFict(fictNow(game)),
      realLeftSec: realLeftSec(game),
      deadline: m.clockStartedActiveMs !== undefined ? fmtFict(fictAt(game, m.clockStartedActiveMs) + scenarioDeadlineMin(game)) : undefined,
      clockStarted: m.clockStartedActiveMs !== undefined ? fmtFict(fictAt(game, m.clockStartedActiveMs)) : undefined,
    },
    score: who.side === 'attack' ? m.attackScore : m.defendScore,
    outcome: m.outcome,
  };

  if (who.side === 'attack') {
    return {
      ...common,
      budget: game.phase === 'round' || game.phase === 'prepare' ? { left: m.budgetAttack, total: game.phase === 'prepare' ? 1 : (scenario.config.attackBudget[game.round - 1] ?? 0) } : null,
      actions: game.phase === 'brief' ? [] : attackActions(game, scenario, m),
      feed: m.feedAttack.slice(-FEED_MAX),
      inFlight: m.inFlight.map((f) => {
        const c = byId(scenario.attacks, f.cardId)!;
        return { id: f.cardId, label: c.label, pct: Math.min(100, Math.round(((game.clock.activeMs - f.startedActiveMs) / (c.durationSec * 1000)) * 100)), anim: c.anim ? { route: c.anim.route, kind: c.anim.kind } : undefined };
      }),
      message: game.phase === 'brief' ? scenario.brief.attack : undefined,
    };
  }
  // defender
  const triageCards: TriageCard[] = m.triagePending.map((c) => ({ id: c.id, text: c.text, node: c.node }));
  return {
    ...common,
    budget: game.phase === 'round' ? { left: m.budgetDefend, total: scenario.config.defendBudget[game.round - 1] ?? 0 } : game.phase === 'prepare' ? { left: m.budgetDefend, total: scenario.config.preparePicks } : null,
    actions: game.phase === 'brief' ? [] : defendActions(game, scenario, m),
    feed: m.feedDefend.slice(-FEED_MAX),
    inFlight: [],
    duties: game.phase === 'round' || game.phase === 'over' ? dutyCards(scenario, m) : undefined,
    triage: triageCards.length ? triageCards : undefined,
    reasons: reasonChoices(scenario, m),
    message: game.phase === 'brief' ? scenario.brief.defend : game.phase === 'prepare' ? `Pick ${scenario.config.preparePicks} fixes.` : undefined,
  };
}

function nodeStatesFor(scenario: Scenario, m: MatchState): Record<string, string> {
  const out: Record<string, string> = { ...m.nodeState };
  if (m.flags['atk.foothold'] > 0) out['attacker'] = 'bad';
  if (m.flags['atk.exfilDone'] > 0) out['unknown'] = 'bad';
  if (m.flags['atk.defaced'] > 0 && !(m.flags['def.restored'] > 0)) out['portal'] = out['portal'] ?? 'warn';
  return out;
}

function matchSummary(game: GameState, m: MatchState, dev: { attack: number; defend: number }): MatchSummary {
  const unseenAlerts = m.feedDefend.filter((f) => f.band === 'alert').length;
  return {
    id: m.id, n: m.n,
    attackTeam: m.attackTeam, defendTeam: m.defendTeam,
    attackCode: m.attackCode, defendCode: m.defendCode,
    attackDevices: dev.attack, defendDevices: dev.defend,
    attackScore: m.attackScore, defendScore: m.defendScore,
    phase: game.phase, round: game.round, alertCount: unseenAlerts,
  };
}

/** The after-game review: every round with what each side did and what it scored. */
const REVIEW_PHASES: { key: string; label: string }[] = [
  { key: 'prepare', label: 'Prepare' },
  { key: 'r1', label: 'Round 1: Detect' },
  { key: 'r2', label: 'Round 2: Contain & eradicate' },
  { key: 'r3', label: 'Round 3: Recover & notify' },
];

function buildReview(m: MatchState): RoundReview[] {
  return REVIEW_PHASES.map(({ key, label }) => {
    const scores = m.ledger.filter((l) => l.phase === key);
    return {
      key,
      label,
      attackPts: scores.filter((l) => l.who === 'attack').reduce((a, l) => a + l.pts, 0),
      defendPts: scores.filter((l) => l.who === 'defend').reduce((a, l) => a + l.pts, 0),
      moves: (m.moves ?? []).filter((x) => x.phase === key).map((x) => ({ t: x.t, who: x.who, label: x.label, note: x.note })),
      scores: scores.map((l) => ({ t: l.t, who: l.who, pts: l.pts, reason: l.reason, link: l.link })),
    };
  });
}

function focusView(game: GameState, scenario: Scenario, m: MatchState): FocusView {
  return {
    id: m.id, n: m.n,
    attackTeam: m.attackTeam, defendTeam: m.defendTeam,
    nodes: nodeStatesFor(scenario, m),
    attackFeed: m.feedAttack.slice(-20),
    defendFeed: m.feedDefend.slice(-20),
    inFlight: m.inFlight.map((f) => { const c = byId(scenario.attacks, f.cardId)!; return { id: f.cardId, label: c.label, pct: Math.min(100, Math.round(((game.clock.activeMs - f.startedActiveMs) / (c.durationSec * 1000)) * 100)), anim: c.anim ? { route: c.anim.route, kind: c.anim.kind } : undefined }; }),
    duties: dutyCards(scenario, m),
    attackScore: m.attackScore, defendScore: m.defendScore,
    ledger: m.ledger.slice(-20),
    outcome: m.outcome,
    review: game.phase === 'over' ? buildReview(m) : undefined,
  };
}

/** The scoring reference, read straight out of the scenario so it always
 *  matches the rules actually being applied. Dashboard only. */
function buildRubric(scenario: Scenario): RubricSection[] {
  const defLabel = (id: string) => byId(scenario.defends, id)?.label ?? id;
  const ptsOf = (arr: { who: Side; pts: number }[] | undefined, who: Side) =>
    (arr ?? []).filter((x) => x.who === who).reduce((a, x) => a + x.pts, 0);

  const attacks: RubricRow[] = scenario.attacks.map((a) => {
    const win = ptsOf(a.onSuccess?.score, 'attack');
    const stops = (a.blockedBy ?? []).map((b) => defLabel(b.control));
    const back = ptsOf(a.onBlocked?.score, 'defend');
    const cut = ptsOf(a.onInterrupt?.score, 'defend');
    let note: string;
    if (stops.length) note = `Stopped by ${stops.join(' or ')} — defenders +${back}`;
    else if (a.interruptedBy?.length) note = `Cannot be blocked, only cut off mid-move${cut ? ` — defenders +${cut}` : ''}`;
    else note = 'Nothing stops it';
    return { label: a.label, value: win ? `+${win}` : '0', note, who: 'attack' as Side };
  });

  const signs: RubricRow[] = scenario.signs
    .filter((sg) => sg.real && sg.points)
    .map((sg) => ({
      label: sg.text,
      value: `+${sg.points!.fast} fast · +${sg.points!.slow} slow`,
      note: `Fast means within ${sg.points!.fastSec}s of the sign appearing`,
      who: 'defend' as Side,
    }));

  const duties: RubricRow[] = scenario.duties.map((d) => {
    if (d.timing) {
      const w = d.timing.windows.map((x) => `+${x.pts} within ${x.withinSec}s`).join(' · ');
      return { label: d.label, value: w, note: `otherwise +${d.timing.late.pts}`, who: 'defend' as Side };
    }
    const base = ptsOf(d.score, 'defend');
    return {
      label: d.label,
      value: `+${base}`,
      note: d.deadlineSensitive ? 'halved if the 72 fictional hours have passed' : undefined,
      who: 'defend' as Side,
    };
  });

  const moves: RubricRow[] = scenario.defends
    .filter((d) => (d.score ?? []).length)
    .map((d) => {
      const p = ptsOf(d.score, 'defend');
      return { label: d.label, value: `${p > 0 ? '+' : ''}${p}`, who: 'defend' as Side };
    });
  moves.push({ label: 'Restore from a backup, after eradication', value: `+${ENGINE_SCORES.restoreClean}`, who: 'defend' });
  for (const a of scenario.attacks) {
    const cut = ptsOf(a.onInterrupt?.score, 'defend');
    if (cut) moves.push({ label: `Cut off “${a.label}” mid-move`, value: `+${cut}`, who: 'defend' });
  }

  const penalties: RubricRow[] = [
    ...scenario.defends.filter((d) => ptsOf(d.score, 'defend') < 0)
      .map((d) => ({ label: d.label, value: `${ptsOf(d.score, 'defend')}`, note: d.score?.[0]?.reason, who: 'defend' as Side })),
    { label: 'Restore before removing the way back in', value: `${ENGINE_SCORES.restoreEarlyDefend}`, note: `and the attackers get +${ENGINE_SCORES.restoreEarlyAttack}`, who: 'defend' },
    { label: 'Misread a card: a real sign called normal, or the reverse', value: `${ENGINE_SCORES.triageWrong}`, note: `each; +${ENGINE_SCORES.triageCorrect} for each one called right`, who: 'defend' },
    { label: 'Records copied out before the incident was declared', value: `+${ENGINE_SCORES.exfilBeforeDeclare} to the attackers`, who: 'attack' },
  ];

  const atkMax = scenario.attacks.reduce((t, a) => t + ptsOf(a.onSuccess?.score, 'attack'), 0);
  // best case per duty: the fastest window, or its flat value
  const dutyMax = scenario.duties.reduce((t, d) => t + (d.timing
    ? Math.max(...d.timing.windows.map((w) => w.pts), d.timing.late.pts)
    : ptsOf(d.score, 'defend')), 0);

  return [
    { title: 'Attackers — points only when a move lands', blurb: `${atkMax} points in all, if nothing stops them.`, rows: attacks },
    { title: 'Defenders — spotting a sign', blurb: 'The clock starts when the sign appears, not when it is caused.', rows: signs },
    { title: 'Defenders — the legal duties', blurb: `${dutyMax} points in all — the biggest pot, and none of them spends a move.`, rows: duties },
    { title: 'Defenders — contain, preserve, recover', rows: moves },
    { title: 'Losing points', blurb: 'Each of these is the instinctive wrong move.', rows: penalties },
  ];
}

/** What each side will see and the choices it has to make. Built from the
 *  scenario; dashboard only, so the facilitator can show or explain a console
 *  without looking over a team's shoulder. */
function buildPreview(scenario: Scenario): PreviewSide[] {
  const whenAttack = (rounds: number[]) => {
    const r = rounds.filter((x) => x > 0);
    if (!r.length) return 'Prepare only';
    return r.length === 1 ? `Round ${r[0]}` : `Rounds ${r[0]}\u2013${r[r.length - 1]}`;
  };
  const group = <T>(items: T[], name: (x: T) => string, row: (x: T) => RubricRow): PreviewGroup[] => {
    const out = new Map<string, RubricRow[]>();
    for (const it of items) {
      const k = name(it);
      if (!out.has(k)) out.set(k, []);
      out.get(k)!.push(row(it));
    }
    return [...out].map(([n, rows]) => ({ name: n, rows }));
  };

  const attack: PreviewSide = {
    key: 'attack',
    title: 'Attackers',
    brief: scenario.brief.attack,
    groups: [
      ...group(scenario.attacks, (a) => a.group, (a) => ({
        label: a.label,
        value: whenAttack(a.rounds),
        note: a.attack ? `${a.attack.id} \u00b7 ${a.attack.name}` : undefined,
        who: 'attack' as Side,
      })),
      {
        name: 'What they also see',
        rows: [
          { label: 'Moves left this round', value: '3 pips', note: 'spent one at a time; a move cannot be taken back', who: 'attack' },
          { label: 'Under way', value: 'a bar', note: 'long moves run on a timer and can be cut off by the defenders', who: 'attack' },
          { label: 'Your results', value: 'a log', note: 'only their own moves — never the defenders\u2019 alerts', who: 'attack' },
        ],
      },
    ],
  };

  const defendPhaseName: Record<string, string> = {
    prepare: 'Prepare: pick 4 of 7 fixes',
    detect: 'Detect', contain: 'Contain', preserve: 'Preserve',
    eradicate: 'Eradicate', recover: 'Recover',
  };
  const defend: PreviewSide = {
    key: 'defend',
    title: 'Defenders',
    brief: scenario.brief.defend,
    groups: [
      ...group(scenario.defends, (d) => defendPhaseName[d.phase] ?? d.phase, (d) => ({
        label: d.label,
        value: d.phase === 'prepare' ? 'Prepare' : 'In a round',
        note: d.owner ? `${d.owner}${d.finding ? ` \u00b7 ${d.finding}` : ''}` : d.finding,
        who: 'defend' as Side,
      })),
      {
        name: 'Event or incident?',
        rows: scenario.signs.filter((x) => x.triage).slice(0, 3).map((x) => ({
          label: x.text,
          value: 'Normal / A sign',
          note: 'called right +2, misread \u22122',
          who: 'defend' as Side,
        })),
      },
      {
        name: 'Legal duties (these cost no moves)',
        rows: scenario.duties.map((d) => ({
          label: d.label,
          value: d.needsReason ? 'needs a reason' : 'one tap',
          note: d.needsReason ? 'they must pick which sign justifies it' : undefined,
          who: 'defend' as Side,
        })),
      },
    ],
  };

  return [attack, defend];
}

export function wcView(
  game: GameState, scenario: Scenario,
  ctx: { deviceCounts: Record<string, { attack: number; defend: number }> },
): WcView {
  const matches = game.matches.map((m) => matchSummary(game, m, ctx.deviceCounts[m.id] ?? { attack: 0, defend: 0 }));
  const focus = game.focusId ? game.matches.find((m) => m.id === game.focusId) : game.matches[0];
  let leaderboard: WcView['leaderboard'];
  if (game.phase === 'over') {
    leaderboard = {
      defend: [...game.matches].sort((a, b) => b.defendScore - a.defendScore).map((m) => ({ team: m.defendTeam, score: m.defendScore })),
      attack: [...game.matches].sort((a, b) => b.attackScore - a.attackScore).map((m) => ({ team: m.attackTeam, score: m.attackScore })),
    };
  }
  return {
    kind: 'wc',
    phase: game.phase, round: game.round, phaseLabel: phaseLabelOf(game),
    paused: !game.clock.running && game.phase !== 'lobby' && game.phase !== 'over',
    clock: { fictional: fmtFict(fictNow(game)), realLeftSec: realLeftSec(game) },
    joinHost: game.joinHost,
    matches,
    focusId: focus?.id ?? null,
    focus: focus ? focusView(game, scenario, focus) : null,
    injects: scenario.injects.map((i) => ({ id: i.id, label: i.label })),
    rubric: buildRubric(scenario),
    preview: buildPreview(scenario),
    leaderboard,
  };
}
