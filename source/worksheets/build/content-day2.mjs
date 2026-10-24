// Day 2 printable documents: the Module 3 workbook (team, formative), the
// Module 4 Audit File (individual, graded 20%), and the facilitator answer key
// for both. Written 21 October 2026 from the Module 3 and Module 4 learner
// guides (activities, timings, rubric and cited controls word for word where the
// guides give them). Everything in the RSSO scenario is fictional: the office,
// the people, the accounts, the vendors, the addresses and the records.
//
// Blocks: the same as content.mjs ({h2} {p} {q,n,lines} {table} {checks} {box}
// {fill} {pagebreak}), plus {landscape:true} and {portrait:true} to switch the
// page orientation for the blocks that follow.

const blank = (n) => Array.from({ length: n }, () => '');
const rowsOf = (labels, cols) => labels.map((l) => [l, ...blank(cols - 1)]);
const numbered = (n, cols) => Array.from({ length: n }, (_, i) => [String(i + 1), ...blank(cols - 1)]);

const ROLES = ['Records clerk', 'Supervisor', 'Cashier', 'System administrator'];
const FUNCTIONS = [
  'Encode a new application',
  'View applicant records',
  'Approve an application',
  "Edit an applicant's e-wallet number",
  'Release a payout',
  'Create and disable user accounts',
  'View audit logs',
  'Export applicant data',
];

const SIX_CONNECTIONS = [
  'A citizen opens the Assistance Portal (internet → public zone, HTTPS)',
  'The portal saves a new application (public zone → applicant database)',
  "An internet scan tries the portal's admin page (internet → admin pages)",
  "A visitor's phone on guest Wi-Fi tries the file server (guest Wi-Fi → server zone)",
  'Malware on a staff PC tries the applicant database directly (staff network → database)',
  'The backup server sends data to an unknown address abroad at 2:00 AM (server zone → internet)',
];

const SIX_DATA_SETS = [
  'The applicant database',
  'Scanned IDs and medical certificates',
  'The payout list for the e-wallet provider',
  'The nightly backup',
  'Staff records and leave files',
  "The portal's public pages",
];

const ZONES = [
  ['Public zone (DMZ)', "The Assistance Portal's web server", 'The applicant database, through one approved connection only'],
  ['Server zone', 'Applicant database, file server, backup server', 'Approved update sites only; nothing else on the internet'],
  ['Staff network', 'Staff computers (Ben, Dan, Sol)', 'The portal and the file server, not the database directly'],
  ['Admin network', "Ana's admin workstation", 'Admin pages and servers'],
  ['Guest Wi-Fi', "Visitors' phones", 'The internet only'],
  ['Cameras and devices', 'CCTV, printers, smart devices', 'Their own recorder or service only'],
  ['Remote access (VPN)', 'Staff working from home, with MFA', 'Only what each person\'s role needs'],
];

// ---------- the Audit File's records (also used by the answer key) ----------

const EXHIBIT_A = [
  ['A1', 'System', 'RSSO Assistance Portal, at assist.rsso-q.example (fictional)'],
  ['A2', 'Purpose', 'Citizens apply online for medical, burial and educational assistance. Staff encode, check and approve applications, and payouts go to applicants\' e-wallets.'],
  ['A3', 'Data held', 'About 48,000 applicants: names, home addresses, birthdates, mobile numbers, government ID numbers, scanned IDs, medical certificates (health information), household income and e-wallet numbers.'],
  ['A4', 'Who owns it', 'Director Eva, head of office (system owner). Ana, IT officer (system administrator). Carla, Data Protection Officer.'],
  ['A5', 'Users', '14 accounts (Exhibit B). Staff work in the office, in the field, and from home through the VPN.'],
  ['A6', 'Where it runs', 'The web server sits in the public zone (DMZ). The applicant database and the backup server sit in the office server room.'],
  ['A7', 'Who built it', 'Bayani Systems (a fictional vendor), under a development and support contract that ended on 31 August 2026. Since then, support is "as needed".'],
  ['A8', 'Go-live and testing', 'Went live in March 2024. Security testing before go-live: none on record. Security testing since: none on record.'],
  ['A9', 'Connections', 'An SMS vendor sends status texts to applicants; an e-wallet provider receives approved payouts (Exhibit E).'],
  ['A10', 'Volume in 2026', 'About 9,600 applications approved and PHP 31 million paid out, January to September.'],
];

const EXHIBIT_B = [
  ['B1', 'ana', 'Ana, IT officer', 'System administrator', 'SMS code', '21 Oct, 08:05', 'Active', 'One account for email, daily work and admin work'],
  ['B2', 'ben', 'Ben, records clerk', 'Records clerk', 'Off', '21 Oct, 09:12', 'Active', ''],
  ['B3', 'luz', 'Luz, supervisor', 'Supervisor; Records clerk', 'Off', '21 Oct, 10:40', 'Active', 'Promoted from records clerk on 4 Aug 2026 (G1)'],
  ['B4', 'dan', 'Dan, cashier', 'Cashier', 'App', '20 Oct, 16:55', 'Active', ''],
  ['B5', 'sol', 'Sol, social worker', 'Records clerk', 'Off', '19 Oct, 14:02', 'Active', 'Works in the field; signs in from home through the VPN'],
  ['B6', 'carla', 'Carla, DPO', 'Auditor', 'App', '15 Oct, 11:20', 'Active', 'Reads the audit logs'],
  ['B7', 'eva', 'Director Eva', 'System administrator', 'Off', '2 Mar 2026, 09:00', 'Active', '"So the director can see everything"'],
  ['B8', 'frontdesk', 'Three frontline staff', 'Records clerk', 'Off', '21 Oct, 08:31', 'Active', 'One login for the front desk; its password is on a note under the keyboard'],
  ['B9', 'admin', 'Generic (no named person)', 'System administrator', 'Off', '14 Oct, 02:31', 'Active', 'Created at go-live; Bayani Systems also knows the password'],
  ['B10', 'bayani.support', 'Vendor, Bayani Systems', 'System administrator', 'Off', '14 Oct, 02:14', 'Active', 'Vendor support account (contract ended 31 Aug 2026, A7)'],
  ['B11', 'rex', 'Rex, former records clerk', 'Records clerk', 'Off', '30 Jun 2026, 16:47', 'Active', 'Resigned; last working day 30 June 2026'],
  ['B12', 'mara', 'Mara, job-order clerk', 'Records clerk', 'Off', '21 Oct, 08:58', 'Active', 'Started 1 Sep 2026; no security clearance on file with the DPO'],
  ['B13', 'test1', 'Test account', 'Supervisor', 'Off', 'Never', 'Active', 'Created at go-live for testing; password unchanged'],
  ['B14', 'sms-link', "SMS vendor's system link", 'Export applicant data', 'Not applicable', 'Every 5 minutes', 'Active', 'Pulls applicant records to send status texts (E1, F5)'],
];

