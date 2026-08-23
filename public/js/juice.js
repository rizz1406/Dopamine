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
