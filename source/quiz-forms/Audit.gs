/**
 * PDAC Module 4 graded controls audit (20%): the Google Form each participant
 * fills in and submits, one form per run, in place of typing in the Audit File
 * or photographing its pages. In order:
 *   page 1    name, office, and the five audit rules (ticked, as the guide asks online)
 *   page 2    the records: Exhibits A to G, word for word from the printed Audit File
 *   Part A    findings 1 to 8 (one page each), then up to 12 if they choose to add more
 *   Part B    the access review of all 14 accounts, then the corrected role table
 *   Write-up  the top three findings and three sentences to Director Eva
 * Not a quiz: the facilitator scores it with the rubric. The records come from
 * AuditData.gs (generated from content-day2.mjs; facilitator only, because it
 * also holds the answer key's Part B decisions). Uses the helpers in Code.gs
 * and Worksheets.gs. Steps are in README.md.
 *
 * Choose one of these in the toolbar, then click Run:
 *   checkAudit             Checks AuditData.gs and logs the form's pages and items. Creates nothing.
 *   createAuditForms       Creates the audit form for each run, open, and logs the links and
 *                          the line for pdac-web/src/data/links.json. Safe to run again:
 *                          forms that exist are skipped. About a minute per form.
 *   showAuditLinks         Logs the links, status and response counts again.
 *   showAuditSubmissions   Who has submitted: name, office, time (late or not), findings
 *                          written, accounts reviewed, and the Part B decisions that differ
 *                          from the answer key (check those reasons; a sound one can be right).
 *   closeAuditFaceToFace   Stops the face-to-face form accepting responses (at the end of
 *                          the grace period, 8:00 AM the next day).
 *   closeAuditOnline       The same for the online run.
 *   reopenAuditForms       Opens both forms again.
 *   forgetAuditForms       Forgets both forms, so createAuditForms makes new ones. The old
 *                          forms stay in Google Drive until you trash them.
 */

const AUDIT = {
  key: 'audit-submit', // the same key as in pdac-web/src/data/links.json
  label: 'Controls audit submission',
  title: 'Module 4 Controls Audit: The RSSO Assistance Portal',
  when: {
    f2f: { day: 'Thursday 22 October 2026', deadline: '2026-10-22T16:30:00+08:00', grace: '2026-10-23T08:00:00+08:00' },
    online: { day: 'Tuesday 27 October 2026', deadline: '2026-10-27T16:30:00+08:00', grace: '2026-10-28T08:00:00+08:00' },
  },
  minFindings: 8, // as the guide asks
  maxFindings: 12, // the rows on the printed findings register
  decisions: ['Keep', 'Change role', 'Disable', 'Require MFA'],
  bands: ['Low (1 to 4)', 'Medium (5 to 9)', 'High (10 to 16)', 'Critical (20 to 25)'],
  rulesTick: 'I have read and will follow the five audit rules',
};

const AUDIT_STILL_TO_DO = [
  'Still to do:',
  '1. Put this run\'s line in pdac-web/src/data/links.json (replace the audit-submit line), then',
  '   npm run qr && npm run build. The audit-submit slide shows its QR code.',
  '2. Open the form once with the eye icon (Preview): try "Add finding 9?" both ways.',
  '3. Optional: Responses > Link to Sheets, one row per person, and add four columns for the rubric',
  '   (Findings /40, Analysis /25, Access-control management /20, Remediation and clarity /15).',
].join('\n');

