# Live poll pack (Slido or Mentimeter)

Every vote in the web presentation, in slide order, ready to paste. Made by `npm run poll-pack` in `pdac-web/` from the same data as the slides; run it again after changing a slide.

**Set up (once per run):**

1. Create one event (Slido) or presentation (Mentimeter) per run, for example "PDAC face-to-face, 21 October". Neither tool imports polls from a file.
2. For each poll below: add a **multiple choice** poll, paste the question, then paste the whole options block at once (one option per line: Slido and Mentimeter split it into options).
3. Do **not** mark correct answers: the deck reveals them, with the reason.
4. Put the event's participant link in `pdac-web/src/data/links.json` under `live-poll`, then `npm run qr && npm run build`.

**In class:** press **L** on any slide to show the poll QR code full screen (L or Esc closes); online, paste the link in the chat. Activate one poll at a time as you reach each case, then press **A** on the deck to reveal. If the internet drops, keep voting with cards and the deck's own tally (keys 1 to 9).

No names, offices or other personal data are needed to vote. Keep the polls anonymous.

## Module 1 · Try it 1.1A: Secret, Correct or Ready?

Slide `act1`

### Poll 1

1 of 8: Applicants' government ID numbers in the portal

```text
Secret (confidentiality)
Correct (integrity)
Ready (availability)
```

### Poll 2

2 of 8: Payout amounts in the approval spreadsheet

```text
Secret (confidentiality)
Correct (integrity)
Ready (availability)
```

### Poll 3

3 of 8: The Assistance Portal on payout day

```text
Secret (confidentiality)
Correct (integrity)
Ready (availability)
```

### Poll 4

4 of 8: Sol's case notes about a family

```text
Secret (confidentiality)
Correct (integrity)
Ready (availability)
```

### Poll 5

5 of 8: The list of approved beneficiaries sent to Dan

```text
Secret (confidentiality)
Correct (integrity)
Ready (availability)
```

### Poll 6

6 of 8: The file server Ben uses every morning

```text
Secret (confidentiality)
Correct (integrity)
Ready (availability)
```

### Poll 7

7 of 8: The SMS vendor's login to the portal

```text
Secret (confidentiality)
Correct (integrity)
Ready (availability)
```

### Poll 8

8 of 8: The office's offline backup

```text
Secret (confidentiality)
Correct (integrity)
Ready (availability)
```

## Module 1 · Try it 1.2A: Personal, sensitive or not covered?

Slide `sort`

### Poll 9

1 of 8: An applicant's full name and home address

```text
Personal
Sensitive personal
Not covered
```

### Poll 10

2 of 8: An applicant's social security number

```text
Personal
Sensitive personal
Not covered
```

### Poll 11

3 of 8: A medical certificate attached for medical assistance

```text
Personal
Sensitive personal
Not covered
```

### Poll 12

4 of 8: Ben's name and job title on the citizen's charter

```text
Personal
Sensitive personal
Not covered
```

### Poll 13

5 of 8: An applicant's religion written on the intake form

```text
Personal
Sensitive personal
Not covered
```

### Poll 14

6 of 8: An applicant's mobile and e-wallet numbers

```text
Personal
Sensitive personal
Not covered
```

### Poll 15

7 of 8: A photo of an applicant at the payout line

```text
Personal
Sensitive personal
Not covered
```

### Poll 16

8 of 8: Dan's position and office in the staff directory

```text
Personal
Sensitive personal
Not covered
```

## Module 1 · Try it 1.2B: Compliant or not?

Slide `act2`

### Poll 17

Case 1 of 6: A beneficiary list with ID numbers shared as a public spreadsheet link.

```text
Compliant
Not compliant
It depends
```

### Poll 18

Case 2 of 6: Carla puts a privacy notice at the intake desk and on the portal: what is collected, why, and who sees it.

```text
Compliant
Not compliant
It depends
```

### Poll 19

Case 3 of 6: Ben asks every applicant for a selfie holding their ID, a utility bill, and their Facebook password, 'to be safe'.

```text
Compliant
Not compliant
It depends
```

### Poll 20

Case 4 of 6: Dan emails the payout list to his personal email to finish work at home.

```text
Compliant
Not compliant
It depends
```

### Poll 21

Case 5 of 6: The SMS vendor keeps applicants' mobile numbers after the contract ends, 'for future clients'.

```text
Compliant
Not compliant
It depends
```

### Poll 22

Case 6 of 6: A defaced website on a server holding no personal data.

```text
Compliant
Not compliant
It depends
```

## Module 1 · Try it 1.2.1: Which theme?

