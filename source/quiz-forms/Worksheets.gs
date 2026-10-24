/**
 * PDAC worksheets: the Try it and Check yourself activities from the Module 1
 * to Module 4 learner guides, as Google Forms instead of a printed handout.
 * One response per person, kept open the whole module so people can return to
 * it between activities; not graded for the course, but the classification
 * questions (Try it 1.2A, 1.2B, 1.2.1, the STRIDE quick check, Phish or legit,
 * Try it 3.1, Try it 4.2A, Try it 4.3) show the right answer and why. Uses
 * the helpers in Code.gs. Steps are in README.md.
 *
 * Team products and graded work stay out of these forms: the Module 2 team
 * risk assessment (map, threat table, matrix) goes on paper or a shared
 * document via "ra-submit"; the Module 3 configuration workshop is done in the
 * team workbook; the Module 4 controls audit is done on the Audit File and
 * submitted via "audit-submit". A Google Form is a poor medium for drawing a
 * map or filling a table together. These worksheets cover the individual
 * practice activities only.
 *
 * Choose one of these in the toolbar, then click Run:
 *   checkWorksheets        Logs each worksheet's section and item counts. Creates nothing.
 *   createAllWorksheets     Creates the Module 3 and 4 forms (both runs), open, and logs
 *                           their links. Modules 1 and 2 were made in the first project
 *                           (MADE_IN_FIRST_PROJECT in Code.gs), so it skips them. Safe to
 *                           run again: forms that exist are skipped.
 *   showWorksheetLinks      Logs the links and the lines for pdac-web/src/data/links.json.
 *   closeAllWorksheets      Stops every worksheet form accepting responses.
 *   reopenAllWorksheets     Opens them all again.
 *   forgetWorksheetForms    Forgets all eight forms, so createAllWorksheets makes new ones.
 */

const WORKSHEETS = [
  {
    key: 'worksheet-m1', // the same key as in pdac-web/src/data/links.json
    label: 'Worksheet · Module 1',
    title: 'Module 1 Worksheet: Threat Landscape and Legal Governance',
    when: {
      f2f: 'Wednesday 21 October 2026, morning',
      online: 'Monday 26 October 2026, morning',
    },
  },
  {
    key: 'worksheet-m2',
    label: 'Worksheet · Module 2',
    title: 'Module 2 Worksheet: Assessing Cyber Risks and Threat Modeling',
    when: {
      f2f: 'Wednesday 21 October 2026, afternoon',
      online: 'Monday 26 October 2026, afternoon',
    },
  },
  {
    key: 'worksheet-m3',
    label: 'Worksheet · Module 3',
    title: 'Module 3 Worksheet: Security Controls and Data Protection Strategies',
    when: {
      f2f: 'Thursday 22 October 2026, morning',
      online: 'Tuesday 27 October 2026, morning',
    },
    teamHelp: 'The same team as on Day 1. Optional.',
  },
  {
    key: 'worksheet-m4',
    label: 'Worksheet · Module 4',
    title: 'Module 4 Worksheet: Endpoint Security and Safe Digital Workflows',
    when: {
      f2f: 'Thursday 22 October 2026, afternoon',
      online: 'Tuesday 27 October 2026, afternoon',
    },
    teamHelp: 'The same team as this morning. Optional.',
  },
];

// Which function builds each worksheet's sections.
const WORKSHEET_BUILDERS = {
  'worksheet-m1': (form) => m1Sections_(form),
  'worksheet-m2': (form) => m2Sections_(form),
  'worksheet-m3': (form) => m3Sections_(form),
  'worksheet-m4': (form) => m4Sections_(form),
};

const WORKSHEET_STILL_TO_DO = [
  'Still to do by hand in each form (Apps Script cannot change these):',
  '1. Settings > Release grades: switch to "Immediately after each submission", with missed questions,',
  '   correct answers and point values switched ON. That is the opposite of the quizzes: a worksheet is',
  '   meant to show the right answer and why as soon as someone answers, the same as the printed answer key.',
  '2. Optional: Responses > Link to Sheets, to read everyone\'s answers in a spreadsheet as the module runs.',
].join('\n');

