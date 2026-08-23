// MEMORY — Simon-style sequence game. Watch the pattern, repeat it. Pure reflex for your hippocampus.
import { store } from '../store.js';
import { sfx } from '../audio.js';
import { bigWin } from '../confetti.js';
import { animateNumber, winJuice } from '../juice.js';
import { submitScore, mountLeaderboard } from '../scores.js';
import { maybeShowInterstitial } from '../ads.js';
import { ui } from '../app.js';
import { shareTargets, nativeShare, hasNativeShare } from '../share.js';

const BEST_KEY = 'memory-level';
const PADS = [
  { color: '#7c3aed', glow: 'rgba(124,58,237,.8)', freq: 329.6 },   // violet E4
  { color: '#22d3ee', glow: 'rgba(34,211,238,.8)', freq: 415.3 },   // cyan G#4
  { color: '#f472b6', glow: 'rgba(244,114,182,.8)', freq: 523.3 },  // pink C5
  { color: '#a3e635', glow: 'rgba(163,230,53,.8)', freq: 659.3 }    // lime E5
];

export function renderMemory(view) {
  maybeShowInterstitial();
  const state = { seq: [], input: [], level: 0, phase: 'idle', timers: [] };

  view.innerHTML = `
    <div class="game-head">
      <button class="back-btn" data-nav href="#/" aria-label="Back">←</button>
      <div class="game-title">
        <h2>🧠 MEMORY</h2>
        <p>Watch the pattern. Repeat it. One extra step each round.</p>
      </div>
      <div class="stat-row">
        <div class="stat-chip hot"><b id="level-num" data-test="level">0</b><span>level</span></div>
        <div class="stat-chip"><b id="best-num">${store.best(BEST_KEY)}</b><span>best</span></div>
      </div>
    </div>
    <section class="stage" id="stage"></section>`;

  const stage = document.getElementById('stage');
  const levelEl = document.getElementById('level-num');
  const bestEl = document.getElementById('best-num');
  const cleanupTimers = () => { state.timers.forEach(clearTimeout); state.timers = []; };

  function board(statusText, btnLabel) {
    stage.innerHTML = `
      <p class="hl-question" data-test="status">${statusText}</p>
      <div class="mem-grid" data-test="pads">
        ${PADS.map((p, i) => `<button class="mem-pad" data-test="pad-${i}" data-idx="${i}" style="--pc:${p.color};--pg:${p.glow}" aria-label="pad ${i + 1}"></button>`).join('')}
      </div>
      <span class="sr-only" data-test="seq">${state.seq.join(',')}</span>
      <button class="btn big" id="mem-start" data-test="start-btn" style="margin-top:22px">${btnLabel}</button>`;
    stage.querySelector('#mem-start').addEventListener('click', nextLevel);
    stage.querySelector('[data-test="pads"]').addEventListener('click', onPad);
    applyInputLock();
  }

  function applyInputLock() {
    stage.querySelectorAll('.mem-pad').forEach(p => p.classList.toggle('locked', state.phase !== 'input'));
  }

  function flash(idx, dur = 420) {
    return new Promise(res => {
      const pad = stage.querySelector(`[data-test="pad-${idx}"]`);
      if (!pad) return res();
      const p = PADS[idx];
      pad.classList.add('lit');
      blip(p.freq);
      state.timers.push(setTimeout(() => { pad.classList.remove('lit'); res(); }, dur));
    });
  }

  function blip(freq) {
    if (document.getElementById('mute-btn').textContent === '🔇') return;
    try {
      const c = new (window.AudioContext || window.webkitAudioContext)();
      const o = c.createOscillator(); const g = c.createGain();
      o.type = 'triangle'; o.frequency.value = freq;
      g.gain.setValueAtTime(0.07, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.28);
      o.connect(g); g.connect(c.destination);
      o.start(); o.stop(c.currentTime + 0.3);
    } catch {}
  }

  async function playSequence() {
    state.phase = 'watch';
    applyInputLock();
    stage.querySelector('[data-test="status"]').innerHTML = `👁️ WATCH... <b>level ${state.level}</b>`;
    await new Promise(r => state.timers.push(setTimeout(r, 700)));
    for (const idx of state.seq) {
      await flash(idx);
      await new Promise(r => state.timers.push(setTimeout(r, 160)));
    }
    state.phase = 'input';
    state.input = [];
    applyInputLock();
    stage.querySelector('[data-test="status"]').innerHTML = `👆 YOUR TURN — repeat all <b>${state.seq.length}</b>`;
  }

  function nextLevel() {
    state.level++;
    state.seq.push(Math.floor(Math.random() * 4));
    levelEl.textContent = state.level;
    const seqEl = stage.querySelector('[data-test="seq"]');
    if (seqEl) seqEl.textContent = state.seq.join(',');
    playSequence();
  }

  function onPad(e) {
    const pad = e.target.closest('.mem-pad');
    if (!pad || state.phase !== 'input') return;
    const idx = parseInt(pad.dataset.idx, 10);
    flash(idx, 260);

    if (state.seq[state.input.length] !== idx) return gameOver();

    state.input.push(idx);
    if (state.input.length === state.seq.length) {
      state.phase = 'watch';
      applyInputLock();
      if (state.level >= 5 && state.level % 5 === 0) { winJuice(true); } else sfx.correct();
      stage.querySelector('[data-test="status"]').innerHTML = `✅ Nailed it! Next pattern incoming...`;
      state.timers.push(setTimeout(nextLevel, 900));
    }
  }

  function gameOver() {
    state.phase = 'over';
    cleanupTimers();
    sfx.lose();
    const best = store.setBest(BEST_KEY, state.level);
    bestEl.textContent = best;
    stage.innerHTML = `
      <div class="result-wrap" data-test="result">
        <span class="result-emoji">${state.level >= 10 ? '🧠' : state.level >= 6 ? '🔥' : '😵‍💫'}</span>
        <h3 class="result-title" data-test="result-title">Level ${state.level}</h3>
        <p class="result-msg">${state.level >= 10 ? 'Your hippocampus is showing off.' : state.level >= 6 ? 'Goldfish are quaking.' : 'The pattern was RIGHT THERE.'}</p>
        <div class="stat-row" style="justify-content:center;margin-bottom:22px">
          <div class="stat-chip hot"><b data-test="level-final">${state.level}</b><span>level</span></div>
          <div class="stat-chip"><b>${best}</b><span>best</span></div>
        </div>
        <div class="result-actions">
          <button class="btn cyan" id="mem-share">📤 Share</button>
          <button class="btn lime" id="mem-again">↻ Again</button>
          <a class="btn ghost" href="#/" data-nav>🏠 Hub</a>
        </div>
      </div>`;
    animateNumber(stage.querySelector('[data-test="level-final"]'), state.level);
    submitScore('memory', state.level);
    mountLeaderboard('memory', stage.querySelector('.result-wrap'));
    stage.querySelector('#mem-again').addEventListener('click', () => { sfx.click(); renderMemory(view); });
    stage.querySelector('#mem-share').addEventListener('click', () => {
      sfx.click();
      ui.openShareModal({
        title: 'Flex your memory',
        grid: null,
        text: `🧠 MEMORY\nI reached level ${state.level} ${state.level >= 10 ? '🧠' : '🔥'} (best: ${best})\nBeat me → https://dopamine.games`
      });
    });
  }

  board('Press start — pattern gets longer every level', '▶ Start');
}
