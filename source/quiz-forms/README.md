# Quiz forms (Google Apps Script)

Builds Quiz 1 and Quiz 2 as auto-graded Google Forms from the facilitator quiz bank (19 October 2026). Each run gets its own forms, so the online run never sees the face-to-face ones: four forms in all. It also builds an anonymous, ungraded exit check for the end of each module: ten more forms.

**Keep this folder private.** `QuizBank.gs` holds both answer keys. It sits outside `pdac-web/`, so nothing here is bundled into the presentation.

| File | Contents |
|---|---|
| `QuizBank.gs` | The 27 items with answers and feedback, in the bank's order |
| `Code.gs` | Creates, lists, opens and closes the forms |
| `ExitChecks.gs` | The anonymous exit check for each module, and its results summary (see [Exit checks](#exit-checks-one-per-module)) |
| `appsscript.json` | Project settings: Manila time zone, V8 runtime |

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
6. Change the settings below in each of the four forms.

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

## Exit checks (one per module)

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

**Modules 3 to 5** have no "What stuck" items yet: their learner guides were not available when this was written, and their objectives are drafted from the Day 2 and Day 3 plan. Add five items per module in `ExitChecks.gs` (the same format as `QuizBank.gs`) and check the objectives before you run `createExitCheckForms`. If the forms already exist, delete that module's two entries (for example `form:f2f:exit-m3` and `form:online:exit-m3`) under **Project Settings → Script properties**, run `createExitCheckForms` again, trash the old forms, and use the new links.

**Modules 1 and 2** rate the objectives exactly as each deck's objectives slide words them (7 rows for Module 1, 6 for Module 2; updated 20 October 2026, after the decks arrived). If you created `exit-m1` or `exit-m2` before that, rebuild them the same way (delete their entries under Script properties, run `createExitCheckForms`, trash the old forms, use the new links), or keep the old forms: only the self-rating rows differ.

**In the presentation:** before each run, replace the `exit-m1` and `exit-m2` lines in `pdac-web/src/data/links.json` with that run's lines from the log (`showExitCheckLinks` shows them again), then `npm run qr && npm run build`. The last slide of each module (`home` in Module 1, `day1-close` in Module 2) shows the QR code. For Modules 3 to 5, show the link from the log until those decks are built.

**After each module:** run **showExitCheckResults**. Look at three things:

1. *What stuck:* any item under 70% is worth two minutes at the start of the next session.
2. *Before → now:* the average gain per objective is your measure of impact. A small gain on one objective shows where to change the lesson for the online run.
3. *Still unclear:* open the next session with the two or three most common answers.

Compare the face-to-face and online results to see whether your changes worked. Run **closeAllExitChecks** when the course ends (**reopenAllExitChecks** undoes it).

## Two things to fix in the quiz bank document

- The "Answer keys at a glance" table stops at Quiz 1 item 14. Item 15 is **False**: add it before you print the key for hand scoring.
- The Quiz 2 introduction says four items are short scenarios, but five are marked (Scenario): items 2, 6, 7, 9 and 10.
