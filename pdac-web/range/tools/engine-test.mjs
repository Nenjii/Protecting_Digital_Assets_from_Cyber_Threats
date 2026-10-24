// Engine tests on a fake clock. Deterministic: no wall-clock, no network.
//   node range/tools/engine-test.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  loadScenario, newGame, makeMatches, startGame, nextPhase, endGame,
  playTeam, playerView, wcView, triage, pushInject, tick, setMatchName,
} from '../engine/engine.ts';

const scenarioRaw = JSON.parse(readFileSync(new URL('../scenario/portal-week.json', import.meta.url), 'utf8'));

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; } else { fail++; console.log(`  ✗ ${msg}`); } };
const section = (name) => console.log(`\n${name}`);

// A virtual clock: advance(ms) moves time forward and ticks the engine.
function rig(count = 1) {
  const scenario = loadScenario(scenarioRaw);
  const game = newGame(scenario, { joinHost: 'test:8080' });
  makeMatches(game, scenario, count);
  let v = 1000;
  startGame(game, scenario);
  game.clock.lastMs = v;
  const advance = (ms) => { v += ms; tick(game, scenario, v); };
  const pause = () => { tick(game, scenario, v, true); game.clock.running = false; };
  const resume = () => { game.clock.running = true; game.clock.lastMs = v; };
  const toPrepare = () => { nextPhase(game, scenario); }; // brief -> prepare
  const toRound = (r) => { while (game.round < r || game.phase !== 'round') nextPhase(game, scenario); };
  return { scenario, game, advance, pause, resume, toPrepare, toRound, m: () => game.matches[0] };
}

// ---- 1. scenario loads and validates ----
section('Scenario');
{
  const scenario = loadScenario(scenarioRaw);
  ok(scenario.attacks.length >= 8, 'has the attack moves');
  ok(scenario.defends.length >= 15, 'has the defense moves');
  let threw = false;
  try { loadScenario({ ...scenarioRaw, attacks: [{ ...scenarioRaw.attacks[0], blockedBy: [{ control: 'nope', reason: 'x' }] }] }); } catch { threw = true; }
  ok(threw, 'rejects an unknown control reference');
}

// ---- 2. no fixes -> attackers get in and exfiltrate ----
section('No fixes: attackers win');
{
  const t = rig();
  t.toPrepare();
  t.toRound(1);
  ok(playTeam(t.game, t.scenario, { matchId: 'm1', side: 'attack' }, { action: 'phish' }) === null, 'phish starts');
  t.advance(21000); // past its 20s
  ok(t.m().flags['atk.foothold'] > 0, 'phish gives a foothold with no filter/mfa');
  nextPhase(t.game, t.scenario); // round2
  ok(playTeam(t.game, t.scenario, { matchId: 'm1', side: 'attack' }, { action: 'exfil' }) === null, 'exfil starts with a foothold');
  t.advance(41000);
  ok(t.m().flags['atk.exfilDone'] > 0, 'records copied out');
  endGame(t.game, t.scenario);
  ok(t.m().outcome?.records === true, 'outcome: records breached');
  ok(t.m().attackScore >= 20, `attackers scored (${t.m().attackScore})`);
}

// ---- 3. the right fixes stop them at the door ----
section('Right fixes: stopped at Get in');
{
  const t = rig();
  t.toPrepare();
  for (const fix of ['mfa', 'patch', 'close_rule', 'filter']) {
    ok(playTeam(t.game, t.scenario, { matchId: 'm1', side: 'defend' }, { action: fix }) === null, `prepare: ${fix}`);
  }
  ok(playTeam(t.game, t.scenario, { matchId: 'm1', side: 'defend' }, { action: 'alerts' }) !== null, 'a 5th prepare pick is refused (budget 4)');
  t.toRound(1);
  playTeam(t.game, t.scenario, { matchId: 'm1', side: 'attack' }, { action: 'phish' });
  playTeam(t.game, t.scenario, { matchId: 'm1', side: 'attack' }, { action: 'exploit_patch' });
  playTeam(t.game, t.scenario, { matchId: 'm1', side: 'attack' }, { action: 'exploit_admin_open' });
  t.advance(21000);
  ok(!(t.m().flags['atk.foothold'] > 0), 'no foothold: every door was shut');
  ok(t.m().defendScore > 0, `defenders scored for the blocks (${t.m().defendScore})`);
  nextPhase(t.game, t.scenario);
  ok(playTeam(t.game, t.scenario, { matchId: 'm1', side: 'attack' }, { action: 'exfil' }) !== null, 'exfil refused without a foothold');
}

