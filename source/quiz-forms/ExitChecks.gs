/**
 * PDAC exit checks: one short, anonymous Google Form at the end of every module,
 * one per run, so you can see what stuck and whether the session made a
 * difference. Not graded. Uses the helpers in Code.gs. Steps are in README.md.
 *
 * WHICH ONE DO I RUN?
 *
 *   ONE form for everyone — one scan, one submit  ->  createCourseExitForms
 *       A single Google Form covering Modules 1 to 5. Use it at the course close.
 *       This is what the Module 5 slide's QR code points at (key: exit-course).
 *       For most runs this is the ONLY exit check you need to create.
 *
 *   OPTIONAL: a separate short form after each module  ->  createExitCheckForms
 *       Makes TEN forms (5 modules × 2 runs), one per module. Only if you want to
 *       check after every module during the week (the Module 1 to 4 close slides
 *       show these). You do NOT need them as well as the course form.
 *
 * Choose one of these in the toolbar, then click Run:
 *   checkExitChecks        Logs each exit check's items and answer key. Creates nothing.
 *   createExitCheckForms   OPTIONAL. Creates the ten per-module forms (5 modules × 2 runs),
 *                          open, and logs their links. Safe to run again: existing ones are skipped.
 *   showExitCheckLinks     Logs the links and the lines for pdac-web/src/data/links.json.
 *   showExitCheckResults   Logs, per module and run: the share who got each item right,
 *                          before → now self-ratings, feedback averages, and every
 *                          "still unclear" and "I will change" answer.
 *   closeAllExitChecks     Stops every exit check accepting responses (course check included).
 *   reopenAllExitChecks    Opens them all again.
 *   forgetExitCheckForms   Forgets the forms, so the create… functions make new ones.
 *
 * The course exit check lives at the end of this file:
 *   checkCourseExit · createCourseExitForms · showCourseExitLinks · showCourseExitResults
 *
 * Every form here is anonymous: no name, email or office, and no sign-in. A
 * per-module form has four pages (your work, What stuck, Before and now, Your
 * feedback); the course form has one What stuck page per module.
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
 * why. None of them repeats a Quiz 1 to Quiz 4 item. Modules 3, 4 and 5 follow
 * their learner guides: the objectives are the guides' "What you will be able
 * to do" rows, word for word. Module 5's five items were added on 23 October
 * 2026 from its learner guide.
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
    objectives: [ // the Module 3 learner guide, "What you will be able to do"
      'Recall the Module 3 memory phrases, from Layers, not walls to Roles, not people',
      'Explain in plain words what a firewall, an IDS, an IPS and a VPN each do',
      'Choose the control that stops or detects each Module 2 threat, and the protection for data stored and data moving',
      'Find separation-of-duties conflicts in a set of roles',
      "Score another team's controls for coverage and name the gap that is left",
      'Write firewall rules, a role matrix and a data protection plan for the RSSO',
    ],
    items: [
      {
        q: 'Why does the RSSO put several controls between an attacker and the data, instead of one strong one?',
        choices: [
          'One strong control is enough if it is expensive',
          'So that when one control fails, the next one holds',
          'Because the law requires exactly five layers',
          'To make the network faster',
        ],
        answer: 'B',
        why: 'Layers, not walls: no single control is trusted alone. Lesson 3.1, Key idea.',
      },
      {
        q: 'At 2:00 AM, two nights in a row, a large amount of data leaves the backup server for an unknown internet address. Which control was built to catch this?',
        choices: [
          'Full-disk encryption on staff laptops',
          'An IDS alert on outbound traffic, with outbound filtering that allows only approved destinations',
          'A longer screen-lock timeout',
          'Guest Wi-Fi for visitors',
        ],
        answer: 'B',
        why: 'Filter outbound traffic too: a server that suddenly sends data to an unknown address is a warning sign. Lesson 3.1, Try it 3.1 item 6.',
      },
      {
        q: 'The nightly backup drive is stolen from the server room. Which protection keeps its data Secret?',
        choices: [
          'HTTPS on the Assistance Portal',
          'Encryption of the backup, with the key kept somewhere else',
          'A firewall rule',
          'A VPN for remote staff',
        ],
        answer: 'B',
        why: 'Data stored (at rest) is protected by encryption, and the key never sits with the data. Moving, stored, keys. Lesson 3.2.',
      },
      {
        q: 'Which of these is something you HAVE, in "know, have, are"?',
        choices: ['A PIN', 'A fingerprint', 'A security key', 'A passphrase'],
        answer: 'C',
        why: 'Know: a password or PIN. Have: a phone or a security key. Are: a fingerprint or face. Lesson 3.3, MFA.',
      },
      {
        q: 'Which pair of functions must never sit with one person?',
        choices: [
          'Encode an application and view the cases assigned to you',
          "Edit an applicant's e-wallet number and release the payout",
          'View audit logs and read reports',
          'Approve an application and view applicant records',
        ],
        answer: 'B',
        why: 'Two hands on money: whoever changes where the money goes must not be the one who releases it. Lesson 3.3, Roles, not people.',
      },
    ],
  },
  {
    key: 'exit-m4',
    label: 'Exit check · Module 4',
    title: 'Module 4 exit check: Endpoint security and safe digital workflows',
    when: {
      f2f: 'Thursday 22 October 2026, end of the afternoon',
      online: 'Tuesday 27 October 2026, end of the afternoon',
    },
    objectives: [ // the Module 4 learner guide, "What you will be able to do"
      'Recall the Module 4 memory phrases and the four TLP labels',
      'Explain why a padlock does not make a website honest, and why shadow IT is a data risk',
      'Check your own work device against a ten-point baseline',
      "Tell safe from suspicious websites and tools, and find control gaps in a system's records",
      "Rate each finding's severity and decide what to fix first",
      'Create a corrected access-control table, and one 30-day action for your office',
    ],
    items: [
      {
        q: 'Opening the office leave portal, you see a full-page warning: "Your connection is not private." What do you do?',
        choices: [
          'Click Advanced, then continue to the site',
          'Do not click past it or sign in; tell IT, who usually find an expired or wrongly set-up certificate',
          'Try again in another browser',
          'Turn off the antivirus and reload',
        ],
        answer: 'B',
        why: 'The browser could not confirm the site\'s identity. IT fixes the certificate; staff never learn to ignore the warning. Lesson 4.2, Certificate warnings.',
      },
      {
        q: 'A pop-up says your computer is infected and gives a number to call. What do you do?',
        choices: [
          'Call the number at once',
          'Close the browser and tell IT',
          'Pay for the cleaning tool it offers',
          'Restart the computer and carry on',
        ],
        answer: 'B',
        why: 'Never call a number from a pop-up. Updates and fixes come from the browser, the operating system or IT. Lesson 4.2, Downloads and pop-ups.',
      },
      {
        q: 'A list of sender addresses and links to block today is which layer of threat intelligence?',
        choices: ['Strategic', 'Tactical', 'Operational', 'It is not threat intelligence'],
        answer: 'C',
        why: 'Operational intelligence gives the details of specific attacks, including technical signs; at the RSSO, Ana uses it. Lesson 4.3.',
      },
      {
        q: 'Which awareness measure should rise over time?',
        choices: [
          'The click rate in phishing practice',
          'The report rate: how many people report a suspicious message',
          'The number of warnings forwarded to all staff',
          'The number of training slides',
        ],
        answer: 'B',
        why: 'Measure what matters: the report rate should rise, and the click rate should fall. Lesson 4.3, Department awareness that lasts.',
      },
      {
        q: 'Before the office uses a new online tool with personal data, who checks it?',
        choices: [
          'Only the person who found the tool',
          'IT checks security and the DPO checks privacy, and a written agreement comes first if the vendor will process personal data',
          'Nobody, if the tool is free',
          'The vendor itself',
        ],
        answer: 'B',
        why: 'The approved-tools route: ask, request, check, agree terms, list it. A fast route is itself a control. Lesson 4.2.',
      },
    ],
  },
  {
    key: 'exit-m5',
    label: 'Exit check · Module 5',
    title: 'Module 5 exit check: Incident response and integrated capstone',
    when: {
      f2f: 'Friday 23 October 2026, end of the morning',
      online: 'Wednesday 28 October 2026, end of the morning',
    },
    objectives: [ // the Module 5 learner guide's "What you will be able to do", one row per level
      'Name the phases of incident response and the 72-5 rule',
      'Explain who does what in each phase, and why evidence comes before repair',
      'Put first-hour actions in a safe order',
      'Decide whether an incident must be reported to the NPC, and when the clock started',
      'Weigh pressure to deny or pay against the law and the evidence',
      'Produce an immediate response plan, an incident log and a final incident report',
    ],
    items: [
      {
        q: 'Ben reports a ransom note on the file server. Ana wants to switch the server off at once. What should she do instead?',
        choices: [
          'Switch it off: it is the fastest way to stop the spread',
          'Disconnect it from the network, but leave it powered on',
          "Restore last night's backup over it immediately",
          'Wipe it and reinstall, then carry on',
        ],
        answer: 'B',
        why: 'Isolate first, power off last: powering down can destroy the evidence held in memory. Disconnecting stops the spread and keeps it. Lesson 5.1, Containment and evidence habits (CISA).',
      },
      {
        q: 'On Friday at 5:30 PM the firewall log shows a large transfer from the server zone, which holds applicant records, to an unknown address abroad. When does the 72-hour clock start?',
        choices: [
          'Only when the investigation proves that data was taken',
          'At 5:30 PM, when there is reasonable belief that a breach happened',
          'When the attackers publish the data',
          'On Monday, when the office reopens',
        ],
        answer: 'B',
        why: 'Smoke, not ashes: the clock starts at knowledge or reasonable belief, not certainty. Notify within 72 hours, and send the full report within 5 days of discovery. Lesson 5.2, the 72-5 rule (NPC Circular 16-03 Sec. 17).',
      },
      {
        q: 'A reporter calls the office during the response. Who may answer?',
        choices: [
          'Anyone who knows the facts',
          'Only the communications lead, with a holding statement',
          'The technical lead, because they know the systems best',
          'Nobody: the office says nothing at all',
        ],
        answer: 'B',
        why: 'One channel, one log, one voice. Only the communications lead speaks outside the team, with a holding statement: what is known, what is being done, and when the next update will come. Lesson 5.1.1.',
      },
      {
        q: 'The office asked the NPC in writing to postpone telling the people affected. Two days later there is no reply. May it postpone?',
        choices: [
          'Yes: silence means the request was granted',
          'No: approval must be express and in writing',
          'Yes, as long as the DPO agrees',
          'Only if fewer than 100 people are affected',
        ],
        answer: 'B',
        why: 'Silence is not approval. An exemption, a postponement or alternative means must be requested and justified, and approval must be express and in writing. A pending request does not stop the clock on the full report. Lesson 5.2 (NPC Advisory 2026-02).',
      },
      {
        q: 'The attackers offer to delete the stolen applicant records if the office pays. Does paying end the duty to notify?',
        choices: [
          'Yes: if the data is deleted there is no breach to report',
          'No: the data has already been taken, so the duty to notify remains',
          'Only the NPC must still be told, not the people affected',
          'It ends the duty if the payment is documented in the log',
        ],
        answer: 'B',
        why: 'Paying does not guarantee the data back and does not end the duty to notify; the FBI does not support paying. The decision belongs to the head of office, with legal advice and law enforcement, and the reasons go into the log. Lesson 5.1, The ransom question.',
      },
    ],
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
  console.log('NOTE: this makes TEN separate per-module forms (5 modules x 2 runs).\n' +
    'If you want ONE form for the whole course — one scan, one submit — stop and run\n' +
    'createCourseExitForms instead. You do not need both.\n');
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
  Object.keys(RUNS).forEach((run) => EXIT_CHECKS.concat([COURSE_EXIT]).forEach((check) => props.deleteProperty(propKey_(run, check.key))));
  console.log('Forgot the ten exit checks and the two course exit checks: createExitCheckForms and\n' +
    'createCourseExitForms now make new ones, with new links.\n' +
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
    EXIT_CHECKS.concat([COURSE_EXIT]).forEach((check) => {
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

/* =====================================================================
 * One exit check for the whole course (Modules 1 to 5), in a single form.
 *
 * THIS IS THE ONE TO USE. One QR, one form, all five modules — one scan, one
 * submit. The per-module forms above remain available for runs where you check
 * after every module, but you do not need them as well as this.
 *
 *   checkCourseExit        Logs what the combined form will contain. Creates nothing.
 *   createCourseExitForms  Creates the two forms (one per run) and logs their links.
 *   showCourseExitLinks    Logs the links and the links.json line.
 *   showCourseExitResults  Logs the same report as the per-module checks, for the course.
 *
 * This is the ONLY exit check your participants need: one scan, one submit.
 * As set up now (itemsPerModule: 5) it asks, in one pass: ALL FIVE "what stuck"
 * items from every module — 25 in all, about 20 minutes — a before-and-now
 * self-rating with one row per module, and course feedback. Anonymous, not
 * graded. Lower itemsPerModule to 3 or 2 if the close runs short.
 * ===================================================================== */

