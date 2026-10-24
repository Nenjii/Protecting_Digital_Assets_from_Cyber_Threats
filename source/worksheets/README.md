# Printable worksheets

Word files (.docx), ready to print or edit, for the Day 1 Try it activities and the
graded risk assessment. Wording follows the Module 1 and Module 2 learner guides and
decks (19–20 October 2026); a different answer with a sound reason can also be right.

| File | For | Contents |
|---|---|---|
| `Module 1 Worksheet.docx` | Participants | Try it 1.1A to 1.2.2B, every Check yourself, and Bring it home (process map, readiness mini-check, 30-day commitments) |
| `Module 2 Worksheet.docx` | Participants | Try it 2.1 to 2.3, every Check yourself, and the graded risk assessment's templates (data-flow box, 8-row threat table, blank 5 by 5 matrix, risk register, contribution line, rubric) |
| `Worksheet Answer Key, Modules 1 and 2 (facilitator only).docx` | You only | Model answers for both worksheets. Keep this one away from participants, the same as the Quiz Bank. |
| `Module 3 Workbook.docx` | Each team (Module 3 workshop, 10:45 AM) | The configuration workshop: the zone table, Task A (firewall rule table and the six-connection self-check), Task B (role matrix, MFA policy, joiner/mover/leaver checklists), Task C (six data sets, backup rules), and the peer-evaluation scorecard. Formative: completion is recorded |
| `Module 4 Audit File.docx` | Each participant (Module 4 audit, 2:50 PM) | The graded controls audit (20%): audit rules with a signature line, how to work, Exhibits A to G (fictional records of the RSSO Assistance Portal), and the working pages: findings register (landscape), access review, corrected role table, write-up, cited controls and the rubric |
| `Answer Key, Modules 3 and 4 (facilitator only).docx` | You only | Model answers for the workbook, and for the audit: 28 planted findings with evidence, control, rating, fix, owner and date; the access decision for all 14 accounts; the corrected role table; a model write-up; how to score; the debrief's top five fixes. Keep it away from participants |

Print one `Module 1 Worksheet.docx` and one `Module 2 Worksheet.docx` per participant
(or per team, for the risk-assessment pages at the end of Module 2's), one
`Module 3 Workbook.docx` per team, and one `Module 4 Audit File.docx` per
participant. Online: share an editable copy of each instead (one per team for the
workbook, one per person for the Audit File). US Letter, 0.6in margins.

The Module 3 and 4 documents follow their learner guides (21 October 2026). The
guides describe the workbook and the Audit File but do not include them, so their
records are written for this course: the Audit File's exhibits plant 28 control
gaps, including two records where harm may already have happened (a vendor
account's export at 2:19 AM with logs deleted after, and a redirected payout).

To regenerate after an edit: edit `build/content.mjs` (Day 1) or `build/content-day2.mjs` (Day 2) (the wording, as structured
blocks: headings, questions, tables, checklists, the blank 5 by 5 matrix…), then

```bash
cd build
npm install         # once
npm run build       # writes all six .docx files here, next to this README
npm run build:day2  # only the three Day 2 files (Module 3 workbook, Module 4 Audit File, their key)
```

