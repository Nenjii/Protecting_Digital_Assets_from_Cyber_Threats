/**
 * PDAC exit checks: one short, anonymous Google Form at the end of every module,
 * one per run, so you can see what stuck and whether the session made a
 * difference. Not graded. Uses the helpers in Code.gs. Steps are in README.md.
 *
 * Choose one of these in the toolbar, then click Run:
 *   checkExitChecks        Logs each exit check's items and answer key. Creates nothing.
 *   createExitCheckForms   Creates the ten forms (5 modules × 2 runs), open, and logs
 *                          their links. Safe to run again: forms that exist are skipped.
 *   showExitCheckLinks     Logs the links and the lines for pdac-web/src/data/links.json.
 *   showExitCheckResults   Logs, per module and run: the share who got each item right,
 *                          before → now self-ratings, feedback averages, and every
 *                          "still unclear" and "I will change" answer.
 *   closeAllExitChecks     Stops every exit check accepting responses.
 *   reopenAllExitChecks    Opens them all again.
 *   forgetExitCheckForms   Forgets the ten forms, so createExitCheckForms makes new ones.
 *
 * Each form has four pages: your work (optional), What stuck (five items with
 * the answers shown after submitting), Before and now (self-rating on the
 * module's objectives), and Your feedback. It asks for no name, email or office.
 */

const EXIT = {
  roles: ['IT or systems', 'Records, admin or frontline', 'Supervisor or head of office', 'Other'],
  levels: ['1 Not yet', '2 With help', '3 On my own', '4 Could teach it'],
  agree: ['1 Strongly disagree', '2 Disagree', '3 Neutral', '4 Agree', '5 Strongly agree'],
  feedback: [
    'The resource person explained ideas clearly.',
    'The examples and demos fit my work.',
    'The activities helped me practise, not just listen.',
    'The pace was right for me.',
    'I will use what I learned at work this month.',
  ],
  // Titles are how showExitCheckResults finds the answers: change them here only.
  titles: {
    role: 'Which best describes your work?',
    stuck: 'What stuck',
    beforeNow: 'Before and now',
    before: 'Before this module, how well could you do each of these?',
    now: 'Now, how well can you do each of these?',
    page: 'Your feedback',
    agree: 'How much do you agree?',
    useful: 'How useful was this module for your work?',
    learned: 'In one sentence: the most important thing you learned',
    change: 'One thing you will do differently at work',
    unclear: 'What is still unclear? The next session starts with it.',
    rp: 'Anything the resource person should keep or change?',
  },
};

/**
 * One entry per module. Items follow QuizBank.gs: q, choices (A to D), answer,
 * why. None of them repeats a Quiz 1 or Quiz 2 item. Modules 3 to 5 have no
 * items yet: their learner guides were not available on 20 October 2026, and
 * their objectives are drafted from the Day 2 and Day 3 plan in the deck.
 * Add five items from each guide before you create the forms.
 */
