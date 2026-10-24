# RSSO Live — a LAN attack-and-defend game (Module 5)

A live simulation for Module 5. Teams join from their own laptop (or phone) over
the room's Wi-Fi. One team **attacks** the fictional RSSO, the other **defends**;
your dashboard shows both sides of every match on one screen. It turns the
module's phases (detect, contain, eradicate, recover) and duties (declare, tell
the DPO, the 72-hour clock) into something the room *does*.

**It is a different incident from the graded capstone tabletop.** No Friday
ransomware story, no ended-vendor account, no e-wallet call-back, no backup-drive
facts, and none of the White Cell Guide's injects. Playing it gives nothing away.
Everything is fictional and awareness-level: the moves are the course's own doors,
steps and Module 4 findings, in plain words — no tools, commands or real targets.

Each attack move also carries its real **MITRE ATT&CK** technique (for example
Phishing T1566, Exploit Public-Facing Application T1190), shown on the attacker
console and your dashboard. The names come from the same ATT&CK data the deck
bundles — `npm run attack` (github.com/mitre-attack/attack-stix-data); on your
dashboard the tag links to the technique's page.

## Suggested slot (Friday, Lesson 5.1)

Teach the essentials 8:10–8:30, then play 8:30–8:55, before the graded tabletop.

| Time | Step |
|---|---|
| 8:30 | Teams open the game and enter their code (or scan the QR). You watch them arrive in the lobby |
| 8:33 | 1-minute briefing on screen |
| 8:34 | **Prepare** (2 min): defenders pick 4 of 7 fixes; attackers study the office |
| 8:36 | **Round 1 Detect → 2 Contain & eradicate → 3 Recover & notify** (≈4 min each). Press **Next** between rounds; **Pause** (Space) for a 30-second pulse check |
| 8:50 | **End** → debrief: a round-by-round review of each match (what both sides played, then every point with its module), then the leaderboard |

All timings live in `scenario/portal-week.json` (`config`), change them freely.

## Run it

```bash
cd pdac-web
npm run range          # builds the consoles and starts the server
```

It prints two links:

```
Teams join on:   http://<your-LAN-ip>:8080
Your dashboard:  http://<your-LAN-ip>:8080/wc?key=<secret>
```

- Open the **dashboard** link on your laptop. Keep its `key` to yourself.
  It is built for a screen **1100px wide or more**, where it fills the window
  with no scrolling. On anything narrower (a small tablet) it still works: the
  three columns stack and the page scrolls.
- Put the **join** address on the projector. In the lobby, choose how many matches
  (1 match per attack/defend pair; 6 teams = 3 matches), then each team enters the
  code shown for its side, or scans the QR. Press **Start**.
- The game stays on your laptop. macOS will ask once to allow incoming
  connections for `node` — say yes. No internet is used.
- **Can't reach it?** The startup banner lists every address your laptop has
  (Wi-Fi, Ethernet, hotspot) — try another, or force one with
  `node range/server/main.mjs --host <ip>`.
- Crashed? `node range/server/main.mjs --resume` picks up the autosave (paused).

### Dashboard keys

| Key | Does |
|---|---|
| **1–9** | Focus that match (the big both-sides view) |
| **← →** | Previous / next match |
| **Space** | Pause / resume everything |
| **N** | Next phase or round |
| **P** | What the teams see — both consoles side by side, with the choices each side has to make |
| **?** | Scoring reference — every move's points, read live from the scenario. Esc closes it |
| **V** | Room view — safe to project during play (timer, teams, scores; no moves). Press V again for your full view |
| Buttons | Start, Next, Pause, End, Reset, and the injects (citizen screenshot, central office, reporter) |

Two screens help: put **Room view** on the projector and your full dashboard on
the laptop. One screen only? Project the lobby to hand out codes, then keep the
dashboard to yourself and glance up at Room view when you want to show the room.

**No usable network?** The dashboard can press moves for either side of any match
(the inject/force controls), so you can still run it on the projector with the
room calling out moves.

## Network checklist (test before class)

1. Put your laptop and one test phone **on the venue Wi-Fi**. Open the join
   address from the phone. If the team console loads, you are good.
2. Many venues block device-to-device traffic ("client isolation") or use a guest
   network that does. If the phone cannot reach the address:
   - Use a **pocket Wi-Fi or your phone's hotspot** (no internet needed — the game
     is offline). One device per team keeps the count small.
   - Last resort: **projector-only mode** above.
3. Firewall: allow incoming connections to `node` on port 8080 (macOS prompt).

## Safety

- Neither panel (**P** or **?**) will open over Room view, and switching to Room
  view closes them: both name controls, signs and moves, so they must never
  reach the projector.
- The participant bundle (`range-dist/`) ships **no rules and no answers** — the
  scoring reasons and the scenario live only on the server and reach only your
  dashboard. `npm run range:check` proves it.
- Join codes change every time you press **Reset** or restart the server.
- No participant data is kept. The autosave in `range-save/` holds only team
  names and moves, for crash recovery.

## Check it

```bash
npm run range:test    # engine logic on a fake clock + a full browser play-through
npm run range:check   # the bundle ships no answers, loads nothing online, names nothing real
npm run range:typecheck
node range/tools/range-shots.mjs   # screenshots + a no-sideways-scroll audit (range/shots/)
```

The browser test confirms the one-way mirror: a defender console never receives
attacker move text, an attacker never sees the defenders' alerts, a `<script>`
team name is shown as text, wrong codes are locked out, and nothing leaves the
machine.

## What's where

```
range/
  wire.ts                 shapes shared by server and browsers (types only)
  engine/                 the rules: state, clock, scoring, per-role views (server-only)
  scenario/portal-week.json  the incident: moves, controls, signs, duties, scoring reasons
  server/main.mjs         http + Server-Sent Events, join codes, rate limits, autosave
  client/play.ts          the team console (attacker / defender)
  client/wc.ts            your dashboard
  tools/                  engine test, browser test, bundle check, screenshots
```

To change the game, edit `scenario/portal-week.json` — moves, what blocks what,
the signs defenders see, and the scoring with its teaching reasons. The server
validates it on load and names anything that does not line up.

## Online run (28 Oct)

Online participants are not on your Wi-Fi. Running it then needs the server
reachable over the internet (for example the cloud VM in `src/data/lab.json`),
which we have not set up. Decide closer to the date.