Slide `act3`

### Poll 23

1 of 8: A written policy on taking files home

```text
Rules (organizational)
People
Places (physical)
Tech (technological)
```

### Poll 24

2 of 8: Background checks before hiring

```text
Rules (organizational)
People
Places (physical)
Tech (technological)
```

### Poll 25

3 of 8: A locked server room with a sign-in log

```text
Rules (organizational)
People
Places (physical)
Tech (technological)
```

### Poll 26

4 of 8: Multi-factor login to the portal

```text
Rules (organizational)
People
Places (physical)
Tech (technological)
```

### Poll 27

5 of 8: Yearly awareness training for all staff

```text
Rules (organizational)
People
Places (physical)
Tech (technological)
```

### Poll 28

6 of 8: Clear desks and locked screens at night

```text
Rules (organizational)
People
Places (physical)
Tech (technological)
```

### Poll 29

7 of 8: Backups that are tested by restoring

```text
Rules (organizational)
People
Places (physical)
Tech (technological)
```

### Poll 30

8 of 8: A list of all the office's information assets

```text
Rules (organizational)
People
Places (physical)
Tech (technological)
```

## Module 2 · Try it 2.1: Spot the weakness

Slide `spot`. Allow more than one answer (some cases have two).

### Poll 31

Case 1 of 6: The Assistance Portal's admin page can be reached from the internet, and it still uses the vendor's default password.

```text
People
Process
Technology
```

### Poll 32

Case 2 of 6: The whole approval team uses one login for the approval spreadsheet.

```text
People
Process
Technology
```

### Poll 33

Case 3 of 6: A contractor who left two months ago can still connect through the VPN.

```text
People
Process
Technology
```

### Poll 34

Case 4 of 6: Backups run every night, but no one has ever tried to restore one.

```text
People
Process
Technology
```

### Poll 35

Case 5 of 6: Field staff carry applicant forms on their personal USB sticks.

```text
People
Process
Technology
```

### Poll 36

Case 6 of 6: The server's operating system reached end of support last year and no longer receives security updates.

```text
People
Process
Technology
```

## Module 2 · Quick check: Which STRIDE letter?

Slide `stride-call`

### Poll 37

1 of 6: Someone logs in as Carla with her stolen password

```text
S (spoofing)
T (tampering)
R (repudiation)
I (information disclosure)
D (denial of service)
E (elevation of privilege)
```

### Poll 38

2 of 6: A payout amount is changed in the database

```text
S (spoofing)
T (tampering)
R (repudiation)
I (information disclosure)
D (denial of service)
E (elevation of privilege)
```

### Poll 39

3 of 6: A clerk deletes an application and there is no log to show who did it

```text
S (spoofing)
T (tampering)
R (repudiation)
I (information disclosure)
D (denial of service)
E (elevation of privilege)
```

### Poll 40

4 of 6: Applicant ID numbers appear on a public website

```text
S (spoofing)
T (tampering)
R (repudiation)
I (information disclosure)
D (denial of service)
E (elevation of privilege)
```

### Poll 41

5 of 6: Fake requests flood the portal on payout day

```text
S (spoofing)
T (tampering)
R (repudiation)
I (information disclosure)
D (denial of service)
E (elevation of privilege)
```

### Poll 42

6 of 6: A clerk account opens the admin page and creates new users

```text
S (spoofing)
T (tampering)
R (repudiation)
I (information disclosure)
D (denial of service)
E (elevation of privilege)
```

## Module 2 · Try it 2.3: Phish or legit? Messages 1 to 4

Slide `phish-1`

### Poll 43

Message 1 of 8 (email, on the screen): phish or legit?

```text
Phish
Legit
```

### Poll 44

Message 2 of 8 (email, on the screen): phish or legit?

```text
Phish
Legit
```

### Poll 45

Message 3 of 8 (text message, on the screen): phish or legit?

```text
Phish
Legit
```

### Poll 46

Message 4 of 8 (voicemail, on the screen): phish or legit?

```text
Phish
Legit
```

## Module 2 · Try it 2.3: Phish or legit? Messages 5 to 8

Slide `phish-2`

### Poll 47

Message 5 of 8 (QR poster, on the screen): phish or legit?

```text
Phish
Legit
```

### Poll 48

Message 6 of 8 (email, on the screen): phish or legit?

```text
Phish
Legit
```

### Poll 49

Message 7 of 8 (email, on the screen): phish or legit?

```text
Phish
Legit
```

### Poll 50

Message 8 of 8 (text message, on the screen): phish or legit?

```text
Phish
Legit
```
