import Reveal from 'reveal.js';
import RevealNotes from 'reveal.js/plugin/notes/notes.esm.js';
import 'reveal.js/dist/reveal.css';

// Self-hosted fonts (SIL Open Font License), bundled into dist/assets.
import '@fontsource/source-serif-4/400.css';
import '@fontsource/source-serif-4/500.css';
import '@fontsource/source-serif-4/600.css';
import '@fontsource/source-serif-4/700.css';
import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/400-italic.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';

import './styles/tokens.css';
import './styles/slides.css';
import './styles/components.css';
import './styles/presenter.css';
import './styles/sims.css';

import { registerComponents } from './components';
import type { PdacCountdown } from './components/countdown';
import type { PdacGlossaryPanel } from './components/glossary-panel';
import { decorateSlides } from './core/decorate';
import { blackoutFirst, highlightNow, runCountUps } from './core/effects';
import { evidenceFor, hydrateQr } from './core/evidence';
import { renderIcons } from './core/icons';
import { pickModule, renderLauncher } from './core/modules';
import { FallbackViewer, QrOverlay, SidePanel } from './core/overlays';
import { initPresenter, itDepthFor, initReceiverMirror, relayKeysFromReceiver } from './core/presenter';
import { ProgressBar } from './core/progress';
import type { Deck } from './core/types';

const params = new URLSearchParams(location.search);
// Speaker-view previews load this page with ?receiver: they show slides only.
const isReceiver = params.has('receiver');
if (isReceiver) document.documentElement.classList.add('is-receiver');
// ?draft=1 outlines every element marked data-verify (wording to confirm against the deck).
const isDraft = params.has('draft');
if (isDraft) document.documentElement.classList.add('is-draft');

registerComponents();

async function start(): Promise<void> {
  const launcher = document.getElementById('launcher')!;
  const revealEl = document.querySelector<HTMLElement>('.reveal')!;
  const slidesEl = revealEl.querySelector<HTMLElement>('.slides')!;

  const mod = pickModule();
  if (!mod) {
    revealEl.remove();
    renderLauncher(launcher);
    return;
  }

  launcher.remove();
  revealEl.hidden = false;
  document.title = mod.number ? `Module ${mod.number} · ${mod.title}` : mod.title;
  // Shown faintly on the blackout (pause) screen, so the room still sees the module.
  revealEl.style.setProperty('--module-title', JSON.stringify(document.title));
  slidesEl.innerHTML = mod.html ?? '';
  renderIcons(slidesEl);
  const metas = decorateSlides(slidesEl);

  const deck = new Reveal(revealEl, {
    width: 1920,
    height: 1080,
    margin: 0,
    center: false,
    hash: true,
    slideNumber: false, // each slide's footer carries its deck number (c/t), scaled with the slide
    transition: 'fade',
    display: 'flex',
    controls: false,
    progress: false,
    jumpToSlide: true,
    help: true,
    pdfSeparateFragments: false, // ?print-pdf gives one page per slide, all steps shown
    ...(isReceiver ? { keyboard: relayKeysFromReceiver() } : {}),
    plugins: [RevealNotes],
  } as Reveal.Options) as Deck;
  await deck.initialize();
  (window as unknown as { pdacDeck: Deck }).pdacDeck = deck; // used by tools/screenshots.mjs and tools/smoke-test.mjs

  const current = () => deck.getCurrentSlide();
  const onSlide = () => {
    runCountUps(current());
    highlightNow(current());
  };
  deck.on('slidechanged', onSlide as EventListener);
  onSlide();
  setInterval(() => highlightNow(current()), 30_000);

  if (isReceiver) initReceiverMirror(deck);
  if (isReceiver || deck.isPrintView()) return;

  // Presenter UI (page level, outside the scaled canvas).
  const countdown = document.createElement('pdac-countdown') as PdacCountdown;
  const glossary = document.createElement('pdac-glossary-panel') as PdacGlossaryPanel;
  document.body.append(countdown, glossary);
  const itDepth = new SidePanel('pdac-itdepth', 'IT depth', itDepthFor);
  itDepth.keyHint = 'I';
  const evidence = new SidePanel('pdac-evidence', 'Sources on this slide', evidenceFor, hydrateQr);
  evidence.keyHint = 'E';
  const fallback = new FallbackViewer();
  const poll = new QrOverlay('live-poll', 'Vote on your phone', 'L or Esc closes · online: paste the link in the chat');
  const progress = new ProgressBar(metas);
  progress.update(current());
  deck.on('slidechanged', (() => progress.update(current())) as EventListener);
  blackoutFirst(deck);

  initPresenter({ deck, countdown, glossary, itDepth, evidence, fallback, poll });

  if (isDraft) {
    const badge = document.createElement('div');
    badge.className = 'pdac-ui pdac-draft-badge';
    document.body.append(badge);
    const count = () => {
      const n = current().querySelectorAll('[data-verify]').length;
      const total = document.querySelectorAll('.reveal [data-verify]').length;
      badge.textContent = `Draft: ${n} to verify here · ${total} in this module`;
    };
    deck.on('slidechanged', count as EventListener);
    count();
  }

  // Listed in the reveal.js help overlay (?).
  const help: [string, string][] = [
    ['A', 'Show answer on the interactive'],
    ['R', 'Reset the interactive'],
    ['T', 'Start / pause the activity timer'],
    ['X', 'Stop the timer'],
    ['K', 'Break timer'],
    ['G', 'Glossary panel'],
    ['I', 'IT depth panel'],
    ['E', 'Sources: the exact quotes behind the numbers, with QR codes'],
    ['F', 'Fallback clip on demo slides (full screen elsewhere)'],
    ['J', 'Jump to a slide (number, id or word)'],
    ['L', 'Live poll QR code (Slido or Mentimeter link in links.json)'],
    ['1 – 9', 'Add a vote to that option'],
    ['S', 'Speaker view'],
  ];
  help.forEach(([k, v]) => deck.registerKeyboardShortcut(k, v));
}

void start();