// Exhibit C: what each role can do today.
const EXHIBIT_C = [
  ['C1', 'Encode a new application', 'Yes', 'Yes', 'No', 'Yes', 'No'],
  ['C2', 'View applicant records', 'All records', 'All records', 'All records, including medical certificates', 'All records', 'No'],
  ['C3', 'Approve an application', 'Yes (added January 2026 "to speed up approvals")', 'Yes', 'No', 'Yes', 'No'],
  ['C4', "Edit an applicant's e-wallet number", 'Yes (no call-back check)', 'No', 'Yes', 'Yes', 'No'],
  ['C5', 'Release a payout', 'No', 'Yes', 'Yes', 'Yes', 'No'],
  ['C6', 'Create and disable user accounts', 'No', 'No', 'No', 'Yes (no approval step)', 'No'],
  ['C7', 'View audit logs', 'No', 'No', 'No', 'Yes, and can delete entries', 'Yes (read only)'],
  ['C8', 'Export applicant data', 'Yes', 'Yes', 'No', 'Yes', 'No'],
];

const EXHIBIT_D = [
  ['D1', 'Password rule', 'At least 8 characters with one symbol; changed every 30 days; no check against passwords known from breaches.'],
  ['D2', 'Multi-factor authentication', 'Optional for every account. In use on 3 of 14 accounts (B1 by SMS code; B4 and B6 by app).'],
  ['D3', 'Failed sign-ins', 'Unlimited attempts; no lockout and no delay.'],
  ['D4', 'Remote access (VPN)', 'Password only; MFA is available on the VPN but not switched on.'],
  ['D5', 'Audit log', 'On. Kept on the portal\'s own server for 30 days. System administrator accounts can delete entries (C7).'],
  ['D6', 'Log review', 'Last review recorded: 12 March 2026.'],
  ['D7', 'Portal software', 'Version 2.3. The vendor\'s update 2.4 (2 September 2026) fixes a weakness listed in CISA\'s Known Exploited Vulnerabilities catalog. Not installed: "waiting for downtime approval" (G3).'],
  ['D8', 'Endpoint protection, portal server', 'Licence expired on 30 September 2026. No updates since.'],
  ['D9', 'Backups', 'Every night, to a USB drive kept in the server room, beside the server. Not encrypted. Restore test: never. Last three nights failed (G13).'],
  ['D10', 'Encryption', 'The database is not encrypted. The portal accepts TLS 1.0, 1.1 and 1.2. Its certificate expires on 30 October 2026.'],
  ['D11', 'Admin pages', 'Firewall rule: admin pages answer on the admin network only.'],
  ['D12', 'Privacy notice', 'The online application form shows no privacy notice. It also asks for religion and the names of all household members "for statistics"; no report uses them.'],
  ['D13', 'Retention', 'Every application since March 2024 is kept, including rejected ones. There is no deletion schedule.'],
  ['D14', 'Security policy', 'Access control policy: draft, not approved. Password policy: none. Business continuity plan: none.'],
];

const EXHIBIT_E = [
  ['E1', 'SMS vendor (fictional)', 'Through the system link B14: the full applicant record for each status text (F5)', 'Data processing agreement, signed 2024, valid to 2027. Its scope: "applicant name, mobile number and application status only"', ''],
  ['E2', 'E-wallet provider (fictional)', 'Approved payout lists (names, e-wallet numbers, amounts), uploaded to its business portal over HTTPS', 'Agreement signed, valid', 'One payout file was emailed as an attachment on 2 Oct (G7)'],
  ['E3', 'Bayani Systems (fictional developer)', 'Built and supported the portal; remote access through account B10', 'Development contract, ended 31 Aug 2026. No data processing agreement on file. No report of security testing', 'Account B10 still active'],
  ['E4', 'A free online form builder', 'An applicant feedback survey: names, mobile numbers, application numbers and comments (about 1,900 responses)', 'None. Not on any approved list', 'Set up by a staff member in July 2026 "because it was quick"'],
];

const EXHIBIT_F = [
  ['F1', '"Applicant search" screen', 'Records clerks (B2, B3, B5, B8, B11, B12)', 'Search all 48,000 applicants by name. Each result shows the full government ID number, birthdate and medical diagnosis.'],
  ['F2', '"Payout" screen', 'Cashier (B4)', 'Payout details, plus a link to each applicant\'s medical certificate.'],
  ['F3', 'Public page "Check my application"', 'Anyone on the internet', 'Enter an application number (they run in order: A-20931, A-20932 …) to see the applicant\'s name, home address and approved amount. No other check.'],
  ['F4', 'Monthly report "Approved applicants"', 'Emailed to all 30 staff as a spreadsheet', 'Full names, home addresses, mobile numbers and amounts of every approved applicant that month.'],
  ['F5', 'Sample of what the SMS link sends (B14)', "SMS vendor's system", 'Name, mobile number, home address, government ID number, diagnosis and application status, for each text.'],
];