const EXIT_CHECKS = [
  {
    key: 'exit-m1', // the same key as in pdac-web/src/data/links.json
    label: 'Exit check · Module 1',
    title: 'Module 1 exit check: Threat landscape and legal governance',
    when: {
      f2f: 'Wednesday 21 October 2026, end of the morning',
      online: 'Monday 26 October 2026, end of the morning',
    },
    objectives: [ // the Module 1 deck's objectives slide, one row per level
      'Recall Secret-Correct-Ready, Tell-Legit-Little, the 3S test and the 72-5 rule',
      'Explain why offices are attacked, and who answers for what under the DPA',
      'Sort data and judge everyday cases as compliant or not',
      'Break down a real incident: what failed, what the law required',
      'Decide whether a breach must be reported, and defend it',
      'Write an AI rule for your unit and map one process you handle',
      'Test what content credentials show on an image and a screenshot',
    ],
    items: [
      {
        q: "A clerk's unencrypted laptop with 2,000 applicants' records is stolen from a parked car. Which of Secret, Correct, Ready is broken first?",
        choices: ['Secret (confidentiality)', 'Correct (integrity)', 'Ready (availability)', 'None, because the laptop had a login password'],
        answer: 'A',
        why: 'People with no right can now read the records: a confidentiality breach. A login password does not protect an unencrypted disk. Lesson 1.1, Secret, Correct, Ready.',
      },
      {
        q: 'Staff send applicant lists to each other in a personal chat app because it is faster. Which of the five doors is this?',
        choices: ['Phishing and stolen passwords', 'Old systems and lapsed licences', 'Shared accounts', 'Personal apps for official files'],
        answer: 'D',
        why: 'Citizen data left the office tools for an app the office cannot protect or recover. Use only approved tools for official files. Lesson 1.1, five doors.',
      },
      {
        q: "Applicants' mobile numbers, collected to send assistance updates, are given to a lending company for its promotions. Which principle does this break first?",
        choices: ['Tell (transparency)', 'Legit (legitimate purpose)', 'Little (proportionality)', 'None, because mobile numbers are not personal data'],
        answer: 'B',
        why: 'The numbers are used for a purpose the office never declared and has no lawful reason for. Use data only for the purpose you declared. Lesson 1.2, Tell, Legit, Little.',
      },
      {
        q: 'On Monday morning, IT finds signs that an outsider copied the applicant database, which holds ID numbers. The IT head wants to finish the investigation next week before telling anyone. What should happen?',
        choices: [
          'Wait: the 72 hours start only when the investigation proves the breach',
          'Tell the DPO now: the 72 hours start from reasonable belief, not certainty',
          'Report it only if the news media learns of it',
          'Delete the logs so the breach cannot spread',
        ],
        answer: 'B',
        why: "Smell smoke? Call. Don't wait for ashes. The clock starts when there is reasonable belief of a breach. Notify within 72 hours; the full report follows within 5 days. Lesson 1.2, the 72-5 rule.",
      },
      {
        q: 'A supervisor wants to finish encoding at home with 800 applicant records, including health information, on a laptop. Under the government rules of the Data Privacy Act, what is needed?',
        choices: [
          'Nothing, because it is under 1,000 records',
          "The head of office's approval, and the records must be encrypted",
          'Only a message to the DPO after the work is done',
          'It is never allowed',
        ],
        answer: 'B',
        why: "Off-site access to sensitive personal information needs the head's approval, is limited to 1,000 records at a time, and must be encrypted. Staying under 1,000 does not remove the other two. Lesson 1.2, Clearance, approval, 1,000, encrypt (RA 10173 Sec. 23).",
      },
    ],
  },
  {
    key: 'exit-m2',
    label: 'Exit check · Module 2',
    title: 'Module 2 exit check: Assessing cyber risks and threat modeling',
    when: {
      f2f: 'Wednesday 21 October 2026, end of the afternoon',
      online: 'Monday 26 October 2026, end of the afternoon',
    },
    objectives: [ // the Module 2 deck's objectives slide, one row per level
      'Recall the seven risk words, the six STRIDE threats, TARA and SLAM',
      'Explain how a threat, a weakness and a risk differ, using a house',
      'Spot weaknesses in office situations; tell phishing from genuine messages',
      'Draw where data flows, and ask what can go wrong at each step',
      'Rate risks by likelihood and impact, and decide what to treat first',
      'Create a threat model and a risk register, with your team',
    ],
    items: [
      {
        q: "The Assistance Portal's admin page is open to the internet and still uses the vendor's default password. Which step lowers this risk the most?",
        choices: [
          'Buy cyber insurance for the portal',
          'Close the admin page to the internet and set a strong unique password with MFA',
          'Put a warning banner on the admin page',
          'Remind staff to be careful when they log in',
        ],
        answer: 'B',
        why: 'It removes the weakness itself: no weakness, no risk. Insurance only shares the cost after the harm. Lesson 2.1, the house.',
      },
      {
        q: "Four risks are rated on the course's 5 by 5 matrix. Which one should the office treat first?",
        choices: ['Likelihood 2, impact 3', 'Likelihood 4, impact 4', 'Likelihood 5, impact 1', 'Likelihood 1, impact 5'],
        answer: 'B',
        why: '4 × 4 = 16, High. The others score 6, 5 and 5, all Medium. Treat Critical and High risks first. Lesson 2.2, the 5 by 5 matrix.',
      },
      {
        q: 'On payout day, a flood of fake requests makes the portal too slow for citizens to use. Which STRIDE threat is this?',
        choices: ['Spoofing', 'Tampering', 'Repudiation', 'Denial of service'],
        answer: 'D',
        why: 'The portal is made unavailable, which breaks Ready (availability). Lesson 2.2, STRIDE.',
      },
      {
        q: 'The office buys cyber insurance to cover part of the cost of a data breach. Which TARA treatment is this?',
        choices: ['Transfer', 'Avoid', 'Reduce', 'Accept'],
        answer: 'A',
        why: 'Part of the consequence passes to someone else, the insurer. ISO/IEC 27005 calls this sharing. Lesson 2.2, TARA.',
      },
      {
        q: "Late at night, Ben's phone keeps showing sign-in approval prompts, but he is not signing in. What should he do?",
        choices: [
          'Approve one so the prompts stop',
          'Deny them, tell the IT unit at once, and change his password',
          'Ignore them; they stop on their own',
          'Switch off the phone and tell no one',
        ],
        answer: 'B',
        why: 'This is MFA fatigue: someone already has his password and hopes he taps Approve. Deny, report at once, and change the password. Lesson 2.3, the tricks.',
      },
    ],
  },
  {
    key: 'exit-m3',
    label: 'Exit check · Module 3',
    title: 'Module 3 exit check: Security controls and data protection',
    when: {
      f2f: 'Thursday 22 October 2026, end of the morning',
      online: 'Tuesday 27 October 2026, end of the morning',
    },
    objectives: [ // draft: check against the Module 3 learner guide
      'Explain what a firewall allows and blocks',
      'Explain when encryption protects data, and when it does not',
      'Give access by role and need to know',
    ],
    items: [], // add five from the Module 3 learner guide
  },
  {
    key: 'exit-m4',
    label: 'Exit check · Module 4',
    title: 'Module 4 exit check: Endpoint security and safe digital workflows',
    when: {
      f2f: 'Thursday 22 October 2026, end of the afternoon',
      online: 'Tuesday 27 October 2026, end of the afternoon',
    },
    objectives: [ // draft: check against the Module 4 learner guide
      'Keep a work computer or phone safe',
      'Check a web address before you trust it',
      'Spot common weaknesses in a web application',
    ],
    items: [], // add five from the Module 4 learner guide
  },
  {
    key: 'exit-m5',
    label: 'Exit check · Module 5',
    title: 'Module 5 exit check: Incident response and integrated capstone',
    when: {
      f2f: 'Friday 23 October 2026, end of the morning',
      online: 'Wednesday 28 October 2026, end of the morning',
    },
    objectives: [ // draft: check against the Module 5 learner guide
      'Take the first steps when an incident happens',
      'Decide who to tell, and how fast',
      'Work through an incident with a team, from start to finish',
    ],
    items: [], // add five from the Module 5 learner guide
  },
];

