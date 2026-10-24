# Quiz forms (Google Apps Script)

Builds Quiz 1 and Quiz 2 as auto-graded Google Forms from the facilitator quiz bank (19 October 2026), and Quiz 3 and Quiz 4 as **practice quizzes** (not graded, 21 October 2026). Each run gets its own forms, so the online run never sees the face-to-face ones: eight quiz forms in all. It also builds an anonymous, ungraded exit check for the end of each module (ten more forms) **plus one combined exit check covering Modules 1 to 5** (two more, for the course close), and the worksheets for Modules 1 to 4 as a Google Form per module (eight more).

**Day 2 (Modules 3 and 4), if you already made the Day 1 forms:** paste the four updated `.gs` files into the project, then run `createAllQuizForms`, `createAllWorksheets` and `createExitCheckForms`. Quiz 1, Quiz 2 and the Module 1 and 2 worksheets are listed in `MADE_IN_FIRST_PROJECT` (top of `Code.gs`), so even a **new** Apps Script project never builds them again: `createAllQuizForms` makes only Quizzes 3 and 4, and `createAllWorksheets` only Worksheets 3 and 4 (both runs each). Open, close and see the links of the Day 1 forms from the first project. The logs give the new `links.json` lines. If `exit-m3` and `exit-m4` were created before 21 October (with no "What stuck" items), rebuild those two first: see [Exit checks](#exit-checks-one-per-module).

**Keep this folder private.** `QuizBank.gs` holds both answer keys. It sits outside `pdac-web/`, so nothing here is bundled into the presentation.

| File | Contents |
|---|---|
| `QuizBank.gs` | The 27 items of Quizzes 1 and 2 with answers and feedback, in the bank's order, then the 20 practice items of Quizzes 3 and 4 |
| `Code.gs` | Creates, lists, opens and closes the forms; shared helpers the other files use |
| `ExitChecks.gs` | The anonymous exit check for each module, and its results summary (see [Exit checks](#exit-checks-one-per-module)) |
| `Worksheets.gs` | The Try it and Check yourself activities of Modules 1 to 4 as a Google Form per module (see [Worksheets](#worksheets-one-per-module)) |
| `Audit.gs` | The Module 4 graded controls audit as the form participants fill in and submit, one per run (see [Module 4 audit form](#module-4-audit-form-auditgs)) |
| `AuditData.gs` | The Audit File's records, rules and rubric for `Audit.gs`, plus the answer key's Part B decisions. Generated: do not edit by hand |
| `appsscript.json` | Project settings: Manila time zone, V8 runtime |

## Practice quizzes: Quiz 3 and Quiz 4

The Module 3 learner guide says nothing in Module 3 is graded, and Module 4's only grade is the controls audit (20%). So Quizzes 3 and 4 are **practice**: 10 items each, written from the guides' Check yourself questions, Try it activities and desk cards. They are marked `practice: true` in `QuizBank.gs`, and differ from Quizzes 1 and 2 in four ways:

- **Anonymous:** no name or office, no Google sign-in, and people may try again.
- **Open from the start:** nobody has the link until you show the QR code. `openQuiz…` and `closeAllQuizzes` leave them alone; `closePracticeQuizzes` and `reopenPracticeQuizzes` switch them.
- **Answers shown at once:** set **Settings → Release grades** to *Immediately after each submission* with missed questions, correct answers and point values **on** (the log reminds you).
- **When:** the QR codes are on the last slide of each module (`m3-close`, `day2-close`), next to the exit check. Quiz 3 fits the end of the morning or lunch; Quiz 4 after the audit or that evening. Open the next session with the two most-missed items (**Responses → Summary**).

To make one count after all, set `practice: false` and add `weight` in `QuizBank.gs` before creating the forms, and find it a time slot: the guides' timetables have none.

## What each form gets

- Quiz mode, 1 point per item, the answer key, and the bank's explanation as feedback on every item
- Page 1: name and office only. Page 2: the items, in a different order for each person
- One response per person: participants sign in to Google, and the form does not record their email address
- A description with the rules (items, minutes, one attempt, 10%) and the privacy statement
- Closed to responses until you open it

## Make the forms (once, about 5 minutes)

1. Sign in to the Google account that should own the quizzes, open [script.google.com](https://script.google.com) and click **New project**. Rename it "PDAC quizzes".
2. Replace everything in `Code.gs` with this folder's `Code.gs`. Add a second file (**+** → **Script**) named `QuizBank` and paste in `QuizBank.gs`. Save.
3. With `Code.gs` open, choose **checkQuizBank** in the toolbar and click **Run**. Compare the logged keys with the quiz bank.
4. Choose **createAllQuizForms** and click **Run**. Allow access when asked. Google warns that the app is not verified, because it is your own script: click **Advanced** → **Go to PDAC quizzes**.
5. The log lists each form's participant link (forms.gle) and edit link, and the lines for `links.json`. Run **showQuizLinks** to see them again at any time.
6. Change the settings below in each graded quiz form (the practice quizzes need the opposite release setting, above).

If the run stops before it finishes (Apps Script allows 6 minutes), run `createAllQuizForms` again: it skips the forms already made. Trash the half-built form it names in Google Drive.

## Settings the script cannot change

Apps Script has no access to these, so set them in Google Forms:

1. **Settings → Release grades:** keep *Immediately after each submission*. Under **Respondent settings**, switch off missed questions, correct answers and point values, so no one can pass answers on during the quiz. Switch them on after the review if you want people to see their results. *Later, after manual review* sends scores by email, which needs email addresses, and the quiz bank collects name and office only.
2. **Shuffle option order** (optional): the script already spreads the correct answers evenly over the four positions in each form. For a different order for each person, open each question's ⋮ menu → **Shuffle option order**.
3. **Responses → Link to Sheets** (optional), for the grade sheet.
4. **Google Workspace (office) accounts only:** if participants from other offices are refused, let anyone with the link respond in the form's publish settings.

## Show the QR codes in the presentation

Before each run, replace the `quiz1` and `quiz2` lines in `pdac-web/src/data/links.json` with that run's two lines from the log. Then, in `pdac-web/`:

```bash
npm run qr && npm run build
```

The `quiz1` and `quiz2` slides then show the QR code and short link.

## At quiz time

1. On the quiz slide, run **openQuiz1FaceToFace** (or whichever quiz and run you need). It closes every other quiz form first.
2. Press **T** to start the slide's timer.
3. When time is up, run **closeAllQuizzes**.
4. For the review, open the form's **Responses → Summary**: it lists the frequently missed questions.

You can also open and close a form in Google Forms with the **Accepting responses** switch on the Responses tab.

## Change an item or rebuild

Edit `QuizBank.gs`, run `checkQuizBank`, then `forgetQuizForms` and `createAllQuizForms`. The links change, so update `links.json` and trash the old forms in Google Drive. To rebuild one run only, delete that run's two entries under **Project Settings → Script properties** instead of running `forgetQuizForms`.

If some participants have no Google account, set `oneResponsePerPerson: false` in `Code.gs` before creating the forms. People can then answer more than once, so remove duplicate names when scoring, or use the printed backup.

## Where the forms differ from the quiz bank

- Choices appear in a different order from the bank's, so the letters participants see differ too. The form marks by answer, not by letter.
- Quiz 1 item 9: the feedback names the choices instead of letters ("Multi-factor authentication and encryption are technical measures; a privacy manual is organizational").
- The "(Scenario)" tags stay in `QuizBank.gs` but are not shown. True-or-false items start with "True or false:".
- Both quizzes say "closed book": the Module 1 and Module 2 decks and learner guides all state "closed book, one attempt" (Quiz 1 updated 20 October 2026). If you already created the forms, edit Quiz 1's description by hand or rebuild it.

## Exit checks

**Which do I make?** There are two ways to run the exit check. Pick one — you do not need both.

| You want | Run | Makes |
|---|---|---|
| **One form for the whole course — one scan, one submit** (recommended; this is what the Module 5 close slide's QR points at) | `createCourseExitForms` | **2 forms** (one per run), covering Modules 1 to 5 → [jump to it](#one-form-for-the-whole-course-modules-1-to-5) |
| A separate short form after each module, during the week (the Module 1 to 4 close slides show these) | `createExitCheckForms` | 10 forms (5 modules × 2 runs) |

Both draw their questions from the same `EXIT_CHECKS` bank below, so the questions are identical either way.

### One per module (optional)

At the end of every module, show the exit-check QR code. It takes about 5 minutes, is anonymous and not graded, and tells you what stuck and whether the session made a difference.

| Page | What it asks |
|---|---|
| 1 | Optional: the kind of work they do (IT, records/admin/frontline, supervisor, other) |
| What stuck | Five items on the module, answered from memory. After submitting, people see the right answer and why. None repeats a quiz item. |
| Before and now | A self-rating on each module objective, before the session and now: 1 Not yet, 2 With help, 3 On my own, 4 Could teach it |
| Your feedback | Five agree-or-disagree lines about the session, usefulness from 1 to 5, the most important thing learned (required), one change at work, what is still unclear, and anything to keep or change |

It asks for no name, email or office, and needs no Google sign-in.

**Make them (once):**

1. In the same Apps Script project, add a third file (**+** → **Script**) named `ExitChecks` and paste in `ExitChecks.gs`. Save.
2. Run **checkExitChecks** and compare the logged keys with the items in `ExitChecks.gs`.
3. Run **createExitCheckForms**. It makes ten forms (5 modules × 2 runs), already open: nobody has a link until you show the QR code.
4. In each form with "What stuck" items, check **Settings → Release grades**: *Immediately after each submission*, with missed questions, correct answers and point values switched **on**. That is the opposite of the quizzes: here, seeing the answer is part of the learning.

**Modules 3, 4 and 5** have five "What stuck" items each and the objectives from their learner guides (Modules 3 and 4 on 21 October 2026; **Module 5 on 23 October 2026**). **If you already created `exit-m3`, `exit-m4` or `exit-m5` before those dates** (they would have no "What stuck" page), delete their entries under **Project Settings → Script properties** (`form:f2f:exit-m3`, `form:online:exit-m3`, and the same for `exit-m4` and `exit-m5`), run `createExitCheckForms` again, trash the old forms, and use the new links.

**Modules 1 and 2** rate the objectives exactly as each deck's objectives slide words them (7 rows for Module 1, 6 for Module 2; updated 20 October 2026, after the decks arrived). If you created `exit-m1` or `exit-m2` before that, rebuild them the same way (delete their entries under Script properties, run `createExitCheckForms`, trash the old forms, use the new links), or keep the old forms: only the self-rating rows differ.

**In the presentation:** before each run, replace the `exit-m1` to `exit-m5` lines in `pdac-web/src/data/links.json` with that run's lines from the log (`showExitCheckLinks` shows them again), then `npm run qr && npm run build`. The last slide of each module (`home` in Module 1, `day1-close` in Module 2, `m3-close` in Module 3, `day2-close` in Module 4, `m5-exit` in Module 5) shows the QR code.

### One form for the whole course (Modules 1 to 5)

Show **one** QR code at the course close instead of chasing five separate links: the **course exit check** is a single form covering all five modules — **one scan, one submit**. It lives at the end of `ExitChecks.gs`.

This single form replaces **all five** per-module exit checks — you do not create or show `exit-m1` … `exit-m5` as well. The per-module forms stay available for runs where you prefer to check after every module; nothing is deleted.

| Page | What it asks |
|---|---|
| 1 | Optional: the kind of work they do |
| What stuck · Module 1 … 5 | One page per module, **all five items from each** (25 in all) — this form *is* the exit check for every module. Answers and why are shown after submitting |
| Before and now | A self-rating with **one row per module** (the learner guide's "Five modules, one office" table), before the course and now |
| Your feedback | The same five agree lines, usefulness 1 to 5, **which module was most useful**, the most important thing learned, one change at work, what is still unclear, anything to keep or change |

About **20 minutes**, anonymous, no sign-in. It is set to `itemsPerModule: 5` because the per-module checks were not run during the week, so this single form carries all five. If the close runs short, set `itemsPerModule: 3` (15 items, ~14 min) or `2` (10 items, ~11 min); `fullItemsFor` keeps today's module complete either way. The length shown in the form's description is computed from the real item count, so it always matches.

**Make it (once):**

1. Run **checkCourseExit** first: it logs what the form will contain and creates nothing.
2. Run **createCourseExitForms**. It makes two forms (one per run), already open.
3. Check **Settings → Release grades** on both, the same as the per-module checks: *Immediately after each submission*, with correct answers switched **on**.
4. Run **showCourseExitLinks**, paste the `exit-course` line into `pdac-web/src/data/links.json`, then `npm run qr && npm run build`. The Module 5 close slide (`m5-exit`) already shows the `exit-course` QR code.

**After the course:** run **showCourseExitResults**. It prints the same report as the per-module checks — the share who got each item right (tagged `M1` to `M5`), before → now per module, the feedback averages, which module was most useful, and every written answer.

`closeAllExitChecks`, `reopenAllExitChecks` and `forgetExitCheckForms` cover the course exit check too.

**After each module:** run **showExitCheckResults**. Look at three things:

1. *What stuck:* any item under 70% is worth two minutes at the start of the next session.
2. *Before → now:* the average gain per objective is your measure of impact. A small gain on one objective shows where to change the lesson for the online run.
3. *Still unclear:* open the next session with the two or three most common answers.

Compare the face-to-face and online results to see whether your changes worked. Run **closeAllExitChecks** when the course ends (**reopenAllExitChecks** undoes it).

## Worksheets (one per module)

The Try it and Check yourself activities of Modules 1 to 4, as a Google Form instead of a printed handout. One form per module per run: eight in all. Not graded for the course, but every classification activity (Try it 1.2A, 1.2B, 1.2.1, the STRIDE quick check, Phish or legit, Try it 3.1, Try it 4.2A, Try it 4.3) shows the right answer and why, the same as the facilitator answer key. The rest is open writing space, following the slides in order. Try it 3.3's role design is a tick grid (functions × roles).

Team products and graded work stay out of these forms, on paper or a shared document: the Module 2 risk assessment (`ra-submit`), the Module 3 configuration workshop (the team workbook, `../worksheets/Module 3 Workbook.docx`) and the Module 4 controls audit (its own form, `audit-submit`: see [Module 4 audit form](#module-4-audit-form-auditgs)). Self-check 4.1 is not in the Module 4 form either: the guide says it is individual and not collected.

It is a working document, not a test: no Google sign-in, and answers stay editable from the same link for the whole module (so a team can keep one form open across activities). It collects name, office and team only.

The graded team risk assessment (data flow map, threat table, 5 by 5 matrix, risk register) is **not** in these forms, because a Google Form is a poor place to draw a map or fill a matrix together. Teams build it on paper (A3) or a shared document and submit through the existing `ra-submit` link.

**Make them (once):**

1. In the same Apps Script project, add a file (**+** → **Script**) named `Worksheets` and paste in `Worksheets.gs`. Save. (It reuses helpers in `Code.gs`, so keep that file in the project.)
2. Run **checkWorksheets** to list the sections each form will build.
3. Run **createAllWorksheets**. It makes the forms that do not exist yet (eight in all), already open: nobody has a link until you show it.
4. In each form, **Settings → Release grades**: switch to *Immediately after each submission*, with missed questions, correct answers and point values switched **on**, so the instant-feedback answers show (the opposite of the quizzes). The classification items are worth 0 points, so this never adds to anyone's grade.

**In the presentation (optional QR):** the worksheet links use the keys `worksheet-m1` and `worksheet-m2`. `showWorksheetLinks` prints the `links.json` lines; add a QR only if you want one on a slide (the slides do not show these by default). Otherwise just share the link in the room or the chat.

**Edit an activity:** change `Worksheets.gs`, then `forgetWorksheetForms` and `createAllWorksheets` (the links change; trash the old forms). Toolbar also has **closeAllWorksheets** and **reopenAllWorksheets**.

## Two things to fix in the quiz bank document

- The "Answer keys at a glance" table stops at Quiz 1 item 14. Item 15 is **False**: add it before you print the key for hand scoring.
- The Quiz 2 introduction says four items are short scenarios, but five are marked (Scenario): items 2, 6, 7, 9 and 10.

## Module 4 audit form (Audit.gs)

The graded controls audit (20%) is done in a Google Form: each participant answers in the form and submits it, instead of typing in the Audit File or photographing the printed pages. One form per run, both made by the script. The printed Audit File stays the evidence pack (and a paper draft); the form holds the same records too, so online participants need nothing else.

**What is in it, page by page:** name and office, and a tick for the five audit rules (the guide asks for that tick online; face-to-face they can sign on paper as well) · the records, Exhibits A to G, word for word from the printed Audit File · Part A, one page per finding with the nine columns of the findings register (likelihood and impact on the Module 2 scales, the band as a choice), findings 1 to 8 required, then "Add finding 9?" up to 12 · Part B, all 14 accounts (keep, change role, disable, require MFA: one or two, with each account's Exhibit B record shown), then the corrected role table as a tick grid, its conditions and the conflicts removed · the write-up (top three and three sentences to Director Eva) and an optional note for you.

**Settings:** not a quiz (you score it with the rubric). Sign-in with one response per person, as for the graded quizzes (`SETTINGS.oneResponsePerPerson` in `Code.gs`); participants can submit early and keep editing from the same link until you close the form. Email addresses are not recorded. Open from the moment it is made: nobody has the link until you show it.

**Make it (once, about 2 to 3 minutes):**

1. In the same Apps Script project, add two script files (**+** → **Script**) named `AuditData` and `Audit`, and paste in `AuditData.gs` and `Audit.gs`. Save. (They reuse helpers in `Code.gs` and `Worksheets.gs`, so keep those in the project.)
2. Run **checkAudit**: it lists the pages and creates nothing.
3. Run **createAuditForms**. It makes both runs' forms, open, and logs each run's `links.json` line. If it stops on the time limit, run it again: a finished form is kept, so trash only the half-built one in Google Drive.
4. Put the face-to-face line under `audit-submit` in `pdac-web/src/data/links.json`, then `npm run qr && npm run build`: the `audit-submit` slide shows its QR code. Before the online run, swap in the online line the same way (`showAuditLinks` prints both again).
5. Open the form once with **Preview** (the eye icon) and try "Add finding 9?" both ways.

**During and after the audit:**

- **showAuditSubmissions** lists who has submitted: name, office, time (marked LATE after 4:30 PM, and whether that is within the grace period), how many findings, how many accounts reviewed, and which Part B decisions differ from the answer key. A different decision with a sound reason can be right, so read those reasons before you score.
- For scoring, **Responses → Link to Sheets** gives one row per person; add four columns for the rubric (Findings /40, Analysis /25, Access-control management /20, Remediation and clarity /15).
- At the end of the grace period (8:00 AM the next day) run **closeAuditFaceToFace** (or **closeAuditOnline**). **reopenAuditForms** opens both again.

**Change the records or the rubric:** edit `../worksheets/build/content-day2.mjs` (the printed Audit File), run `npm run build:audit-form` there to regenerate `AuditData.gs`, paste it into the project again, then `forgetAuditForms` and `createAuditForms` (the links change; trash the old forms). `AuditData.gs` holds the answer key's Part B decisions for the grading aid: keep it private, like `QuizBank.gs`.

