import type { SlideMeta } from './types';

/** Thin bar at the top: the module's planned 4 hours, split into time-boxed
 *  segments (one per syllabus code, breaks shown hatched). The filled part is
 *  where the plan says you are on the current slide. */
export class ProgressBar {
  private root: HTMLElement;
  private fill: HTMLElement;
  private now: HTMLElement;
  private currentModule = '';

  constructor(private metas: SlideMeta[]) {
    this.root = document.createElement('div');
    this.root.className = 'pdac-ui pdac-progress';
    this.root.setAttribute('aria-hidden', 'true');
    this.root.innerHTML = '<div class="pdac-progress__segs"></div><div class="pdac-progress__fill"></div><div class="pdac-progress__now"></div>';
    this.fill = this.root.querySelector('.pdac-progress__fill')!;
    this.now = this.root.querySelector('.pdac-progress__now')!;
    document.body.append(this.root);
  }

  private build(moduleKey: string): void {
    const list = this.metas.filter((m) => m.module === moduleKey);
    const total = list.reduce((sum, m) => sum + m.minutes + m.breakAfter, 0) || 1;
    const segs = this.root.querySelector('.pdac-progress__segs')!;
    segs.innerHTML = '';
    let run: { code: string; minutes: number } | null = null;
    const flush = () => {
      if (run && run.minutes > 0) {
        const seg = document.createElement('span');
        seg.className = 'pdac-progress__seg';
        seg.style.flexGrow = String(run.minutes / total);
        segs.append(seg);
      }
      run = null;
    };
    for (const m of list) {
      const code = m.code.split('.').slice(0, 2).join('.') || 'open';
      if (!run || run.code !== code) {
        flush();
        run = { code, minutes: 0 };
      }
      run.minutes += m.minutes;
      if (m.breakAfter) {
        flush();
        const b = document.createElement('span');
        b.className = 'pdac-progress__seg is-break';
        b.style.flexGrow = String(m.breakAfter / total);
        segs.append(b);
      }
    }
    flush();
    this.currentModule = moduleKey;
  }

  update(slide: HTMLElement): void {
    const meta = this.metas.find((m) => m.id === slide.id && m.module === (slide.dataset.module ?? ''));
    const planned = meta && this.metas.some((m) => m.module === meta.module && m.minutes > 0);
    if (!meta || !planned) {
      this.root.hidden = true;
      return;
    }
    this.root.hidden = false;
    if (meta.module !== this.currentModule) this.build(meta.module);
    const list = this.metas.filter((m) => m.module === meta.module);
    const first = list[0].startMin;
    const total = list.reduce((sum, m) => sum + m.minutes + m.breakAfter, 0) || 1;
    const start = (meta.startMin - first) / total;
    const end = (meta.endMin - first) / total;
    this.fill.style.width = `${start * 100}%`;
    this.now.style.left = `${start * 100}%`;
    this.now.style.width = `${Math.max(end - start, 0.004) * 100}%`;
    this.root.classList.toggle('on-dark', slide.classList.contains('is-dark') || slide.classList.contains('is-accent'));
  }
}
