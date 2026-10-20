// Animation toolkit for the simulations. Every wait and tween belongs to a
// Timeline; cancelling it (R, a new step, a jump) stops them all at once, and
// the pending promises reject with CANCELLED, which run() swallows.
// With reduced motion, waits are skipped and tweens jump to their end state.

export const CANCELLED = Symbol('cancelled');

export const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const linear = (t: number): number => t;

export class Timeline {
  private alive = true;
  private timers = new Set<number>();
  private frames = new Set<number>();
  private pending = new Set<() => void>();

  get cancelled(): boolean {
    return !this.alive;
  }

  wait(ms: number): Promise<void> {
    return this.track((done) => {
      const id = window.setTimeout(() => {
        this.timers.delete(id);
        done();
      }, reducedMotion() ? 0 : ms);
      this.timers.add(id);
    });
  }

  /** Calls frame(p) with eased progress from 0 to 1 over ms, once per animation frame. */
  tween(ms: number, frame: (p: number) => void, ease: (t: number) => number = easeInOut): Promise<void> {
    if (!this.alive) return Promise.reject(CANCELLED);
    if (reducedMotion() || ms <= 0) {
      frame(1);
      return Promise.resolve();
    }
    return this.track((done) => {
      const t0 = performance.now();
      let id = 0;
      const tick = (now: number) => {
        this.frames.delete(id);
        const t = Math.min(1, (now - t0) / ms);
        frame(ease(t));
        if (t < 1) {
          id = requestAnimationFrame(tick);
          this.frames.add(id);
        } else done();
      };
      id = requestAnimationFrame(tick);
      this.frames.add(id);
    });
  }

  private track(start: (done: () => void) => void): Promise<void> {
    if (!this.alive) return Promise.reject(CANCELLED);
    return new Promise<void>((resolve, reject) => {
      const fail = () => reject(CANCELLED);
      this.pending.add(fail);
      start(() => {
        this.pending.delete(fail);
        resolve();
      });
    });
  }

  cancel(): void {
    if (!this.alive) return;
    this.alive = false;
    this.timers.forEach((id) => clearTimeout(id));
    this.frames.forEach((id) => cancelAnimationFrame(id));
    const pending = [...this.pending];
    this.timers.clear();
    this.frames.clear();
    this.pending.clear();
    pending.forEach((fail) => fail());
  }
}

/** Starts an async scene. Cancellation is expected and ignored; real errors are reported. */
export function run(task: Promise<unknown>): void {
  task.catch((err: unknown) => {
    if (err !== CANCELLED) console.error(err);
  });
}

/** Owns the current Timeline for a component: fresh() cancels the old one and starts a new one. */
export class Director {
  private tl = new Timeline();

  get now(): Timeline {
    return this.tl;
  }

  fresh(): Timeline {
    this.tl.cancel();
    this.tl = new Timeline();
    return this.tl;
  }

  stop(): void {
    this.tl.cancel();
  }
}
