// Renders DOCS (content.mjs, Day 1; content-day2.mjs, Day 2) into printable .docx files.
//   node make-docx.mjs <out-dir> [filter,filter]   (only files whose name contains a filter)
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  Document, Paragraph, TextRun, Table, TableRow, TableCell, Header, Footer,
  WidthType, BorderStyle, ShadingType, AlignmentType, PageOrientation,
  LevelFormat, Packer, PageNumber, TabStopType, TabStopPosition,
} from 'docx';
import { DOCS as DAY1 } from './content.mjs';
import { DOCS as DAY2 } from './content-day2.mjs';

const filters = (process.argv[3] ?? '').split(',').map((f) => f.trim()).filter(Boolean);
const DOCS = [...DAY1, ...DAY2].filter((d) => !filters.length || filters.some((f) => d.file.includes(f)));

const outDir = process.argv[2];
if (!outDir) { console.error('usage: node make-docx.mjs <out-dir>'); process.exit(1); }

// US Letter in DXA (1440 = 1in). Portrait content area after 0.6in side margins.
const PAGE_W = 12240, PAGE_H = 15840, MARGIN = 864; // 0.6in
const CONTENT_W = PAGE_W - 2 * MARGIN;
const LAND_CONTENT_W = PAGE_H - 2 * MARGIN;

const NAVY = '14213D', ACCENT = 'B5561A', RULE = 'DCE1E8', MUTED = '6A7385', HEAD_BG = 'F2EFEA';

const runsOf = (text) => {
  // **bold** spans, no nesting.
  const parts = String(text).split(/(\*\*.+?\*\*)/g).filter(Boolean);
  return parts.map((p) => {
    const m = /^\*\*(.+)\*\*$/.exec(p);
    return new TextRun({ text: m ? m[1] : p, bold: Boolean(m), size: 21, font: 'Calibri' });
  });
};

const para = (text, opts = {}) => new Paragraph({ spacing: { after: 140, ...opts.spacing }, ...opts, children: runsOf(text) });

const h2 = (text) => new Paragraph({
  spacing: { before: 260, after: 120 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: ACCENT, space: 4 } },
  children: [new TextRun({ text, bold: true, size: 26, color: NAVY, font: 'Calibri' })],
});

const writingLines = (n) => Array.from({ length: n }, () => new Paragraph({
  spacing: { after: 220 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 1 } },
  children: [new TextRun({ text: '', size: 21 })],
}));

const question = (b) => [
  para(`**${b.n}.** ${b.q}`, { spacing: { before: 100, after: 60 } }),
  ...writingLines(b.lines),
];

function cell(text, opts = {}) {
  const { widthPct, head = false, fs = 10 } = opts;
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: head ? { type: ShadingType.CLEAR, fill: HEAD_BG } : undefined,
    margins: { top: 70, bottom: 70, left: 90, right: 90 },
    children: [new Paragraph({
      children: [new TextRun({ text: String(text ?? ''), bold: head, size: fs * 2, color: head ? NAVY : undefined, font: 'Calibri' })],
    })],
  });
}

function table(spec) {
  const { widths, head, rows, minH = 0, fs = 10 } = spec;
  const total = widths.reduce((a, b) => a + b, 0);
  const pct = widths.map((w) => (w / total) * 100);
  const trOpts = minH ? { height: { value: Math.round(minH * 1440), rule: 'atLeast' } } : {};
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: widths.map((w) => Math.round((w / total) * CONTENT_W)),
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: RULE }, bottom: { style: BorderStyle.SINGLE, size: 2, color: RULE },
      left: { style: BorderStyle.SINGLE, size: 2, color: RULE }, right: { style: BorderStyle.SINGLE, size: 2, color: RULE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: RULE }, insideVertical: { style: BorderStyle.SINGLE, size: 2, color: RULE },
    },
    rows: [
      new TableRow({ tableHeader: true, children: head.map((t, i) => cell(t, { widthPct: pct[i], head: true, fs })) }),
      ...rows.map((r) => new TableRow({ ...trOpts, children: r.map((t, i) => cell(t, { widthPct: pct[i], fs })) })),
    ],
  });
}

function checkbox(label) {
  return new Paragraph({
    spacing: { after: 140 },
    children: [
      new TextRun({ text: '☐  ', size: 24, font: 'Calibri' }), // ☐
      ...runsOf(label),
    ],
  });
}

function box(heightIn) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [CONTENT_W],
    rows: [new TableRow({
      height: { value: Math.round(heightIn * 1440), rule: 'atLeast' },
      children: [new TableCell({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 2, color: RULE }, bottom: { style: BorderStyle.SINGLE, size: 2, color: RULE },
          left: { style: BorderStyle.SINGLE, size: 2, color: RULE }, right: { style: BorderStyle.SINGLE, size: 2, color: RULE },
        },
        children: [new Paragraph({ children: [new TextRun({ text: '' })] })],
      })],
    })],
  });
}