const EXHIBIT_G = [
  ['G1', '2026-08-04 09:15', 'ana', 'Added the Supervisor role to luz; kept her Records clerk role "for the transition"', 'None', 'Audit log'],
  ['G2', '2026-08-31 17:00', '—', 'Bayani Systems contract ends', 'No account change recorded', 'Contract file'],
  ['G3', '2026-09-02 10:00', '—', 'Vendor notice: update 2.4 available; fixes a known-exploited weakness', 'Not installed (D7)', 'Email'],
  ['G4', '2026-09-15 14:22', 'ana', 'Firewall: added "allow internet to admin pages, temporary, for vendor support"', 'None; not removed since', 'Firewall log'],
  ['G5', '2026-10-02 10:14', 'dan', 'Changed the e-wallet number of applicant A-21507 from EW-0417 to EW-9911', 'No call-back recorded', 'Audit log'],
  ['G6', '2026-10-02 10:21', 'dan', 'Released the payout for A-21507, PHP 15,000, to EW-9911', '—', 'Audit log'],
  ['G7', '2026-10-02 11:03', 'dan', 'Emailed "payouts-oct2.xlsx" to the e-wallet provider: "the portal is slow today"', '—', 'Mail log'],
  ['G8', '2026-10-14 02:14', 'bayani.support', 'Signed in through the VPN from an address outside the Philippines', '—', 'VPN log'],
  ['G9', '2026-10-14 02:19', 'bayani.support', 'Export all applicants (CSV): 48,112 rows', '—', 'Export register'],
  ['G10', '2026-10-14 02:31', 'admin', 'Deleted 214 audit log entries dated 14 Oct, 02:00 to 02:30', '—', 'Audit log'],
  ['G11', '2026-10-16 10:02', 'luz', 'Encoded application A-21733', '—', 'Audit log'],
  ['G12', '2026-10-16 10:05', 'luz', 'Approved application A-21733', '—', 'Audit log'],
  ['G13', '2026-10-18 to 20, 01:00', 'backup job', '"Backup failed: disk full", three nights in a row', 'No follow-up recorded', 'Backup log'],
  ['G14', '2026-10-19 16:40', 'frontdesk', 'Exported "today\'s applicants" (37 rows) to a USB drive', '—', 'Export register'],
];

const CITED = [
  ['ISO 5.3', 'Segregation of duties'],
  ['ISO 5.15 to 5.18', 'Access control, identity management, authentication information, access rights'],
  ['ISO 5.19 and 5.20', 'Supplier relationships, and security in supplier agreements'],
  ['ISO 6.5', 'Responsibilities after termination or change of employment'],
  ['ISO 8.2 and 8.5', 'Privileged access rights; secure authentication'],
  ['ISO 8.7, 8.8', 'Protection against malware; management of technical vulnerabilities'],
  ['ISO 8.11', 'Data masking'],
  ['ISO 8.13', 'Information backup'],
  ['ISO 8.15', 'Logging'],
  ['ISO 8.24', 'Use of cryptography'],
  ['ISO 8.32', 'Change management'],
  ['NPC Circular 2023-06', 'Access control policy; known, properly configured devices; password policy; MFA for online access to sensitive personal information; security logs kept; encrypted removable media; business continuity with testing'],
  ['RA 10173 Sec 11', 'Principles: data adequate and not excessive (d); kept only as long as necessary (e)'],
  ['RA 10173 Secs 14, 21(a)', 'The office stays responsible for data processed by others, and protects it by contract'],
  ['RA 10173 Sec 16(b)', 'Data subjects told what is collected, why, by whom, and for how long, before processing'],
];

const RUBRIC = [
  ['Findings', '40', 'At least 8 valid findings, each with exhibit-and-row evidence; nothing invented'],
  ['Analysis', '25', 'Correct control references; likelihood and impact rated consistently and justified; top three ranked sensibly'],
  ['Access-control management', '20', 'A sound decision and reason for every account; a corrected role table with the conflicts removed'],
  ['Remediation and clarity', '15', 'Specific fixes, each with an owner and a date; a clear three-sentence summary for the head'],
];

// ---------- the answer key's model findings ----------