// Lists the sections each worksheet builds, in order. The classification
// activities (shown with their answer count) reveal the right answer and why
// as soon as a question is answered; the rest are open-ended writing space.
const WORKSHEET_SECTIONS = {
  'worksheet-m1': [
    'Try it 1.1A: Secret, Correct, Ready (6 assets, each with an answer)',
    'Try it 1.1B: Read the 2023 case like an investigator (writing)',
    'Check yourself 1.1 (writing)',
    'Try it 1.2A: Sort the data (7 items, each with an answer)',
    'Try it 1.2B: Compliant or not? (6 cases, each with an answer)',
    'Try it 1.2C: Notify or not? (3 cases, 3S grid + decision)',
    'Check yourself 1.2 (writing)',
    'Try it 1.2.1: Which theme would have caught it? (5 items, each with an answer)',
    'Check yourself 1.2.1 (writing)',
    'Try it 1.2.2A: Write your unit\'s AI rule (writing)',
    'Try it 1.2.2B: The screenshot experiment (writing)',
    'Check yourself 1.2.2 (writing)',
    'Bring it home: process map, readiness mini-check, three commitments (writing + checklist)',
  ],
  'worksheet-m2': [
    'Try it 2.1: Spot the weakness (6 situations, each with an answer)',
    'Check yourself 2.1 (writing)',
    'Quick check: Which STRIDE letter? (6 items, each with an answer)',
    'Check yourself 2.2 (writing)',
    'Try it 2.3: Phish or legit? (8 messages, each with an answer)',
    'Check yourself 2.3 (writing)',
    'Graded risk assessment: brief only (submitted on paper via "ra-submit")',
  ],
  'worksheet-m3': [
    'Try it 3.1: Which control stops this? (6 threats, each with an answer)',
    'Check yourself 3.1 (writing)',
    'Try it 3.2: Encrypt it right (8 data sets: stored, moving, key holder)',
    'Optional: read a padlock (issuer and expiry)',
    'Check yourself 3.2 (writing)',
    'Try it 3.3: Design the roles (role grid + 3 questions)',
    'Check yourself 3.3 (writing)',
    'Configuration workshop: brief only (done in the team workbook)',
    'Desk card: three phrases to add first (checklist)',
  ],
  'worksheet-m4': [
    'Self-check 4.1: pointer only (it stays with the participant, not collected)',
    'Check yourself 4.1 (writing)',
    'Try it 4.2A: Safe or suspicious? (6 screens, each with an answer)',
    'Try it 4.2B: Vet the tool (team card + 5 questions)',
    'Check yourself 4.2 (writing)',
    'Try it 4.3: Triage the inbox (6 items, each with an answer)',
    'Check yourself 4.3 (writing)',
    'Your 30-day action (writing)',
    'Graded controls audit: brief only (done on the Audit File, submitted via "audit-submit")',
  ],
};

function checkWorksheets() {
  WORKSHEETS.forEach((ws) => {
    if (!WORKSHEET_BUILDERS[ws.key]) throw new Error(`${ws.key}: no section builder in WORKSHEET_BUILDERS`);
    console.log(ws.title + ':');
    WORKSHEET_SECTIONS[ws.key].forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  });
  console.log('\nNot in these forms: the Module 2 team risk assessment ("ra-submit"), the Module 3 workshop (team workbook) and the Module 4 audit ("audit-submit").');
}

function createAllWorksheets() {
  const toMake = WORKSHEETS.filter((ws) => !madeInFirstProject_(ws.key));
  const skipped = WORKSHEETS.filter((ws) => madeInFirstProject_(ws.key));
  if (skipped.length) console.log(`Skipped, made in the first project: ${skipped.map((ws) => ws.label).join(', ')}`);
  const made = [];
  Object.keys(RUNS).forEach((run) => {
    toMake.forEach((ws) => {
      if (storedForm_(run, ws.key)) return;
      const form = buildWorksheetForm_(ws, run);
      remember_(run, ws.key, form);
      made.push(form.getTitle());
    });
  });
  console.log(made.length
    ? `Created ${made.length} form(s), open for responses:\n  ${made.join('\n  ')}`
    : `All ${toMake.length * Object.keys(RUNS).length} worksheet forms already exist; nothing created.`);
  showWorksheetLinks();
  console.log(WORKSHEET_STILL_TO_DO);
}

function showWorksheetLinks() {
  Object.keys(RUNS).forEach((run) => {
    const lines = [`${RUNS[run]} run`];
    const links = [];
    WORKSHEETS.forEach((ws) => {
      const form = storedForm_(run, ws.key);
      if (!form) {
        lines.push(madeInFirstProject_(ws.key)
          ? `  ${ws.label}: made in the first Apps Script project (its links are there)`
          : `  ${ws.label}: not created yet (run createAllWorksheets)`);
        return;
      }
      const url = stored_(run, ws.key).url;
      const state = form.isAcceptingResponses() ? 'open' : 'CLOSED';
      lines.push(
        `  ${ws.label} · ${ws.when[run]} · ${state} · ${form.getResponses().length} response(s)`,
        `    Participants: ${url}`,
        `    Edit (facilitator only): ${form.getEditUrl()}`);
      links.push(worksheetLinksLine_(ws, url));
    });
    if (links.length) {
      lines.push(`  For pdac-web/src/data/links.json before the ${RUNS[run].toLowerCase()} run, replace the worksheet lines with:`);
      links.forEach((line) => lines.push(`  ${line}`));
    }
    console.log(lines.join('\n'));
  });
}

function closeAllWorksheets() {
  console.log(setWorksheetsAccepting_(false).join('\n') || 'No worksheet was open.');
}

function reopenAllWorksheets() {
  console.log(setWorksheetsAccepting_(true).join('\n') || 'Every worksheet was already open.');
}

function forgetWorksheetForms() {
  const props = PropertiesService.getScriptProperties();
  Object.keys(RUNS).forEach((run) => WORKSHEETS.forEach((ws) => props.deleteProperty(propKey_(run, ws.key))));
  console.log(`Forgot the ${WORKSHEETS.length * Object.keys(RUNS).length} worksheet forms: createAllWorksheets now makes new ones, with new links.\n` +
    'The old forms are still in Google Drive. Trash them there, and update links.json.\n' +
    'To rebuild only one, delete its entries under Project Settings > Script properties instead (for example form:f2f:worksheet-m3).');
}