const EXIT_STILL_TO_DO = [
  'Still to do by hand (Apps Script cannot change these):',
  '1. In each exit check with "What stuck" items: Settings > Release grades stays "Immediately after',
  '   each submission", with missed questions, correct answers and point values switched ON, so people',
  '   see the right answers and why as soon as they submit. (Quizzes keep them off; exit checks are not graded.)',
  '2. Optional: Responses > Link to Sheets, to keep the answers in a spreadsheet.',
].join('\n');

function checkExitChecks() {
  checkExits_();
  EXIT_CHECKS.forEach((check) => {
    console.log([
      check.title,
      check.items.length
        ? `  ${check.items.length} items · key: ${check.items.map((item, i) => `${i + 1}${item.answer}`).join(' ')}`
        : '  No "What stuck" items yet: add five from the learner guide (the form still has the self-rating and feedback).',
      `  Before and now: ${check.objectives.length} objectives`,
    ].join('\n'));
  });
}

function createExitCheckForms() {
  checkExits_();
  const made = [];
  Object.keys(RUNS).forEach((run) => {
    EXIT_CHECKS.forEach((check) => {
      if (storedForm_(run, check.key)) return;
      const form = buildExitForm_(check, run);
      remember_(run, check.key, form);
      made.push(form.getTitle());
    });
  });
  console.log(made.length
    ? `Created ${made.length} form(s), open for responses:\n  ${made.join('\n  ')}`
    : 'All ten exit checks already exist; nothing created.');
  showExitCheckLinks();
  console.log(EXIT_STILL_TO_DO);
}