const COURSE_EXIT = {
  key: 'exit-course', // the same key as in pdac-web/src/data/links.json
  label: 'Exit check · whole course',
  title: 'Course exit check: Modules 1 to 5',
  // 5 = every item from every module. The per-module exit checks were never run
  // during the week: this one form IS the exit check for all five modules, taken
  // on the last day. Lower it to 3 (15 items, about 14 min) or 2 (10 items, about
  // 11 min) if the close runs short.
  itemsPerModule: 5,
  // Modules whose FULL set is asked even when itemsPerModule is lower. Harmless
  // at 5; it keeps today's module complete if you ever shorten the form.
  fullItemsFor: ['exit-m5'],
  when: {
    f2f: 'Friday 23 October 2026, course close',
    online: 'Wednesday 28 October 2026, course close',
  },
  // One row per module: the learner guide's "Five modules, one office" table.
  objectives: [
    'Module 1: name the threats, and apply the Data Privacy Act, ISO/IEC 27001 and the ASEAN AI guide',
    'Module 2: find weak spots, model threats, rate risks, and spot social engineering',
    'Module 3: choose controls — zones, encryption, MFA and roles',
    'Module 4: keep devices and tools safe, use threat intelligence, and audit an office’s records',
    'Module 5: respond, notify, recover and report',
  ],
  modules: ['Module 1', 'Module 2', 'Module 3', 'Module 4', 'Module 5'],
  titles: {
    mostUseful: 'Which module was most useful for your work?',
  },
};

