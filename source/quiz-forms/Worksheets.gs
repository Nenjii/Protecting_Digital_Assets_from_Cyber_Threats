/**
 * PDAC worksheets: the Try it and Check yourself activities from the Module 1
 * and Module 2 learner guides, as Google Forms instead of a printed handout.
 * One response per person, kept open the whole module so people can return to
 * it between activities; not graded for the course, but the classification
 * questions (Try it 1.2A, 1.2B, 1.2.1, the STRIDE quick check, Phish or legit)
 * show the right answer and why as soon as that question is answered. Uses
 * the helpers in Code.gs. Steps are in README.md.
 *
 * The graded team risk assessment (data flow map, threat table, risk matrix)
 * stays on paper or a shared document, submitted through the separate
 * "ra-submit" link: a Google Form is a poor medium for drawing a map or
 * filling in a free-form matrix together as a team. This worksheet covers the
 * individual practice activities only.
 *
 * Choose one of these in the toolbar, then click Run:
 *   checkWorksheets        Logs each worksheet's section and item counts. Creates nothing.
 *   createAllWorksheets     Creates the four forms (2 modules × 2 runs), open, and logs
 *                           their links. Safe to run again: forms that exist are skipped.
 *   showWorksheetLinks      Logs the links and the lines for pdac-web/src/data/links.json.
 *   closeAllWorksheets      Stops every worksheet form accepting responses.
 *   reopenAllWorksheets     Opens them all again.
 *   forgetWorksheetForms    Forgets the four forms, so createAllWorksheets makes new ones.
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
];

const WORKSHEET_STILL_TO_DO = [
  'Still to do by hand in each form (Apps Script cannot change these):',
  '1. Settings > Release grades: switch to "Immediately after each submission", with missed questions,',
  '   correct answers and point values switched ON. That is the opposite of the quizzes: a worksheet is',
  '   meant to show the right answer and why as soon as someone answers, the same as the printed answer key.',
  '2. Optional: Responses > Link to Sheets, to read everyone\'s answers in a spreadsheet as the module runs.',
].join('\n');

function checkWorksheets() {
  console.log('Module 1: 14 sections, 81 items (49 graded with feedback, 32 open-ended)');
  console.log('Module 2: 6 sections, 50 items (24 graded with feedback, 26 open-ended)');
  console.log('The graded risk assessment is not in these forms: it stays on paper/shared document, via "ra-submit".');
}

function createAllWorksheets() {
  const made = [];
  Object.keys(RUNS).forEach((run) => {
    WORKSHEETS.forEach((ws) => {
      if (storedForm_(run, ws.key)) return;
      const form = buildWorksheetForm_(ws, run);
      remember_(run, ws.key, form);
      made.push(form.getTitle());
    });
  });
  console.log(made.length
    ? `Created ${made.length} form(s), open for responses:\n  ${made.join('\n  ')}`
    : 'All four worksheet forms already exist; nothing created.');
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
        lines.push(`  ${ws.label}: not created yet (run createAllWorksheets)`);
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
  console.log('Forgot the four worksheet forms: createAllWorksheets now makes new ones, with new links.\n' +
    'The old forms are still in Google Drive. Trash them there, and update links.json.');
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
    form.addTextItem().setTitle('Your team').setHelpText('As assigned this morning. Optional.').setRequired(false);

    (ws.key === 'worksheet-m1' ? m1Sections_ : m2Sections_)(form);

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

function checkBank_dummy_() {} // placeholder kept out; Code.gs's checkBank_ is for QuizBank only