// A 5-by-5 likelihood/impact matrix, blank, for the team to mark.
function matrixTable() {
  const impactHeads = ['1 Minor', '2 Moderate', '3 Serious', '4 Major', '5 Severe'];
  const likelihoods = ['5 Almost certain', '4 Likely', '3 Possible', '2 Unlikely', '1 Rare'];
  const widths = [18, ...impactHeads.map(() => (100 - 18) / 5)];
  const rows = likelihoods.map((l) => [l, '', '', '', '', '']);
  return table({ widths, head: ['Likelihood \\ Impact', ...impactHeads], rows, minH: 0.6, fs: 9 });
}

function fillSentence(text) {
  // Render blank-filled sentences with underlined runs for the blanks.
  const parts = text.split(/(_{3,})/g);
  const children = parts.map((p) => /^_{3,}$/.test(p)
    ? new TextRun({ text: ' '.repeat(Math.max(8, p.length)), underline: {}, size: 22 })
    : new TextRun({ text: p, size: 22, font: 'Calibri' }));
  return new Paragraph({ spacing: { before: 160, after: 160 }, children });
}

function blocksToChildren(blocks) {
  const children = [];
  for (const b of blocks) {
    if (b.pagebreak) { children.push(new Paragraph({ children: [], pageBreakBefore: true })); continue; }
    if (b.landscape || b.portrait) continue; // handled at section level by the caller
    if (b.h2) children.push(h2(b.h2));
    else if (b.p) children.push(para(b.p));
    else if (b.q) children.push(...question(b));
    else if (b.table) children.push(table(b.table), new Paragraph({ spacing: { after: 160 }, children: [] }));
    else if (b.checks) { children.push(...b.checks.map(checkbox)); }
    else if (b.box) { children.push(box(b.box.h), new Paragraph({ spacing: { after: 160 }, children: [] })); }
    else if (b.matrix) { children.push(matrixTable(), new Paragraph({ spacing: { after: 160 }, children: [] })); }
    else if (b.fill) children.push(fillSentence(b.fill));
  }
  return children;
}

function splitAtLandscape(blocks) {
  // Returns [{landscape:false, blocks:[...]}, {landscape:true, blocks:[...]}, ...];
  // {landscape:true} starts landscape pages, {portrait:true} goes back to portrait.
  const sections = [{ landscape: false, blocks: [] }];
  for (const b of blocks) {
    if (b.landscape) { sections.push({ landscape: true, blocks: [] }); continue; }
    if (b.portrait) { sections.push({ landscape: false, blocks: [] }); continue; }
    sections[sections.length - 1].blocks.push(b);
  }
  return sections.filter((s) => s.blocks.length);
}

function buildDoc(doc) {
  const header = new Header({
    children: [new Paragraph({
      tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: RULE, space: 4 } },
      children: [
        new TextRun({ text: doc.header, size: 16, color: MUTED, font: 'Calibri' }),
        new TextRun({ text: '\tProtecting Digital Assets from Cyber Threats', size: 16, color: MUTED, font: 'Calibri' }),
      ],
    })],
  });
  const footer = new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: 'Page ', size: 16, color: MUTED, font: 'Calibri' }),
        new TextRun({ children: [PageNumber.CURRENT], size: 16, color: MUTED, font: 'Calibri' }),
        new TextRun({ text: ' of ', size: 16, color: MUTED, font: 'Calibri' }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: MUTED, font: 'Calibri' }),
      ],
    })],
  });

  const titleBlock = [
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: doc.title, bold: true, size: 36, color: NAVY, font: 'Calibri' })] }),
    new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: doc.meta, size: 19, color: MUTED, italics: true, font: 'Calibri' })] }),
    para(doc.intro, { spacing: { after: 260 } }),
  ];

  const parts = splitAtLandscape(doc.blocks);
  const sections = parts.map((part, i) => {
    const w = part.landscape ? PAGE_H : PAGE_W, h = part.landscape ? PAGE_W : PAGE_H;
    const children = i === 0 ? [...titleBlock, ...blocksToChildren(part.blocks)] : blocksToChildren(part.blocks);
    return {
      properties: {
        page: {
          size: { width: w, height: h, orientation: part.landscape ? PageOrientation.LANDSCAPE : PageOrientation.PORTRAIT },
          margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        },
      },
      headers: { default: header },
      footers: { default: footer },
      children,
    };
  });

  return new Document({
    creator: 'Nino Filipen Duque',
    title: doc.title,
    styles: { default: { document: { run: { font: 'Calibri', size: 21 } } } },
    sections,
  });
}

for (const doc of DOCS) {
  const built = buildDoc(doc);
  const buf = await Packer.toBuffer(built);
  const path = join(outDir, `${doc.file}.docx`);
  writeFileSync(path, buf);
  console.log('wrote', path, `(${(buf.length / 1024).toFixed(0)} KB)`);
}
