// Tiny WebAudio synth — juicy feedback without audio files.

let ctx = null;
let muted = false;

try { muted = localStorage.getItem('dopamine:muted') === '1'; } catch {}

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function blip({ freq = 440, dur = 0.08, type = 'sine', gain = 0.06, slide = 0, delay = 0 }) {
  if (muted) return;
  try {
    const c = ac();
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t); o.stop(t + dur + 0.02);
  } catch { /* audio unavailable */ }
}

export const sfx = {
  click: () => blip({ freq: 520, dur: 0.05, type: 'triangle' }),
  hover: () => blip({ freq: 300, dur: 0.03, type: 'sine', gain: 0.02 }),
  correct: () => { blip({ freq: 523, dur: 0.09, type: 'triangle' }); blip({ freq: 784, dur: 0.12, type: 'triangle', delay: 0.07 }); },
  wrong: () => blip({ freq: 180, dur: 0.18, type: 'sawtooth', gain: 0.05, slide: -80 }),
  win: () => [523, 659, 784, 1047].forEach((f, i) => blip({ freq: f, dur: 0.14, type: 'triangle', delay: i * 0.09 })),
  lose: () => [392, 330, 262].forEach((f, i) => blip({ freq: f, dur: 0.16, type: 'sawtooth', gain: 0.04, delay: i * 0.12 })),
  tick: () => blip({ freq: 900, dur: 0.02, type: 'square', gain: 0.015 }),
  whoosh: () => blip({ freq: 220, dur: 0.15, type: 'sine', gain: 0.03, slide: 400 }),
};

export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('dopamine:muted', muted ? '1' : '0'); } catch {}
  return muted;
}
export function isMuted() { return muted; }