// ---- 4. interrupt an in-flight transfer ----
section('Contain in time');
{
  const t = rig();
  t.toPrepare(); t.toRound(1);
  playTeam(t.game, t.scenario, { matchId: 'm1', side: 'attack' }, { action: 'phish' });
  t.advance(21000); // foothold
  nextPhase(t.game, t.scenario); // round2
  playTeam(t.game, t.scenario, { matchId: 'm1', side: 'attack' }, { action: 'exfil' });
  t.advance(10000); // mid-transfer
  ok(t.m().inFlight.some((f) => f.cardId === 'exfil'), 'transfer is running');
  playTeam(t.game, t.scenario, { matchId: 'm1', side: 'defend' }, { action: 'isolate' });
  t.advance(1000);
  ok(!t.m().inFlight.some((f) => f.cardId === 'exfil'), 'isolate interrupted the transfer');
  ok(!(t.m().flags['atk.exfilDone'] > 0), 'no records left');
}

// ---- 5. power off loses evidence; isolate keeps it ----
section('Isolate vs power off');
{
  const a = rig(); a.toPrepare(); a.toRound(1);
  const before = a.m().defendScore;
  playTeam(a.game, a.scenario, { matchId: 'm1', side: 'defend' }, { action: 'isolate' });
  playTeam(a.game, a.scenario, { matchId: 'm1', side: 'defend' }, { action: 'preserve' });
  endGame(a.game, a.scenario);
  ok(a.m().defendScore > before, 'isolate + preserve add points');
  ok(a.m().outcome?.evidenceKept === true, 'evidence kept');

  const b = rig(); b.toPrepare(); b.toRound(1);
  playTeam(b.game, b.scenario, { matchId: 'm1', side: 'defend' }, { action: 'preserve' });
  playTeam(b.game, b.scenario, { matchId: 'm1', side: 'defend' }, { action: 'power_off' });
  endGame(b.game, b.scenario);
  ok(b.m().outcome?.evidenceKept === false, 'power off loses the memory evidence');
  ok(b.m().ledger.some((l) => l.pts < 0 && /powered off/i.test(l.reason)), 'power off is penalised with a reason');
}

// ---- 6. restore before eradication brings the attacker back ----
section('Restore before eradication');
{
  const t = rig(); t.toPrepare(); t.toRound(1);
  playTeam(t.game, t.scenario, { matchId: 'm1', side: 'attack' }, { action: 'phish' });
  t.advance(21000);
  nextPhase(t.game, t.scenario); // round2
  playTeam(t.game, t.scenario, { matchId: 'm1', side: 'attack' }, { action: 'escalate' });
  t.advance(21000);
  ok(t.m().flags['atk.backdoor'] > 0, 'attacker installed a way back in');
  nextPhase(t.game, t.scenario); // round3
  playTeam(t.game, t.scenario, { matchId: 'm1', side: 'defend' }, { action: 'restore' });
  ok(t.m().flags['atk.foothold'] > 0, 'restoring before eradication returns the attacker');
  ok(t.m().ledger.some((l) => /before eradication/i.test(l.reason)), 'the mistake is explained in the ledger');
}