function showExitCheckLinks() {
  Object.keys(RUNS).forEach((run) => {
    const lines = [`${RUNS[run]} run`];
    const links = [];
    EXIT_CHECKS.forEach((check) => {
      const form = storedForm_(run, check.key);
      if (!form) {
        lines.push(`  ${check.label}: not created yet (run createExitCheckForms)`);
        return;
      }
      const url = stored_(run, check.key).url;
      const state = form.isAcceptingResponses() ? 'open' : 'CLOSED';
      lines.push(
        `  ${check.label} · ${check.when[run]} · ${state} · ${form.getResponses().length} response(s)`,
        `    Participants: ${url}`,
        `    Edit (facilitator only): ${form.getEditUrl()}`);
      links.push(exitLinksLine_(check, url));
    });
    if (links.length) {
      lines.push(`  For pdac-web/src/data/links.json before the ${RUNS[run].toLowerCase()} run, replace the exit-check lines with:`);
      links.forEach((line) => lines.push(`  ${line}`));
    }
    console.log(lines.join('\n'));
  });
}

function showExitCheckResults() {
  const lines = [];
  Object.keys(RUNS).forEach((run) => {
    EXIT_CHECKS.forEach((check) => {
      const form = storedForm_(run, check.key);
      if (form) lines.push(...exitResults_(check, form, run), '');
    });
  });
  console.log(lines.length ? lines.join('\n') : 'No exit checks yet. Run createExitCheckForms first.');
}

function closeAllExitChecks() {
  console.log(setExitsAccepting_(false).join('\n') || 'No exit check was open.');
}

function reopenAllExitChecks() {
  console.log(setExitsAccepting_(true).join('\n') || 'Every exit check was already open.');
}

function forgetExitCheckForms() {
  const props = PropertiesService.getScriptProperties();
  Object.keys(RUNS).forEach((run) => EXIT_CHECKS.forEach((check) => props.deleteProperty(propKey_(run, check.key))));
  console.log('Forgot the ten exit checks: createExitCheckForms now makes new ones, with new links.\n' +
    'The old forms are still in Google Drive. Trash them there, and update links.json.');
}

