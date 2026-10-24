# Protecting Digital Assets from Cyber Threats: web presentation

The web presentation for the DICT ILCDB course (20 hours), built from `WEB_PRESENTATION_SPEC.md` v1.3. It follows the same flow as the Slides deck and adds live interactives. It runs fully offline from your laptop.

**Runs:** face-to-face Wednesday 21 to Friday 23 October 2026; online Monday 26 to Wednesday 28 October 2026.

## Status

| Part | State |
|---|---|
| Engine, layouts, presenter keys, speaker-view relay | Done and tested (`npm test`) |
| Live simulations on 9 slides | Done and tested: see [Simulations](#simulations). Same slide IDs, order and minutes as the deck |
| Proof for the numbers and facts (E key) | Done: every number on `numbers`, `vuln-numbers` and `human-key`, and the key facts on six Module 2 slides (four questions, STRIDE, kill chain, SPF/DKIM/DMARC, the deepfake case, ScamSafe and RA 12010), have their exact quote, publisher, date and a QR code to the page (`src/data/sources.json`, quotes checked 20 October 2026) |
| Exit checks | Done: the last slide of each module shows the QR code of an anonymous exit check (`exit-m1` to `exit-m4` in `links.json`), built by `../source/quiz-forms/ExitChecks.gs`; Modules 3 and 4 also show their practice quiz (`quiz3`, `quiz4`, not graded) |
| Module 1 (41 slides) | **Synced with the Module 1 deck and learner guide** (20 October 2026): the deck's wording on every slide, its speaker notes, and the guide's activities and model answers (Try it 1.1A to 1.2.2B, the readiness mini-check) |
| Module 2 (42 slides) | **Synced with the Module 2 deck** (20 October 2026): the deck's wording and speaker notes on every slide; activities, worked example and the risk assessment brief follow the Module 2 learner guide |
| Module 3 (40 slides) | **Built from the Module 3 learner guide** (21 October 2026; no deck yet): Lessons 3.1 to 3.3 as live simulations and room decisions, Try it 3.1 to 3.3 with the guide's model answers, and the 60-minute configuration workshop. Team workbook: `../source/worksheets/Module 3 Workbook.docx` |
| Module 4 (40 slides) | **Built from the Module 4 learner guide** (21 October 2026; no deck yet): Lessons 4.1 to 4.3, Try it 4.2A to 4.3, and the graded controls audit (20%) on paper from `../source/worksheets/Module 4 Audit File.docx`, with a findings-board debrief, then a 6-minute news outro on the PHP2Shell flaws (22 October 2026; recheck php.net and CISA KEV before each run). Key: the facilitator-only answer key next to it |
| Module 5 | Components staged in the **component gallery** (`?m=gallery`). Slides come after its learner guide exists |
| Lab app | Not needed for Module 4: its guide replaced the hands-on lab with a paper audit ("nothing is tested live") |

`npm run check` reports how many draft items are still marked `data-verify` in each module (0 in all four) and how many slides lack speaker notes (0 in all four). Modules 3 and 4 have no deck yet: when their decks arrive, sync them as in [Sync with the deck](#sync-with-the-deck), and update `tools/slide-map.json` if the deck's order differs.

## Run it

```bash
npm install          # once (needs internet)
npm run dev          # edit with live reload: http://localhost:5173
npm run build        # builds dist/, then checks nothing loads from the network
npm run preview      # serves dist/ at http://localhost:4173 (works with Wi-Fi off)
```

Other ways to serve `dist/` with no internet:

```bash
python3 -m http.server 4173 --directory dist
docker build -t pdac-web . && docker run -d -p 8080:80 pdac-web
```

Open `http://localhost:4173` for the start page, or go straight to a module:

| Address | Opens |
|---|---|
| `?m=1`, `?m=2` | One module (slide numbers match its deck) |
| `?m=all` | Every built module in one deck |
| `?m=gallery` | Component gallery, including the Module 3 to 5 interactives |
| `#/breach-duties` | A slide by its deck ID (the module is found automatically) |
| `?m=1&draft=1` | Draft mode: outlines wording still to confirm against the deck |
| `?m=1&now=09:10` | Pretend it is 9:10 (rehearse the clock-driven flow table) |

## Keys while presenting

| Key | Does |
|---|---|
| → ← PgDn PgUp Space | Next or previous. Inside an interactive, the clicker steps first (reveal, next case…), then moves on |
| S | Speaker view: notes, planned time window, timer |
| B or . | Blackout. The recap slides open blacked out so the room recalls first |
| A / R | Show the answer / reset the current interactive (also reveals "Check yourself" answers) |
| T / X | Start or pause the slide's activity timer / stop it. Warns in words and color at 2 minutes |
| K | Full-screen break timer with "back at" time. After `report` (Module 2) it also shows the QR code of Jigsaw's phishing quiz (`data-break-link` on the slide) |
| L | Live poll: the Slido or Mentimeter QR code full screen (`live-poll` in `links.json`); without a link it says where to add one |
| G / I | Glossary panel (terms on this slide) / IT depth panel |
| E | Sources on this slide: the exact quote behind each number, who published it and when, and a QR code the room can scan |
| F | Recorded fallback on demo slides; full screen elsewhere |
| J | Jump to a slide by number, ID or word |
| 1 to 9 | Add one vote to that option (vote and phish activities) |
| O or Esc | Overview (Esc first closes any open panel) |
| ? | All keys |

**Speaker view:** keys work from either window. reveal.js forwards them from the speaker view and this project relays them to the projected window. Mouse clicks on interactives must be made on the projected window (the speaker view's previews do not mirror their state).

## Before each run

1. Paste this run's form links into `src/data/links.json`, then `npm run qr` (makes `public/qr/*.svg` locally). The quiz forms (Quizzes 1 and 2 graded; 3 and 4 practice), the worksheets, the exit checks and their `links.json` lines come from the Apps Script in `../source/quiz-forms/` (run `showQuizLinks`, `showWorksheetLinks` and `showExitCheckLinks`). Day 2 also needs `audit-submit`: a hand-made Google Form with a file upload (see `../source/quiz-forms/README.md`).
   - **Day 2 printing:** one `Module 3 Workbook.docx` per team and one `Module 4 Audit File.docx` per participant (`../source/worksheets/`); online, one editable copy each. Keep the Module 3 and 4 answer key away from participants.
2. Refresh CISA's known-exploited snapshot: `npm run kev` (needs internet; updates the card on `manage-vulns` and its quote for E).
3. Optional live poll: create the run's Slido or Mentimeter event from `../source/live-poll/questions.md` (`npm run poll-pack` rebuilds it), and put its link under `live-poll` in `links.json`.
4. Install OWASP Threat Dragon 2.6.2 on the presenting laptop if you will open the models (see [Security tools](#security-tools)).
5. Put the lab address in `src/data/lab.json` (Module 4).
6. Record the 60-second fallback clips into `public/fallback/` (list in `public/fallback/README.md`).
7. Recheck facts against the NPC and DICT websites (spec section 12).
8. `npm run check && npm run build && npm test`. All three must pass.
9. Keep the PowerPoint and PDF copies of each deck on the laptop and a USB drive.

## Sync with the deck

The deck is the source of truth for wording, and the learner guide comes before it (spec section 16). Slides are matched by position, so the order must stay identical.

1. Export each module's deck as `.pptx` into `../source/` (next to this folder).
2. `npm run import-deck` writes `../source/extracted/<deck>.md` and `.json` (every slide's text and notes) for reading.
3. `npm run import-deck -- --deck="<file>.pptx" --module=1 --notes` copies the speaker notes into the module, slide by slide. Labels such as TIME, SAY and ASK are set in bold, and each slide's `<p class="notes-web">` (how to drive the web slide: presses, A, R, E) is kept.
4. `npm run import-deck -- --deck="<file>.pptx" --module=1 --diff` writes `../source/extracted/m1-wording.md`: per slide, the words on the deck but not on the web slide, and the reverse. The web side includes the eyebrow, source and the data files the slide's interactives use.

The 20 October 2026 sync used the decks you exported as PDF with speaker notes (`../source/Module 1 Threat Landscape and Legal Governance.pdf`, `../source/Module 2 Assessing Cyber Risks and Threat Modeling.pdf`). Their text and notes are in `../source/extracted/<deck>.json` and `.md`; `--json="<deck>.json"` in place of `--deck` runs steps 3 and 4 from those files.
5. Fix the wording in `src/modules/m1-threats-legal.html`, replace the draft items in `src/data/m1-*.json` (each file's `_status` says what is a draft), and remove `data-verify` once a piece is confirmed.
6. When nothing is left to verify, remove `"status"` for that module in `src/data/modules.json`; the start page then drops its draft badge.

## How a slide is written

```html
<section id="breach-duties" class="l-interactive"
         data-min="5" data-code="1.2" data-eyebrow="How fast"
         data-source="NPC Circular 16-03 Secs. 17, 18" data-terms="dbnms">
  <h2>The 72-5 rule</h2>
  <div class="stage"><pdac-breach-flow data-src="m1-breach.json" data-part="clock"></pdac-breach-flow></div>
  <div class="it-depth">…shown only in the I panel…</div>
  <aside class="notes">…speaker notes from the deck…</aside>
</section>
```

The eyebrow, footer (module, source, slide number), background, level and "Fictional office" badges, and the planned-time line in the notes are added automatically.

| Attribute | Meaning |
|---|---|
| `id` | The deck's slide ID (never reuse one across modules) |
| `data-min`, `data-break-after` | Planned minutes; a break after this slide. They drive the progress bar and the notes |
| `data-break-link` | A `links.json` key whose QR code the break screen (K) shows, e.g. `phishing-quiz` |
| `data-code`, `data-eyebrow` | Syllabus code and topic for the eyebrow |
| `data-source` | Footer source |
| `data-level` | Activity level badge (Remember … Experiment) |
| `data-timer`, `data-timer-label`, `data-checkpoints` | Minutes for T, its label, and checkpoint chimes (`"10:Map drawn|20:Threats listed"`) |
| `data-demo` | Fallback clip name for F (`public/fallback/<name>.mp4`) |
| `data-terms` | Extra glossary IDs (terms in the slide text are found automatically) |
| `data-blackout-first` | Open blacked out |
| `data-footer="none"`, `data-fictional="true\|false"`, `data-theme="dark\|accent\|light"` | Overrides |
| `class="answer"` | Hidden until A (check-yourself slides) |
| `data-verify` | Draft wording to confirm against the deck |

Layouts: `l-cover`, `l-statement`, `l-cards-3`, `l-cards-4`, `l-tiles`, `l-table`, `l-timeline`, `l-two-col`, `l-cycle`, `l-activity`, `l-demo`, `l-interactive`. Icons: `<i data-lucide="lock"></i>` (register new ones in `src/core/icons.ts`). Never put a `<section>` inside a slide: reveal.js treats it as a vertical slide.

### Interactives

| Element | Data | Notes |
|---|---|---|
| `<pdac-match-board>` | `categories`, `items` | Click an item, then a category; Check; A places all with reasons |
| `<pdac-vote-reveal>` | `items` (+ `data-options`) | Tally with clicks or 1 to 9; clicker reveals, then next case. `answer` may list two options; `facts` adds labelled lines (weakness, data at risk, fix). `data-no-vote` shows each case's model answer only (Try it 3.2, 4.2B); `unit` names the cases; `class="vr-tight"` for long cases |
| `<pdac-three-s-check>` | `questions`, `scenarios` | Team answers per S and a decision; model answer on A |
| `<pdac-breach-flow>` | 3S steps, "when unsure", 72-5 clock | `data-part="3s"`, `"clock"` or `"full"` |
| `<pdac-recall>` | sets per module | `data-module="2"` |
| `<pdac-checklist>` | `items`, `bands` | Count of yes answers at the end. The Module 1 readiness mini-check (the guide's nine questions) is in the gallery, `?m=gallery#/g-readiness`; the deck's last slide lists it as one of three Bring it home tasks |
| `<pdac-fill-template>` | `data-template="… {{blank}} …"`, or `data-src` with `template` and `examples` | Typed live, nothing saved; A fills in the example (Module 1: the deck's good AI rule) |
| `<pdac-phish-or-legit>` | `messages` with `[[cue|text]]` spans; channel `email`, `sms`, `qr`, `voice` (voicemail with transcript), `browser` (address bar, padlock, and a warning, sign-in, pop-up, upload or plain page) or `chat` (a messaging group); optional `verdict` words, `options`, `unit` | `data-range="1-4"` |
| `<pdac-dfd-stride>` | nodes, flows (optional `via` corners, `both` ends, `name`), boundaries (open or closed), threats | `data-view="threats"` for the table. Stores are two parallel lines, as in the learner guide |
| `<pdac-risk-matrix>` | bands, risks | `data-risks="w1,w2"` |
| `<pdac-qr-panel>` | `links.json` key | `data-link="quiz1"`. Inside `<div class="exit-card is-corner">` or `is-wide` it shows a smaller QR code |
| `<pdac-phrases>` | `phrases.json` keys | The memory phrases, same words and icons everywhere. `data-recap` shows the deck's desk-card wording (`recapPhrase`, `recap`) on the recap slides |
| `<pdac-firewall-sim>` | `zones`, `rules`, `flows`, `start`/`answer` order, `startOff`/`answerOff` | First match wins over a default deny; move or switch rules off; every block is logged. A fixes the rules |
| `<pdac-rbac-matrix>` | `roles`, `functions`, `start`, `recommended`, `conflicts`, `notes` | Click to grant; separation-of-duties conflicts in red; A shows the answer with its notes in the cells |
| `<pdac-lock-seal-sign>` | `lock`, `seal`, `sign`, `scenes` | Module 3's three tools with live Web Crypto (AES-GCM, SHA-256, ECDSA): a thief's key fails, one digit breaks the seal, a changed or impostor file fails the signature |
| `<pdac-reveal-grid>` | `tiles` (label, head, facts, band) | Face-down tiles the room calls out; click to turn one over; A turns all (the Module 4 debrief) |
| `<pdac-checks>` | wraps `<ol class="checks">` | Check yourself with answers on demand (Modules 3 and 4): → reveals the next answer, ← hides it, a click shows one, A all, R hides |
| `<pdac-reveal-panel>` | any slide HTML inside | An example or model answer over the slide (the workshop tasks, the audit debrief): its button or A opens it, R or ← closes it; → still moves on, so a timed task never jumps to the answer |
| `<pdac-crypto-visual>`, `<pdac-hash-prefix-demo>`, `<pdac-url-anatomy>`, `<pdac-inject-clock>`, `<pdac-password-lab>` | see the gallery | Modules 3 to 5 |

All data lives in `src/data/*.json` and is bundled at build time: nothing is fetched or sent at runtime, and no participant data is collected.

## Simulations

**Modules 3 and 4 (21 October 2026)** are built the same way, with more of them, after the Day 1 feedback that the interactive parts landed best. Network simulations on one RSSO zone map (`m3-net.json`) play the layers, the zones, IDS and IPS, the VPN and Try it 3.1; steps with an `ask` are predictions: the room votes (1 to 9), → reveals the answer and why, → plays it. Module 3 also has the firewall rules, Lock, seal, sign, the Zero Trust gate, the MFA phishing relay (SMS code, number matching, security key) and the role matrix; Module 4 the endpoint baseline (layers), shadow IT, look-alike addresses, six browser and chat screens, TLP, inbox triage and the audit's findings board.

Nine slides in Modules 1 and 2 show a live demonstration instead of static text. Each keeps its deck ID, position and minutes, and works like every other interactive: the clicker plays the next step (a press during a step finishes it), **A** jumps to the end or the summary, **R** starts over. They are awareness-level stories about the fictional RSSO: what staff would see and what each control changes, not attack instructions.

| Slide | Element and data | What the room sees |
|---|---|---|
| M1 `cia` | `<pdac-cia-lab>` · `m1-cia-lab.json` | **Secret:** the same application sent plain, then with real AES-GCM encryption made in the browser. **Correct:** a payout is edited and its SHA-256 fingerprint stops matching the approved one. **Ready:** ransomware locks the portal, then the offline backup restores it |
| M1 `actors` | `<pdac-attackers>` · `m1-attackers.json` | The deck's five attackers, each in a three-beat scene: criminal groups (files lock, a ransom note, the leak threat), state-linked groups (months of quiet data loss), hacktivists (a defaced portal, leaked documents), insiders (a list sent to a personal email to work faster), vendors and partners (the SMS vendor's weak, reused password becomes the way in). A shows the deck's table |
| M1 `numbers`, M2 `vuln-numbers`, M2 `human-key` | `<pdac-stat-proof>` around the tiles · `sources.json` | Each press flips the next number to its source: the exact quote, publisher, date and a QR code. **E** lists every source on the slide |
| M1 `paths` | `<pdac-net-sim>` · `m1-doors.json` | The office network (internet, firewall, portal, database, PCs, homes): how a citizen's request travels, then each of the five doors attacked and closed, with the deck's "what it looks like at your desk" and "what IT does". Door 1 includes the password check. A shows the deck's doors table |
| M2 `house` | `<pdac-house-sim>` · `m2-house.json` | The house, then the RSSO: switch controls on and watch likelihood × impact = risk fall, in this course's bands. "Try to get in" sends the threat round the ways in |
| M2 `attack-path` | `<pdac-chain-breaker>` · `m2-chain.json` | The seven steps in the deck's words, each with its MITRE ATT&CK tactic. Tick defenses and run the attack: it stops at the first guarded step. The scenes play the deck's three examples: staff report the phishing email (Delivery), the weakness was already patched (Exploitation), MFA and limited access (Actions on objectives) |
| M2 `layers` | `<pdac-layers-sim>` · `m2-layers.json` | Ten everyday attacks against the deck's three layers, in its order (people, process, technology): 10 land, then 4, 3, 0. When technology comes on, it shows why the filter caught the faked-address email (SPF, DKIM, DMARC) |

Open-source pieces, all bundled so the presentation stays offline:

| What | From | Used for |
|---|---|---|
| MITRE ATT&CK tactic names (v18.1) | [mitre-attack/attack-stix-data](https://github.com/mitre-attack/attack-stix-data) on GitHub, via `npm run attack` | The ATT&CK label on each link of the attack chain. `npm run attack -- --version=20.0` switches to the newest release |
| zxcvbn password estimator | [zxcvbn-ts/zxcvbn](https://github.com/zxcvbn-ts/zxcvbn) (MIT), loaded on first use | The password check in Door 1 and the gallery |
| QR codes | `qrcode` (MIT), drawn in the browser | The source cards and the E panel |

To change a story, edit its JSON file: captions, devices, routes, which control stops which attack. The component checks the data when the slide loads and names the step if something does not match.

## Security tools

Real tools that analysts use, added on 20 October 2026. The first three run from the laptop with no internet; each folder in `public/tools/` has a `VENDOR.md` (source, version, checksum, what was changed).

| Tool | Where in class | How it works here |
|---|---|---|
| **CyberChef** v11.5.0 (GCHQ, Apache 2.0) | M2 `slam`: "Read the link" splits a fictional phishing address into its parts; "Defang links for your report" turns the Try it 2.3 links into `hxxps[://]…[.]example` so nobody clicks them by accident | `public/tools/cyberchef/`, opened in a new tab with the recipe and input in the link. Its OCR and "Show on map" operations would need internet; the course does not use them |
| **CVSS v4.0 calculator** (FIRST, Red Hat; BSD 2-Clause) | M2 `manage-vulns`: the RSSO's default-password admin page scores 9.3 Critical on the internet and 8.7 High inside the office | `public/tools/cvss-v4/`, with Vue and spectre.css bundled; the vector rides in the link after `#` |
| **CISA Known Exploited Vulnerabilities** catalog (US government data) | M2 `manage-vulns`: the dark card (1,748 weaknesses attackers already use, as of catalog 2026.10.16; E shows the catalog's own header) | `npm run kev` saves counts and the three newest entries to `src/data/kev.json`; `<pdac-kev-card>` shows them |
| **OWASP Threat Dragon** 2.6.2 (Apache 2.0) | M2 `worked-map` (I panel: download the worked example) and `ra-map` (starter list for IT-minded teams) | `npm run threat-dragon` builds the two models in `public/tools/threat-dragon/` from the slide data. The app itself is a free desktop install: https://github.com/OWASP/threat-dragon/releases/tag/v2.6.2 |
| **Phishing Quiz** by Jigsaw (Google) | The break after M2 `report` (K) | QR code from `phishing-quiz` in `links.json`. Needs internet; it asks for a made-up name and email, which stay on the phone |
| **Slido or Mentimeter** (live polls) | Any vote: press L for the QR code | Needs internet and your account. `npm run poll-pack` writes all 50 votes in the deck, ready to paste, to `../source/live-poll/`. Without a link, the deck's own tally (keys 1 to 9) still works |

## Checks

| Command | Checks |
|---|---|
| `npm run check` | Slide IDs, order and minutes against the spec's slide map (`tools/slide-map.json`); data files and icons exist; no nested sections; counts draft items. Then scans for real-looking phone numbers, ID numbers, emails and banned agency names (`tools/banned-terms.json`) |
| `npm run build` | Type check, build, and fail if anything in `dist/` would load from the network (the only exceptions are CyberChef's two unused online operations, named in `tools/check-offline.mjs`) |
| `npm test` | Opens every slide in Chrome, presses A and R on every interactive, tests the presenter keys, the speaker-view relay, the simulations, the E panel and the bundled tools (CyberChef, the CVSS calculator, the Threat Dragon model, the CISA card, the break QR, L), and confirms no request leaves the machine |
| `npm run shots -- --m=1 --answer` | Screenshots of every slide (and its answer state) into `shots/` |
| `npm run attack` | Rebuilds `src/data/attack.json` from MITRE's ATT&CK data on GitHub (needs internet once) |
| `npm run kev` | Refreshes `src/data/kev.json` and its E quote from CISA's catalog (needs internet; `-- --file=` for a downloaded copy) |
| `npm run threat-dragon` | Rebuilds the two Threat Dragon models from the slide data |
| `npm run poll-pack` | Rebuilds the live-poll question pack in `../source/live-poll/` |

## Things to know

- **Do not serve `dist/` to participants as is.** The bundle contains every answer and the Module 5 inject deck (TLP:AMBER). Participants should only see the projector or your screen share.
- The live encryption demo needs `localhost` or HTTPS (Web Crypto). Over a plain LAN address the hash demos still work (a local fallback is built in), but AES needs `localhost`.
- Chimes use the Web Audio API and need one key press or click first. The "Sound on/off" button is on the timer.
- Fonts are bundled from `@fontsource` (SIL Open Font License); icons from `lucide` (ISC).

## Where this differs from the spec, and why

| Spec | Here | Why |
|---|---|---|
| Download woff2 files into `public/fonts/` | `@fontsource` packages, bundled by Vite | Same offline result, versioned, no manual downloads |
| `slideNumber: 'c/t'` | Number in each slide's footer | Scales with the slide and restarts per module in `?m=all` |
| Jump by URL hash only | Also **J** (reveal.js jump-to-slide, by number, ID or word) | Faster for questions; **G** stays the glossary |
| No key for break or stopping a timer | **K** break screen, **X** stop timer | Single keys survive the speaker-view key forwarding |
| Keys dispatched on the current slide | Commands relayed from the speaker view to the projected window | reveal.js sends speaker-view keys to a preview frame, so A, R, T would otherwise act on the preview |
| Clicker moves slides | Clicker steps inside interactives first | Run a whole activity with a clicker |
| Not specified | Draft mode, `check-slides`, `check-data`, smoke test, component gallery, deck importer | Keeps the three materials in sync and makes the pre-session checklist mostly automatic |
| Static cards, tables and tiles on `cia`, `actors`, `numbers`, `paths`, `house`, `vuln-numbers`, `attack-path`, `human-key`, `layers` | Live simulations and source cards on the same slides | Show it, not just say it. The deck's wording is kept inside each simulation's data, and the minutes are unchanged |
| reveal.js latest | reveal.js 5.2.1, Vite 7.3.7, TypeScript 5.9.3 pinned | Newer majors (reveal.js 6, Vite 8, TypeScript 7) were too fresh to trust for a live run |

## Project layout

```
index.html            start page and reveal container
src/main.ts           boots the chosen module, reveal.js, presenter UI
src/core/             module loading, slide decoration, presenter keys and relay, panels, progress, effects
src/components/       one file per interactive
src/sim/              animation timeline and the SVG network map the simulations share
src/modules/          one HTML partial per module (+ x-gallery.html)
src/data/             all content as JSON
src/styles/           tokens, slide layouts, components, presenter UI
public/               favicon, fallback clips, QR images
tools/                checks, smoke test, screenshots, QR generator, deck importer
```
