/**
 * GENERATED from source/worksheets/build/content-day2.mjs (the printed Module 4
 * Audit File) by make-audit-gs.mjs. Do not edit it here: change content-day2.mjs,
 * then run "npm run build:audit-form" in source/worksheets/build and paste this
 * file into the Apps Script project again.
 *
 * FACILITATOR ONLY: keyDecisions holds the answer key's Part B decisions.
 */

const AUDIT_DATA = {
  "title": "Module 4 Audit File: The RSSO Assistance Portal",
  "intro": "You are the RSSO's internal reviewer. Using only the records in this file, find where the portal's controls fall short, rate each finding, and correct who can do what. Nobody tests or signs in to any system: the evidence is all on paper. Everything in this file is fictional: the office, the people, the accounts, the vendors, the addresses and the records.",
  "meta": "Graded controls audit, 20% · individual · Day 2 afternoon, 2:50 to 4:30 PM · face-to-face Thursday 22 October 2026 · online Tuesday 27 October 2026",
  "rules": [
    "1. Work only from this Audit File. Everything in it is fictional.",
    "2. Do not scan, probe or sign in to any real system, including your own office's. Accessing a computer system without right is illegal access under the Cybercrime Prevention Act (RA 10175, Section 4(a)(1)), so scope is a legal line, not a courtesy.",
    "3. Never add real names, accounts or data to your findings.",
    "4. Work on your own. You may ask the facilitator about the rules or the records, not for answers.",
    "5. Submit through the submission link by 4:30 PM. If connectivity fails, the grace period runs until 8:00 AM the next day."
  ],
  "method": [
    "Read Exhibit A first (5 minutes). Know what is at stake before you judge anything.",
    "Part A, findings (about 35 minutes). Go through Exhibits B to G and record at least 8 findings. For each: what is wrong, in one plain sentence; the evidence (exhibit and row, for example \"D4\"); the control it fails (an ISO/IEC 27001:2022 Annex A control, NPC Circular 2023-06, or a section of the Data Privacy Act); likelihood and impact from 1 to 5, the score, and its band (Low 1 to 4, Medium 5 to 9, High 10 to 16, Critical 20 to 25); the fix, an owner from the RSSO cast, and a target date.",
    "Part B, access review (about 20 minutes). For every account in Exhibit B, decide: keep, change role, disable, or require MFA, with a one-line reason. One account may need two decisions. Then correct the role table in Exhibit C so that it matches your Module 3 role matrix, and list each separation-of-duties conflict you removed.",
    "Write-up (4:10 to 4:30). Rank your top three findings and write three sentences to Director Eva: what is most urgent, what it could cost the office, and what you ask her to approve."
  ],
  "harm": "If a record suggests that something harmful may already have happened, say so in your finding and name who must be told today. Spotting that is part of the audit.",
  "cast": "Director Eva, head of office; Carla, DPO and legal officer; Ana, IT officer; Ben, records clerk; Dan, cashier; Sol, social worker.",
  "exhibits": [
    {
      "letter": "A",
      "title": "Exhibit A · System profile",
      "lines": [
        "A1 · System: RSSO Assistance Portal, at assist.rsso-q.example (fictional)",
        "A2 · Purpose: Citizens apply online for medical, burial and educational assistance. Staff encode, check and approve applications, and payouts go to applicants' e-wallets.",
        "A3 · Data held: About 48,000 applicants: names, home addresses, birthdates, mobile numbers, government ID numbers, scanned IDs, medical certificates (health information), household income and e-wallet numbers.",
        "A4 · Who owns it: Director Eva, head of office (system owner). Ana, IT officer (system administrator). Carla, Data Protection Officer.",
        "A5 · Users: 14 accounts (Exhibit B). Staff work in the office, in the field, and from home through the VPN.",
        "A6 · Where it runs: The web server sits in the public zone (DMZ). The applicant database and the backup server sit in the office server room.",
        "A7 · Who built it: Bayani Systems (a fictional vendor), under a development and support contract that ended on 31 August 2026. Since then, support is \"as needed\".",
        "A8 · Go-live and testing: Went live in March 2024. Security testing before go-live: none on record. Security testing since: none on record.",
        "A9 · Connections: An SMS vendor sends status texts to applicants; an e-wallet provider receives approved payouts (Exhibit E).",
        "A10 · Volume in 2026: About 9,600 applications approved and PHP 31 million paid out, January to September."
      ]
    },
    {
      "letter": "B",
      "title": "Exhibit B · User accounts (as of 21 October 2026)",
      "lines": [
        "B1 · ana · Ana, IT officer · role: System administrator · MFA: SMS code · last sign-in: 21 Oct, 08:05 · Active · One account for email, daily work and admin work",
        "B2 · ben · Ben, records clerk · role: Records clerk · MFA: Off · last sign-in: 21 Oct, 09:12 · Active",
        "B3 · luz · Luz, supervisor · role: Supervisor; Records clerk · MFA: Off · last sign-in: 21 Oct, 10:40 · Active · Promoted from records clerk on 4 Aug 2026 (G1)",
        "B4 · dan · Dan, cashier · role: Cashier · MFA: App · last sign-in: 20 Oct, 16:55 · Active",
        "B5 · sol · Sol, social worker · role: Records clerk · MFA: Off · last sign-in: 19 Oct, 14:02 · Active · Works in the field; signs in from home through the VPN",
        "B6 · carla · Carla, DPO · role: Auditor · MFA: App · last sign-in: 15 Oct, 11:20 · Active · Reads the audit logs",
        "B7 · eva · Director Eva · role: System administrator · MFA: Off · last sign-in: 2 Mar 2026, 09:00 · Active · \"So the director can see everything\"",
        "B8 · frontdesk · Three frontline staff · role: Records clerk · MFA: Off · last sign-in: 21 Oct, 08:31 · Active · One login for the front desk; its password is on a note under the keyboard",
        "B9 · admin · Generic (no named person) · role: System administrator · MFA: Off · last sign-in: 14 Oct, 02:31 · Active · Created at go-live; Bayani Systems also knows the password",
        "B10 · bayani.support · Vendor, Bayani Systems · role: System administrator · MFA: Off · last sign-in: 14 Oct, 02:14 · Active · Vendor support account (contract ended 31 Aug 2026, A7)",
        "B11 · rex · Rex, former records clerk · role: Records clerk · MFA: Off · last sign-in: 30 Jun 2026, 16:47 · Active · Resigned; last working day 30 June 2026",
        "B12 · mara · Mara, job-order clerk · role: Records clerk · MFA: Off · last sign-in: 21 Oct, 08:58 · Active · Started 1 Sep 2026; no security clearance on file with the DPO",
        "B13 · test1 · Test account · role: Supervisor · MFA: Off · last sign-in: Never · Active · Created at go-live for testing; password unchanged",
        "B14 · sms-link · SMS vendor's system link · role: Export applicant data · MFA: Not applicable · last sign-in: Every 5 minutes · Active · Pulls applicant records to send status texts (E1, F5)"
      ]
    },
    {
      "letter": "C",
      "title": "Exhibit C · Roles and permissions: what each role can do today",
      "lines": [
        "C1 · Encode a new application · Records clerk: Yes · Supervisor: Yes · Cashier: No · System administrator: Yes · Auditor: No",
        "C2 · View applicant records · Records clerk: All records · Supervisor: All records · Cashier: All records, including medical certificates · System administrator: All records · Auditor: No",
        "C3 · Approve an application · Records clerk: Yes (added January 2026 \"to speed up approvals\") · Supervisor: Yes · Cashier: No · System administrator: Yes · Auditor: No",
        "C4 · Edit an applicant's e-wallet number · Records clerk: Yes (no call-back check) · Supervisor: No · Cashier: Yes · System administrator: Yes · Auditor: No",
        "C5 · Release a payout · Records clerk: No · Supervisor: Yes · Cashier: Yes · System administrator: Yes · Auditor: No",
        "C6 · Create and disable user accounts · Records clerk: No · Supervisor: No · Cashier: No · System administrator: Yes (no approval step) · Auditor: No",
        "C7 · View audit logs · Records clerk: No · Supervisor: No · Cashier: No · System administrator: Yes, and can delete entries · Auditor: Yes (read only)",
        "C8 · Export applicant data · Records clerk: Yes · Supervisor: Yes · Cashier: No · System administrator: Yes · Auditor: No"
      ]
    },
    {
      "letter": "D",
      "title": "Exhibit D · Security settings and records",
      "lines": [
        "D1 · Password rule: At least 8 characters with one symbol; changed every 30 days; no check against passwords known from breaches.",
        "D2 · Multi-factor authentication: Optional for every account. In use on 3 of 14 accounts (B1 by SMS code; B4 and B6 by app).",
        "D3 · Failed sign-ins: Unlimited attempts; no lockout and no delay.",
        "D4 · Remote access (VPN): Password only; MFA is available on the VPN but not switched on.",
        "D5 · Audit log: On. Kept on the portal's own server for 30 days. System administrator accounts can delete entries (C7).",
        "D6 · Log review: Last review recorded: 12 March 2026.",
        "D7 · Portal software: Version 2.3. The vendor's update 2.4 (2 September 2026) fixes a weakness listed in CISA's Known Exploited Vulnerabilities catalog. Not installed: \"waiting for downtime approval\" (G3).",
        "D8 · Endpoint protection, portal server: Licence expired on 30 September 2026. No updates since.",
        "D9 · Backups: Every night, to a USB drive kept in the server room, beside the server. Not encrypted. Restore test: never. Last three nights failed (G13).",
        "D10 · Encryption: The database is not encrypted. The portal accepts TLS 1.0, 1.1 and 1.2. Its certificate expires on 30 October 2026.",
        "D11 · Admin pages: Firewall rule: admin pages answer on the admin network only.",
        "D12 · Privacy notice: The online application form shows no privacy notice. It also asks for religion and the names of all household members \"for statistics\"; no report uses them.",
        "D13 · Retention: Every application since March 2024 is kept, including rejected ones. There is no deletion schedule.",
        "D14 · Security policy: Access control policy: draft, not approved. Password policy: none. Business continuity plan: none."
      ]
    },
    {
      "letter": "E",
      "title": "Exhibit E · Vendors and agreements",
      "lines": [
        "E1 · SMS vendor (fictional) · receives: Through the system link B14: the full applicant record for each status text (F5) · agreement on file: Data processing agreement, signed 2024, valid to 2027. Its scope: \"applicant name, mobile number and application status only\"",
        "E2 · E-wallet provider (fictional) · receives: Approved payout lists (names, e-wallet numbers, amounts), uploaded to its business portal over HTTPS · agreement on file: Agreement signed, valid · note: One payout file was emailed as an attachment on 2 Oct (G7)",
        "E3 · Bayani Systems (fictional developer) · receives: Built and supported the portal; remote access through account B10 · agreement on file: Development contract, ended 31 Aug 2026. No data processing agreement on file. No report of security testing · note: Account B10 still active",
        "E4 · A free online form builder · receives: An applicant feedback survey: names, mobile numbers, application numbers and comments (about 1,900 responses) · agreement on file: None. Not on any approved list · note: Set up by a staff member in July 2026 \"because it was quick\""
      ]
    },
    {
      "letter": "F",
      "title": "Exhibit F · Screens and reports",
      "lines": [
        "F1 · \"Applicant search\" screen · seen by: Records clerks (B2, B3, B5, B8, B11, B12) · shows: Search all 48,000 applicants by name. Each result shows the full government ID number, birthdate and medical diagnosis.",
        "F2 · \"Payout\" screen · seen by: Cashier (B4) · shows: Payout details, plus a link to each applicant's medical certificate.",
        "F3 · Public page \"Check my application\" · seen by: Anyone on the internet · shows: Enter an application number (they run in order: A-20931, A-20932 …) to see the applicant's name, home address and approved amount. No other check.",
        "F4 · Monthly report \"Approved applicants\" · seen by: Emailed to all 30 staff as a spreadsheet · shows: Full names, home addresses, mobile numbers and amounts of every approved applicant that month.",
        "F5 · Sample of what the SMS link sends (B14) · seen by: SMS vendor's system · shows: Name, mobile number, home address, government ID number, diagnosis and application status, for each text."
      ]
    },
    {
      "letter": "G",
      "title": "Exhibit G · Change and activity log",
      "lines": [
        "G1 · 2026-08-04 09:15 · ana · Added the Supervisor role to luz; kept her Records clerk role \"for the transition\" · approval or ticket: None · source: Audit log",
        "G2 · 2026-08-31 17:00 · — · Bayani Systems contract ends · approval or ticket: No account change recorded · source: Contract file",
        "G3 · 2026-09-02 10:00 · — · Vendor notice: update 2.4 available; fixes a known-exploited weakness · approval or ticket: Not installed (D7) · source: Email",
        "G4 · 2026-09-15 14:22 · ana · Firewall: added \"allow internet to admin pages, temporary, for vendor support\" · approval or ticket: None; not removed since · source: Firewall log",
        "G5 · 2026-10-02 10:14 · dan · Changed the e-wallet number of applicant A-21507 from EW-0417 to EW-9911 · approval or ticket: No call-back recorded · source: Audit log",
        "G6 · 2026-10-02 10:21 · dan · Released the payout for A-21507, PHP 15,000, to EW-9911 · approval or ticket: — · source: Audit log",
        "G7 · 2026-10-02 11:03 · dan · Emailed \"payouts-oct2.xlsx\" to the e-wallet provider: \"the portal is slow today\" · approval or ticket: — · source: Mail log",
        "G8 · 2026-10-14 02:14 · bayani.support · Signed in through the VPN from an address outside the Philippines · approval or ticket: — · source: VPN log",
        "G9 · 2026-10-14 02:19 · bayani.support · Export all applicants (CSV): 48,112 rows · approval or ticket: — · source: Export register",
        "G10 · 2026-10-14 02:31 · admin · Deleted 214 audit log entries dated 14 Oct, 02:00 to 02:30 · approval or ticket: — · source: Audit log",
        "G11 · 2026-10-16 10:02 · luz · Encoded application A-21733 · approval or ticket: — · source: Audit log",
        "G12 · 2026-10-16 10:05 · luz · Approved application A-21733 · approval or ticket: — · source: Audit log",
        "G13 · 2026-10-18 to 20, 01:00 · backup job · \"Backup failed: disk full\", three nights in a row · approval or ticket: No follow-up recorded · source: Backup log",
        "G14 · 2026-10-19 16:40 · frontdesk · Exported \"today's applicants\" (37 rows) to a USB drive · approval or ticket: — · source: Export register"
      ]
    }
  ],
  "accounts": [
    {
      "row": "B1",
      "account": "ana",
      "record": "Ana, IT officer · role: System administrator · MFA: SMS code · last sign-in: 21 Oct, 08:05 · Active · One account for email, daily work and admin work"
    },
    {
      "row": "B2",
      "account": "ben",
      "record": "Ben, records clerk · role: Records clerk · MFA: Off · last sign-in: 21 Oct, 09:12 · Active"
    },
    {
      "row": "B3",
      "account": "luz",
      "record": "Luz, supervisor · role: Supervisor; Records clerk · MFA: Off · last sign-in: 21 Oct, 10:40 · Active · Promoted from records clerk on 4 Aug 2026 (G1)"
    },
    {
      "row": "B4",
      "account": "dan",
      "record": "Dan, cashier · role: Cashier · MFA: App · last sign-in: 20 Oct, 16:55 · Active"
    },
    {
      "row": "B5",
      "account": "sol",
      "record": "Sol, social worker · role: Records clerk · MFA: Off · last sign-in: 19 Oct, 14:02 · Active · Works in the field; signs in from home through the VPN"
    },
    {
      "row": "B6",
      "account": "carla",
      "record": "Carla, DPO · role: Auditor · MFA: App · last sign-in: 15 Oct, 11:20 · Active · Reads the audit logs"
    },
    {
      "row": "B7",
      "account": "eva",
      "record": "Director Eva · role: System administrator · MFA: Off · last sign-in: 2 Mar 2026, 09:00 · Active · \"So the director can see everything\""
    },
    {
      "row": "B8",
      "account": "frontdesk",
      "record": "Three frontline staff · role: Records clerk · MFA: Off · last sign-in: 21 Oct, 08:31 · Active · One login for the front desk; its password is on a note under the keyboard"
    },
    {
      "row": "B9",
      "account": "admin",
      "record": "Generic (no named person) · role: System administrator · MFA: Off · last sign-in: 14 Oct, 02:31 · Active · Created at go-live; Bayani Systems also knows the password"
    },
    {
      "row": "B10",
      "account": "bayani.support",
      "record": "Vendor, Bayani Systems · role: System administrator · MFA: Off · last sign-in: 14 Oct, 02:14 · Active · Vendor support account (contract ended 31 Aug 2026, A7)"
    },
    {
      "row": "B11",
      "account": "rex",
      "record": "Rex, former records clerk · role: Records clerk · MFA: Off · last sign-in: 30 Jun 2026, 16:47 · Active · Resigned; last working day 30 June 2026"
    },
    {
      "row": "B12",
      "account": "mara",
      "record": "Mara, job-order clerk · role: Records clerk · MFA: Off · last sign-in: 21 Oct, 08:58 · Active · Started 1 Sep 2026; no security clearance on file with the DPO"
    },
    {
      "row": "B13",
      "account": "test1",
      "record": "Test account · role: Supervisor · MFA: Off · last sign-in: Never · Active · Created at go-live for testing; password unchanged"
    },
    {
      "row": "B14",
      "account": "sms-link",
      "record": "SMS vendor's system link · role: Export applicant data · MFA: Not applicable · last sign-in: Every 5 minutes · Active · Pulls applicant records to send status texts (E1, F5)"
    }
  ],
  "functions": [
    "Encode a new application",
    "View applicant records",
    "Approve an application",
    "Edit an applicant's e-wallet number",
    "Release a payout",
    "Create and disable user accounts",
    "View audit logs",
    "Export applicant data"
  ],
  "roles": [
    "Records clerk",
    "Supervisor",
    "Cashier",
    "System administrator"
  ],
  "cited": [
    "ISO 5.3: Segregation of duties",
    "ISO 5.15 to 5.18: Access control, identity management, authentication information, access rights",
    "ISO 5.19 and 5.20: Supplier relationships, and security in supplier agreements",
    "ISO 6.5: Responsibilities after termination or change of employment",
    "ISO 8.2 and 8.5: Privileged access rights; secure authentication",
    "ISO 8.7, 8.8: Protection against malware; management of technical vulnerabilities",
    "ISO 8.11: Data masking",
    "ISO 8.13: Information backup",
    "ISO 8.15: Logging",
    "ISO 8.24: Use of cryptography",
    "ISO 8.32: Change management",
    "NPC Circular 2023-06: Access control policy; known, properly configured devices; password policy; MFA for online access to sensitive personal information; security logs kept; encrypted removable media; business continuity with testing",
    "RA 10173 Sec 11: Principles: data adequate and not excessive (d); kept only as long as necessary (e)",
    "RA 10173 Secs 14, 21(a): The office stays responsible for data processed by others, and protects it by contract",
    "RA 10173 Sec 16(b): Data subjects told what is collected, why, by whom, and for how long, before processing"
  ],
  "rubric": [
    [
      "Findings",
      "40",
      "At least 8 valid findings, each with exhibit-and-row evidence; nothing invented"
    ],
    [
      "Analysis",
      "25",
      "Correct control references; likelihood and impact rated consistently and justified; top three ranked sensibly"
    ],
    [
      "Access-control management",
      "20",
      "A sound decision and reason for every account; a corrected role table with the conflicts removed"
    ],
    [
      "Remediation and clarity",
      "15",
      "Specific fixes, each with an owner and a date; a clear three-sentence summary for the head"
    ]
  ],
  "keyDecisions": {
    "B1": [
      "Change role",
      "Require MFA"
    ],
    "B2": [
      "Require MFA"
    ],
    "B3": [
      "Change role",
      "Require MFA"
    ],
    "B4": [
      "Keep"
    ],
    "B5": [
      "Require MFA"
    ],
    "B6": [
      "Keep"
    ],
    "B7": [
      "Change role",
      "Require MFA"
    ],
    "B8": [
      "Disable"
    ],
    "B9": [
      "Disable"
    ],
    "B10": [
      "Disable"
    ],
    "B11": [
      "Disable"
    ],
    "B12": [
      "Require MFA"
    ],
    "B13": [
      "Disable"
    ],
    "B14": [
      "Change role"
    ]
  }
};
