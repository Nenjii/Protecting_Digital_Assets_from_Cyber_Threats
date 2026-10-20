/**
 * PDAC quiz forms: builds Quiz 1 and Quiz 2 as auto-graded Google Forms from
 * QuizBank.gs, one form per run (face-to-face and online), so the online run
 * never sees the face-to-face form. Steps are in README.md.
 *
 * Choose one of these in the toolbar, then click Run:
 *   checkQuizBank        Logs each quiz's item counts and answer key. Creates nothing.
 *   createAllQuizForms   Creates the four forms, closed to responses, and logs their
 *                        links. Safe to run again: forms that exist are skipped.
 *   showQuizLinks        Logs the links, status and response counts, and the lines
 *                        for pdac-web/src/data/links.json.
 *   openQuiz1FaceToFace  (and the three below it) Closes every other quiz form,
 *                        then opens this one.
 *   closeAllQuizzes      Stops every quiz form accepting responses.
 *   forgetQuizForms      Forgets the four forms, so createAllQuizForms makes new
 *                        ones. The old forms stay in Google Drive until you trash them.
 */

const RUNS = {
  f2f: 'Face-to-face',
  online: 'Online',
};

const SETTINGS = {
  course: 'Protecting Digital Assets from Cyber Threats · DICT ILCDB',
  // One response per person makes participants sign in to a Google account.
  // Google shows them their address as not shared, and the form does not record
  // it. Set this to false before creating the forms if some participants have no
  // Google account (then remove duplicate names when scoring).
  oneResponsePerPerson: true,
  shuffleQuestions: true,
};

const STILL_TO_DO = [
  'Still to do by hand in each form (Apps Script cannot change these):',
  '1. Settings > Release grades: keep "Immediately after each submission", and under Respondent settings',
  '   switch off missed questions, correct answers and point values, so no one can pass answers on during',
  '   the quiz. Switch them on after the review if you want people to see their results.',
  '   ("Later, after manual review" sends scores by email, which needs email addresses: the quiz bank',
  '   collects name and office only.)',
  '2. Optional: each question\'s menu (three dots) > Shuffle option order, for a different order per person.',
  '   The script already spreads the correct answers evenly over the four positions.',
  '3. Optional: Responses > Link to Sheets, for the grade sheet.',
].join('\n');

function checkQuizBank() {
  checkBank_();
  QUIZZES.forEach((quiz) => {
    const items = items_(quiz);
    const choice = items.filter((item) => item.choices).length;
    const scenarios = items.filter((item) => item.scenario).length;
    console.log([
      quiz.title,
      `  ${items.length} items: ${choice} multiple choice (${scenarios} marked Scenario), ${items.length - choice} true or false`,
      `  Key: ${items.map((item, i) => `${i + 1}${keyLetter_(item)}`).join(' ')}`,
    ].join('\n'));
  });
}

function createAllQuizForms() {
  checkBank_();
  const made = [];
  Object.keys(RUNS).forEach((run) => {
    QUIZZES.forEach((quiz) => {
      if (storedForm_(run, quiz.key)) return;
      const form = buildForm_(quiz, run);
      remember_(run, quiz.key, form);
      made.push(form.getTitle());
    });
  });
  console.log(made.length
    ? `Created ${made.length} form(s):\n  ${made.join('\n  ')}`
    : 'All four forms already exist; nothing created.');
  showQuizLinks();
  console.log(STILL_TO_DO);
}

function showQuizLinks() {
  Object.keys(RUNS).forEach((run) => {
    const lines = [`${RUNS[run]} run`];
    const links = [];
    QUIZZES.forEach((quiz) => {
      const form = storedForm_(run, quiz.key);
      if (!form) {
        lines.push(`  ${quiz.label}: not created yet (run createAllQuizForms)`);
        return;
      }
      const url = stored_(run, quiz.key).url;
      const state = form.isAcceptingResponses() ? 'OPEN' : 'closed';
      lines.push(
        `  ${quiz.label} · ${quiz.when[run]} · ${state} · ${form.getResponses().length} response(s)`,
        `    Participants: ${url}`,
        `    Edit (facilitator only): ${form.getEditUrl()}`);
      links.push(linksLine_(quiz, url));
    });
    if (links.length) {
      lines.push(`  For pdac-web/src/data/links.json before the ${RUNS[run].toLowerCase()} run, replace the quiz lines with:`);
      links.forEach((line) => lines.push(`  ${line}`));
    }
    console.log(lines.join('\n'));
  });
}

