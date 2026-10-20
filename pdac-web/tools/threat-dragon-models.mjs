// Builds two OWASP Threat Dragon (v2) models for Module 2, so the room can see the
// course's data flow maps in a real threat modeling tool:
//   public/tools/threat-dragon/rsso-booking-page.json   the worked example, from
//     src/data/m2-booking-dfd.json (same shapes, flows, boundaries and the guide's
//     three worked threats), so the slide and the model never disagree
//   public/tools/threat-dragon/rsso-portal-starter.json  the graded activity's
//     starter list only (no flows, boundaries or threats: the teams add those)
// Run: npm run threat-dragon. Format checked against Threat Dragon 2.6.2's schema.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, 'public/tools/threat-dragon');
const VERSION = '2.6.2';
const STRIDE = { S: 'Spoofing', T: 'Tampering', R: 'Repudiation', I: 'Information disclosure', D: 'Denial of service', E: 'Elevation of privilege' };

// Stable ids, so rebuilding gives the same file.
const uuid = (...parts) => {
  const h = createHash('sha1').update(parts.join('/')).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-${(8 + (parseInt(h[16], 16) & 3)).toString(16)}${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const int = (n) => Math.round(n);
const SIDES = ['top', 'right', 'bottom', 'left'];
const portAttrs = { circle: { r: 4, magnet: true, stroke: '#5F95FF', strokeWidth: 1, fill: '#fff', style: { visibility: 'hidden' } } };
const ports = (id) => ({
  groups: Object.fromEntries(SIDES.map((s) => [s, { position: s, attrs: portAttrs }])),
  items: SIDES.map((s) => ({ group: s, id: uuid(id, 'port', s) })),
});

function node(model, kind, name, x, y, extra = {}) {
  const id = uuid(model, kind, name);
  const base = { name, description: extra.description ?? '', outOfScope: false, reasonOutOfScope: '', threats: extra.threats ?? [], hasOpenThreats: Boolean(extra.threats?.length) };
  const shapes = {
    actor: { size: { width: 160, height: 80 }, attrs: { text: { text: name }, body: { stroke: '#333333', strokeWidth: 1.5, strokeDasharray: null } },
      data: { type: 'tm.Actor', isTrustBoundary: false, providesAuthentication: false, ...base } },
    process: { size: { width: 120, height: 120 }, attrs: { text: { text: name }, body: { stroke: '#333333', strokeWidth: 1.5, strokeDasharray: null } },
      data: { type: 'tm.Process', isTrustBoundary: false, handlesCardPayment: false, handlesGoodsOrServices: false, isWebApplication: Boolean(extra.web), privilegeLevel: '', ...base } },
    store: { size: { width: 160, height: 80 }, attrs: { text: { text: name }, topLine: { stroke: '#333333', strokeWidth: 1.5, strokeDasharray: null }, bottomLine: { stroke: '#333333', strokeWidth: 1.5, strokeDasharray: null } },
      data: { type: 'tm.Store', isTrustBoundary: false, isALog: false, storesCredentials: false, isEncrypted: false, isSigned: false, ...base } },
  }[kind];
  return { position: { x: int(x), y: int(y) }, size: shapes.size, attrs: shapes.attrs, visible: true, shape: kind, ports: ports(id), id, zIndex: 3, data: shapes.data };
}

function centre(n) { return { x: n.position.x + n.size.width / 2, y: n.position.y + n.size.height / 2 }; }
function side(from, to) {
  const a = centre(from), b = centre(to);
  const dx = b.x - a.x, dy = b.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
  return dy >= 0 ? 'bottom' : 'top';
}

function flow(model, a, b, name, opts = {}) {
  const id = uuid(model, 'flow', a.data.name, b.data.name, name);
  const fromSide = opts.fromSide ?? side(a, b), toSide = opts.toSide ?? side(b, a);
  return {
    shape: 'flow',
    attrs: { line: { stroke: '#333333', targetMarker: { name: 'block' }, sourceMarker: { name: opts.both ? 'block' : '' }, strokeDasharray: null } },
    width: 200, height: 100, zIndex: 10,
    labels: [{ markup: [{ tagName: 'ellipse', selector: 'labelBody' }, { tagName: 'text', selector: 'labelText' }],
      attrs: { labelText: { text: name, textAnchor: 'middle', textVerticalAnchor: 'middle' }, labelBody: { ref: 'labelText', refRx: '50%', refRy: '60%', fill: '#fff', strokeWidth: 0 } },
      position: { distance: 0.5, args: { keepGradient: true, ensureLegibility: true } } }],
    connector: 'smooth',
    data: { type: 'tm.Flow', name, description: opts.description ?? '', outOfScope: false, reasonOutOfScope: '', hasOpenThreats: false,
      isBidirectional: Boolean(opts.both), isEncrypted: false, isPublicNetwork: Boolean(opts.publicNetwork), protocol: '', threats: [] },
    id,
    source: { cell: a.id, port: uuid(a.id, 'port', fromSide) },
    target: { cell: b.id, port: uuid(b.id, 'port', toSide) },
    vertices: (opts.vertices ?? []).map((v) => ({ x: int(v.x), y: int(v.y) })),
  };
}

function boundaryCurve(model, name, from, to) {
  return {
    shape: 'trust-boundary-curve',
    attrs: { line: { targetMarker: { name: '' }, sourceMarker: { name: '' } } },
    width: 200, height: 100, zIndex: 10,
    labels: [{ markup: [{ tagName: 'ellipse', selector: 'labelBody' }, { tagName: 'text', selector: 'labelText' }],
      attrs: { labelText: { text: name, textAnchor: 'middle', textVerticalAnchor: 'middle' }, labelBody: { ref: 'labelText', refRx: '50%', refRy: '60%', fill: '#fff', strokeWidth: 0 } },
      position: { distance: 0.5, args: { keepGradient: true, ensureLegibility: true } } }],
    connector: 'smooth',
    data: { type: 'tm.Boundary', name, description: '', isTrustBoundary: true, hasOpenThreats: false },
    id: uuid(model, 'boundary', name),
    source: { x: int(from.x), y: int(from.y) },
    target: { x: int(to.x), y: int(to.y) },
    vertices: [],
  };
}

function boundaryBox(model, name, x, y, w, h) {
  return {
    position: { x: int(x), y: int(y) }, size: { width: int(w), height: int(h) },
    attrs: { label: { text: name } }, visible: true, shape: 'trust-boundary-box', id: uuid(model, 'box', name), zIndex: -1,
    data: { type: 'tm.BoundaryBox', name, description: '', isTrustBoundary: true, hasOpenThreats: false },
  };
}

function textBlock(model, text, x, y, w, h) {
  return { position: { x, y }, size: { width: w, height: h }, attrs: { text: { text } }, visible: true, shape: 'td-text-block', zIndex: 1,
    id: uuid(model, 'text'), data: { type: 'tm.Text', name: text, hasOpenThreats: false } };
}

function model(title, description, cells, threatTop) {
  return {
    version: VERSION,
    summary: { title, owner: 'Protecting Digital Assets from Cyber Threats (DICT ILCDB course)', description, id: 0 },
    detail: {
      contributors: [],
      diagrams: [{ id: 0, title: 'Data flow map (STRIDE)', diagramType: 'STRIDE', placeholder: '', thumbnail: './public/content/images/thumbnail.stride.jpg', version: VERSION, cells }],
      diagramTop: 1, reviewer: '', threatTop,
    },
  };
}

// ---- 1. The worked example, from the slide's own data ----
const dfd = JSON.parse(readFileSync(join(root, 'src/data/m2-booking-dfd.json'), 'utf8'));
const SEVERITY = { t1: 'Medium', t2: 'High', t3: 'Medium' }; // t2 and t3: the guide's register, 12 High and 6 Medium
const scale = (v) => 60 + v * 0.8;
let number = 0;
const nodes = {};
for (const n of dfd.nodes) {
  const worked = dfd.threats.filter((t) => t.worked && t.element === n.id);
  const threats = worked.map((t) => ({
    id: uuid('booking', 'threat', t.id), number: ++number, status: 'Open', severity: SEVERITY[t.id] ?? 'Medium',
    title: t.threat.replace(/\.$/, ''), type: STRIDE[t.letter], modelType: 'STRIDE', description: t.threat, mitigation: t.control, score: '',
  }));
  const kind = n.type === 'external' ? 'actor' : n.type;
  const cx = n.type === 'process' ? n.x : n.x + (n.w ?? 220) / 2;
  const cy = n.type === 'process' ? n.y : n.y + (n.h ?? 100) / 2;
  const size = kind === 'process' ? 120 : 160;
  const height = kind === 'process' ? 120 : 80;
  nodes[n.id] = node('booking', kind, n.label, scale(cx) - size / 2, scale(cy) - height / 2, { threats, web: n.id === 'p1' });
}
const flows = dfd.flows.map((f) => flow('booking', nodes[f.from], nodes[f.to], f.label ?? f.name ?? '', {
  both: f.both, description: f.name ?? '', publicNetwork: f.id === 'f1' || f.id === 'f5',
  vertices: f.via?.map((v) => ({ x: scale(v[0]), y: scale(v[1]) })),
  ...(f.via ? { fromSide: 'bottom', toSide: 'bottom' } : {}),
}));
const [line, box] = dfd.boundaries;
const curve = boundaryCurve('booking', line.label, { x: scale(line.points[0][0]), y: scale(line.points[0][1]) }, { x: scale(line.points[1][0]), y: scale(line.points[1][1]) });
const xs = box.points.map((p) => p[0]), ys = box.points.map((p) => p[1]);
const vendorBox = boundaryBox('booking', box.label, scale(Math.min(...xs)), scale(Math.min(...ys)), (Math.max(...xs) - Math.min(...xs)) * 0.8, (Math.max(...ys) - Math.min(...ys)) * 0.8);
const booking = model(
  "RSSO online appointment booking page (fictional)",
  "Worked example from the Module 2 learner guide. Citizens book an office visit online with their name, mobile number and purpose; a cloud form service keeps the list; staff check it and confirm by SMS. The model holds the guide's three worked STRIDE threats: add your own at each trust boundary.",
  [vendorBox, ...Object.values(nodes), ...flows, curve],
  number,
);

// ---- 2. The graded activity's starter list (from the learner guide) ----
const STARTER = {
  actor: ['Citizen', 'SMS vendor', 'E-wallet provider', 'Staff working from home'],
  process: ['Submit application', 'Approve application', 'Pay out', 'Send SMS update'],
  store: ['Applicant database', 'Approval spreadsheet', 'Backup USB drive'],
};
const starterCells = [textBlock('starter', 'Starter list from the learner guide. Draw the data flows and every trust boundary, then add at least 8 threats, each with its STRIDE letter.', 60, 20, 520, 70)];
Object.entries(STARTER).forEach(([kind, names], row) => names.forEach((name, i) => {
  starterCells.push(node('starter', kind, name, 60 + i * 230, 140 + row * 190));
}));
const starter = model(
  'RSSO Assistance Portal: starter list (fictional)',
  'Starter for the graded Module 2 risk assessment: the outside parties, steps and data stores from the learner guide. Your team adds the data flows, trust boundaries and threats.',
  starterCells,
  0,
);

mkdirSync(out, { recursive: true });
writeFileSync(join(out, 'rsso-booking-page.json'), JSON.stringify(booking, null, 2) + '\n');
writeFileSync(join(out, 'rsso-portal-starter.json'), JSON.stringify(starter, null, 2) + '\n');
console.log(`threat-dragon: wrote rsso-booking-page.json (${booking.detail.diagrams[0].cells.length} cells, ${number} threats) and rsso-portal-starter.json (${starterCells.length} cells) to public/tools/threat-dragon/`);