// ---- 7. clock-start timing ----
section('Clock-start scoring');
{
  const t = rig(); t.toPrepare(); t.toRound(1);
  playTeam(t.game, t.scenario, { matchId: 'm1', side: 'attack' }, { action: 'phish' }); // emits s-phish (auto)
  t.advance(1000); // sign reveals, firstRealSign set
  const v = playerView(t.game, t.scenario, { matchId: 'm1', side: 'defend' });
  const reasonId = v.reasons?.[0]?.id;
  ok(!!reasonId, 'a revealed real sign is offered as a reason');
  ok(playTeam(t.game, t.scenario, { matchId: 'm1', side: 'defend' }, { action: 'start_clock', reason: reasonId }) === null, 'clock started with a reason');
  ok(t.m().ledger.some((l) => /promptly/i.test(l.reason)), 'prompt start scores full');
  ok(playTeam(t.game, t.scenario, { matchId: 'm1', side: 'defend' }, { action: 'start_clock', reason: reasonId }) !== null, 'cannot start the clock twice');

  const late = rig(); late.toPrepare(); late.toRound(1);
  playTeam(late.game, late.scenario, { matchId: 'm1', side: 'attack' }, { action: 'phish' });
  late.advance(1000);
  const rid = playerView(late.game, late.scenario, { matchId: 'm1', side: 'defend' }).reasons[0].id;
  late.advance(200000); // long wait -> late
  playTeam(late.game, late.scenario, { matchId: 'm1', side: 'defend' }, { action: 'start_clock', reason: rid });
  ok(late.m().ledger.some((l) => /late/i.test(l.reason)), 'a late start scores less, with the reason');
}

// ---- 8. duty needs a valid reason ----
section('Duties need a reason');
{
  const t = rig(); t.toPrepare(); t.toRound(1);
  ok(playTeam(t.game, t.scenario, { matchId: 'm1', side: 'defend' }, { action: 'declare' }) !== null, 'declare without a reason is refused');
  ok(playTeam(t.game, t.scenario, { matchId: 'm1', side: 'defend' }, { action: 'declare', reason: 'bogus' }) !== null, 'a bogus reason is refused');
}

// ---- 9. pause freezes time ----
section('Pause freezes the game');
{
  const t = rig(); t.toPrepare(); t.toRound(1);
  playTeam(t.game, t.scenario, { matchId: 'm1', side: 'attack' }, { action: 'phish' });
  t.advance(5000);
  t.pause();
  const atPause = t.game.clock.activeMs;
  t.advance(60000); // wall time passes while paused
  ok(t.game.clock.activeMs === atPause, 'active time does not move while paused');
  ok(!(t.m().flags['atk.foothold'] > 0), 'the attack does not complete while paused');
  ok(playTeam(t.game, t.scenario, { matchId: 'm1', side: 'attack' }, { action: 'deface' }) !== null, 'moves are refused while paused');
  t.resume();
  t.advance(16000);
  ok(t.m().flags['atk.foothold'] > 0, 'after resume, the attack completes');
}

// ---- 10. invalid commands & white-cell view ----
section('Validation & white-cell view');
{
  const t = rig(2);
  ok(playTeam(t.game, t.scenario, { matchId: 'mX', side: 'attack' }, { action: 'phish' }) !== null, 'unknown match refused');
  t.toPrepare(); t.toRound(1);
  ok(playTeam(t.game, t.scenario, { matchId: 'm1', side: 'attack' }, { action: 'nope' }) !== null, 'unknown move refused');
  ok(setMatchName(t.game, 'm1', 'attack', '  Red Team  ') === null && t.m().attackTeam === 'Red Team', 'team name set & trimmed');
  ok(pushInject(t.game, t.scenario, 'm1', 'inj-reporter') === null, 'white cell can push an inject');
  const w = wcView(t.game, t.scenario, { deviceCounts: { m1: { attack: 2, defend: 3 }, m2: { attack: 0, defend: 0 } } });
  ok(w.matches.length === 2 && w.matches[0].attackDevices === 2, 'wc view lists matches with device counts');
  ok(typeof w.focus?.attackFeed === 'object', 'wc focus shows both feeds');
  ok(w.matches[0].attackCode.length === 8 && !/[IO01]/.test(w.matches[0].attackCode), 'join codes are 8 unambiguous chars');
}

console.log(`\nengine-test: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