function buildExitForm_(check, run) {
  const form = FormApp.create(`${check.title} (${RUNS[run].toLowerCase()} run)`);
  try {
    const graded = check.items.length > 0;
    form.setDescription(exitDescription_(check, run));
    form.setIsQuiz(graded);
    form.setShuffleQuestions(false);
    form.setLimitOneResponsePerUser(false); // no sign-in, so it stays anonymous
    form.setCollectEmail(false);
    form.setAllowResponseEdits(false);
    form.setPublishingSummary(false);
    form.setShowLinkToRespondAgain(false);
    form.setProgressBar(true);
    form.setConfirmationMessage(graded
      ? 'Thank you. Tap "View score" to see the right answers and why. Your feedback reaches the resource person with no names.'
      : 'Thank you. Your feedback reaches the resource person with no names.');
    form.setCustomClosedFormMessage('This exit check is closed. Thank you for taking part.');

    form.addMultipleChoiceItem()
      .setTitle(EXIT.titles.role)
      .setHelpText('Optional. It shows whether the session worked for IT and non-IT staff alike.')
      .setChoiceValues(EXIT.roles)
      .setRequired(false);

    if (graded) {
      form.addPageBreakItem().setTitle(EXIT.titles.stuck)
        .setHelpText('Answer from memory, without your notes. You see the right answers after you submit.');
      const slots = answerSlots_(check.items);
      check.items.forEach((item, i) => addItem_(form, item, slots[i]));
    }

    form.addPageBreakItem().setTitle(EXIT.titles.beforeNow)
      .setHelpText('Rate yourself honestly: the form is anonymous, and the difference shows what this session changed.');
    form.addGridItem().setTitle(EXIT.titles.before)
      .setHelpText('Think back to just before the first slide.')
      .setRows(check.objectives).setColumns(EXIT.levels).setRequired(true);
    form.addGridItem().setTitle(EXIT.titles.now)
      .setRows(check.objectives).setColumns(EXIT.levels).setRequired(true);

    form.addPageBreakItem().setTitle(EXIT.titles.page)
      .setHelpText('Straight to the resource person, to improve the next session.');
    form.addGridItem().setTitle(EXIT.titles.agree)
      .setRows(EXIT.feedback).setColumns(EXIT.agree).setRequired(true);
    form.addScaleItem().setTitle(EXIT.titles.useful)
      .setBounds(1, 5).setLabels('Not useful', 'Very useful').setRequired(true);
    form.addParagraphTextItem().setTitle(EXIT.titles.learned).setRequired(true);
    form.addParagraphTextItem().setTitle(EXIT.titles.change).setRequired(false);
    form.addParagraphTextItem().setTitle(EXIT.titles.unclear).setRequired(false);
    form.addParagraphTextItem().setTitle(EXIT.titles.rp).setRequired(false);

    ensurePublished_(form);
    form.setAcceptingResponses(true);
    return form;
  } catch (e) {
    throw new Error(`Stopped while building "${form.getTitle()}": ${e.message}\n` +
      'Trash that form in Google Drive, then run createExitCheckForms again.');
  }
}

function exitDescription_(check, run) {
  return [
    SETTINGS.course,
    `${RUNS[run]} run · ${check.when[run]}`,
    '',
    'About 5 minutes · anonymous · not graded',
    '',
    'This tells your resource person what stuck, what to explain again, and how to make the next session better. ' +
      'It does not ask for your name, email address or office.',
  ].join('\n');
}