function buildWorksheetForm_(ws, run) {
  const form = FormApp.create(`${ws.title} (${RUNS[run].toLowerCase()} run)`);
  try {
    form.setDescription(worksheetDescription_(ws, run));
    form.setIsQuiz(true);
    form.setShuffleQuestions(false);
    form.setLimitOneResponsePerUser(false); // a working document, not a test: no sign-in required
    form.setCollectEmail(false);
    form.setAllowResponseEdits(true); // keep it open and editable across the whole module
    form.setPublishingSummary(false);
    form.setShowLinkToRespondAgain(false);
    form.setProgressBar(true);
    form.setConfirmationMessage('Thank you. You can still come back and edit your answers from this same link during the module.');
    form.setCustomClosedFormMessage('This worksheet is closed. Ask your resource person for this run\'s link.');

    form.addTextItem().setTitle('Your name').setRequired(true);
    form.addTextItem().setTitle('Your office').setRequired(true);
    form.addTextItem().setTitle('Your team').setHelpText(ws.teamHelp || 'As assigned this morning. Optional.').setRequired(false);

    WORKSHEET_BUILDERS[ws.key](form);

    ensurePublished_(form);
    form.setAcceptingResponses(true);
    return form;
  } catch (e) {
    throw new Error(`Stopped while building "${form.getTitle()}": ${e.message}\n` +
      'Trash that form in Google Drive, then run createAllWorksheets again.');
  }
}

function worksheetDescription_(ws, run) {
  return [
    SETTINGS.course,
    `${RUNS[run]} run · ${ws.when[run]}`,
    '',
    'Not graded for the course. Write in this worksheet during each Try it, in the same order as the slides. ' +
      'Every case here is fictional: never write real names, systems or incidents from your own office.',
    '',
    'Privacy: this form collects your name, office and team, the same as the attendance sheet. It does not ' +
      'collect birthdates, ID numbers or phone numbers, and does not require signing in to a Google account.',
  ].join('\n');
}