// The items the combined form asks. One source of truth: the form and the
// results report both read this, so they cannot drift apart.
function courseExitItems_() {
  const picked = [];
  const full = COURSE_EXIT.fullItemsFor || [];
  EXIT_CHECKS.forEach((check, i) => {
    const take = full.indexOf(check.key) >= 0 ? check.items.length : COURSE_EXIT.itemsPerModule;
    check.items.slice(0, take).forEach((item) => picked.push({ module: i + 1, item: item }));
  });
  return picked;
}

// "Threat landscape and legal governance" out of "Module 1 exit check: ...".
function exitTopic_(check) {
  const parts = String(check.title).split(': ');
  return parts.length > 1 ? parts.slice(1).join(': ') : check.title;
}

function checkCourseExit() {
  checkExits_();
  const picked = courseExitItems_();
  const lines = [
    `${COURSE_EXIT.title} · ${picked.length} "what stuck" item(s) in ONE form`,
    `  ${COURSE_EXIT.itemsPerModule} per module, and every item from: ${(COURSE_EXIT.fullItemsFor || []).join(', ') || 'none'}`,
  ];
  EXIT_CHECKS.forEach((check, i) => {
    const items = picked.filter((entry) => entry.module === i + 1).map((entry) => entry.item);
    lines.push(items.length
      ? `  Module ${i + 1}: ${items.length} item(s) · key: ${items.map((item, n) => `${n + 1}${item.answer}`).join(' ')}`
      : `  Module ${i + 1}: no items in its bank yet, so the form skips its page`);
  });
  lines.push(`  Before and now: ${COURSE_EXIT.objectives.length} rows (one per module)`);
  console.log(lines.join('\n'));
}