const FINDINGS = [
  ['1', "A vendor account still has administrator rights seven weeks after the contract ended, and was used at 2:14 AM to export every applicant's record", 'B10, A7, E3, G2, G8, G9', 'ISO 5.18, 6.5; RA 10173 Secs 14, 21(a)', '5', '5', '25 Critical', 'Disable B10 today; keep the logs; investigate with the vendor', 'Ana; tell Carla and Director Eva today', 'Today'],
  ['2', 'Administrators can delete audit log entries, and 214 entries were deleted 12 minutes after the export', 'C7, D5, G10', 'ISO 8.15; NPC Circular 2023-06 (security logs kept)', '4', '5', '20 Critical', 'Send logs to a store admins cannot change; keep at least 12 months; read-only log access', 'Ana', '30 Oct'],
  ['3', 'A generic administrator account, MFA off, whose password the vendor knows', 'B9, G10', 'ISO 5.16, 8.2', '4', '5', '20 Critical', 'Disable it; named admin accounts only, with security keys', 'Ana', 'Today'],
  ['4', 'A security update for a known-exploited weakness has waited seven weeks for downtime approval', 'D7, G3', 'ISO 8.8', '5', '5', '25 Critical', 'Approve downtime and install 2.4 this week', 'Director Eva approves; Ana installs', '24 Oct'],
  ['5', 'MFA is optional and used on 3 of 14 accounts; the VPN takes a password only', 'D2, D4, B2 to B14', 'NPC Circular 2023-06 (MFA for online access to sensitive personal information); ISO 8.5', '4', '4', '16 High', 'MFA required for every account, VPN first; security keys for admins', 'Ana', '6 Nov'],
  ['6', 'Role table lets one person encode and approve, change an e-wallet number and release the payout, and run accounts while approving and paying', 'C1, C3, C4, C5, C6', 'ISO 5.3, 5.15', '4', '4', '16 High', 'Correct the role table to the Module 3 matrix', 'Ana, approved by Director Eva', '30 Oct'],
  ['7', 'The same person changed an e-wallet number and released PHP 15,000 to it seven minutes later, with no call-back', 'G5, G6, C4, C5', 'ISO 5.3', '4', '4', '16 High', 'Call the applicant on a number already on file today; freeze EW-9911 payouts; call-back rule before any change', 'Director Eva and Carla today; Dan', 'Today'],
  ['8', 'A promoted clerk kept her clerk role and then encoded and approved the same application', 'B3, G1, G11, G12', 'ISO 5.18, 5.3', '4', '4', '16 High', 'Remove the clerk role; review A-21733; mover step on the day of any transfer', 'Ana; Luz\'s supervisor reviews', '23 Oct'],
  ['9', 'Backups are unencrypted, kept beside the server, never restored, and failing for three nights unnoticed', 'D9, G13', 'ISO 8.13; NPC Circular 2023-06 (business continuity with testing)', '4', '4', '16 High', 'Encrypted backups with one offline copy off-site; fix the job; restore test every month', 'Ana', '6 Nov'],
  ['10', 'A public page shows any applicant\'s name, address and amount to anyone who types an application number', 'F3', 'ISO 5.15, 8.11; RA 10173 Sec 11(d)', '4', '4', '16 High', 'Show status only, after a one-time code to the applicant\'s own mobile number', 'Ana with the vendor', '13 Nov'],
  ['11', 'An unapproved "temporary" firewall rule opened the admin pages to the internet and was never removed', 'G4, D11', 'ISO 8.32', '4', '4', '16 High', 'Remove the rule today; every change needs a ticket and an approver', 'Ana; Director Eva approves changes', 'Today'],
  ['12', 'The SMS vendor receives full applicant records, including ID numbers and diagnoses, beyond its agreement', 'B14, E1, F5', 'RA 10173 Secs 11(d), 14, 21(a); ISO 5.20', '3', '4', '12 High', 'Send name, mobile number and status only; tell the vendor to delete the rest', 'Ana; Carla checks the agreement', '30 Oct'],
  ['13', 'Screens show every applicant\'s full ID number and diagnosis to every clerk, and medical certificates to the cashier', 'F1, F2, C2', 'ISO 8.11, 5.15; RA 10173 Sec 11(d)', '4', '3', '12 High', 'Assigned cases only; mask ID numbers; payout details only for the cashier', 'Ana with the vendor', '13 Nov'],
  ['14', 'A shared front-desk login, its password on a note, used to copy applicant data to a USB drive', 'B8, G14', 'ISO 5.16, 5.17; NPC Circular 2023-06 (encrypted removable media)', '4', '3', '12 High', 'Disable it; named accounts for the three staff; office-issued encrypted USB only', 'Ana; Ben\'s supervisor', '23 Oct'],
  ['15', 'Endpoint protection on the portal server lapsed on 30 September', 'D8', 'ISO 8.7', '3', '4', '12 High', 'Renew today; renew licences before they lapse', 'Ana; Director Eva approves', '23 Oct'],
  ['16', 'A former clerk\'s account is still active almost four months after the clerk left', 'B11', 'ISO 5.18, 6.5', '3', '4', '12 High', 'Disable it; leaver step on the last day', 'Ana', 'Today'],
  ['17', 'Old TLS versions are on, the certificate expires on 30 October, and the database is not encrypted', 'D10', 'ISO 8.24', '3', '4', '12 High', 'TLS 1.2 or 1.3 only; renew the certificate; encrypt the database, keys kept apart', 'Ana', '29 Oct'],
  ['18', 'The developer had no data processing agreement and gave no proof of security testing before go-live', 'E3, A8', 'ISO 5.19, 5.20; RA 10173 Secs 14, 21(a)', '3', '3', '9 Medium', 'Agreement before any further access; security test the portal (for example against the OWASP Top 10)', 'Director Eva; Carla', '30 Nov'],
  ['19', 'A free form builder holds 1,900 applicants\' names and numbers with no agreement', 'E4', 'RA 10173 Secs 14, 21(a)', '3', '3', '9 Medium', 'Stop using it; move to an approved tool; delete the data there; Carla decides if it is a breach', 'Carla', '30 Oct'],
  ['20', 'The application form has no privacy notice and collects fields nobody uses', 'D12', 'RA 10173 Secs 16(b), 11(d)', '3', '3', '9 Medium', 'Add a privacy notice; remove religion and household names', 'Carla with Ana', '30 Nov'],
  ['21', 'Weak password rule and unlimited sign-in attempts', 'D1, D3, D14', 'ISO 5.17, 8.5; NPC Circular 2023-06 (password policy)', '3', '3', '9 Medium', 'Passphrases, a breached-password check, a limit on attempts; approve a password policy', 'Ana; Director Eva approves', '30 Nov'],
  ['22', 'The payout file left by email attachment', 'G7, E2', 'NPC Circular 2023-06 (secure transmission of emails with personal data)', '3', '3', '9 Medium', 'Business portal only; if email cannot be avoided, encrypt and send the password another way', 'Dan', '23 Oct'],
  ['23', 'The monthly report of approved applicants goes to all staff', 'F4', 'ISO 5.15; RA 10173 Sec 11(d)', '3', '3', '9 Medium', 'Send totals only; full list to those who need it', 'Ana; Director Eva', '30 Oct'],
  ['24', 'The director has a dormant administrator account; the IT officer uses one account for email and admin work', 'B7, B1', 'ISO 8.2', '3', '3', '9 Medium', 'Remove admin rights from B7; separate admin account for Ana with a security key', 'Ana', '30 Oct'],
  ['25', 'No log review for seven months; access policy still a draft', 'D6, D14', 'ISO 8.15; NPC Circular 2023-06 (access control policy)', '3', '3', '9 Medium', 'Weekly log review by a named person; approve the access control policy', 'Ana; Director Eva', '30 Nov'],
  ['26', 'A job-order clerk has access with no security clearance on file', 'B12', 'NPC Circular 2023-06 (security clearance filed with the DPO)', '2', '3', '6 Medium', 'File the clearance with the DPO before access continues; MFA', 'Carla', '23 Oct'],
  ['27', 'A test account from go-live is still active with its first password', 'B13', 'ISO 5.18', '2', '3', '6 Medium', 'Disable it', 'Ana', 'Today'],
  ['28', 'Every application is kept forever, including rejected ones', 'D13', 'RA 10173 Sec 11(e)', '2', '3', '6 Medium', 'Set and apply a retention schedule', 'Carla', '30 Nov'],
];

const ACCESS_REVIEW = [
  ['B1', 'ana', 'Change role; require MFA (security key)', 'Admin work from a separate admin account only; SMS codes are not phishing-resistant'],
  ['B2', 'ben', 'Require MFA', 'Role fits the job; MFA is off'],
  ['B3', 'luz', 'Change role; require MFA', 'Remove the records clerk role (mover step); she encoded and approved A-21733'],
  ['B4', 'dan', 'Keep', 'Cashier role and MFA fit; the role table must stop cashiers editing e-wallet numbers (C4)'],
  ['B5', 'sol', 'Require MFA', 'Signs in from home through the VPN with a password only'],
  ['B6', 'carla', 'Keep', 'Read-only log access with MFA is what the DPO needs'],
  ['B7', 'eva', 'Change role; require MFA', 'A head of office needs reports, not administrator rights; dormant since March'],
  ['B8', 'frontdesk', 'Disable', 'Shared account: nobody is accountable; give each person a named account'],
  ['B9', 'admin', 'Disable', 'Generic administrator account that the vendor knows; used at 02:31 to delete logs'],
  ['B10', 'bayani.support', 'Disable (today)', 'Contract ended 31 August; used at 02:14 to export 48,112 records'],
  ['B11', 'rex', 'Disable', 'Left on 30 June: leaver step not done'],
  ['B12', 'mara', 'Require MFA', 'Role fits; file her security clearance with the DPO before access continues'],
  ['B13', 'test1', 'Disable', 'Test account, never used, first password'],
  ['B14', 'sms-link', 'Change role', 'Send name, mobile number and status only, as the agreement says (E1)'],
];

