// Engine types: the scenario file's shape, and the live state of a game.
// Server-only (the scenario holds the answers), so this never reaches a browser.
import type { Band, FeedItem, Outcome, Phase, Side } from '../wire.ts';

/** A flag expression: AND of tokens. "atk.foothold" truthy; "!ctrl.mfa" absent;
 *  "atk.exfil>=50" numeric. Evaluated against MatchState.flags. */
export type FlagExpr = string[];

export interface ScoreDelta {
  who: Side;
  pts: number;
  reason: string;
  link?: string; // "Module 5: isolate first, power off last"
}

export interface Block {
  control: string; // defend card id (a flag ctrl.<id>) that stops this move
  reason: string; // attacker-facing: what they ran into
  link?: string;
  reveal?: string[]; // reveal-tags unlocked for defenders when a block happens
}

export interface AttackCard {
  id: string;
  label: string;
  group: string; // M2 step name
  attack?: { id: string; name: string; url?: string }; // MITRE ATT&CK technique (url filled from attack.json)
  anim?: { route: string[]; kind: 'attack' | 'leak' | 'secure' }; // dashboard packet route
  rounds: number[]; // rounds it is offered (1..3); recon also in prepare via [0]
  cost: number;
  durationSec: number; // real active seconds to finish
  requires?: FlagExpr;
  requiresNote?: string;
  blockedBy?: Block[];
  interruptedBy?: FlagExpr[]; // any expr true mid-flight -> interrupted (OR of ANDs)
  onStart?: { set?: Record<string, number>; signs?: string[] };
  onSuccess?: { set?: Record<string, number>; signs?: string[]; score?: ScoreDelta[]; result: string };
  onBlocked?: { result: string; score?: ScoreDelta[] };
  onInterrupt?: { result: string; score?: ScoreDelta[] };
}

export type DefendPhase = 'prepare' | 'detect' | 'contain' | 'preserve' | 'eradicate' | 'recover';

export interface DefendCard {
  id: string;
  label: string;
  group: string;
  owner?: string; // Lesson 5.1.1 role
  finding?: string; // Module 4 finding id
  phase: DefendPhase;
  rounds: number[]; // prepare = [0]
  cost: number;
  requires?: FlagExpr;
  requiresNote?: string;
  set?: Record<string, number>;
  reveals?: string[]; // sign reveal-tags unlocked
  score?: ScoreDelta[];
  result?: string; // defender-facing confirmation
  nodeState?: Record<string, string>; // map node -> NetMap state to set
}

export type RevealTag =
  | 'auto'
  | 'onAlerts'
  | 'onCheckTraffic'
  | 'onCheckSignins'
  | 'onCheckServer'
  | 'onAskStaff';

export interface SignDef {
  id: string;
  text: string;
  node?: string;
  band: Band;
  real: boolean;
  reveal: RevealTag;
  category?: string; // 'intrusion' | 'exfil' | 'deface' ...
  points?: { fastSec: number; fast: number; slow: number };
  triage?: boolean; // also pushed as a classify-this card
}

export interface NormalEvent {
  id: string;
  text: string;
  node?: string;
  atSec: number; // active seconds from first round start
}

export interface DutyDef {
  id: string;
  label: string;
  needsReason: boolean;
  reasonCategory?: string; // comma list of sign categories that are valid reasons
  score?: ScoreDelta[];
  deadlineSensitive?: boolean; // full points only if done before the 72h fictional deadline
  timing?: {
    basis: 'firstRealSign' | 'clockStart';
    windows: { withinSec: number; pts: number; reason: string }[];
    late: { pts: number; reason: string };
  };
}

export interface InjectDef {
  id: string;
  label: string;
  text: string;
  band: Band;
}

export interface MapSpecLike {
  size: [number, number];
  zones?: unknown[];
  nodes: { id: string }[];
  links: { from: string; to: string }[];
}

export interface Scenario {
  id: string;
  title: string;
  brief: { attack: string; defend: string };
  map: MapSpecLike;
  config: {
    preparePicks: number;
    briefSec: number;
    prepareSec: number;
    roundSeconds: number[]; // [r1, r2, r3]
    attackBudget: number[]; // [r1, r2, r3]
    defendBudget: number[]; // [r1, r2, r3]
    clock: { startFict: number; compression: number; deadlineHours: number };
  };
  attacks: AttackCard[];
  defends: DefendCard[];
  signs: SignDef[];
  normals: NormalEvent[];
  duties: DutyDef[];
  injects: InjectDef[];
}

// ---- live state ----

export interface InFlightAttack {
  cardId: string;
  startedActiveMs: number;
}

export interface SignInstance {
  id: string; // unique instance key
  def: string; // SignDef id
  availAtActiveMs: number;
  revealed: boolean;
  revealedAtActiveMs?: number;
}

export interface TriageInstance {
  id: string;
  text: string;
  node?: string;
  real: boolean;
}

export interface Ledger {
  t: string;
  who: Side;
  pts: number;
  reason: string;
  link?: string;
  phase: string; // 'prepare' | 'r1' | 'r2' | 'r3' — which round earned it
}

/** Every move either side played, kept for the round-by-round debrief. */
export interface MoveRecord {
  t: string;
  who: Side;
  phase: string;
  label: string;
  note?: string; // blocked, interrupted, or the duty's reason
}

export interface MatchState {
  id: string;
  n: number;
  attackCode: string;
  defendCode: string;
  attackTeam: string;
  defendTeam: string;
  flags: Record<string, number>;
  budgetAttack: number;
  budgetDefend: number;
  prepared: string[];
  playedAttack: string[];
  playedDefend: string[];
  inFlight: InFlightAttack[];
  signs: SignInstance[];
  feedAttack: FeedItem[];
  feedDefend: FeedItem[];
  duties: Record<string, { done: boolean; atFict?: number; reason?: string }>;
  triagePending: TriageInstance[];
  triageDone: { id: string; correct: boolean }[];
  normalsFired: string[];
  ledger: Ledger[];
  moves: MoveRecord[];
  attackScore: number;
  defendScore: number;
  firstRealSignActiveMs?: number;
  clockStartedActiveMs?: number;
  nodeState: Record<string, string>;
  outcome?: Outcome;
}

export interface GameState {
  phase: Phase;
  round: number; // 0 prepare, 1..3 rounds
  clock: {
    startFict: number;
    compression: number;
    activeMs: number; // active (non-paused) ms since play began
    running: boolean;
    lastMs: number; // wall clock of last tick
    phaseEndsActiveMs: number; // activeMs at which the current timed phase ends (0 = untimed)
  };
  matches: MatchState[];
  focusId: string | null;
  joinHost: string;
}

export type { Band, FeedItem, Outcome, Phase, Side };