function openQuiz1FaceToFace() { openQuiz_('f2f', 'quiz1'); }
function openQuiz2FaceToFace() { openQuiz_('f2f', 'quiz2'); }
function openQuiz1Online() { openQuiz_('online', 'quiz1'); }
function openQuiz2Online() { openQuiz_('online', 'quiz2'); }

function closeAllQuizzes() {
  const closed = closeQuizzes_(null);
  console.log(closed.length ? closed.join('\n') : 'No quiz form was open.');
}

function forgetQuizForms() {
  const props = PropertiesService.getScriptProperties();
  Object.keys(RUNS).forEach((run) => QUIZZES.forEach((quiz) => props.deleteProperty(propKey_(run, quiz.key))));
  console.log('Forgot the four quiz forms: createAllQuizForms now makes new ones, with new links.\n' +
    'The old forms are still in Google Drive. Trash them there, and update links.json.');
}

function buildForm_(quiz, run) {
  const items = items_(quiz);
  const form = FormApp.create(`${quiz.title} (${RUNS[run].toLowerCase()} run)`);
  try {
    form.setDescription(description_(quiz, run, items.length));
    form.setIsQuiz(true);
    form.setShuffleQuestions(SETTINGS.shuffleQuestions);
    form.setLimitOneResponsePerUser(SETTINGS.oneResponsePerPerson);
    form.setCollectEmail(false);
    form.setAllowResponseEdits(false);
    form.setPublishingSummary(false);
    form.setShowLinkToRespondAgain(false);
    form.setConfirmationMessage('Thank you. Your answers are in. When time is up, we review together the items most people missed.');
    form.setCustomClosedFormMessage('This quiz is not open right now. Your facilitator opens it at quiz time and closes it when time is up.');

    // Page 1 asks who is answering. Page 2 holds the items; Google shuffles
    // questions within a page, so name and office never land among them.
    form.addTextItem().setTitle('Your name').setHelpText('As on the attendance sheet.').setRequired(true);
    form.addTextItem().setTitle('Your office').setHelpText('As on the attendance sheet.').setRequired(true);
    form.addPageBreakItem().setTitle(quiz.title).setHelpText('Choose one answer for each item.');
    const slots = answerSlots_(items);
    items.forEach((item, i) => addItem_(form, item, slots[i]));

    // Closed until you open it at quiz time.
    ensurePublished_(form);
    form.setAcceptingResponses(false);
    return form;
  } catch (e) {
    throw new Error(`Stopped while building "${form.getTitle()}": ${e.message}\n` +
      'Trash that form in Google Drive, then run createAllQuizForms again.');
  }
}

function description_(quiz, run, count) {
  const rules = [`${count} items`, `${quiz.minutes} minutes`, '1 point each', 'one attempt', `${quiz.weight} of your grade`];
  if (quiz.closedBook) rules.push('closed book');
  const privacy = 'Privacy: this form collects only your name and office, the same as the attendance sheet. ' +
    'It does not collect birthdates, ID numbers or phone numbers.' +
    (SETTINGS.oneResponsePerPerson
      ? ' You sign in to Google so that each person answers once; your email address is not recorded.'
      : '') +
    ' Your answers are used only to score this quiz.';
  return [SETTINGS.course, `${RUNS[run]} run · ${quiz.when[run]}`, '', rules.join(' · '), '', privacy].join('\n');
}

function addItem_(form, item, slot) {
  const question = form.addMultipleChoiceItem();
  let choices;
  let answer;
  if (item.choices) {
    answer = item.choices[letterIndex_(item.answer)];
    choices = shuffle_(item.choices.filter((choice) => choice !== answer));
    choices.splice(slot, 0, answer);
    question.setTitle(item.q);
  } else {
    answer = item.answer ? 'True' : 'False';
    choices = ['True', 'False'];
    question.setTitle(`True or false: ${item.q}`);
  }
  question
    .setChoices(choices.map((choice) => question.createChoice(choice, choice === answer)))
    .setPoints(1)
    .setRequired(true)
    .setFeedbackForCorrect(feedback_(`Correct. ${item.why}`))
    .setFeedbackForIncorrect(feedback_(`The answer is: ${answer}. ${item.why}`));
}

