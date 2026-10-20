// Writes ../source/live-poll/questions.md (and .csv): every vote in the deck as a
// ready-to-paste live poll for Slido or Mentimeter, in slide order, from the same
// data the slides use. Neither tool imports polls from a file, so each poll is one
// question line plus an options block you paste in one go (one option per line).
// No answers are included: the deck reveals them. Run: npm run poll-pack.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, '../source/live-poll');
const data = (name) => JSON.parse(readFileSync(join(root, 'src/data', name), 'utf8'));
const plain = (s) => s.replace(/\[\[[\w-]+\|(.+?)\]\]/g, '$1').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\s+/g, ' ').trim();
const attr = (tag, name) => tag.match(new RegExp(`${name}="([^"]*)"`))?.[1];
const CHANNEL = { email: 'email', sms: 'text message', qr: 'QR poster', voice: 'voicemail' };

const polls = []; // { module, slide, title, question, options, note }
const modules = readdirSync(join(root, 'src/modules')).filter((f) => /^m\d.*\.html$/.test(f)).sort();
for (const file of modules) {
  const mod = file.match(/^m(\d)/)[1];
  const html = readFileSync(join(root, 'src/modules', file), 'utf8');
  for (const sec of html.matchAll(/<section id="([^"]+)"[^>]*>([\s\S]*?)<\/section>/g)) {
    const [, id, body] = sec;
    const title = plain(body.match(/<h2>([\s\S]*?)<\/h2>/)?.[1].replace(/<[^>]+>/g, '') ?? id);
    const eyebrow = sec[0].match(/data-eyebrow="([^"]*)"/)?.[1] ?? '';
    const head = `${eyebrow ? `${eyebrow}: ` : ''}${title}`;

    for (const [tag] of body.matchAll(/<pdac-vote-reveal[^>]*>/g)) {
      const d = data(attr(tag, 'data-src'));
      const items = Array.isArray(d) ? d : d.items;
      const options = (attr(tag, 'data-options') ?? '').split('|').filter(Boolean).map((o) => o.split(':').slice(1).join(':'));
      const multi = items.some((it) => Array.isArray(it.answer));
      items.forEach((it, i) => polls.push({ module: mod, slide: id, head, question: `Case ${i + 1} of ${items.length}: ${plain(it.text)}`, options,
        note: multi ? 'Allow more than one answer (some cases have two).' : '' }));
    }
    for (const [tag] of body.matchAll(/<pdac-phish-or-legit[^>]*>/g)) {
      const all = data(attr(tag, 'data-src')).messages;
      const [from, to] = (attr(tag, 'data-range') ?? '').split('-').map(Number);
      all.slice((from || 1) - 1, to || all.length).forEach((m) => {
        const n = all.indexOf(m) + 1;
        polls.push({ module: mod, slide: id, head, question: `Message ${n} of ${all.length} (${CHANNEL[m.channel] ?? m.channel}, on the screen): phish or legit?`, options: ['Phish', 'Legit'], note: '' });
      });
    }
    for (const [tag] of body.matchAll(/<pdac-match-board[^>]*>/g)) {
      const d = data(attr(tag, 'data-src'));
      const options = d.categories.map((c) => (c.term && c.term.toLowerCase() !== c.label.toLowerCase() ? `${c.label} (${c.term})` : c.label));
      d.items.forEach((it, i) => polls.push({ module: mod, slide: id, head, question: `${i + 1} of ${d.items.length}: ${plain(it.text)}`, options, note: '' }));
    }
  }
}

const md = [
  '# Live poll pack (Slido or Mentimeter)',
  '',
  'Every vote in the web presentation, in slide order, ready to paste. Made by `npm run poll-pack` in `pdac-web/` from the same data as the slides; run it again after changing a slide.',
  '',
  '**Set up (once per run):**',
  '',
  '1. Create one event (Slido) or presentation (Mentimeter) per run, for example "PDAC face-to-face, 21 October". Neither tool imports polls from a file.',
  '2. For each poll below: add a **multiple choice** poll, paste the question, then paste the whole options block at once (one option per line: Slido and Mentimeter split it into options).',
  '3. Do **not** mark correct answers: the deck reveals them, with the reason.',
  '4. Put the event\'s participant link in `pdac-web/src/data/links.json` under `live-poll`, then `npm run qr && npm run build`.',
  '',
  '**In class:** press **L** on any slide to show the poll QR code full screen (L or Esc closes); online, paste the link in the chat. Activate one poll at a time as you reach each case, then press **A** on the deck to reveal. If the internet drops, keep voting with cards and the deck\'s own tally (keys 1 to 9).',
  '',
  'No names, offices or other personal data are needed to vote. Keep the polls anonymous.',
  '',
];
let last = '';
polls.forEach((p, i) => {
  const group = `Module ${p.module} · ${p.head}`;
  if (group !== last) { md.push(`## ${group}`, '', `Slide \`${p.slide}\`${p.note ? `. ${p.note}` : ''}`, ''); last = group; }
  md.push(`### Poll ${i + 1}`, '', p.question, '', '```text', ...p.options, '```', '');
});
mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'questions.md'), md.join('\n'));

const csv = (s) => `"${String(s).replace(/"/g, '""')}"`;
const width = Math.max(...polls.map((p) => p.options.length));
const rows = [['Poll', 'Module', 'Slide', 'Question', ...Array.from({ length: width }, (_, i) => `Option ${i + 1}`)].map(csv).join(',')];
polls.forEach((p, i) => rows.push([i + 1, p.module, p.slide, p.question, ...p.options, ...Array(width - p.options.length).fill('')].map(csv).join(',')));
writeFileSync(join(out, 'questions.csv'), rows.join('\n') + '\n');
console.log(`poll-pack: ${polls.length} polls from ${new Set(polls.map((p) => p.slide)).size} slides → ../source/live-poll/questions.md and questions.csv`);