// One line in the format of pdac-web/src/data/links.json.
function worksheetLinksLine_(ws, url) {
  const entry = { label: ws.label, url: url, short: url.replace(/^https?:\/\//, ''), note: 'Keep it open during the module' };
  const fields = Object.keys(entry).map((name) => `"${name}": ${JSON.stringify(entry[name])}`);
  return `"${ws.key}": { ${fields.join(', ')} },`;
}

function setWorksheetsAccepting_(open) {
  const changed = [];
  Object.keys(RUNS).forEach((run) => {
    WORKSHEETS.forEach((ws) => {
      const form = storedForm_(run, ws.key);
      if (!form || form.isAcceptingResponses() === open) return;
      if (open) ensurePublished_(form);
      form.setAcceptingResponses(open);
      changed.push(`${open ? 'Opened' : 'Closed'}: ${form.getTitle()} (${form.getResponses().length} response(s))`);
    });
  });
  return changed;
}

// ---------- item helpers ----------

// A classification question with instant feedback: shows the right choice and
// why as soon as someone answers (0 points: not scored for the course).
function addClassify_(form, q, choices, answerIndex, why) {
  const item = form.addMultipleChoiceItem();
  item.setTitle(q)
    .setChoices(choices.map((c, i) => item.createChoice(c, i === answerIndex)))
    .setPoints(0)
    .setRequired(true)
    .setFeedbackForCorrect(feedback_(`Correct. ${why}`))
    .setFeedbackForIncorrect(feedback_(`The answer is "${choices[answerIndex]}". ${why}`));
}

function addShort_(form, title, help, required) {
  const item = form.addTextItem().setTitle(title).setRequired(Boolean(required));
  if (help) item.setHelpText(help);
  return item;
}

function addLong_(form, title, help, required) {
  const item = form.addParagraphTextItem().setTitle(title).setRequired(Boolean(required));
  if (help) item.setHelpText(help);
  return item;
}

function addSection_(form, title, help) {
  const item = form.addPageBreakItem().setTitle(title);
  if (help) item.setHelpText(help);
  return item;
}

function addThreeS_(form, caseLabel, caseText) {
  form.addSectionHeaderItem().setTitle(caseLabel).setHelpText(caseText);
  form.addGridItem().setTitle(`${caseLabel}: apply the 3S test`)
    .setRows(['Sensitive?', 'Stolen?', 'Serious?']).setColumns(['Yes', 'Not sure', 'No']).setRequired(false);
  form.addMultipleChoiceItem().setTitle(`${caseLabel}: your team's decision`)
    .setChoiceValues(['Notify', 'Do not notify', 'Not sure']).setRequired(true);
  addLong_(form, `${caseLabel}: why, in one sentence`, '', true);
}

// ---------- Module 1 ----------

function m1Sections_(form) {
  addSection_(form, 'Try it 1.1A: Secret, Correct, Ready', 'Apply · 8 minutes · teams — For each RSSO asset, say which goal it hits first, and in one line, the most likely threat and one thing your team would do.');
  const assets = [
    ['Applicant database', ['Secret', 'Correct', 'Ready'], 0, 'Data theft using stolen passwords puts Secret at risk first.'],
    ['Payout list', ['Secret', 'Correct', 'Ready'], 1, 'E-wallet numbers changed by a fraudster or insider breaks Correct first.'],
    ['Assistance Portal', ['Secret', 'Correct', 'Ready'], 2, 'Ransomware or traffic floods that crash it hit Ready first.'],
    ['Office email', ['Secret', 'Correct', 'Ready'], 0, 'Phishing puts Secret at risk first, then everything the account can reach.'],
    ['Public website', ['Secret', 'Correct', 'Ready'], 1, 'Defacement changes what the site shows: Correct is hit first.'],
    ['Backup drive', ['Secret', 'Correct', 'Ready'], 2, 'Ransomware reaching the backups, or theft, hits Ready first (and Secret too if stolen).'],
  ];
  assets.forEach(([asset, choices, answer, why]) => {
    addClassify_(form, `${asset}: which goal is hit first?`, choices, answer, why);
    addLong_(form, `${asset}: the most likely threat, and one thing your team would do`);
  });

  addSection_(form, 'Try it 1.1B: Read the 2023 case like an investigator', 'Analyze · 6 minutes — The case timeline is on the slide and in your learner guide, Lesson 1.1.');
  addLong_(form, 'Which of the five doors does the expired antivirus relate to?', '', true);
  addLong_(form, 'Which of Secret, Correct and Ready were hit, and in what order?', '', true);
  addLong_(form, 'The first statement said no personal data had leaked; two weeks later the NPC found sensitive data. What does that teach about waiting for certainty before reporting?', '', true);
  addLong_(form, 'What could a non-IT employee have noticed, done, or reported?', '', true);

  addSection_(form, 'Check yourself 1.1', 'Answer from memory first, then check the answers at the end of your learner guide.');
  addLong_(form, 'Give the plain words for confidentiality, integrity and availability.');
  addLong_(form, 'A hacktivist replaces the RSSO homepage with a protest message. Which property is hit first?');
  addLong_(form, 'Why is a shared account a weakness even if no one misuses it?');
  addLong_(form, 'What motive is behind most attacks?');

  addSection_(form, 'Try it 1.2A: Sort the data', 'Apply · 5 minutes — Mark each item P (personal), S (sensitive personal) or N (not covered by the DPA, or not personal information at all).');
  const PSN = ['Personal (P)', 'Sensitive personal (S)', 'Not covered (N)'];
  addClassify_(form, "An applicant's full name and home address", PSN, 0, 'Identifies a person.');
  addClassify_(form, "An applicant's social security number", PSN, 1, 'A government-issued number is on the sensitive list.');
  addClassify_(form, 'A medical certificate attached to a request for medical assistance', PSN, 1, 'Health information is sensitive.');
  addClassify_(form, "Ben's name and job title on the citizen's charter", PSN, 2, "A government employee's position details are not covered (Sec. 4(a)).");
  addClassify_(form, "An applicant's age and marital status", PSN, 1, 'Age and marital status are on the sensitive list.');
  addClassify_(form, "An applicant's mobile number and e-wallet number", PSN, 0, 'Not on the sensitive list, but an e-wallet number can enable fraud, so treat it as high risk in the 3S test.');
  addClassify_(form, '"1,240 applicants this quarter, by province", with no names', PSN, 2, 'Not personal information if no one can be identified from the totals; be careful with very small counts, which can point to one person.');

  addSection_(form, 'Try it 1.2B: Compliant or not?', 'Apply and Evaluate · 10 minutes — Vote, then give the reason.');
  const COMPLIANT = ['Compliant', 'Not compliant', 'It depends'];
  const cases12b = [
    ['A beneficiary list with ID numbers is shared as a public spreadsheet link.', 1, 'Anyone with the link can see ID numbers. If it was opened by people with no right to it, this is likely a notifiable breach.'],
    ['A staff member emails the payroll file to a personal address to work from home.', 1, "Personal email is outside the office's control and access rules; payroll data may include sensitive information."],
    ['A laptop with unencrypted HR files is stolen from a car.', 1, 'Data taken off-site must be encrypted (Sec. 23). With sensitive HR data and likely harm, the 3S test points to notification.'],
    ['A vendor gets full database access with no written agreement.', 1, 'The office stays responsible for what its vendors do (Secs. 14 and 21); the vendor needs a written agreement and only the access its job needs.'],
    ['Citizen letters are pasted into a free public chatbot to draft replies.', 1, 'Unless the tool is approved and the personal data is removed first, pasting letters into a public tool discloses them to a third party.'],
    ['The office website is defaced; the server held no personal data.', 2, 'Without personal data it is not a personal data breach, so there is no NPC notice. It is still a security incident: document it, fix it, report it under DICT\'s mechanism.'],
  ];
  cases12b.forEach(([text, answer, why], i) => {
    addClassify_(form, `${i + 1}. ${text}`, COMPLIANT, answer, why);
    addShort_(form, `${i + 1}. Your reason, in one sentence`);
  });

  addSection_(form, "Try it 1.2C: Notify or not?", 'Evaluate · 10 minutes — Apply the 3S test, decide, and defend your decision.');
  addThreeS_(form, 'Case 1', 'Dan emails the payout list (230 names, e-wallet numbers, amounts) to a wrong outside address. The recipient says they deleted it.');
  addThreeS_(form, 'Case 2', "Sol's laptop with case notes is stolen. Its disk is encrypted with a strong password that was not stored with it.");
  addThreeS_(form, 'Case 3', "Ransomware locks the Assistance Portal for two days. Ana's logs show no data left the network.");

  addSection_(form, 'Check yourself 1.2');
  addLong_(form, 'What do Tell, Legit and Little stand for?');
  addLong_(form, 'Name two kinds of sensitive personal information.');
  addLong_(form, 'What are the 3S?');
  addLong_(form, 'When does the 72-hour clock start?');
  addLong_(form, 'Ben wants to take 1,500 applicant records home. What does the law require?');

  addSection_(form, 'Try it 1.2.1: Which theme would have caught it?', 'Apply and Analyze · 5 minutes — Match each incident to Rules, People, Places or Tech.');
  const THEME = ['Rules', 'People', 'Places', 'Tech'];
  const cases121 = [
    ["A former contractor's account was still active three months after the contract ended.", 0, 'Access rights must end when the contract ends (the access control family, 5.15 to 5.18).'],
    ['A clerk opened a fake invoice attachment; no one had trained staff to spot one.', 1, 'Awareness, education and training (6.3).'],
    ['The server room key hangs beside the door, and no one logs who takes it.', 2, 'Physical security of the server room.'],
    ["The portal's login page did not encrypt passwords in transit.", 3, 'Use of cryptography (8.24).'],
    ['When a breach was reported, no one knew which systems held citizen ID numbers.', 0, 'Inventory of information and other associated assets (5.9).'],
  ];
  cases121.forEach(([text, answer, why]) => addClassify_(form, text, THEME, answer, why));

  addSection_(form, 'Check yourself 1.2.1');
  addLong_(form, 'Name the four themes and how many controls each has.');
  addLong_(form, 'What does the Statement of Applicability record?');
  addLong_(form, 'Which clause asks "Is it working?"');

  addSection_(form, "Try it 1.2.2A: Write your unit's AI rule", 'Create · 5 minutes — Complete this sentence for your own unit: "In our unit, we may use [approved tools] for [tasks]. We never enter [kinds of data]. Before we use any AI output, [who] checks [what]. If something goes wrong, we report to [whom]."');
  addLong_(form, 'Your unit\'s AI rule, as a full sentence', '', true);

  addSection_(form, 'Try it 1.2.2B: The screenshot experiment', 'Experiment · 4 minutes — Your facilitator uploads two sample files to Content Credentials Verify: an image with credentials, and a screenshot of it. Predict before the result appears.');
  addShort_(form, 'My prediction: what will the original image show?');
  addShort_(form, 'My prediction: what will the screenshot show?');
  addLong_(form, 'Discuss: what does a missing credential tell you, and what does it not tell you?');

  addSection_(form, 'Check yourself 1.2.2');
  addLong_(form, 'Name the three questions that group the seven ASEAN AI principles.');
  addLong_(form, 'A screening tool rejects an applicant, and no one can explain why. Which principle is at stake?');
  addLong_(form, 'Does a missing content credential prove that an image is fake?');

  addSection_(form, 'Bring it home', 'Not graded. Your process map feeds this afternoon\'s risk assessment; your commitments feed the Day 3 closing action plan. Use your own office in your notes, but do not share real details in the session.');
  addSection_(form, '1. Map one process you handle (Create, 15 minutes)', 'Pick one process you know well. For each stage, note what data moves, where it is kept, who can see it, for how long, and one weak point and fix.');
  ['Collect', 'Store', 'Use', 'Share', 'Keep', 'Dispose'].forEach((stage) => addLong_(form, stage));
  addSection_(form, '2. Readiness mini-check (Evaluate, 10 minutes)', 'Based on the September 2026 DICT and CICC advisory. Select what your office can show today.');
  form.addCheckboxItem().setTitle('What can your office show today?').setChoiceValues([
    'We know our most serious cyber risk, and the head of office knows it too.',
    'Administrator and email accounts use multi-factor authentication.',
    'Critical security updates are applied, and antivirus and other licences are renewed before they expire.',
    'Only the systems that must be on the internet are on it.',
    'Someone watches the logs or alerts and knows what to do with them.',
    'We restored a backup successfully in the last six months.',
    'We know which vendors can reach our systems or data, and we review that access.',
    'Staff know how to report an incident, and to whom.',
    'We tested our incident response and continuity plans this year.',
  ]).setRequired(false);
  addSection_(form, '3. My three commitments for the next 30 days (Create)', 'Each one: what you will do, by when, and how you will know it worked.');
  ['Commitment 1', 'Commitment 2', 'Commitment 3'].forEach((label) => addLong_(form, label));
}

// ---------- Module 2 ----------

function m2Sections_(form) {
  addSection_(form, 'Try it 2.1: Spot the weakness', 'Apply · 10 minutes · teams — For each situation: say where it sits, then name the weakness, the data at risk and one fix.');
  const WHERE = ['People', 'Process', 'Technology', 'People and process', 'Technology and process'];
  const situations21 = [
    ["The portal's admin page can be reached from the internet, and it still uses the vendor's default password.", 2],
    ['The whole approval team uses one login for the approval spreadsheet.', 3],
    ['A contractor who left two months ago can still connect through the VPN.', 1],
    ['Backups run every night, but no one has ever tried to restore one.', 1],
    ['Field staff carry applicant forms on their personal USB sticks.', 4],
    ["The server's operating system reached end of support last year and no longer gets security updates.", 2],
  ];
  situations21.forEach(([text, answer], i) => {
    addClassify_(form, `${i + 1}. ${text}`, WHERE, answer, 'See the learner guide, Try it 2.1, for the full model answer.');
    addLong_(form, `${i + 1}. The weakness, the data at risk, and one fix`);
  });

  addSection_(form, 'Check yourself 2.1');
  addLong_(form, 'In the house comparison, what is the vulnerability?');
  addLong_(form, 'Name the three places where weaknesses hide.');
  addLong_(form, "In Verizon's 2026 report, what was the most common way attackers got in?");
  addLong_(form, 'Why is a CVSS score not enough to decide what to fix first?');

  addSection_(form, 'Quick check: Which STRIDE letter?', 'Apply · 3 minutes · whole room — Call out the letter, then say what it breaks.');
  const STRIDE = ['S Spoofing', 'T Tampering', 'R Repudiation', 'I Information disclosure', 'D Denial of service', 'E Elevation of privilege'];
  const strideCases = [
    ['a. A shared login means no one can tell who approved a payout.', 2],
    ['b. The applicant list is shared by a public link.', 3],
    ["c. Someone logs in with Ben's stolen password.", 0],
    ['d. A clerk account reaches the admin page.', 5],
    ['e. A payout amount is edited in the spreadsheet.', 1],
    ['f. Ransomware or floods of traffic take the portal down.', 4],
  ];
  strideCases.forEach(([text, answer]) => addClassify_(form, text, STRIDE, answer, 'Letters S, T, R, I, D, E stand for the six STRIDE threats.'));

  addSection_(form, 'Check yourself 2.2');
  addLong_(form, 'What are the four threat modeling questions?');
  addLong_(form, 'What does a dashed line mean on a data flow map, and why does it matter?');
  addLong_(form, 'Which three STRIDE threats match Secret, Correct and Ready?');
  addLong_(form, 'A risk has likelihood 4 and impact 4. What is its score and band?');
  addLong_(form, 'What do the letters of TARA stand for?');

  addSection_(form, 'Try it 2.3: Phish or legit?', 'Apply · 15 minutes · teams — all messages fictional. Vote, then name the warning signs with SLAM.');
  const VERDICT = ['Phish', 'Legit'];
  const messages = [
    ['1 · Email: "DICT Advisory: verify your government mailbox within 24 hours", link to dict-gov-ph.verify-portal.example.', 0],
    ['2 · Email from a regular supplier: "We have changed banks. Please pay invoice 4471 to our new account today."', 0],
    ['3 · Text message: "RSSO: your assistance payout is on hold. Update your details at" a short link.', 0],
    ['4 · Voicemail from a caller claiming to be law enforcement, asking for the one-time code to "confirm SIM ownership".', 0],
    ['5 · Poster with a QR code: "Scan to claim your cash aid today."', 0],
    ['6 · Message from a colleague\'s account: "Pls review this file urgently", link to a password page.', 0],
    ["7 · Email from HR's usual address, no link or attachment, matches the bulletin-board memo.", 1],
    ["8 · Text from your bank's registered sender: a transaction occurred, no link, call the number on your card.", 1],
  ];
  messages.forEach(([text, answer]) => {
    addClassify_(form, text, VERDICT, answer, 'See the learner guide, Try it 2.3, for the full warning signs (SLAM).');
    addShort_(form, `${text.split(' ')[0]} Warning signs (SLAM)`);
  });

  addSection_(form, 'Check yourself 2.3');
  addLong_(form, 'What does SLAM stand for?');
  addLong_(form, 'Why should you verify through a number you already know, not one in the message?');
  addLong_(form, 'Where should a citizen report a scam call?');
  addLong_(form, 'Name one process control that stops a fake bank-detail change.');

  addSection_(form, 'Graded risk assessment: the RSSO Assistance Portal (20%)',
    'This part is not in this form. Build your data flow map, threat table, 5 by 5 matrix and risk register on paper (A3) or your team\'s shared document, then submit through the "ra-submit" link your facilitator shows at 4:45 PM.');
}

// ---------- Module 3 ----------

function m3Sections_(form) {
  addSection_(form, 'Try it 3.1: Which control stops this?', 'Apply · 5 minutes · teams — Match each threat from Module 2 to the control that would stop or detect it.');
  const CONTROLS = [
    'Firewall default deny and an admin network',
    'Segmentation',
    'Web application firewall',
    'MFA on the VPN',
    'Segmentation plus an IPS',
    'An IDS alert on outbound traffic',
  ];
  const threats31 = [
    ["An internet scan finds the portal's admin page.", 0, 'The admin page answers only on the admin network.'],
    ['A visitor on guest Wi-Fi tries to open the file server.', 1, 'Guest Wi-Fi reaches only the internet.'],
    ["The portal's login form receives database commands instead of a name.", 2, 'A web application firewall blocks them while the vendor fixes the form itself; Module 4 adds the buying habit of asking for proof of security testing.'],
    ["A departed contractor's stolen VPN password is used at night.", 3, 'MFA on the VPN, and accounts closed on the last day.'],
    ['Malware on one staff computer tries to reach the applicant database.', 4, 'Staff computers cannot reach the database directly, and the IPS blocks the attempt.'],
    ['A large amount of data leaves the server for an unknown address over two nights.', 5, 'An IDS alert on outbound traffic, with outbound filtering that allows only approved destinations.'],
  ];
  threats31.forEach(([text, answer, why], i) => addClassify_(form, `${i + 1}. ${text}`, CONTROLS, answer, why));

  addSection_(form, 'Check yourself 3.1', 'Answer from memory first, then check the answers at the end of your learner guide.');
  addLong_(form, 'What does "layers, not walls" mean?');
  addLong_(form, 'Name three zones a network should keep apart.');
  addLong_(form, 'What is the difference between an IDS and an IPS?');
  addLong_(form, 'Why should a firewall filter outbound traffic too?');
  addLong_(form, 'What two things should every VPN account have?');

  addSection_(form, 'Try it 3.2: Encrypt it right', 'Apply and Evaluate · 10 minutes · teams — For each fictional RSSO data set, choose its protection when stored and when moving, and name who holds the key.');
  [
    '1. The HR shared drive with staff records',
    '2. A USB drive field staff use to bring home-visit forms to the office',
    '3. The nightly database backup',
    "4. A data exchange between the RSSO's system and a partner agency's system",
    '5. A mobile app social workers use on field visits',
    '6. Scanned IDs and medical certificates uploaded by applicants',
    '7. A list of payouts sent to the e-wallet provider',
    '8. The public Assistance Portal',
  ].forEach((set) => addLong_(form, set, 'Stored: …   Moving: …   Key holder: …'));
  addSection_(form, 'Optional: read a padlock', 'If devices allow: click the padlock on any public government website and look at who issued its certificate and when it expires. Never do this with a page that shows real personal data.');
  addShort_(form, 'Who issued the certificate?');
  addShort_(form, 'When does it expire?');

  addSection_(form, 'Check yourself 3.2');
  addLong_(form, 'Which tool protects Secret, which protects Correct, and which proves who sent a file?');
  addLong_(form, 'What does the padlock in the address bar tell you, and what does it not tell you?');
  addLong_(form, 'Name two places where stored data must be encrypted.');
  addLong_(form, 'Why must keys be kept apart from the data they protect?');
  addLong_(form, 'What does NPC Circular 2023-06 require when personal data must go on a USB drive?');

  addSection_(form, 'Try it 3.3: Design the roles', 'Create and Analyze · 10 minutes · teams — The RSSO Assistance Portal has four roles. Decide which role gets each function, then find the conflicts.');
  form.addCheckboxGridItem()
    .setTitle('Which role gets each function? Tick every role that needs it.')
    .setRows([
      'Encode a new application',
      'View applicant records',
      'Approve an application',
      "Edit an applicant's e-wallet number",
      'Release a payout',
      'Create and disable user accounts',
      'View audit logs',
      'Export applicant data',
    ])
    .setColumns(['Records clerk', 'Supervisor', 'Cashier', 'System administrator'])
    .setRequired(false);
  addLong_(form, '1. Which pairs of functions must never sit with one person?');
  addLong_(form, '2. Ana is the only system administrator. What risk does that create, and what is one control?');
  addLong_(form, '3. A clerk is promoted to supervisor. What must happen to her clerk access?');

  addSection_(form, 'Check yourself 3.3');
  addLong_(form, 'What does "never trust, always verify" mean for a login from inside the office?');
  addLong_(form, 'Name the three kinds of proof that MFA can use.');
  addLong_(form, 'Why does a security key resist phishing when an SMS code does not?');
  addLong_(form, 'What is separation of duties? Give one RSSO example.');
  addLong_(form, 'What are the three steps of joiner, mover, leaver?');

  addSection_(form, 'Configuration workshop (formative, 60 minutes)',
    'This part is not in this form. Your team hardens the RSSO Assistance Portal on paper in the Module 3 workbook: printed at your table face-to-face, or your team\'s shared copy online. Completion is recorded; nothing is scored.');

  addSection_(form, 'Desk card: Module 3 additions', 'Add these to your Day 1 desk card. Which three will you put on it first?');
  form.addCheckboxItem().setTitle('Pick three').setChoiceValues([
    'Layers, not walls',
    'Separate rooms',
    'Deny by default',
    'IDS tells, IPS stops',
    'Lock, seal, sign',
    'Moving, stored, keys',
    'Never trust, always verify',
    'Know, have, are',
    'Roles, not people',
  ]).setRequired(false);
}

// ---------- Module 4 ----------

function m4Sections_(form) {
  addSection_(form, 'Self-check 4.1: your device in three minutes',
    'Apply · individual · not collected. Tick the ten boxes in your learner guide or on the slide, not here: the self-check stays with you. Each unticked box is a candidate for your 30-day action at the end of this worksheet.');

  addSection_(form, 'Check yourself 4.1', 'Answer from memory first, then check the answers at the end of your learner guide.');
  addLong_(form, 'Name four parts of the endpoint baseline.');
  addLong_(form, 'Why should daily work happen on a standard user account?');
  addLong_(form, 'What does NPC Circular 2023-06 say about devices that access personal data?');
  addLong_(form, 'A field laptop with unencrypted applicant records is stolen. Why report it at once?');

  addSection_(form, 'Try it 4.2A: Safe or suspicious?', 'Analyze · pairs · 8 minutes — For each screen: is it safe or suspicious, which clue tells you, and what do you do?');
  const SAFE = ['Safe', 'Suspicious'];
  const screens = [
    ['1. Opening the office\'s leave portal, Dan sees a full-page warning: "Your connection is not private."', 1,
      "The browser cannot confirm the site's identity. Do not click past it or sign in; tell IT, who will usually find an expired or wrongly set-up certificate."],
    ['2. An SMS about a payout problem links to a sign-in page at assist.rss0-q.example. The page shows a padlock.', 1,
      'A zero in place of the letter o; it arrived by SMS link; the padlock proves nothing. Do not sign in; report the text. If you already entered a password, change it at once from the real address and tell IT.'],
    ['3. A colleague wants to merge two beneficiary masterlists using a free online PDF converter.', 1,
      'Sensitive personal data going to an outside service with no agreement. Stop; use an approved tool or ask IT. The office stays responsible for that data (RA 10173, Secs 14 and 21(a)).'],
    ['4. A news site shows a pop-up: "Your browser is out of date. Download the update now."', 1,
      'Updates do not arrive through pop-ups on other websites. Close the tab; update through the browser itself or ask IT.'],
    ['5. Ben opens assist.rsso-q.example from his own bookmark. The page shows a padlock.', 0,
      'Typed from his own bookmark, and the owner part is rsso-q.example. Carry on.'],
    ["6. In a messaging group, field staff post screenshots of applicants' IDs to ask a colleague to check them.", 1,
      'ID images of applicants in an unapproved messaging group. Stop posting; move checks into the portal or an approved tool; tell the DPO, who decides whether this is a breach.'],
  ];
  screens.forEach(([text, answer, why]) => {
    addClassify_(form, text, SAFE, answer, why);
    addShort_(form, `${text.split('.')[0]}. The clue, and what you do`);
  });

  addSection_(form, 'Try it 4.2B: Vet the tool', 'Evaluate · teams · 6 minutes — Your team takes one card. Ask five questions before anyone uses a free online tool.');
  form.addMultipleChoiceItem().setTitle("Your team's card")
    .setChoiceValues(['ScamCheck.ph', 'Content Credentials Verify', 'Pwned Passwords']).setRequired(false);
  ['1. Who runs it?', '2. Where does my input go?', '3. What does a result mean, and can it be wrong?', '4. Is it official, or approved by my office?', '5. What must never go into it?']
    .forEach((q) => addLong_(form, q));

  addSection_(form, 'Check yourself 4.2');
  addLong_(form, 'What does the padlock prove, and what does it not prove?');
  addLong_(form, 'A certificate warning appears on an office system. What do you do?');
  addLong_(form, 'Why is uploading a masterlist to a free converter a privacy problem, even if nothing leaks?');
  addLong_(form, 'Who checks a new tool before the office uses it with personal data?');

  addSection_(form, 'Try it 4.3: Triage the inbox', 'Evaluate · pairs · 5 minutes — For each item, decide: does it change a decision this week? If yes, who acts? How far may you share it?');
  const DECIDE = ['Yes: it changes a decision this week', 'No: file it or let it go'];
  const inbox = [
    ["1. A vendor advisory says the RSSO's VPN product has a security update for a weakness listed in CISA's KEV catalog.", 0,
      'Attackers are already using this weakness, so update now. Ana acts; Director Eva approves any downtime. A public advisory: share freely.'],
    ['2. A news article on global ransomware trends this year.', 1,
      'Big-picture reading: Director Eva, in the monthly bulletin. Public: share freely.'],
    ['3. An alert, marked TLP:AMBER, says two RSSO staff email addresses appear in a newly reported breach.', 0,
      'Reset both passwords and check MFA and sign-in history: Ana, with the two staff. AMBER: within the office, on a need-to-know basis; not the all-staff chat.'],
    ['4. A partner office shares a list of mobile numbers used by scammers posing as the RSSO, marked TLP:GREEN.', 0,
      "Warn the staff who answer calls and texts: Sol and the frontline staff. GREEN: staff and partner offices, not the public. To warn citizens, ask the sender's permission or write your own warning without the list."],
    ['5. A forwarded chain message, with no source, says "Delete this app now or your phone will be hacked."', 1,
      'No source, nothing to verify. Nobody acts: do not pass it on; ask IT if unsure.'],
    ['6. A joint advisory asks government offices to give their head a readiness assessment within 24 hours.', 0,
      'There is a 24-hour deadline. Ana prepares; Director Eva receives and decides. Share as the advisory itself allows.'],
  ];
  inbox.forEach(([text, answer, why]) => {
    addClassify_(form, text, DECIDE, answer, why);
    addShort_(form, `${text.split('.')[0]}. Who acts, and how far may you share it?`);
  });

  addSection_(form, 'Check yourself 4.3');
  addLong_(form, 'Name the three layers of threat intelligence.');
  addLong_(form, 'What single question decides whether to act on an item?');
  addLong_(form, 'A report is marked TLP:AMBER. Who may you share it with?');
  addLong_(form, 'Which awareness measure should go up over time?');

  addSection_(form, 'Your 30-day action', 'Choose one action from your self-check in Lesson 4.1 or from this afternoon\'s audit. Write what you will do, by when, and how you will know it is done. Example: "By 20 November, MFA is on for every account in our unit; I will check the list with Ana."');
  addLong_(form, 'My 30-day action: what, by when, and how I will know it is done');

  addSection_(form, 'Graded controls audit: the RSSO Assistance Portal (20%)',
    'This part is not in this form. Work on your own from the Module 4 Audit File (Exhibits A to G), then submit your findings register and access review through the submission link your facilitator shows, by 4:30 PM.');
}