function createCourseExitForms() {
  checkExits_();
  const made = [];
  Object.keys(RUNS).forEach((run) => {
    if (storedForm_(run, COURSE_EXIT.key)) return;
    const form = buildCourseExitForm_(run);
    remember_(run, COURSE_EXIT.key, form);
    made.push(form.getTitle());
  });
  console.log(made.length
    ? `Created ${made.length} course exit check(s), open for responses:\n  ${made.join('\n  ')}`
    : 'Both course exit checks already exist; nothing created.');
  showCourseExitLinks();
  console.log(EXIT_STILL_TO_DO);
}

function showCourseExitLinks() {
  Object.keys(RUNS).forEach((run) => {
    const form = storedForm_(run, COURSE_EXIT.key);
    if (!form) {
      console.log(`${RUNS[run]} run\n  ${COURSE_EXIT.label}: not created yet (run createCourseExitForms)`);
      return;
    }
    const url = stored_(run, COURSE_EXIT.key).url;
    console.log([
      `${RUNS[run]} run`,
      `  ${COURSE_EXIT.label} · ${COURSE_EXIT.when[run]} · ${form.isAcceptingResponses() ? 'open' : 'CLOSED'} · ${form.getResponses().length} response(s)`,
      `    Participants: ${url}`,
      `    Edit (facilitator only): ${form.getEditUrl()}`,
      `  For pdac-web/src/data/links.json:`,
      `  ${exitLinksLine_(COURSE_EXIT, url)}`,
    ].join('\n'));
  });
}