// One line in the format of pdac-web/src/data/links.json.
function exitLinksLine_(check, url) {
  const entry = { label: check.label, url: url, short: url.replace(/^https?:\/\//, ''), note: 'Anonymous · about 5 minutes' };
  const fields = Object.keys(entry).map((name) => `"${name}": ${JSON.stringify(entry[name])}`);
  return `"${check.key}": { ${fields.join(', ')} },`;
}

function setExitsAccepting_(open) {
  const changed = [];
  Object.keys(RUNS).forEach((run) => {
    EXIT_CHECKS.forEach((check) => {
      const form = storedForm_(run, check.key);
      if (!form || form.isAcceptingResponses() === open) return;
      if (open) ensurePublished_(form);
      form.setAcceptingResponses(open);
      changed.push(`${open ? 'Opened' : 'Closed'}: ${form.getTitle()} (${form.getResponses().length} response(s))`);
    });
  });
  return changed;
}

function exitResults_(check, form, run) {
  const responses = form.getResponses();
  const n = responses.length;
  const out = [`${check.title} · ${RUNS[run]} run · ${n} response(s)`];
  if (!n) return out;

  const roles = {};
  answers_(responses, EXIT.titles.role).forEach((role) => { roles[role || 'Not given'] = (roles[role || 'Not given'] || 0) + 1; });
  out.push(`  Who answered: ${Object.keys(roles).map((role) => `${role} ${roles[role]}`).join(' · ')}`);

  if (check.items.length) {
    const right = check.items.map(() => 0);
    responses.forEach((response) => response.getGradableItemResponses().forEach((answer) => {
      const i = check.items.findIndex((item) => item.q === answer.getItem().getTitle());
      if (i >= 0 && Number(answer.getScore()) > 0) right[i]++;
    }));
    out.push('  What stuck (share who got it right; under 70% is worth reteaching):');
    check.items.forEach((item, i) => out.push(`    ${percent_(right[i], n)}  ${i + 1}. ${item.q}`));
  }

  const before = gridAverages_(responses, EXIT.titles.before, check.objectives.length);
  const now = gridAverages_(responses, EXIT.titles.now, check.objectives.length);
  out.push('  Before → now (average from 1 Not yet to 4 Could teach it):');
  check.objectives.forEach((objective, i) => out.push(`    ${fixed_(before[i])} → ${fixed_(now[i])}  ${gain_(before[i], now[i])}  ${objective}`));

  const agree = gridAverages_(responses, EXIT.titles.agree, EXIT.feedback.length);
  out.push('  Feedback (average from 1 to 5):');
  EXIT.feedback.forEach((line, i) => out.push(`    ${fixed_(agree[i])}  ${line}`));
  out.push(`    ${fixed_(average_(answers_(responses, EXIT.titles.useful).map(Number)))}  ${EXIT.titles.useful}`);

  [EXIT.titles.unclear, EXIT.titles.change, EXIT.titles.learned, EXIT.titles.rp].forEach((title) => {
    const said = answers_(responses, title).map((a) => String(a || '').trim()).filter(Boolean);
    if (said.length) out.push(`  ${title} (${said.length}):`, ...said.map((a) => `    - ${a}`));
  });
  return out;
}

// Every response's answer to the item with this title (null where left blank).
function answers_(responses, title) {
  return responses.map((response) => {
    const found = response.getItemResponses().find((answer) => answer.getItem().getTitle() === title);
    return found ? found.getResponse() : null;
  });
}

// Average of each grid row, reading the number at the start of each column label.
function gridAverages_(responses, title, rows) {
  const sums = new Array(rows).fill(0);
  const counts = new Array(rows).fill(0);
  answers_(responses, title).forEach((row) => (row || []).forEach((label, i) => {
    const value = parseInt(label, 10);
    if (i < rows && !isNaN(value)) { sums[i] += value; counts[i]++; }
  }));
  return sums.map((sum, i) => (counts[i] ? sum / counts[i] : null));
}

function average_(values) {
  const numbers = values.filter((v) => !isNaN(v) && v > 0);
  return numbers.length ? numbers.reduce((a, b) => a + b, 0) / numbers.length : null;
}

function fixed_(value) {
  return value === null ? ' –' : value.toFixed(1);
}

function gain_(before, now) {
  if (before === null || now === null) return '';
  const d = now - before;
  return `(${d >= 0 ? '+' : ''}${d.toFixed(1)})`;
}

function percent_(count, total) {
  return `${String(Math.round((100 * count) / total)).padStart(3)}%`;
}

function checkExits_() {
  const problems = [];
  const keys = new Set();
  EXIT_CHECKS.forEach((check) => {
    if (keys.has(check.key)) problems.push(`${check.key}: the key is used twice`);
    keys.add(check.key);
    Object.keys(RUNS).forEach((run) => {
      if (!check.when[run]) problems.push(`${check.key}: no time for the ${RUNS[run].toLowerCase()} run`);
    });
    if (!check.objectives.length) problems.push(`${check.key}: needs at least one objective for Before and now`);
    const titles = new Set();
    check.items.forEach((item, i) => {
      const where = `${check.key} item ${i + 1}`;
      if (!item.q || !item.why) problems.push(`${where}: needs both q and why`);
      if (titles.has(item.q)) problems.push(`${where}: the same question appears twice`);
      titles.add(item.q);
      if (!item.choices || item.choices.length < 2 || item.choices.length > 4) problems.push(`${where}: needs 2 to 4 choices`);
      else {
        if (new Set(item.choices).size !== item.choices.length) problems.push(`${where}: two choices have the same text`);
        const index = letterIndex_(item.answer);
        if (index < 0 || index >= item.choices.length) problems.push(`${where}: answer "${item.answer}" is not one of its choices`);
      }
    });
  });
  if (problems.length) throw new Error(`Fix ExitChecks.gs first:\n${problems.join('\n')}`);
}
