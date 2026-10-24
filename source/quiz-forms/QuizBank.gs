/**
 * Quiz bank: Quizzes 1 and 2 (facilitator only), 19 October 2026, and the
 * practice Quizzes 3 and 4 (21 October 2026, not graded), at the end.
 *
 * Keep this project private: it holds the answer keys for both runs.
 * Items follow the bank's order, under the bank's headings (item numbers in
 * the comments). For each item:
 *   q         the question (true-or-false items get "True or false:" in front)
 *   choices   in the bank's order A, B, C, D; leave out for true or false
 *   answer    the bank's letter, or true / false
 *   why       the bank's explanation, shown as feedback when you release it
 *   scenario  the bank marks the item "(Scenario)"; not shown in the form
 */
const QUIZZES = [
  {
    key: 'quiz1', // the same key as in pdac-web/src/data/links.json
    label: 'Quiz 1 · Module 1',
    title: 'Quiz 1: Threat landscape and legal governance',
    minutes: 20,
    weight: '10%',
    closedBook: true, // the Module 1 deck and learner guide: "closed book, one attempt"
    when: {
      f2f: 'Wednesday 21 October 2026, 11:25 AM',
      online: 'Monday 26 October 2026, 11:25 AM',
    },
    topics: [
      {
        name: 'Threats and impact',
        items: [
          { // 1
            scenario: true,
            q: 'Someone changes the e-wallet numbers on a payout list so the money goes to the wrong people. Which of Secret, Correct, Ready is hit first?',
            choices: ['Secret (confidentiality)', 'Correct (integrity)', 'Ready (availability)', 'None, because no data left the office'],
            answer: 'B',
            why: 'The data was altered, which is an integrity failure. Source: Lesson 1.1.',
          },
          { // 2
            q: "According to Microsoft's Digital Defense Report 2025, what drove more than half of the attacks with a known motive?",
            choices: ['Espionage by state-linked groups', 'Extortion and ransomware', 'Hacktivism', 'Accidents by employees'],
            answer: 'B',
            why: 'More than 52% involved extortion or ransomware; only 4% were espionage. Source: Lesson 1.1, What the numbers say.',
          },
          { // 3
            q: 'Which measure did Microsoft report can block more than 99% of identity-based attacks?',
            choices: ['Changing passwords every month', 'Multi-factor authentication', 'Antivirus software', 'A firewall'],
            answer: 'B',
            why: 'Source: Lesson 1.1, What the numbers say.',
          },
          { // 4
            q: 'Most harm caused by insiders is deliberate and malicious.',
            answer: false,
            why: 'Most insider harm is accidental, such as sending files through personal accounts to work faster. Source: Lesson 1.1, Who attacks.',
          },
          { // 5
            scenario: true,
            q: 'An email that looks like it comes from your IT unit says your mailbox will be deleted in one hour unless you log in through its link. What is this, and what should you do?',
            choices: [
              'An exposed website; ignore it',
              'Phishing; do not click, check with IT through a number you already know, and report it',
              'A shared account problem; forward it to your colleagues',
              'An old system warning; restart your computer',
            ],
            answer: 'B',
            why: 'Urgency plus a login link is a classic phishing sign (door 1). Source: Lesson 1.1, Five doors.',
          },
        ],
      },
      {
        name: 'Data Privacy Act',
        items: [
          { // 6
            scenario: true,
            q: "An application form asks for each applicant's religion, but the office never uses that information. Which principle does this break?",
            choices: ['Transparency', 'Legitimate purpose', 'Proportionality', 'Data portability'],
            answer: 'C',
            why: 'Proportionality (Little): collect only what the purpose needs. Source: RA 10173, Sec. 11; Lesson 1.2.',
          },
          { // 7
            scenario: true,
            q: "The RSSO hires a vendor to send SMS notices to applicants, using the RSSO's list and following its instructions. Under the DPA, the vendor is a:",
            choices: ['Data subject', 'Personal information controller', 'Personal information processor', 'Data Protection Officer'],
            answer: 'C',
            why: "A processor handles personal data on the controller's behalf and instructions. Source: RA 10173, Sec. 3(i).",
          },
          { // 8
            q: 'An applicant asks the office to correct a wrong birthdate in her record. Which right is she using?',
            choices: ['The right to object', 'The right to rectification', 'The right to data portability', 'The right to damages'],
            answer: 'B',
            why: 'Source: RA 10173, Sec. 16; Lesson 1.2, rights.',
          },
          { // 9
            q: 'Which of these is a physical security measure?',
            choices: ['Multi-factor authentication', 'A privacy manual', 'Locked filing cabinets and shredding', 'Encryption'],
            answer: 'C',
            // The bank says "A and D are technical; B is organizational". The form
            // reorders the choices, so the feedback names them instead of letters.
            why: 'Multi-factor authentication and encryption are technical measures; a privacy manual is organizational. Source: RA 10173, Sec. 20; Lesson 1.2.',
          },
          { // 10
            q: 'When must the office notify the NPC of a breach that meets the notification conditions?',
            choices: [
              'Within 72 hours of knowing or reasonably believing that it happened',
              'Within 72 hours after the investigation proves it happened',
              'Within 5 days of discovery',
              'Only if the media reports it',
            ],
            answer: 'A',
            why: 'Certainty is not required. Five days is the deadline for the full report. Source: NPC Circular 16-03, Sec. 17.',
          },
          { // 11
            scenario: true,
            q: "A clerk emails a list of 150 beneficiaries' names and government ID numbers to a wrong outside address. Using the 3S test, what is the best decision?",
            choices: [
              'No notification, because it was an accident',
              'Notify the NPC and the people affected within 72 hours: the data is sensitive, an unauthorized person received it, there is a real risk of serious harm, and with 100 or more people there can be no delay',
              'Wait until the recipient confirms that the email was deleted',
              'Notify the people affected, but not the NPC',
            ],
            answer: 'B',
            why: 'Government ID numbers are sensitive and enable identity fraud. Source: NPC Circular 16-03, Secs. 11, 13 and 17.',
          },
        ],
      },
      {
        name: 'ISO/IEC 27001',
        items: [
          { // 12
            q: 'ISO/IEC 27001:2022 Annex A has 93 controls in four themes. Which theme has the most controls?',
            choices: ['People', 'Physical', 'Technological', 'Organizational'],
            answer: 'D',
            why: 'Organizational has 37 (People 8, Physical 14, Technological 34). Source: Lesson 1.2.1.',
          },
          { // 13
            q: 'An office must be certified to ISO/IEC 27001 to comply with the Data Privacy Act.',
            answer: false,
            why: 'The DPA requires security measures, not certification. Source: Lesson 1.2.1, For your office.',
          },
          { // 14
            q: 'Which ISO/IEC 27001 document lists which Annex A controls apply, which do not, and why?',
            choices: ['The risk register', 'The Statement of Applicability', 'The privacy notice', 'The incident report'],
            answer: 'B',
            why: 'Source: Lesson 1.2.1.',
          },
        ],
      },
      {
        name: 'ASEAN AI guide',
        items: [
          { // 15
            q: 'The ASEAN Guide on AI Governance and Ethics is a binding law that every ASEAN government office must follow.',
            answer: false,
            why: 'It is a voluntary guide, unveiled on 2 February 2024. In the Philippines, the binding rules for AI that processes personal data come from the DPA, as explained in NPC Advisory 2024-04. Source: Lesson 1.2.2.',
          },
        ],
      },
    ],
  },
  {
    key: 'quiz2',
    label: 'Quiz 2 · Module 2',
    title: 'Quiz 2: Assessing cyber risks and threat modeling',
    minutes: 15,
    weight: '10%',
    closedBook: true,
    when: {
      f2f: 'Wednesday 21 October 2026, 3:35 PM',
      online: 'Monday 26 October 2026, 3:35 PM',
    },
    topics: [
      {
        name: 'Vulnerabilities and personal data',
        items: [
          { // 1
            q: 'In the house comparison used in class, an unlocked window is the:',
            choices: ['Asset', 'Threat', 'Vulnerability', 'Control'],
            answer: 'C',
            why: 'A vulnerability is a weakness a threat can use. Source: Lesson 2.1.',
          },
          { // 2
            scenario: true,
            q: 'A contractor left two months ago but can still log in through the VPN. Where does this weakness sit?',
            choices: ['People', 'Process', 'Technology', 'Physical security'],
            answer: 'B',
            why: 'There is no routine to remove access when people leave. Source: Lesson 2.1.',
          },
          { // 3
            q: "In Verizon's 2026 Data Breach Investigations Report, what was the most common way attackers first got in?",
            choices: ['Stolen passwords', 'Exploiting vulnerabilities', 'Stolen laptops', 'Insider mistakes'],
            answer: 'B',
            why: '31% of breaches, ahead of credential abuse at 13%. Source: Lesson 2.1, What the numbers say.',
          },
          { // 4
            q: 'A weakness with a High CVSS score must always be fixed before one with a Medium score.',
            answer: false,
            why: 'CVSS measures technical severity; the impact on your office also decides the order. Source: Lesson 2.1.',
          },
        ],
      },
      {
        name: 'Threat modeling and risk',
        items: [
          { // 5
            q: 'On a data flow map, a dashed line shows:',
            choices: ['A data store', 'A trust boundary', 'A person outside the system', 'Encrypted traffic'],
            answer: 'B',
            why: 'Source: Lesson 2.2, Step 1.',
          },
          { // 6
            scenario: true,
            q: "Someone logs in to the portal with a clerk's stolen password. Which STRIDE threat is this?",
            choices: ['Spoofing', 'Tampering', 'Repudiation', 'Denial of service'],
            answer: 'A',
            why: 'Pretending to be someone else. Source: Lesson 2.2, Step 2.',
          },
          { // 7
            scenario: true,
            q: 'Five staff share one login, so no one can tell who approved a payout. Which STRIDE threat does this enable?',
            choices: ['Information disclosure', 'Repudiation', 'Elevation of privilege', 'Spoofing'],
            answer: 'B',
            why: 'Without individual records, anyone can deny an action. Source: Lesson 2.2, Step 2.',
          },
          { // 8
            q: "A risk is rated likelihood 3 and impact 4. On the course's 5 by 5 matrix, what are its score and band?",
            choices: ['7, Medium', '12, High', '12, Medium', '16, Critical'],
            answer: 'B',
            why: '3 × 4 = 12, in the High band (10 to 16). Source: Lesson 2.2, Step 4.',
          },
          { // 9
            scenario: true,
            q: "The office stops collecting applicants' religion because it never uses it. Which TARA treatment is this?",
            choices: ['Transfer', 'Avoid', 'Reduce', 'Accept'],
            answer: 'B',
            why: 'Stopping the activity removes the risk. It also follows the Little principle. Source: Lesson 2.2, Step 4.',
          },
        ],
      },
      {
        name: 'Attacks aimed at people',
        items: [
          { // 10
            scenario: true,
            q: "A supplier emails to say its bank account has changed and asks that today's payment go to the new account. What should you do?",
            choices: [
              'Pay, because the supplier is known to the office',
              'Reply to the email to confirm the change',
              'Call the supplier on the number already in your records, and get a second approval',
              'Forward it to colleagues for their opinion',
            ],
            answer: 'C',
            why: 'Replying reaches whoever sent the email, possibly the attacker. Source: Lesson 2.3, Defense in layers.',
          },
          { // 11
            q: 'In SLAM, what does the L ask you to check?',
            choices: ['Language', 'Links', 'Location', 'Login'],
            answer: 'B',
            why: 'Sender, Links, Attachments, Message. Source: Lesson 2.3.',
          },
          { // 12
            q: 'A caller who says he is from law enforcement may be given your one-time code if he already knows your name and address.',
            answer: false,
            why: 'Never share a one-time code with anyone; knowing your details does not prove who he is. Source: Lesson 2.3.',
          },
        ],
      },
    ],
  },

  // ---------- Practice quizzes (not graded) ----------
  // The Module 3 learner guide says nothing in Module 3 is graded, and Module 4's
  // only grade is the controls audit (20%). So Quizzes 3 and 4 are practice:
  // anonymous, no sign-in, and the right answer and why appear on submitting.
  // Written from the Module 3 and Module 4 learner guides (21 October 2026):
  // Check yourself, Try it, the key ideas and the desk card. No item repeats an
  // exit-check item in ExitChecks.gs.
  {
    key: 'quiz3',
    label: 'Quiz 3 · Module 3 (practice)',
    title: 'Quiz 3 (practice): Security controls and data protection',
    minutes: 10,
    practice: true,
    when: {
      f2f: 'Thursday 22 October 2026, end of the morning or over lunch',
      online: 'Tuesday 27 October 2026, end of the morning or over lunch',
    },
    topics: [
      {
        name: 'Network security principles',
        items: [
          { // 1
            scenario: true,
            q: "A visitor on the RSSO's guest Wi-Fi tries to open the file server. Which control stops this?",
            choices: [
              'Segmentation: guest Wi-Fi reaches only the internet',
              "A stronger password on the visitor's phone",
              'An IDS alert on outbound traffic',
              'Full-disk encryption on the file server',
            ],
            answer: 'A',
            why: "Separate rooms: each network zone reaches only what it needs, so a visitor's phone never reaches the servers. Source: Lesson 3.1, Try it 3.1.",
          },
          { // 2
            scenario: true,
            q: 'A firewall reads these rules from the top. Rule 1: allow the staff network to anywhere, any service. Rule 2: deny the staff network to the applicant database. Malware on a staff computer tries to reach the database. What happens?',
            choices: [
              'Blocked by rule 2',
              'Allowed by rule 1, because the firewall acts on the first rule that matches',
              'Blocked by the default deny',
              'Allowed only at night',
            ],
            answer: 'B',
            why: 'Order matters: the firewall acts on the first rule that matches, so the "allow any" rule lets it through before rule 2 is read. Start from "block everything" and add specific allows. Source: Lesson 3.1, Rules that work.',
          },
          { // 3
            q: 'An intrusion detection system (IDS) blocks the attacks it finds.',
            answer: false,
            why: 'IDS tells, IPS stops: an IDS raises an alert; an intrusion prevention system (IPS) can also block what it finds. Source: Lesson 3.1.',
          },
        ],
      },
      {
        name: 'Encryption at rest and in transit',
        items: [
          { // 4
            q: 'Which tool proves who sent a file and that it was not changed?',
            choices: ['Encryption', 'Hashing', 'A digital signature', 'A VPN'],
            answer: 'C',
            why: 'Lock, seal, sign: encryption locks data (Secret), hashing seals it so any change shows (Correct), and a digital signature proves who sent it. Source: Lesson 3.2.',
          },
          { // 5
            q: 'Which versions of TLS, the protection behind HTTPS, should the Assistance Portal use?',
            choices: ['TLS 1.0 or 1.1', 'TLS 1.2 or 1.3', 'Any version, as long as the padlock shows', 'None: a firewall is enough'],
            answer: 'B',
            why: 'TLS 1.0 and 1.1 were formally deprecated in 2021 (RFC 8996), so old versions are turned off. Source: Lesson 3.2, Data moving.',
          },
          { // 6
            scenario: true,
            q: "Ana keeps the nightly backup's encryption key in a text file on the same backup drive. What is wrong with this?",
            choices: [
              'Nothing, because the backup is encrypted',
              'Whoever steals the drive also gets the key, so they can read everything',
              'Keys must be changed every day',
              'Backups should never be encrypted',
            ],
            answer: 'B',
            why: 'Keys are kept apart from the data they protect, with a named custodian and a sealed recovery plan. Moving, stored, keys. Source: Lesson 3.2, Keys.',
          },
          { // 7
            q: 'NPC Circular 2023-06 requires encryption when personal data must move on removable media, such as a USB drive.',
            answer: true,
            why: 'Use only office-issued encrypted USB drives, with approval. Source: Lesson 3.2, What the DPA and the NPC expect.',
          },
        ],
      },
      {
        name: 'Zero Trust, MFA and role-based access',
        items: [
          { // 8
            q: 'A login from inside the office network can be trusted without further checks.',
            answer: false,
            why: 'Never trust, always verify: being inside the office network proves nothing. Every request is checked for identity, device and need. Source: Lesson 3.3.',
          },
          { // 9
            q: 'Which sign-in method resists phishing best?',
            choices: ['A code sent by SMS', 'A code in an authenticator app', 'A security key or passkey (FIDO2)', 'A longer password'],
            answer: 'C',
            why: "The key checks the real site's address and will not sign in to a fake page; an SMS code can be typed into a fake page. CISA strongly urges phishing-resistant MFA. Source: Lesson 3.3.",
          },
          { // 10
            scenario: true,
            q: 'A records clerk is promoted to supervisor. What must happen to her clerk access?',
            choices: [
              'She keeps it, in case the clerks need help',
              'It is removed on the day she moves, so she cannot encode and approve the same application',
              'It is removed at the next yearly review',
              'Nothing, as long as she uses MFA',
            ],
            answer: 'B',
            why: 'Joiner, mover, leaver: access changes on the day of the transfer. Two hands on money: no one person encodes and approves. Source: Lesson 3.3, Try it 3.3.',
          },
        ],
      },
    ],
  },
  {
    key: 'quiz4',
    label: 'Quiz 4 · Module 4 (practice)',
    title: 'Quiz 4 (practice): Endpoint security and safe digital workflows',
    minutes: 10,
    practice: true,
    when: {
      f2f: 'Thursday 22 October 2026, after the audit or that evening',
      online: 'Tuesday 27 October 2026, after the audit or that evening',
    },
    topics: [
      {
        name: 'Laptops, phones and remote work',
        items: [
          { // 1
            q: 'Which part of the endpoint baseline turns "we lost the data" into "we lost a device"?',
            choices: ['Screen lock', 'Full-disk encryption', 'Host firewall', 'Standard user account'],
            answer: 'B',
            why: 'With full-disk encryption, whoever finds the laptop cannot read what is on it. Source: Lesson 4.1, When a device is lost.',
          },
          { // 2
            q: 'Why should daily work happen on a standard user account, not an administrator account?',
            choices: [
              'Standard accounts are faster',
              'Anything that runs while you work, including malware opened by mistake, gets only your limited rights',
              'Administrators cannot use email',
              'So IT can read your files',
            ],
            answer: 'B',
            why: 'Malware runs with the rights of whoever opened it, so limited rights limit the damage. Source: Lesson 4.1, Check yourself 4.1.',
          },
          { // 3
            scenario: true,
            q: "Sol's field laptop, holding unencrypted applicant records, is stolen. What should she do?",
            choices: [
              'Wait a week in case it turns up',
              'Report it at once: it may be a notifiable breach, and the 72-hour clock may already be running',
              'Buy a replacement and say nothing',
              'Change her email password only',
            ],
            answer: 'B',
            why: 'Under the 3S test it may be notifiable, the clock runs from reasonable belief, and IT may still be able to lock or wipe the device. Source: Lesson 4.1.',
          },
          { // 4
            q: 'Under NPC Circular 2023-06, only known devices, properly configured to the office\'s security standards, may access personal data.',
            answer: true,
            why: 'Its rules also cover remote disconnection or deletion on mobile devices. Source: Lesson 4.1, Phones and tablets.',
          },
        ],
      },
      {
        name: 'Safe websites and approved tools',
        items: [
          { // 5
            scenario: true,
            q: 'An SMS about a payout problem links to a sign-in page at assist.rss0-q.example. The page shows a padlock. What is true?',
            choices: [
              "The padlock proves it is the RSSO's site",
              'It is a look-alike: a zero replaces the letter o, and the padlock only means the connection is encrypted',
              'It is safe because it arrived by SMS',
              'It is safe if the page looks official',
            ],
            answer: 'B',
            why: 'Padlock means private, not honest. Do not sign in; report the text. Source: Lesson 4.2, Try it 4.2A.',
          },
          { // 6
            q: 'How do you find who owns a web address?',
            choices: [
              'Read the first word after https://',
              'Find the first single slash after https://, then read the words just before it from right to left: the last part names the owner',
              'Look for the padlock',
              'Count the dots in the address',
            ],
            answer: 'B',
            why: 'In assist.rsso-q.example.verify-account.example, the owner is verify-account.example, not the RSSO. Source: Lesson 4.2, Look-alike addresses.',
          },
          { // 7
            scenario: true,
            q: 'A colleague wants to merge two beneficiary masterlists using a free online PDF converter. What is the main problem?',
            choices: [
              'The converter may be slow',
              'The office stays responsible for the data, the free site has no agreement with the RSSO, and the data cannot be recalled once uploaded',
              'PDF files are not allowed in government',
              'Nothing, if the colleague deletes the file afterwards',
            ],
            answer: 'B',
            why: 'Shadow IT puts office data where nobody controls it (RA 10173, Secs 14 and 21(a)). Use an approved tool or ask IT. Source: Lesson 4.2.',
          },
        ],
      },
      {
        name: 'Threat intelligence and awareness',
        items: [
          { // 8
            q: 'A report is marked TLP:AMBER. Who may you share it with?',
            choices: [
              'Anyone, with no limits',
              'Your community, such as partner offices, but not the public',
              'People in your organization, and its clients, who need to know',
              'Only the named recipients',
            ],
            answer: 'C',
            why: 'RED, AMBER, GREEN, CLEAR: from tightest to open. When in doubt, ask the sender. Source: Lesson 4.3, Traffic Light Protocol.',
          },
          { // 9
            q: 'Which single question decides whether to act on a threat intelligence item?',
            choices: ['Did it come from abroad?', 'Does it change a decision this week?', 'How many people forwarded it?', 'Is it longer than one page?'],
            answer: 'B',
            why: 'If yes, act and tell the people who must act; if no, file it for the monthly bulletin. Forwarding everything trains people to ignore warnings. Source: Lesson 4.3.',
          },
          { // 10
            q: 'In an audit finding, it is enough to write what is wrong; the evidence is optional.',
            answer: false,
            why: 'Evidence, control, fix: each finding names its exhibit and row, the control it fails, a rating, and a fix with an owner and a date. Source: Graded controls audit, How to work.',
          },
        ],
      },
    ],
  },
];