function checkAudit() {
  checkAuditData_();
  const D = AUDIT_DATA;
  const perFinding = 9;
  const findingPages = AUDIT.maxFindings;
  const asks = AUDIT.maxFindings - AUDIT.minFindings;
  console.log([
    `${AUDIT.title}: one form per run (${Object.keys(RUNS).map((run) => RUNS[run]).join(', ')})`,
    '  Page 1: name, office, the five audit rules (one tick)',
    `  Page 2: the records, ${D.exhibits.length} exhibits (${D.exhibits.map((e) => `${e.letter} ${e.lines.length}`).join(', ')} rows)`,
    `  Part A: ${findingPages} finding pages of ${perFinding} questions; findings 1 to ${AUDIT.minFindings} required, ` +
      `then "Add finding n?" (${asks} times) leads to ${AUDIT.minFindings + 1} to ${AUDIT.maxFindings} or straight to Part B`,
    `  Part B: ${D.accounts.length} accounts (decision: ${AUDIT.decisions.join(', ')}; one or two; and a reason), ` +
      `then the role table (${D.functions.length} functions x ${D.roles.length} roles), conditions, conflicts removed`,
    '  Write-up: the top three findings, three sentences to Director Eva, a note to the facilitator (optional)',
    `  Answer key decisions for the grading aid: ${D.accounts.map((a) => `${a.row} ${D.keyDecisions[a.row].join(' + ')}`).join('; ')}`,
  ].join('\n'));
}

function createAuditForms() {
  checkAuditData_();
  const made = [];
  Object.keys(RUNS).forEach((run) => {
    if (storedForm_(run, AUDIT.key)) return;
    const form = buildAuditForm_(run);
    remember_(run, AUDIT.key, form);
    made.push(form.getTitle());
  });
  console.log(made.length
    ? `Created ${made.length} form(s), open for responses:\n  ${made.join('\n  ')}`
    : `Both audit forms already exist; nothing created.`);
  showAuditLinks();
  console.log(AUDIT_STILL_TO_DO);
}

function showAuditLinks() {
  Object.keys(RUNS).forEach((run) => {
    const form = storedForm_(run, AUDIT.key);
    if (!form) {
      console.log(`${RUNS[run]} run\n  ${AUDIT.label}: not created yet (run createAuditForms)`);
      return;
    }
    const url = stored_(run, AUDIT.key).url;
    console.log([
      `${RUNS[run]} run`,
      `  ${AUDIT.label} · ${AUDIT.when[run].day}, by 4:30 PM · ${form.isAcceptingResponses() ? 'open' : 'CLOSED'} · ${form.getResponses().length} response(s)`,
      `    Participants: ${url}`,
      `    Edit (facilitator only): ${form.getEditUrl()}`,
      `  For pdac-web/src/data/links.json before the ${RUNS[run].toLowerCase()} run, replace the audit-submit line with:`,
      `  ${auditLinksLine_(url)}`,
    ].join('\n'));
  });
}

function showAuditSubmissions() {
  Object.keys(RUNS).forEach((run) => {
    const form = storedForm_(run, AUDIT.key);
    if (!form) {
      console.log(`${RUNS[run]} run: no audit form yet (run createAuditForms).`);
      return;
    }
    const deadline = new Date(AUDIT.when[run].deadline);
    const grace = new Date(AUDIT.when[run].grace);
    const rows = form.getResponses().map((response) => auditSummary_(response))
      .sort((a, b) => a.name.localeCompare(b.name));
    const lines = [`${RUNS[run]} run · ${rows.length} response(s) · deadline 4:30 PM, ${AUDIT.when[run].day}`];
    rows.forEach((r) => {
      const when = Utilities.formatDate(r.at, 'Asia/Manila', 'd MMM, h:mm a');
      const late = r.at <= deadline ? '' : r.at <= grace ? ' (LATE: in the grace period)' : ' (LATE: after the grace period)';
      const differs = r.differs.length
        ? `differs from the key on ${r.differs.join(', ')}: check the reasons`
        : 'Part B decisions as the key';
      lines.push(`  ${r.name} · ${r.office} · ${when}${late} · ${r.findings} finding(s) · ` +
        `${r.reviewed}/${AUDIT_DATA.accounts.length} accounts · ${differs}${r.note ? ' · has a note for you' : ''}`);
    });
    if (rows.length) lines.push(`  Fewer than ${AUDIT.minFindings} findings: ${rows.filter((r) => r.findings < AUDIT.minFindings).length} · late: ${rows.filter((r) => r.at > deadline).length}`);
    console.log(lines.join('\n'));
  });
}

function closeAuditFaceToFace() { setAuditAccepting_('f2f', false); }
function closeAuditOnline() { setAuditAccepting_('online', false); }
function reopenAuditForms() { Object.keys(RUNS).forEach((run) => setAuditAccepting_(run, true)); }