const MODEL_ROLES = [
  ['Encode a new application', 'Yes', 'No', 'No', 'No'],
  ['View applicant records', 'Assigned cases', 'Yes', 'Payout details only', 'No'],
  ['Approve an application', 'No', 'Yes', 'No', 'No'],
  ["Edit an applicant's e-wallet number", 'Yes, after a call-back check', 'No', 'No', 'No'],
  ['Release a payout', 'No', 'No', 'Yes', 'No'],
  ['Create and disable user accounts', 'No', 'No', 'No', 'Yes, approved by the head of office'],
  ['View audit logs', 'No', 'Read only', 'No', 'Read only; the DPO also reads them'],
  ['Export applicant data', 'No', 'With written approval', 'No', 'No'],
];

export const DOCS = [
  // ======================= Module 3 workbook =======================
  {
    file: 'Module 3 Workbook',
    header: 'Protecting Digital Assets from Cyber Threats · Module 3 Workbook',
    title: 'Module 3 Workbook: Configuration Workshop',
    meta: 'Day 2, 10:45 to 11:45 AM · formative, completion recorded · face-to-face Thursday 22 October 2026 · online Tuesday 27 October 2026',
    intro: 'Your team hardens the fictional RSSO Assistance Portal on paper, using this morning\'s controls. No command line is needed. Nothing is scored: completion is recorded. Start each task from your Day 1 risk register: which of your risks does this control treat? Everything here is fictional; never write real systems, names or addresses from your office.',
    blocks: [
      { h2: 'Your team' },
      { table: { widths: [30, 70], head: ['Team name', 'Members and today\'s roles (facilitator, scribe, timekeeper, reviewer)'], rows: [blank(2)], minH: 0.9 } },
      { h2: 'The brief (5 minutes)' },
      { p: 'The RSSO network has six zones behind one firewall, plus the internet and remote staff. Every connection between zones passes the firewall\'s rules.' },
      { table: { widths: [24, 36, 40], head: ['Zone', 'What sits there', 'May reach'], rows: ZONES, fs: 9 } },
      { table: { widths: [18, 8, 46, 28], head: ['Part', 'Minutes', 'What your team does', 'Output in this workbook'], fs: 9, rows: [
        ['Brief', '5', 'Read the network and the three tasks', 'None'],
        ['Task A, perimeter', '15', 'Write firewall rules with a default-deny stance, then test them against six sample connections', 'Rule table and self-check'],
        ['Task B, access', '15', 'Give four roles their functions, set the MFA policy, and list the joiner, mover and leaver steps', 'Role matrix, MFA policy, three checklists'],
        ['Task C, data protection', '15', 'Classify six data sets, choose protection when stored and moving, name a key custodian, and set backup rules', 'Data protection table and backup rules'],
        ['Peer evaluation', '10', 'Swap workbooks with another team and score each control from 1 to 3', 'Scorecard with the gap left'],
      ] } },
      { p: '**Tips:** in mixed teams, non-IT members often know best who should see what (Task B), and IT members help word the rules (Task A). The usual mistakes: "allow any" rules, shared admin accounts, and backups that were never restored.' },

      { pagebreak: true },
      { h2: 'Task A, perimeter (15 minutes)' },
      { p: '**Rules that work: deny by default, allow by need, log what you block.** 1. Start from "block everything". 2. Add specific allows: who, to what, using which service. 3. Order matters: the firewall acts on the first rule that matches. 4. Log what is blocked, and have someone review the logs. 5. Filter outbound traffic too.' },
      { table: { widths: [5, 11, 16, 16, 14, 38], head: ['#', 'Allow or deny', 'From', 'To', 'Service', 'Why: which need, or which Day 1 risk it treats'], minH: 0.42, fs: 9,
        rows: [...numbered(9, 6), ['Last', 'Deny', 'Anything', 'Anything', 'Any', 'Default deny: everything no rule allows; every block is logged']] } },
      { p: '**Self-check:** test each connection against your rules, from the top. Which rule decides?' },
      { table: { widths: [5, 47, 14, 16, 18], head: ['#', 'Sample connection', 'Rule that decides', 'Allowed or blocked?', 'As intended? If not, fix'], minH: 0.48, fs: 9,
        rows: SIX_CONNECTIONS.map((c, i) => [String(i + 1), c, '', '', '']) } },

      { pagebreak: true },
      { h2: 'Task B, access (15 minutes)' },
      { p: '**Role matrix (6 minutes).** For each function, write which role gets it: Yes, No, or a condition (for example "assigned cases", "read only", "with written approval"). Then list each separation-of-duties conflict your matrix avoids.' },
      { table: { widths: [32, 17, 17, 17, 17], head: ['Function', ...ROLES], rows: FUNCTIONS.map((f) => [f, ...blank(4)]), minH: 0.42, fs: 9 } },
      { q: 'Conflicts our matrix avoids (no one person may do both):', n: 1, lines: 3 },
      { p: '**MFA policy (4 minutes).**' },
      { table: { widths: [34, 66], head: ['Question', 'Our policy'], minH: 0.5, fs: 9, rows: [
        ['Which accounts get MFA first?', ''],
        ['Which method, for whom? (SMS code, app, push with number matching, security key)', ''],
        ['What do staff do with a sign-in prompt they did not start?', ''],
      ] } },
      { p: '**Joiner, mover, leaver (5 minutes).** The steps, including contract-of-service and job-order staff and consultants: who asks, who approves, what IT does, and by when.' },
      { table: { widths: [33, 33, 34], head: ['Joiner (first day)', 'Mover (day of the transfer)', 'Leaver (last day)'], rows: Array.from({ length: 5 }, () => blank(3)), minH: 0.45, fs: 9 } },

      { pagebreak: true },
      { h2: 'Task C, data protection (15 minutes)' },
      { p: 'Classify each data set (public, internal, personal, or sensitive personal), choose its protection when stored and when moving, and name who holds the key. **Moving, stored, keys.**' },
      { table: { widths: [24, 16, 20, 20, 20], head: ['Data set', 'Classification', 'Stored (at rest)', 'Moving (in transit)', 'Key custodian'], rows: SIX_DATA_SETS.map((d) => [d, ...blank(4)]), minH: 0.62, fs: 9 } },
      { p: '**Backup rules.** A backup that was never restored is a hope, not a backup.' },
      { table: { widths: [36, 64], head: ['Question', 'Our rule'], minH: 0.45, fs: 9, rows: [
        ['How often is it backed up?', ''],
        ['Is the backup encrypted? Who holds the key?', ''],
        ['Where is the offline copy kept?', ''],
        ['How often is a restore tested, and who checks it?', ''],
        ['Who is told if a backup fails?', ''],
      ] } },

      { pagebreak: true },
      { h2: 'Peer evaluation (10 minutes)' },
      { p: 'Swap workbooks with another team. Score each control: **3** covers the risk; **2** partly covers it; **1** leaves a gap. For every 1 or 2, write down the gap that is left: what could an attacker, or a mistake, still do?' },
      { table: { widths: [36, 10, 54], head: ['Control', 'Score (1 to 3)', 'The gap that is left'], minH: 0.45, fs: 9, rows: [
        ['Task A: default deny and specific allows', '', ''],
        ['Task A: zones kept apart (guests, devices, staff, servers)', '', ''],
        ['Task A: outbound filtering and logging', '', ''],
        ['Task B: role matrix and separation of duties', '', ''],
        ['Task B: MFA policy', '', ''],
        ['Task B: joiner, mover, leaver steps', '', ''],
        ['Task C: classification of the six data sets', '', ''],
        ['Task C: protection when stored', '', ''],
        ['Task C: protection when moving', '', ''],
        ['Task C: key custodian and key storage', '', ''],
        ['Task C: backup rules', '', ''],
      ] } },
      { table: { widths: [50, 50], head: ['Scored by (team name)', 'Completed (facilitator\'s initials and time)'], rows: [blank(2)], minH: 0.5 } },
    ],
  },

  // ======================= Module 4 Audit File =======================
  {
    file: 'Module 4 Audit File',
    header: 'Protecting Digital Assets from Cyber Threats · Module 4 Audit File · fictional records',
    title: 'Module 4 Audit File: The RSSO Assistance Portal',
    meta: 'Graded controls audit, 20% · individual · Day 2 afternoon, 2:50 to 4:30 PM · face-to-face Thursday 22 October 2026 · online Tuesday 27 October 2026',
    intro: 'You are the RSSO\'s internal reviewer. Using only the records in this file, find where the portal\'s controls fall short, rate each finding, and correct who can do what. Nobody tests or signs in to any system: the evidence is all on paper. **Everything in this file is fictional: the office, the people, the accounts, the vendors, the addresses and the records.**',
    blocks: [
      { h2: 'Audit rules: read and acknowledge before you start' },
      { p: '1. Work only from this Audit File. Everything in it is fictional.' },
      { p: '2. Do not scan, probe or sign in to any real system, including your own office\'s. Accessing a computer system without right is illegal access under the Cybercrime Prevention Act (RA 10175, Section 4(a)(1)), so scope is a legal line, not a courtesy.' },
      { p: '3. Never add real names, accounts or data to your findings.' },
      { p: '4. Work on your own. You may ask the facilitator about the rules or the records, not for answers.' },
      { p: '5. Submit through the submission link by 4:30 PM. If connectivity fails, the grace period runs until 8:00 AM the next day.' },
      { table: { widths: [40, 30, 30], head: ['I have read and will follow the five audit rules (name)', 'Signature', 'Date'], rows: [blank(3)], minH: 0.55 } },
      { h2: 'How to work: evidence, control, fix' },
      { p: '**Answer in the audit form** (QR code on the screen; one per person). It holds these same records, then one page per finding, Part B and the write-up. The tables at the back of this file are for drafting on paper if you like.' },
      { p: '1. **Read Exhibit A first** (5 minutes). Know what is at stake before you judge anything.' },
      { p: '2. **Part A, findings** (about 35 minutes). Go through Exhibits B to G and record at least 8 findings. For each: what is wrong, in one plain sentence; the evidence (exhibit and row, for example "D4"); the control it fails (an ISO/IEC 27001:2022 Annex A control, NPC Circular 2023-06, or a section of the Data Privacy Act); likelihood and impact from 1 to 5, the score, and its band (Low 1 to 4, Medium 5 to 9, High 10 to 16, Critical 20 to 25); the fix, an owner from the RSSO cast, and a target date.' },
      { p: '3. **Part B, access review** (about 20 minutes). For every account in Exhibit B, decide: keep, change role, disable, or require MFA, with a one-line reason. One account may need two decisions. Then correct the role table in Exhibit C so that it matches your Module 3 role matrix, and list each separation-of-duties conflict you removed.' },
      { p: '4. **Write-up** (4:10 to 4:30). Rank your top three findings and write three sentences to Director Eva: what is most urgent, what it could cost the office, and what you ask her to approve.' },
      { p: '**If a record suggests that something harmful may already have happened, say so in your finding and name who must be told today. Spotting that is part of the audit.**' },
      { p: '**The RSSO cast (possible owners):** Director Eva, head of office; Carla, DPO and legal officer; Ana, IT officer; Ben, records clerk; Dan, cashier; Sol, social worker.' },

      { pagebreak: true },
      { h2: 'Exhibit A · System profile' },
      { table: { widths: [7, 20, 73], head: ['Row', 'Item', 'Record'], rows: EXHIBIT_A, fs: 9 } },
      { h2: 'Exhibit B · User accounts (as of 21 October 2026)' },
      { table: { widths: [6, 13, 16, 16, 9, 12, 8, 20], head: ['Row', 'Account', 'Person', 'Role(s)', 'MFA', 'Last sign-in', 'Status', 'Note'], rows: EXHIBIT_B, fs: 8 } },

      { pagebreak: true },
      { h2: 'Exhibit C · Roles and permissions: what each role can do today' },
      { table: { widths: [6, 22, 16, 13, 15, 16, 12], head: ['Row', 'Function', 'Records clerk', 'Supervisor', 'Cashier', 'System administrator', 'Auditor'], rows: EXHIBIT_C, fs: 9 } },
      { h2: 'Exhibit D · Security settings and records' },
      { table: { widths: [7, 24, 69], head: ['Row', 'Setting or record', 'What the record shows'], rows: EXHIBIT_D, fs: 9 } },

      { pagebreak: true },
      { h2: 'Exhibit E · Vendors and agreements' },
      { table: { widths: [6, 18, 30, 28, 18], head: ['Row', 'Vendor or service', 'What it receives', 'Agreement on file', 'Note'], rows: EXHIBIT_E, fs: 9 } },
      { h2: 'Exhibit F · Screens and reports' },
      { table: { widths: [6, 24, 22, 48], head: ['Row', 'Screen or report', 'Who sees it', 'What it shows'], rows: EXHIBIT_F, fs: 9 } },
      { h2: 'Exhibit G · Change and activity log' },
      { table: { widths: [6, 15, 13, 38, 16, 12], head: ['Row', 'Date and time', 'Account', 'Action', 'Approval or ticket', 'Source'], rows: EXHIBIT_G, fs: 8 } },

      { landscape: true },
      { h2: 'Part A · Findings register (at least 8 findings)' },
      { p: 'For drafting: your answers go in the audit form. Bands: Low 1 to 4 · Medium 5 to 9 · High 10 to 16 · Critical 20 to 25. Owners from the RSSO cast. Write "harm may already have happened: tell … today" in the Fix column where a record suggests it.' },
      { table: { widths: [3, 24, 9, 13, 3, 3, 9, 18, 9, 9], head: ['#', 'Finding (one plain sentence)', 'Evidence (exhibit and row)', 'Control it fails', 'L', 'I', 'Score and band', 'Fix', 'Owner', 'Date'], rows: numbered(12, 10), minH: 0.55, fs: 9 } },
      { portrait: true },
      { h2: 'Part B · Access review: every account in Exhibit B' },
      { p: 'Decision: keep, change role, disable, or require MFA. One account may need two decisions.' },
      { table: { widths: [7, 16, 27, 50], head: ['Row', 'Account', 'Decision', 'Reason, in one line'], rows: EXHIBIT_B.map((b) => [b[0], b[1], '', '']), minH: 0.38, fs: 9 } },
      { h2: 'Part B · The corrected role table' },
      { p: 'Correct Exhibit C so that it matches your team\'s Module 3 role matrix. Write Yes, No, or a condition.' },
      { table: { widths: [32, 17, 17, 17, 17], head: ['Function', ...ROLES], rows: FUNCTIONS.map((f) => [f, ...blank(4)]), minH: 0.4, fs: 9 } },
      { q: 'Each separation-of-duties conflict you removed (function + function, which role, which row of Exhibit C):', n: 1, lines: 4 },
      { pagebreak: true },
      { h2: 'Write-up (4:10 to 4:30)' },
      { table: { widths: [10, 60, 30], head: ['Rank', 'Finding number and title', 'Why it comes first'], rows: [['1', '', ''], ['2', '', ''], ['3', '', '']], minH: 0.6, fs: 9 } },
      { p: '**Three sentences to Director Eva:** what is most urgent, what it could cost the office, and what you ask her to approve.' },
      { q: 'Most urgent:', n: 1, lines: 2 },
      { q: 'What it could cost the office:', n: 2, lines: 2 },
      { q: 'What I ask you to approve:', n: 3, lines: 2 },
      { h2: 'Controls you will likely cite' },
      { table: { widths: [24, 76], head: ['Reference', 'What it covers'], rows: CITED, fs: 9 } },
      { h2: 'How it is scored (100 points, scaled to 20%)' },
      { table: { widths: [28, 10, 62], head: ['Criterion', 'Points', 'Full marks means'], rows: RUBRIC, fs: 9 } },
      { p: '**Submit:** your answers in the audit form, one per person, by 4:30 PM. If connectivity fails, the grace period runs until 8:00 AM the next day: tell the facilitator before you leave.' },
    ],
  },

  // ======================= Answer key (facilitator only) =======================
  {
    file: 'Answer Key, Modules 3 and 4 (facilitator only)',
    header: 'FACILITATOR ONLY · Answer key, Module 3 workbook and Module 4 Audit File',
    title: 'Answer Key: Module 3 Workbook and Module 4 Audit File',
    meta: 'Facilitator only · keep it away from participants, like the Quiz Bank · 21 October 2026',
    intro: 'Model answers. A different answer with a sound reason can also be right. Module 3 is formative (completion recorded, nothing scored). Module 4 is graded with the rubric at the end: at least 8 valid findings with exhibit-and-row evidence earn the Findings points; the 28 below are the planted ones, so accept others that the records support, and give nothing for findings the records do not support ("nothing invented").',
    blocks: [
      { h2: 'Module 3 workbook · Task A, model rules' },
      { table: { widths: [5, 10, 17, 19, 14, 35], head: ['#', 'Action', 'From', 'To', 'Service', 'Why'], fs: 9, rows: [
        ['1', 'Allow', 'Internet', 'Public zone (portal)', 'HTTPS', 'Citizens reach the Assistance Portal'],
        ['2', 'Allow', 'Public zone (portal)', 'Applicant database', 'Database', 'The one approved connection'],
        ['3', 'Allow', 'Staff network', 'Public zone (portal)', 'HTTPS', 'Staff use the portal'],
        ['4', 'Allow', 'Staff network', 'File server', 'File sharing', 'Staff reach the file server, not the database'],
        ['5', 'Allow', 'Admin network', 'Admin pages and servers', 'Admin', 'Ana manages from the admin network only'],
        ['6', 'Allow', 'Remote access (VPN, with MFA)', 'Portal and file server', 'By role', 'Only what each person\'s role needs'],
        ['7', 'Allow', 'Server zone', 'Approved update sites', 'HTTPS', 'Updates only; nothing else on the internet'],
        ['8', 'Allow', 'Guest Wi-Fi', 'Internet', 'Web', 'Visitors get the internet only'],
        ['9', 'Allow', 'Cameras and devices', 'Their own recorder or service', 'Their service', 'Devices stay in their room'],
        ['Last', 'Deny', 'Anything', 'Anything', 'Any', 'Default deny; every block logged and reviewed'],
      ] } },
      { p: '**Self-check:** 1 allowed (rule 1). 2 allowed (rule 2). 3 blocked (default deny: admin pages answer on the admin network only). 4 blocked (default deny: guests reach the internet only). 5 blocked (default deny: staff reach the file server, not the database). 6 blocked (default deny: the server zone reaches approved update sites only), and the block is logged and alerted. **Watch for:** "allow any" rules, admin pages open to the internet, no outbound filtering, and no one named to read the logs.' },
      { h2: 'Module 3 workbook · Task B' },
      { p: '**Role matrix:** the Module 3 learner guide\'s model answer (Try it 3.3), repeated below for Module 4 Part B. **Conflicts avoided:** encode and approve; edit an e-wallet number and release the payout; manage accounts and approve or pay; change the logs and act in the system.' },
      { p: '**MFA policy:** MFA first on email, VPN and admin accounts; security keys (or passkeys) for admins, authenticator app with number matching for staff, SMS only where nothing else works; deny and report any prompt you did not start.' },
      { p: '**Joiner:** a written request from the unit head; security clearance filed with the DPO; a named account with one role; MFA set up; a security and privacy briefing before access; on the first day. **Mover:** on the day of the transfer, remove the old role and add the new one; check no conflict remains. **Leaver:** on the last day, close every account including the VPN; collect devices and badges; hand over shared files; for consultants and job-order staff too.' },
      { h2: 'Module 3 workbook · Task C' },
      { table: { widths: [22, 16, 22, 22, 18], head: ['Data set', 'Classification', 'Stored', 'Moving', 'Key custodian'], fs: 9, rows: [
        ['The applicant database', 'Sensitive personal', 'Database or file-level encryption; access by role', 'Only the portal reaches it, over the one approved connection; TLS', 'Ana, with a backup custodian'],
        ['Scanned IDs and medical certificates', 'Sensitive personal', 'Encrypted storage, open only to staff who check applications', 'HTTPS upload', 'Ana'],
        ['The payout list for the e-wallet provider', 'Personal, high fraud risk', 'Encrypted file, deleted from staff computers after upload', "The provider's business portal over HTTPS; never a plain attachment", 'Dan for the file; Ana for the system'],
        ['The nightly backup', 'Sensitive personal (all of the above)', 'Encrypted, with one copy offline', 'Encrypted transfer to the backup location', 'Ana, with a sealed recovery copy'],
        ['Staff records and leave files', 'Personal', 'Drive or file encryption; access by role only', 'Encrypted sharing inside the office; VPN from outside', 'Ana, with access approved by the HR head'],
        ["The portal's public pages", 'Public', 'No sensitive data on the web server', 'HTTPS, TLS 1.2 or 1.3, valid certificate', 'Ana, renewing certificates on time'],
      ] } },
      { p: '**Backup rules:** nightly; encrypted, key held apart; one copy offline and off-site; a restore tested every month by someone other than the person who runs the backups; a failed backup alerts Ana and her backup the same morning.' },

      { landscape: true },
      { h2: 'Module 4 Audit File · Part A, model findings (28 planted)' },
      { p: '**Harm may already have happened (findings 1, 2 and 7):** a vendor account whose contract ended exported all 48,112 applicant records at 2:19 AM, and the generic admin account deleted the log entries 12 minutes later; and Dan changed an e-wallet number and paid PHP 15,000 to it with no call-back. Full marks on these need "tell Carla (DPO) and Director Eva today": the 72-hour clock may already be running from reasonable belief (NPC Circular 16-03), and A-21507\'s payout needs checking with the applicant.' },
      { table: { widths: [3, 25, 10, 13, 3, 3, 7, 18, 11, 7], head: ['#', 'Finding', 'Evidence', 'Control', 'L', 'I', 'Score', 'Fix', 'Owner', 'Date'], rows: FINDINGS, fs: 8 } },
      { portrait: true },
      { h2: 'Module 4 Audit File · Part B, access review' },
      { table: { widths: [7, 15, 30, 48], head: ['Row', 'Account', 'Decision', 'Reason'], rows: ACCESS_REVIEW, fs: 9 } },
      { h2: 'Module 4 Audit File · Part B, corrected role table' },
      { table: { widths: [30, 17, 17, 18, 18], head: ['Function', ...ROLES], rows: MODEL_ROLES, fs: 9 } },
      { p: '**Conflicts removed (Exhibit C):** records clerk encode (C1) and approve (C3); cashier edit e-wallet number (C4) and release (C5); supervisor approve (C3) and release (C5); system administrator create accounts (C6) with approve and release (C3, C5), and delete logs (C7) while acting in the system. Also: no role edits e-wallet numbers without a call-back; exports need written approval; the Auditor role stays read only.' },
      { h2: 'Model write-up' },
      { p: '**Top three:** 1. The ended vendor account that exported every record, with logs deleted after (findings 1 and 2): possible breach in progress. 2. The known-exploited weakness left unpatched for seven weeks (finding 4). 3. The payout redirected by one person with no call-back (finding 7), or MFA missing on 11 of 14 accounts (finding 5).' },
      { p: '**Three sentences to Director Eva (example):** "On 14 October, a vendor account that should have been closed in August exported all 48,112 applicant records at 2:19 AM, and the logs of that half hour were then deleted, so we may have a notifiable breach and the 72-hour clock may already be running. If the data was taken, applicants\' ID numbers, health information and e-wallet numbers are exposed to fraud, and the office faces NPC action and the loss of citizens\' trust. I ask you to approve, today, disabling the vendor and generic admin accounts, calling Carla to start the breach assessment, and the downtime to install the security update this week."' },
      { h2: 'Scoring the audit (100 points, scaled to 20%)' },
      { table: { widths: [26, 9, 65], head: ['Criterion', 'Points', 'What to look for'], fs: 9, rows: [
        ['Findings', '40', 'At least 8 valid findings with exhibit-and-row evidence (5 points each up to 40); deduct for invented facts. Bonus credit within the 40 for spotting harm already done (findings 1, 2, 7).'],
        ['Analysis', '25', 'Controls that fit the finding; likelihood and impact consistent with each other and justified; Critical items (1 to 4) ranked above Medium ones.'],
        ['Access-control management', '20', 'A sound decision and reason for all 14 accounts (B8, B9, B10, B11, B13 disabled; B3 and B1 two decisions); a role table without the conflicts.'],
        ['Remediation and clarity', '15', 'Specific fixes with a named owner from the cast and a date; three clear sentences to Director Eva.'],
      ] } },
      { p: '**Debrief (4:30 PM): the top five fixes.** 1. Today: disable B10 and B9, preserve the logs, and tell Carla and Director Eva (possible breach). 2. Install update 2.4 this week. 3. MFA on every account, VPN first; security keys for admins. 4. Fix the role table and clean up joiners, movers and leavers (B3, B8, B11, B13). 5. Logs admins cannot delete, reviewed weekly; encrypted, tested backups with an offline copy.' },
    ],
  },
];
