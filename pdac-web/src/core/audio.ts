// Offline chime made with the Web Audio API (no sound files). Browsers only allow
// audio after a user gesture, so call unlockAudio() from a key or click handler.
let ctx: AudioContext | null = null;
let muted = false;

try {
  muted = localStorage.getItem('pdac:muted') === '1';
} catch {
  /* storage blocked: default to sound on */
}

export function unlockAudio(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

export function setMuted(value: boolean): void {
  muted = value;
  try {
    localStorage.setItem('pdac:muted', value ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function isMuted(): boolean {
  return muted;
}

/** Two soft tones. kind 'end' plays three. */
export function chime(kind: 'checkpoint' | 'warning' | 'end' | 'inject' = 'checkpoint'): void {
  if (muted || !ctx || document.documentElement.classList.contains('is-receiver')) return;
  const notes = {
    checkpoint: [660, 880],
    warning: [523, 523],
    end: [880, 660, 440],
    inject: [784, 988],
  }[kind];
  const t0 = ctx.currentTime + 0.02;
  notes.forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const start = t0 + i * 0.28;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.28, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(start);
    osc.stop(start + 0.65);
  });
}