function forgetAuditForms() {
  const props = PropertiesService.getScriptProperties();
  Object.keys(RUNS).forEach((run) => props.deleteProperty(propKey_(run, AUDIT.key)));
  console.log('Forgot both audit forms: createAuditForms now makes new ones, with new links.\n' +
    'The old forms are still in Google Drive. Trash them there, and update links.json.\n' +
    `To rebuild only one, delete its entry under Project Settings > Script properties instead (for example ${propKey_('online', AUDIT.key)}).`);
}

function buildAuditForm_(run) {
  const D = AUDIT_DATA;
  const form = FormApp.create(`${AUDIT.title} (${RUNS[run].toLowerCase()} run)`);
  try {
    form.setDescription(auditDescription_(run));
    form.setIsQuiz(false); // scored by the facilitator with the rubric, not by Google
    form.setShuffleQuestions(false);
    form.setLimitOneResponsePerUser(SETTINGS.oneResponsePerPerson);
    form.setCollectEmail(false);
    form.setAllowResponseEdits(true); // submit early, then keep improving until the form closes
    form.setPublishingSummary(false);
    form.setShowLinkToRespondAgain(false);
    form.setProgressBar(true);
    form.setConfirmationMessage('Thank you: your audit is submitted. To change anything before the deadline, ' +
      'choose "Edit your response" below, or open the same link again.');
    form.setCustomClosedFormMessage('The audit form is closed. If connectivity stopped you from submitting, ' +
      'tell your resource person.');

    // Page 1: who is answering, and the five rules.
    form.addTextItem().setTitle('Your name').setHelpText('As on the attendance sheet.').setRequired(true);
    form.addTextItem().setTitle('Your office').setHelpText('As on the attendance sheet.').setRequired(true);
    form.addCheckboxItem().setTitle('The five audit rules').setHelpText(D.rules.join('\n'))
      .setChoiceValues([AUDIT.rulesTick]).setRequired(true);

    // Page 2: the records, the same rows as the printed Audit File.
    addSection_(form, 'The records: Exhibits A to G', `${D.method[0]}\n\n` +
      'Face-to-face: these are the records in your printed Audit File. You can come back to this page ' +
      'with Back at any time; what you have typed stays.');
    D.exhibits.forEach((ex) => form.addSectionHeaderItem().setTitle(ex.title).setHelpText(ex.lines.join('\n\n')));

    // Part A: one page per finding. Findings 1 to 8 are required; from 8 on, a
    // question leads to the next finding or straight to Part B.
    const pages = [];
    const asks = [];
    for (let n = 1; n <= AUDIT.maxFindings; n++) {
      const required = n <= AUDIT.minFindings;
      const help = n === 1 ? `${D.method[1]}\n\n${D.harm}`
        : required ? null : 'Not required: leave it empty if you change your mind.';
      pages.push(addSection_(form, `Part A · Finding ${n}${required ? ` of at least ${AUDIT.minFindings}` : ''}`, help));
      if (n === 1) form.addSectionHeaderItem().setTitle('Controls you will likely cite').setHelpText(D.cited.join('\n'));
      addFinding_(form, n, required);
      if (n >= AUDIT.minFindings && n < AUDIT.maxFindings) {
        const ask = form.addMultipleChoiceItem().setTitle(`Add finding ${n + 1}?`).setRequired(true);
        if (n === AUDIT.minFindings) ask.setHelpText(`${AUDIT.minFindings} is the minimum. Add more, up to ${AUDIT.maxFindings}, if the records show them.`);
        asks.push(ask);
      }
    }

    // Part B: every account, then the role table.
    const partB = addSection_(form, 'Part B · Access review: every account in Exhibit B',
      `${D.method[2]}\n\nFor each account, tick one decision, or two where it needs both.`);
    const oneOrTwo = FormApp.createCheckboxValidation().setHelpText('Tick one or two decisions.').requireSelectAtMost(2).build();
    D.accounts.forEach((a) => {
      form.addCheckboxItem().setTitle(`${a.row} · ${a.account}`).setHelpText(a.record)
        .setChoiceValues(AUDIT.decisions).setValidation(oneOrTwo).setRequired(true);
      addShort_(form, `${a.row} · ${a.account} · reason, in one line`, null, true);
    });
    addSection_(form, 'Part B · The corrected role table',
      'Correct Exhibit C (page 2) so that it matches your team\'s Module 3 role matrix.');
    form.addCheckboxGridItem().setTitle('Who may do each function?')
      .setHelpText('Tick each role that may do it. Leave a row empty if no role should.')
      .setRows(D.functions).setColumns(D.roles);
    addLong_(form, 'Conditions', 'Where a tick holds only with a condition, write one per line: function · role · condition.', false);
    addLong_(form, 'Separation-of-duties conflicts you removed',
      'One per line: function + function · which role · which rows of Exhibit C.', true);

    // The write-up.
    addSection_(form, 'Write-up (4:10 to 4:30)', D.method[3].replace(/^Write-up \([^)]*\)\.\s*/, ''));
    [1, 2, 3].forEach((rank) => {
      addShort_(form, `Rank ${rank} · finding number and title`, null, true);
      addShort_(form, `Rank ${rank} · why it ranks here`, null, true);
    });
    addLong_(form, 'To Director Eva · 1. What is most urgent', null, true);
    addLong_(form, 'To Director Eva · 2. What it could cost the office', null, true);
    addLong_(form, 'To Director Eva · 3. What you ask her to approve', null, true);
    addLong_(form, 'A note for your resource person (optional)',
      'For example, if connectivity failed and you are submitting in the grace period.', false);

    // The "Add finding n?" questions can point only at pages that exist, so they get their choices last.
    asks.forEach((ask, i) => {
      const next = AUDIT.minFindings + i + 1;
      ask.setChoices([
        ask.createChoice(`Yes, add finding ${next}`, pages[next - 1]),
        ask.createChoice('No, go to Part B', partB),
      ]);
    });

    ensurePublished_(form);
    form.setAcceptingResponses(true);
    return form;
  } catch (e) {
    throw new Error(`Stopped while building "${form.getTitle()}": ${e.message}\n` +
      'Trash that form in Google Drive, then run createAuditForms again.');
  }
}