// Where each multiple-choice item puts its correct answer. Most of the bank's
// answers are B, and Apps Script cannot switch on Google's per-person "Shuffle
// option order", so each form spreads the correct answers evenly instead.
function answerSlots_(items) {
  let deck = [];
  return items.map((item) => {
    if (!item.choices) return null;
    if (!deck.length) deck = shuffle_([0, 1, 2, 3]);
    return deck.pop() % item.choices.length;
  });
}

// A form must be published before it can accept responses. New forms start
// published; older forms have no publish setting at all.
function ensurePublished_(form) {
  if (form.supportsAdvancedResponderPermissions() && !form.isPublished()) form.setPublished(true);
}

function openQuiz_(run, key) {
  const form = storedForm_(run, key);
  if (!form) throw new Error(`There is no ${key} form for the ${RUNS[run].toLowerCase()} run yet. Run createAllQuizForms first.`);
  const closed = closeQuizzes_(form.getId());
  ensurePublished_(form);
  form.setAcceptingResponses(true);
  console.log([...closed, `OPEN: ${form.getTitle()}`, `  ${stored_(run, key).url}`].join('\n'));
}

function closeQuizzes_(exceptId) {
  const closed = [];
  Object.keys(RUNS).forEach((run) => {
    QUIZZES.forEach((quiz) => {
      const form = storedForm_(run, quiz.key);
      if (!form || form.getId() === exceptId || !form.isAcceptingResponses()) return;
      form.setAcceptingResponses(false);
      closed.push(`Closed: ${form.getTitle()} (${form.getResponses().length} response(s))`);
    });
  });
  return closed;
}

function propKey_(run, key) {
  return `form:${run}:${key}`;
}

function stored_(run, key) {
  const saved = PropertiesService.getScriptProperties().getProperty(propKey_(run, key));
  return saved ? JSON.parse(saved) : null;
}

function remember_(run, key, form) {
  const long = form.getPublishedUrl();
  let url = long;
  try {
    url = form.shortenFormUrl(long);
  } catch (e) {
    console.warn(`Kept the long link for "${form.getTitle()}" (${e.message}).`);
  }
  PropertiesService.getScriptProperties().setProperty(propKey_(run, key), JSON.stringify({ id: form.getId(), url: url }));
}

function storedForm_(run, key) {
  const saved = stored_(run, key);
  if (!saved) return null;
  try {
    return FormApp.openById(saved.id);
  } catch (e) {
    console.warn(`The ${key} form for the ${RUNS[run].toLowerCase()} run cannot be opened (${e.message}).`);
    return null;
  }
}

// One line in the format of pdac-web/src/data/links.json.
function linksLine_(quiz, url) {
  const entry = {
    label: quiz.label,
    url: url,
    short: url.replace(/^https?:\/\//, ''),
    note: `${items_(quiz).length} items · ${quiz.minutes} minutes`,
  };
  const fields = Object.keys(entry).map((name) => `"${name}": ${JSON.stringify(entry[name])}`);
  return `"${quiz.key}": { ${fields.join(', ')} },`;
}

function checkBank_() {
  const problems = [];
  QUIZZES.forEach((quiz) => {
    Object.keys(RUNS).forEach((run) => {
      if (!quiz.when[run]) problems.push(`${quiz.key}: no date for the ${RUNS[run].toLowerCase()} run`);
    });
    items_(quiz).forEach((item, i) => {
      const where = `${quiz.key} item ${i + 1}`;
      if (!item.q || !item.why) problems.push(`${where}: needs both q and why`);
      if (!item.choices) {
        if (typeof item.answer !== 'boolean') problems.push(`${where}: a true-or-false item needs answer: true or false`);
        return;
      }
      if (item.choices.length < 2 || item.choices.length > 4) problems.push(`${where}: needs 2 to 4 choices`);
      if (new Set(item.choices).size !== item.choices.length) problems.push(`${where}: two choices have the same text`);
      const index = letterIndex_(item.answer);
      if (index < 0 || index >= item.choices.length) problems.push(`${where}: answer "${item.answer}" is not one of its choices`);
    });
  });
  if (problems.length) throw new Error(`Fix QuizBank.gs first:\n${problems.join('\n')}`);
}

function items_(quiz) {
  return quiz.topics.flatMap((topic) => topic.items);
}

function keyLetter_(item) {
  if (item.choices) return item.answer;
  return item.answer ? 'T' : 'F';
}

function letterIndex_(letter) {
  return /^[A-D]$/.test(letter) ? letter.charCodeAt(0) - 65 : -1;
}

function feedback_(text) {
  return FormApp.createFeedback().setText(text).build();
}

function shuffle_(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
