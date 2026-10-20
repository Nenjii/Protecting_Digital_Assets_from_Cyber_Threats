// Page-level presenter UI that sits outside the scaled slide canvas:
// toasts, the side panels (glossary, IT depth) and the demo fallback viewer.
// Everything here carries .pdac-ui so it never shows in speaker-view previews.
import { getData, hasData } from './data';

let toastTimer = 0;

/** True when src/data/links.json has a link for this key. */
export function hasLink(key: string): boolean {
  const links = hasData('links.json') ? getData<Record<string, { url?: string }>>('links.json') : {};
  return Boolean(links[key]?.url);
}

export function toast(message: string, ms = 1800): void {
  let node = document.querySelector<HTMLElement>('.pdac-toast');
  if (!node) {
    node = document.createElement('div');
    node.className = 'pdac-ui pdac-toast';
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    document.body.append(node);
  }
  node.textContent = message;
  node.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => node!.classList.remove('is-on'), ms);
}

/** A right-hand drawer. Content is re-rendered for the current slide while open. */
export class SidePanel {
  readonly root: HTMLElement;
  private body: HTMLElement;
  private titleEl: HTMLElement;

  constructor(id: string, title: string, private renderFor: (slide: HTMLElement) => string, private afterRender?: (body: HTMLElement) => void) {
    this.root = document.createElement('aside');
    this.root.className = 'pdac-ui pdac-panel';
    this.root.id = id;
    this.root.setAttribute('aria-label', title);
    this.root.hidden = true;
    this.root.innerHTML = `
      <header class="pdac-panel__head">
        <h2 class="pdac-panel__title"></h2>
        <button type="button" class="pdac-panel__close" aria-label="Close panel">Close <span class="pdac-panel__key"></span></button>
      </header>
      <div class="pdac-panel__body" aria-live="polite"></div>`;
    this.titleEl = this.root.querySelector('.pdac-panel__title')!;
    this.titleEl.textContent = title;
    this.body = this.root.querySelector('.pdac-panel__body')!;
    this.root.querySelector('.pdac-panel__close')!.addEventListener('click', () => this.close());
    document.body.append(this.root);
  }

  set keyHint(k: string) {
    this.root.querySelector('.pdac-panel__key')!.textContent = k;
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(slide: HTMLElement): void {
    this.update(slide);
    this.root.hidden = false;
    requestAnimationFrame(() => this.root.classList.add('is-open'));
  }

  close(): void {
    this.root.classList.remove('is-open');
    this.root.hidden = true;
  }

  toggle(slide: HTMLElement): void {
    if (this.isOpen) this.close();
    else this.open(slide);
  }

  update(slide: HTMLElement): void {
    this.body.innerHTML = this.renderFor(slide);
    this.body.scrollTop = 0;
    this.afterRender?.(this.body);
  }
}

/** Plays public/fallback/<demo>.mp4, else shows <demo>.png, else says what to record. */
export class FallbackViewer {
  private root: HTMLElement;
  private stage: HTMLElement;
  private caption: HTMLElement;

  constructor() {
    this.root = document.createElement('div');
    this.root.className = 'pdac-ui pdac-fallback';
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', 'Recorded fallback');
    this.root.innerHTML = `
      <div class="pdac-fallback__bar">
        <span class="pdac-fallback__caption"></span>
        <button type="button" class="pdac-fallback__close">Close (F or Esc)</button>
      </div>
      <div class="pdac-fallback__stage"></div>`;
    this.stage = this.root.querySelector('.pdac-fallback__stage')!;
    this.caption = this.root.querySelector('.pdac-fallback__caption')!;
    this.root.querySelector('.pdac-fallback__close')!.addEventListener('click', () => this.close());
    document.body.append(this.root);
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(demo: string, label: string): void {
    this.caption.textContent = `Recorded fallback · ${label}`;
    this.stage.innerHTML = '';
    const video = document.createElement('video');
    video.src = `fallback/${demo}.mp4`;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.addEventListener('error', () => this.tryImage(demo), { once: true });
    this.stage.append(video);
    this.root.hidden = false;
  }

  private tryImage(demo: string): void {
    this.stage.innerHTML = '';
    const img = document.createElement('img');
    img.alt = `Screenshot of the ${demo} demo`;
    img.src = `fallback/${demo}.png`;
    img.addEventListener('error', () => {
      this.stage.innerHTML = `<p class="pdac-fallback__missing">No fallback recorded yet.<br>
        Add <code>public/fallback/${demo}.mp4</code> (60 seconds) or <code>public/fallback/${demo}.png</code>, then rebuild.</p>`;
    }, { once: true });
    this.stage.append(img);
  }

  close(): void {
    this.stage.querySelector('video')?.pause();
    this.root.hidden = true;
    this.stage.innerHTML = '';
  }
}

/** A full-screen QR code for one links.json key (L: the live poll), so phones can join from anywhere in the room. */
export class QrOverlay {
  private root: HTMLElement;

  constructor(private key: string, private heading: string, private hint: string) {
    this.root = document.createElement('div');
    this.root.className = 'pdac-ui pdac-qr-overlay';
    this.root.hidden = true;
    this.root.setAttribute('role', 'dialog');
    this.root.setAttribute('aria-label', heading);
    document.body.append(this.root);
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  /** False when the link is not set yet, so the caller can say what to do. */
  open(): boolean {
    if (!hasLink(this.key)) return false;
    this.root.innerHTML = `
      <p class="pdac-qr-overlay__k">${this.heading}</p>
      <pdac-qr-panel data-link="${this.key}"></pdac-qr-panel>
      <p class="pdac-qr-overlay__hint">${this.hint}</p>`;
    this.root.hidden = false;
    return true;
  }

  close(): void {
    this.root.hidden = true;
    this.root.innerHTML = '';
  }
}