// The nine columns of the printed findings register, one question each.
function addFinding_(form, n, required) {
  const D = AUDIT_DATA;
  const title = (text) => `Finding ${n} · ${text}`;
  addLong_(form, title('What is wrong, in one plain sentence'), null, required);
  addShort_(form, title('Evidence: exhibit and row'), 'For example "D4". Only what the records show; nothing invented.', required);
  addShort_(form, title('Control it fails'), 'An ISO/IEC 27001:2022 Annex A control, NPC Circular 2023-06, or a section ' +
    'of the Data Privacy Act (RA 10173). The list is on the Finding 1 page.', required);
  form.addScaleItem().setTitle(title('Likelihood')).setBounds(1, 5).setLabels('Rare', 'Almost certain').setRequired(required);
  form.addScaleItem().setTitle(title('Impact')).setBounds(1, 5).setLabels('Minor', 'Severe').setRequired(required);
  form.addMultipleChoiceItem().setTitle(title('Band (likelihood × impact)')).setChoiceValues(AUDIT.bands).setRequired(required);
  addLong_(form, title('Fix'), 'Specific: what to do. If a record suggests harm may already have happened, write ' +
    '"harm may already have happened: tell … today".', required);
  addShort_(form, title('Owner'), `From the RSSO cast: ${D.cast}`, required);
  addShort_(form, title('Target date'), 'Today, or a date.', required);
}

