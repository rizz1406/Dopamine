// REFLEX — 5-round reaction test with trash talk.
import { REACTIONS } from '../data.js';
import { store } from '../store.js';
import { sfx } from '../audio.js';
import { bigWin } from '../confetti.js';
import { submitScore, mountLeaderboard } from '../scores.js';
import { maybeShowInterstitial } from '../ads.js';
import { ui } from '../app.js';

const BEST_KEY = 'reflex-avg';
const ROUNDS = 5;

export function renderReflex(view) {
  maybeShowInterstitial();
  const state = {
    round: 0,
    times: [],
    phase: 'idle', // idle | waiting | go | too-soon | done
    timer: null,
    goAt: 0
  };

  view.innerHTML = `
    <div class="game-head">
      <button class="back-btn" data-nav href="#/" aria-label="Back">←</button>
      <div class="game-title">
        <h2>⚡ REFLEX</h2>
        <p>Wait for green. Click. Repeat ×${ROUNDS}. Blame your mouse if slow.</p>
      </div>
      <div class="stat-row">
        <div class="stat-chip"><b data-test="best">${store.best(BEST_KEY) || '—'}</b><span>best avg</span></div>
      </div>
    </div>
    <section class="stage" id="stage"></section>`;

  const stage = document.getElementById('stage');

  function zone() { return stage.querySelector('#reflex-zone'); }

  function renderIdle() {
    const dots = state.times.map(t => `<i class="done-ok"></i>`).join('');
    const remaining = ROUNDS - state.times.length;
    stage.innerHTML = `
      <div id="reflex-zone" class="reflex-zone ${state.phase === 'too-soon' ? 'too-soon' : ''}" data-test="zone">
        ${state.phase === 'too-soon'
          ? `<span class="reflex-big">😤 TOO SOON</span><span class="reflex-sub">Patience, grasshopper. Click to retry this round.</span>`
          : `<span class="reflex-big">⚡ READY?</span><span class="reflex-sub" data-test="zone-hint">${remaining > 0 ? `Round ${state.round + 1} of ${ROUNDS} — click to start` : ''}</span>`}
      </div>
      <div class="round-dots" data-test="dots">
        ${Array.from({ length: ROUNDS }, (_, i) => {
          if (i < state.times.length) return '<i class="done-ok"></i>';
          return i === state.round ? '<i class="cur"></i>' : '<i></i>';
        }).join('')}
      </div>`;
    zone().addEventListener('click', onZoneClick);
  }

  function startWaiting() {
    state.phase = 'waiting';
    const z = zone();
    z.className = 'reflex-zone waiting';
    z.innerHTML = `<span class="reflex-big">WAIT FOR GREEN...</span><span class="reflex-sub" style="color:var(--red)">Click now and suffer public shame</span>`;
    state.timer = setTimeout(() => {
      if (state.phase !== 'waiting') return;
      state.phase = 'go';
      sfx.tick();
      const z2 = zone();
      z2.className = 'reflex-zone go';
      z2.innerHTML = `<span class="reflex-big" data-test="go-signal">CLICK!!!</span>`;
      state.goAt = performance.now();
    }, 900 + Math.random() * 2600);
  }

  function onZoneClick() {
    if (state.phase === 'idle' || state.phase === 'too-soon') {
      sfx.click();
      startWaiting();
      return;
    }
    if (state.phase === 'waiting') {
      // jumped the gun
      clearTimeout(state.timer);
      state.phase = 'too-soon';
      sfx.wrong();
      renderIdle();
      return;
    }
    if (state.phase === 'go') {
      const ms = Math.round(performance.now() - state.goAt);
      state.times.push(ms);
      state.round++;
      sfx.correct();
      state.phase = 'done';
      const z = zone();
      z.className = 'reflex-zone done';
      z.innerHTML = `<span class="reflex-ms count-up" data-test="ms">${ms}</span><span class="reflex-sub">milliseconds — click for next</span>`;
      z.addEventListener('click', () => nextRound(), { once: true });
    }
  }

  function nextRound() {
    if (state.times.length >= ROUNDS) finish();
    else { state.phase = 'idle'; renderIdle(); }
  }

  function average() {
    return Math.round(state.times.reduce((a, b) => a + b, 0) / state.times.length);
  }

  function verdict(avg) {
    return REACTIONS.find(r => avg <= r.max);
  }

  function finish() {
    const avg = average();
    const v = verdict(avg);
    const best = store.setBest(BEST_KEY, avg);
    store.pushHistory('reflex', { avg, day: new Date().toISOString().slice(0, 10) });
    if (avg < 280) bigWin();
    stage.innerHTML = `
      <div class="result-wrap" data-test="result">
        <span class="result-emoji">${avg <= 250 ? '🦾' : avg <= 350 ? '😎' : '🥲'}</span>
        <h3 class="result-title" data-test="result-title">${v.title}</h3>
        <p class="result-msg">${v.msg}</p>
        <div class="hl-duel" style="grid-template-columns:repeat(3,1fr);max-width:480px;margin:0 auto 22px">
          <div class="stat-chip"><b class="count-up" data-test="avg-final">${avg}<small style="font-size:.6em">ms</small></b><span>average</span></div>
          <div class="stat-chip"><b>${Math.min(...state.times)}</b><span>fastest</span></div>
          <div class="stat-chip"><b>${best || avg}</b><span>best avg</span></div>
        </div>
        <p class="hint-line" style="margin-top:-8px">times: ${state.times.join(' · ')} ms</p>
        <div class="result-actions">
          <button class="btn cyan" id="share-rx">📤 Share Score</button>
          <button class="btn lime" id="again-rx">↻ Go Again</button>
          <a class="btn ghost" href="#/" data-nav>🏠 Hub</a>
        </div>
      </div>`;
    submitScore('reflex', Math.max(1, 1000 - avg));
    mountLeaderboard('reflex', stage.querySelector('.result-wrap'));
    stage.querySelector('#again-rx').addEventListener('click', () => { sfx.click(); renderReflex(view); });
    stage.querySelector('#share-rx').addEventListener('click', () => {
      sfx.click();
      ui.openShareModal({
        title: 'Flex your reflexes',
        grid: null,
        text: `⚡ REFLEX TEST\nAverage: ${avg}ms — ${v.title}\nThink you're faster? → dopamine.games`
      });
    });
  }

  renderIdle();
}