function showCourseExitResults() {
  const lines = [];
  Object.keys(RUNS).forEach((run) => {
    const form = storedForm_(run, COURSE_EXIT.key);
    if (form) lines.push(...courseExitResults_(form, run), '');
  });
  console.log(lines.length ? lines.join('\n') : 'No course exit check yet. Run createCourseExitForms first.');
}

function buildCourseExitForm_(run) {
  const form = FormApp.create(`${COURSE_EXIT.title} (${RUNS[run].toLowerCase()} run)`);
  try {
    const picked = courseExitItems_();
    const graded = picked.length > 0;
    form.setDescription(courseExitDescription_(run));
    form.setIsQuiz(graded);
    form.setShuffleQuestions(false);
    form.setLimitOneResponsePerUser(false); // no sign-in, so it stays anonymous
    form.setCollectEmail(false);
    form.setAllowResponseEdits(false);
    form.setPublishingSummary(false);
    form.setShowLinkToRespondAgain(false);
    form.setProgressBar(true);
    form.setConfirmationMessage(graded
      ? 'Thank you, and congratulations on finishing the course. Tap "View score" to see the right answers and why. Your feedback reaches the resource person with no names.'
      : 'Thank you, and congratulations on finishing the course. Your feedback reaches the resource person with no names.');
    form.setCustomClosedFormMessage('This exit check is closed. Thank you for taking part.');

    form.addMultipleChoiceItem()
      .setTitle(EXIT.titles.role)
      .setHelpText('Optional. It shows whether the course worked for IT and non-IT staff alike.')
      .setChoiceValues(EXIT.roles)
      .setRequired(false);

    if (graded) {
      const slots = answerSlots_(picked.map((entry) => entry.item));
      let n = 0;
      EXIT_CHECKS.forEach((check, i) => {
        // Same selection as courseExitItems_, so the form and the results report
        // can never drift apart.
        const items = picked.filter((entry) => entry.module === i + 1).map((entry) => entry.item);
        if (!items.length) return;
        form.addPageBreakItem()
          .setTitle(`${EXIT.titles.stuck} · Module ${i + 1}`)
          .setHelpText(`${exitTopic_(check)}. Answer from memory, without your notes. You see the right answers after you submit.`);
        items.forEach((item) => { addItem_(form, item, slots[n]); n++; });
      });
    }

    form.addPageBreakItem().setTitle(EXIT.titles.beforeNow)
      .setHelpText('One row per module. Rate yourself honestly: the form is anonymous, and the difference shows what the course changed.');
    form.addGridItem().setTitle(EXIT.titles.before)
      .setHelpText('Think back to the morning of the first day.')
      .setRows(COURSE_EXIT.objectives).setColumns(EXIT.levels).setRequired(true);
    form.addGridItem().setTitle(EXIT.titles.now)
      .setRows(COURSE_EXIT.objectives).setColumns(EXIT.levels).setRequired(true);

    form.addPageBreakItem().setTitle(EXIT.titles.page)
      .setHelpText('Straight to the resource person, to improve the next course.');
    form.addGridItem().setTitle(EXIT.titles.agree)
      .setRows(EXIT.feedback).setColumns(EXIT.agree).setRequired(true);
    form.addScaleItem().setTitle(EXIT.titles.useful)
      .setBounds(1, 5).setLabels('Not useful', 'Very useful').setRequired(true);
    form.addMultipleChoiceItem().setTitle(COURSE_EXIT.titles.mostUseful)
      .setChoiceValues(COURSE_EXIT.modules).setRequired(false);
    form.addParagraphTextItem().setTitle(EXIT.titles.learned).setRequired(true);
    form.addParagraphTextItem().setTitle(EXIT.titles.change).setRequired(false);
    form.addParagraphTextItem().setTitle(EXIT.titles.unclear).setRequired(false);
    form.addParagraphTextItem().setTitle(EXIT.titles.rp).setRequired(false);

    ensurePublished_(form);
    form.setAcceptingResponses(true);
    return form;
  } catch (e) {
    throw new Error(`Stopped while building "${form.getTitle()}": ${e.message}\n` +
      'Trash that form in Google Drive, then run createCourseExitForms again.');
  }
}