function auditDescription_(run) {
  const D = AUDIT_DATA;
  const intro = D.intro
    .replace('in this file,', 'in the Audit File (Exhibits A to G, also on page 2 of this form),')
    .replace('Everything in this file', 'Everything in the Audit File');
  return [
    SETTINGS.course,
    `Module 4 graded controls audit · 20% of the course grade · individual · ${RUNS[run]} run · ${AUDIT.when[run].day}, 2:50 to 4:30 PM`,
    '',
    intro,
    '',
    'Submit by 4:30 PM. Submit as soon as your findings are in: you can still edit your answers from this ' +
      'link until the form closes. If connectivity fails, the grace period runs until 8:00 AM the next day.',
    '',
    'How it is scored (100 points, scaled to 20%):',
    ...D.rubric.map(([criterion, points, full]) => `· ${criterion}, ${points}: ${full}`),
    '',
    'Privacy: this form records your name and office (as on the attendance sheet) and your answers, for scoring. ' +
      (SETTINGS.oneResponsePerPerson
        ? 'It asks you to sign in to a Google account, so that each person submits once and can edit; your email address is not recorded.'
        : 'It does not require signing in to a Google account.'),
  ].join('\n');
}

function auditLinksLine_(url) {
  const entry = { label: AUDIT.label, url: url, short: url.replace(/^https?:\/\//, ''), note: 'The audit form · one per person · by 4:30 PM · grace period to 8:00 AM' };
  const fields = Object.keys(entry).map((name) => `"${name}": ${JSON.stringify(entry[name])}`);
  return `"${AUDIT.key}": { ${fields.join(', ')} },`;
}

function setAuditAccepting_(run, open) {
  const form = storedForm_(run, AUDIT.key);
  if (!form) {
    console.log(`No audit form for the ${RUNS[run].toLowerCase()} run yet (run createAuditForms).`);
    return;
  }
  if (open) ensurePublished_(form);
  form.setAcceptingResponses(open);
  console.log(`${open ? 'Open' : 'Closed'}: ${form.getTitle()} (${form.getResponses().length} response(s))`);
}

// One response, boiled down for the roster in showAuditSubmissions.
function auditSummary_(response) {
  const D = AUDIT_DATA;
  const answers = {};
  response.getItemResponses().forEach((r) => { answers[r.getItem().getTitle()] = r.getResponse(); });
  const filled = (value) => (Array.isArray(value) ? value.length > 0 : String(value || '').trim() !== '');
  let findings = 0;
  for (let n = 1; n <= AUDIT.maxFindings; n++) {
    if (filled(answers[`Finding ${n} · What is wrong, in one plain sentence`])) findings++;
  }
  const decided = D.accounts.filter((a) => filled(answers[`${a.row} · ${a.account}`]));
  const differs = decided
    .filter((a) => answers[`${a.row} · ${a.account}`].slice().sort().join('+') !== D.keyDecisions[a.row].slice().sort().join('+'))
    .map((a) => a.row);
  return {
    name: String(answers['Your name'] || '(no name)').trim(),
    office: String(answers['Your office'] || '').trim(),
    at: response.getTimestamp(),
    findings: findings,
    reviewed: decided.length,
    differs: differs,
    note: filled(answers['A note for your resource person (optional)']),
  };
}

function checkAuditData_() {
  const D = typeof AUDIT_DATA === 'undefined' ? null : AUDIT_DATA;
  if (!D) throw new Error('AuditData.gs is missing: add it to this project (from source/quiz-forms/AuditData.gs).');
  const problems = [];
  if (D.rules.length !== 5) problems.push(`expected 5 audit rules, found ${D.rules.length}`);
  if (D.method.length !== 4) problems.push(`expected 4 method steps, found ${D.method.length}`);
  if (D.exhibits.length !== 7) problems.push(`expected 7 exhibits, found ${D.exhibits.length}`);
  if (D.accounts.length !== 14) problems.push(`expected 14 accounts, found ${D.accounts.length}`);
  if (!D.functions.length || !D.roles.length) problems.push('the role table has no functions or roles');
  D.accounts.forEach((a) => {
    const key = D.keyDecisions[a.row];
    if (!key || !key.length) problems.push(`${a.row}: no answer key decision`);
    else if (key.some((d) => !AUDIT.decisions.includes(d))) problems.push(`${a.row}: unknown decision "${key.join(', ')}"`);
  });
  D.exhibits.forEach((ex) => {
    const size = ex.lines.join('\n\n').length;
    if (size > 4000) problems.push(`${ex.title} is ${size} characters: too long for one form section`);
  });
  if (problems.length) throw new Error(`AuditData.gs: ${problems.join('; ')}`);
}
