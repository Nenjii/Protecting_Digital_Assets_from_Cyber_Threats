// Writes ../../quiz-forms/AuditData.gs from the Module 4 Audit File in
// content-day2.mjs, so the audit form shows exactly the records, rules and
// rubric that are on paper. Run it after any change to the Audit File:
//   npm run build:audit-form
// The answer key's Part B decisions go in too (keyDecisions), for the grading
// aid in Audit.gs: like QuizBank.gs, AuditData.gs is facilitator only.
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DOCS } from './content-day2.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'quiz-forms', 'AuditData.gs');
const DECISIONS = ['Keep', 'Change role', 'Disable', 'Require MFA'];

const docNamed = (name) => {
  const doc = DOCS.find((d) => d.file === name);
  if (!doc) throw new Error(`No document "${name}" in content-day2.mjs`);
  return doc;
};
const plain = (text) => String(text).replace(/\*\*(.+?)\*\*/g, '$1');

// The blocks under the heading that starts with `title`, up to the next heading.
function under(blocks, title) {
  const i = blocks.findIndex((b) => b.h2 && b.h2.startsWith(title));
  if (i < 0) throw new Error(`No heading starting "${title}"`);
  const out = [];
  for (let k = i + 1; k < blocks.length && !blocks[k].h2; k++) out.push(blocks[k]);
  return { title: blocks[i].h2, blocks: out };
}
function tableUnder(blocks, title) {
  const section = under(blocks, title);
  const block = section.blocks.find((b) => b.table);
  if (!block) throw new Error(`No table under "${title}"`);
  return { title: section.title, head: block.table.head, rows: block.table.rows };
}
const parasUnder = (blocks, title) => under(blocks, title).blocks.filter((b) => b.p).map((b) => plain(b.p));
const join_ = (...parts) => parts.filter(Boolean).join(' · ');

// One line per record, in the words of the printed exhibit.
const FORMAT = {
  A: (r) => `${r[0]} · ${r[1]}: ${r[2]}`,
  B: (r) => join_(r[0], r[1], r[2], `role: ${r[3]}`, `MFA: ${r[4]}`, `last sign-in: ${r[5]}`, r[6], r[7]),
  C: (r, head) => join_(r[0], r[1], ...r.slice(2).map((v, i) => `${head[i + 2]}: ${v}`)),
  D: (r) => `${r[0]} · ${r[1]}: ${r[2]}`,
  E: (r) => join_(r[0], r[1], `receives: ${r[2]}`, `agreement on file: ${r[3]}`, r[4] && `note: ${r[4]}`),
  F: (r) => join_(r[0], r[1], `seen by: ${r[2]}`, `shows: ${r[3]}`),
  G: (r) => join_(r[0], r[1], r[2], r[3], `approval or ticket: ${r[4]}`, `source: ${r[5]}`),
};

const audit = docNamed('Module 4 Audit File');
const key = docNamed('Answer Key, Modules 3 and 4 (facilitator only)');
const B = audit.blocks;

const rules = parasUnder(B, 'Audit rules').filter((p) => /^\d\. /.test(p));
const how = parasUnder(B, 'How to work');
const method = how.filter((p) => /^\d\. /.test(p)).map((p) => p.replace(/^\d\. /, ''));
const harm = how.find((p) => p.startsWith('If a record suggests'));
const cast = how.find((p) => p.startsWith('The RSSO cast'));

const exhibits = Object.keys(FORMAT).map((letter) => {
  const t = tableUnder(B, `Exhibit ${letter} ·`);
  return { letter, title: t.title, lines: t.rows.map((r) => FORMAT[letter](r, t.head)) };
});
const exhibitB = tableUnder(B, 'Exhibit B ·').rows;
const accounts = exhibitB.map((r) => ({
  row: r[0],
  account: r[1],
  record: join_(r[2], `role: ${r[3]}`, `MFA: ${r[4]}`, `last sign-in: ${r[5]}`, r[6], r[7]),
}));
const roleTable = tableUnder(B, 'Part B · The corrected role table');
const cited = tableUnder(B, 'Controls you will likely cite').rows;
const rubric = tableUnder(B, 'How it is scored').rows;

// "Change role; require MFA" -> ['Change role', 'Require MFA']; "Disable (today)" -> ['Disable'].
const keyRows = tableUnder(key.blocks, 'Module 4 Audit File · Part B, access review').rows;
const keyDecisions = {};
keyRows.forEach(([row, , decision]) => {
  const picked = DECISIONS.filter((d) => decision.toLowerCase().includes(d.toLowerCase()));
  if (!picked.length) throw new Error(`${row}: cannot read the decision "${decision}"`);
  keyDecisions[row] = picked;
});

const problems = [];
if (rules.length !== 5) problems.push(`expected 5 audit rules, found ${rules.length}`);
if (method.length !== 4) problems.push(`expected 4 method steps, found ${method.length}`);
if (!harm || !cast) problems.push('the "harm" or "cast" paragraph is missing');
if (accounts.length !== 14) problems.push(`expected 14 accounts, found ${accounts.length}`);
accounts.forEach((a) => { if (!keyDecisions[a.row]) problems.push(`${a.row}: no decision in the answer key`); });
if (problems.length) throw new Error(`Audit File content: ${problems.join('; ')}`);

const data = {
  title: audit.title,
  intro: plain(audit.intro),
  meta: audit.meta,
  rules,
  method,
  harm,
  cast: cast.replace(/^The RSSO cast \(possible owners\): /, ''),
  exhibits,
  accounts,
  functions: roleTable.rows.map((r) => r[0]),
  roles: roleTable.head.slice(1),
  cited: cited.map(([ref, what]) => `${ref}: ${what}`),
  rubric,
  keyDecisions,
};

writeFileSync(OUT, `/**
 * GENERATED from source/worksheets/build/content-day2.mjs (the printed Module 4
 * Audit File) by make-audit-gs.mjs. Do not edit it here: change content-day2.mjs,
 * then run "npm run build:audit-form" in source/worksheets/build and paste this
 * file into the Apps Script project again.
 *
 * FACILITATOR ONLY: keyDecisions holds the answer key's Part B decisions.
 */

const AUDIT_DATA = ${JSON.stringify(data, null, 2)};
`);
console.log(`Wrote ${OUT}: ${exhibits.length} exhibits (${exhibits.reduce((n, e) => n + e.lines.length, 0)} records), ${accounts.length} accounts, ${data.functions.length} functions x ${data.roles.length} roles, ${cited.length} controls, ${rubric.length} rubric rows.`);
