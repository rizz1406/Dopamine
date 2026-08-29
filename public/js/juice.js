// juice.js — satisfaction layer: count-ups, screen pulse, grid stagger.
import { sfx } from './audio.js';

/** Animate a number from 0 (or current) to target inside an element. */
export function animateNumber(el, target, { duration = 900, prefix = '', suffix = '' } = {}) {
  if (!el) return;
  const start = performance.now();
  const from = 0;
  function frame(t) {
    const p = Math.min(1, (t - start) / duration);
    const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
    el.textContent = prefix + Math.round(from + (target - from) * eased) + suffix;
    if (p < 1) requestAnimationFrame(frame);
    else el.classList.add('bumped');
  }
  requestAnimationFrame(frame);
}

/** Full-screen white radial pulse — fire on wins. */
export function screenPulse() {
  const el = document.createElement('div');
  el.className = 'screen-pulse';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 650);
}

/** Wrap each emoji cell of a result grid in spans with staggered flip-in. */
export function staggerGrid(el) {
  if (!el) return;
  const text = el.textContent.replace(/<br>/g, '\n');
  let i = 0;
  el.innerHTML = [...text].map(ch => {
    if (ch === '\n') return '<br>';
    if ('🟩🟥🟨⬛'.includes(ch)) return `<span style="animation-delay:${(i++ * 90)}ms">${ch}</span>`;
    return ch;
  }).join('');
}

/** Big juicy win combo. */
export function winJuice(intense = false) {
  sfx.win();
  screenPulse();
  if (intense) import('./confetti.js').then(m => m.bigWin());
}

/** Screen shake — call on hits, clears, explosions. */
export function shake(intensity = 6) {
  const el = document.getElementById('view');
  if (!el) return;
  el.style.animation = 'none';
  void el.offsetWidth;
  el.style.animation = `shake ${0.32 + intensity * 0.02}s cubic-bezier(.36,.07,.19,.97)`;
  setTimeout(() => el.style.animation = '', 400);
}

/** Spawn sparks at (x,y) viewport coords. */
export function sparks(x, y, { color = '#facc15', count = 8 } = {}) {
  for (let i = 0; i < count; i++) {
    const s = document.createElement('div');
    s.className = 'spark';
    s.style.left = x + 'px'; s.style.top = y + 'px';
    s.style.background = color;
    const ang = (i / count) * 360 + Math.random() * 20;
    const dist = 40 + Math.random() * 50;
    const dx = Math.cos(ang * Math.PI / 180) * dist;
    const dy = Math.sin(ang * Math.PI / 180) * dist;
    s.style.setProperty('--dx', dx + 'px');
    s.style.setProperty('--dy', dy + 'px');
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 600);
  }
}

/** Brief hit-stop freeze. */
export function hitStop(ms = 80) {
  document.body.style.animation = `hitstop ${ms}ms steps(1)`;
  setTimeout(() => document.body.style.animation = '', ms + 20);
}

/** Pop scale on element. */
export function pop(el) {
  if (!el) return;
  el.style.animation = 'none'; void el.offsetWidth;
  el.style.animation = 'pop .32s cubic-bezier(.34,1.56,.64,1)';
  setTimeout(() => el.style.animation = '', 320);
}
