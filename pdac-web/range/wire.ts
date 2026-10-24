// Shapes sent between the server and the browsers. Pure types plus a few
// constants: no runtime logic, so both the server engine (range/engine/*) and
// the Vite-built clients (range/client/*) can import it. Everything a device
// receives is already filtered for its role; the raw rules never leave the
// server.

export type Side = 'attack' | 'defend';
export type Role = Side | 'wc'; // wc = white cell (facilitator)

export type Phase = 'lobby' | 'brief' | 'prepare' | 'round' | 'over';

/** One phase step of a match, named for the room. */
export const PHASE_LABEL: Record<Phase, string> = {
  lobby: 'Waiting to start',
  brief: 'Briefing',
  prepare: 'Prepare',
  round: 'Round',
  over: 'Debrief',
};

export const ROUND_LABEL = ['Prepare', 'Detect', 'Contain & eradicate', 'Recover & notify'];

export type Band = 'info' | 'warn' | 'alert' | 'ok' | 'bad';

/** A packet to animate across the dashboard map. */
export interface Anim {
  route: string[]; // map node ids, in order
  kind: 'attack' | 'leak' | 'secure';
  blockAt?: string; // stop here with a cross (blocked / contained)
}

/** A button on a team console. */
export interface ActionCard {
  id: string;
  label: string;
  group: string; // "Detect", "Contain", ... or attacker step
  enabled: boolean;
  cost: number; // moves it spends (0 = duties, free checks)
  note?: string; // why disabled, or a short hint
  picked?: boolean; // prepare: already chosen
  attack?: { id: string; name: string; url?: string }; // MITRE ATT&CK technique (attacker cards)
}

/** A line in a team's feed (attacker results, or defender signs/events). */
export interface FeedItem {
  id: string;
  t: string; // fictional time stamp, e.g. "Mon 09:14"
  text: string;
  band: Band;
  node?: string; // map node it points at
  tag?: string; // e.g. "T1566 Phishing" (attacker results / white-cell view)
  tagUrl?: string; // the ATT&CK page for that technique
  anim?: Anim; // dashboard: a packet to animate when this line is new
}

/** An attacker move still running, shown as a progress bar. */
export interface InFlight {
  id: string;
  label: string;
  pct: number; // 0..100
  anim?: Anim; // dashboard: pulse this packet while the move runs
}

/** A defender duty (declare, notify, ...). */
export interface DutyCard {
  id: string;
  label: string;
  done: boolean;
  needsReason: boolean;
  note?: string;
}

/** An event card the defenders classify as normal or a real sign. */
export interface TriageCard {
  id: string;
  text: string;
  node?: string;
}

export interface Outcome {
  records: boolean; // confidentiality: records copied out
  defaced: boolean; // integrity: portal page changed
  offlineHours: number; // availability
  evidenceKept: boolean;
  lines: string[]; // plain summary lines
  attackScore: number;
  defendScore: number;
}

/** What a team console renders. */
export interface PlayerView {
  kind: 'player';
  role: Side;
  matchId: string;
  team: string;
  opponent: string;
  phase: Phase;
  round: number;
  phaseLabel: string;
  paused: boolean;
  clock: {
    fictional: string; // "Mon 09:14"
    realLeftSec: number; // time left in this phase
    deadline?: string; // 72-hour deadline, fictional
    clockStarted?: string; // when the team started the 72h clock
  };
  budget: { left: number; total: number } | null;
  actions: ActionCard[];
  feed: FeedItem[];
  inFlight: InFlight[];
  duties?: DutyCard[];
  triage?: TriageCard[];
  reasons?: { id: string; text: string }[]; // revealed real signs a duty may cite
  score: number;
  message?: string;
  outcome?: Outcome;
}

/** One match as the white cell sees it in the lobby and the strip. */
export interface MatchSummary {
  id: string;
  n: number; // 1-based index, the key that selects it
  attackTeam: string;
  defendTeam: string;
  attackCode: string;
  defendCode: string;
  attackDevices: number;
  defendDevices: number;
  attackScore: number;
  defendScore: number;
  phase: Phase;
  round: number;
  alertCount: number; // unseen-by-you cue
}

/** The full both-sides view of one match for the white cell. */
export interface FocusView {
  id: string;
  n: number;
  attackTeam: string;
  defendTeam: string;
  nodes: Record<string, string>; // node id -> NetMap state
  attackFeed: FeedItem[];
  defendFeed: FeedItem[];
  inFlight: InFlight[];
  duties: DutyCard[];
  attackScore: number;
  defendScore: number;
  ledger: { t: string; who: Side; pts: number; reason: string; link?: string; phase: string }[];
  outcome?: Outcome;
  review?: RoundReview[]; // filled at the end: the match, round by round
}

/** One round of the after-game review, as the dashboard shows it. */
export interface RoundReview {
  key: string;      // 'prepare' | 'r1' | 'r2' | 'r3'
  label: string;    // 'Prepare', 'Round 1: Detect', …
  attackPts: number;
  defendPts: number;
  moves: { t: string; who: Side; label: string; note?: string }[];
  scores: { t: string; who: Side; pts: number; reason: string; link?: string }[];
}

/** The scoring reference the dashboard shows. Built on the server from the
 *  scenario and the engine's own constants, and sent only to the white cell:
 *  the participant bundle must never carry rule text (range:check enforces it). */
export interface RubricRow {
  label: string;
  value: string;
  note?: string;
  who?: Side;
}

export interface RubricSection {
  title: string;
  blurb?: string;
  rows: RubricRow[];
}

/** What one side will see: its brief and the choices it has to make.
 *  Dashboard only, like the rubric. */
export interface PreviewGroup {
  name: string;
  rows: RubricRow[];
}

export interface PreviewSide {
  key: Side;
  title: string;
  brief: string;
  groups: PreviewGroup[];
}

export interface WcView {
  kind: 'wc';
  phase: Phase;
  round: number;
  phaseLabel: string;
  paused: boolean;
  clock: { fictional: string; realLeftSec: number };
  joinHost: string; // "174.16.2.145:8080"
  matches: MatchSummary[];
  focusId: string | null;
  focus: FocusView | null;
  injects: { id: string; label: string }[]; // prepared injects to push
  leaderboard?: { defend: { team: string; score: number }[]; attack: { team: string; score: number }[] };
  rubric: RubricSection[]; // the scoring reference, for the dashboard's modal
  preview: PreviewSide[]; // what each side sees, for the dashboard's modal
}

export type ServerMessage =
  | { type: 'hello'; role: Role; map: unknown; youAre?: string }
  | { type: 'view'; view: PlayerView | WcView }
  | { type: 'bye'; reason: string };

/** Commands a browser POSTs. The server adds identity from the session. */
export type ClientCommand =
  | { type: 'play'; action: string; target?: string; reason?: string } // team move / duty
  | { type: 'triage'; card: string; asReal: boolean }
  | { type: 'setName'; name: string }
  // white cell only:
  | { type: 'wc'; cmd: WcCommand };

export type WcCommand =
  | { kind: 'makeMatches'; count: number }
  | { kind: 'start' }
  | { kind: 'next' } // advance phase / round
  | { kind: 'pause' }
  | { kind: 'resume' }
  | { kind: 'inject'; matchId: string; injectId?: string; text?: string }
  | { kind: 'focus'; matchId: string }
  | { kind: 'force'; matchId: string; side: Side; action: string; target?: string } // projector fallback
  | { kind: 'end' }
  | { kind: 'reset' };