// Rough minutes: ~30s per question, plus the two grids and the written feedback.
function courseExitMinutes_() {
  return Math.round(courseExitItems_().length * 0.5 + 7);
}

function courseExitDescription_(run) {
  return [
    SETTINGS.course,
    `${RUNS[run]} run · ${COURSE_EXIT.when[run]}`,
    '',
    `About ${courseExitMinutes_()} minutes · anonymous · not graded · covers Modules 1 to 5`,
    '',
    'This is the only exit check to fill in: it covers all five modules in one form.',
    '',
    'One short check for the whole course. It tells your resource person what stuck, what to explain ' +
      'again, and how to make the next course better. It does not ask for your name, email address or office.',
  ].join('\n');
}

function courseExitResults_(form, run) {
  const responses = form.getResponses();
  const n = responses.length;
  const out = [`${COURSE_EXIT.title} · ${RUNS[run]} run · ${n} response(s)`];
  if (!n) return out;

  const roles = {};
  answers_(responses, EXIT.titles.role).forEach((role) => { roles[role || 'Not given'] = (roles[role || 'Not given'] || 0) + 1; });
  out.push(`  Who answered: ${Object.keys(roles).map((role) => `${role} ${roles[role]}`).join(' · ')}`);

  const picked = courseExitItems_();
  if (picked.length) {
    const right = picked.map(() => 0);
    responses.forEach((response) => response.getGradableItemResponses().forEach((answer) => {
      const i = picked.findIndex((entry) => entry.item.q === answer.getItem().getTitle());
      if (i >= 0 && Number(answer.getScore()) > 0) right[i]++;
    }));
    out.push('  What stuck (share who got it right; under 70% is worth reteaching):');
    picked.forEach((entry, i) => {
      out.push(`    M${entry.module} ${percent_(right[i], n)}  ${entry.item.q}`);
    });
  }

  const before = gridAverages_(responses, EXIT.titles.before, COURSE_EXIT.objectives);
  const now = gridAverages_(responses, EXIT.titles.now, COURSE_EXIT.objectives);
  out.push('  Before and now (1 Not yet to 4 Could teach it):');
  COURSE_EXIT.objectives.forEach((objective, i) => {
    out.push(`    ${fixed_(before[i])} → ${fixed_(now[i])}  ${gain_(before[i], now[i])}  ${objective}`);
  });

  const agree = gridAverages_(responses, EXIT.titles.agree, EXIT.feedback);
  out.push('  Feedback (1 to 5):');
  EXIT.feedback.forEach((row, i) => out.push(`    ${fixed_(agree[i])}  ${row}`));
  out.push(`    ${fixed_(average_(answers_(responses, EXIT.titles.useful).map(Number)))}  ${EXIT.titles.useful}`);

  const useful = {};
  answers_(responses, COURSE_EXIT.titles.mostUseful).forEach((m) => { if (m) useful[m] = (useful[m] || 0) + 1; });
  if (Object.keys(useful).length) {
    out.push(`  Most useful module: ${Object.keys(useful).sort().map((m) => `${m} ${useful[m]}`).join(' · ')}`);
  }

  [EXIT.titles.learned, EXIT.titles.change, EXIT.titles.unclear, EXIT.titles.rp].forEach((title) => {
    const said = answers_(responses, title).filter(String);
    if (!said.length) return;
    out.push(`  ${title}`);
    said.forEach((text) => out.push(`    - ${text}`));
  });
  return out;
}
