// 2048 — slide, merge, chase the big tile. Arrow keys / WASD / swipe.
import { store } from '../store.js';
import { sfx } from '../audio.js';
import { bigWin } from '../confetti.js';
import { animateNumber } from '../juice.js';
import { submitScore, mountLeaderboard } from '../scores.js';
import { maybeShowInterstitial } from '../ads.js';
import { ui } from '../app.js';

const BEST_KEY = 'g2048-score';
const N = 4;
const COLORS = { 2: '#3c3c52', 4: '#4a4468', 8: '#7c3aed', 16: '#8b5cf6', 32: '#a855f7', 64: '#d946ef', 128: '#f472b6', 256: '#fb7185', 512: '#fb923c', 1024: '#fbbf24', 2048: '#a3e635' };

export function render2048(view, registerCleanup) {
  maybeShowInterstitial();
  const state = { board: [], score: 0, over: false, won: false };

  view.innerHTML = `
    <div class="game-head">
      <button class="back-btn" data-nav href="/" aria-label="Back">←</button>
      <div class="game-title">
        <h2>🔢 2048</h2>
        <p>Slide, merge equal tiles, reach 2048.</p>
      </div>
      <div class="stat-row">
        <div class="stat-chip hot"><b id="g2048-score" data-test="score">0</b><span>score</span></div>
        <div class="stat-chip"><b id="g2048-best">${store.best(BEST_KEY)}</b><span>best</span></div>
      </div>
    </div>
    <section class="stage" style="padding:14px">
      <div class="race-wrap" style="position:relative">
        <div id="g2048-board" data-test="board" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;background:#14141d;border-radius:16px;padding:12px;max-width:400px;margin:0 auto;aspect-ratio:1"></div>
        <div class="race-overlay" id="g2048-overlay" data-test="overlay"></div>
      </div>
      <p class="hint-line" style="margin-top:12px">Arrow keys / WASD / swipe</p>
    </section>`;

  const boardEl = document.getElementById('g2048-board');
  const overlay = document.getElementById('g2048-overlay');
  const scoreEl = document.getElementById('g2048-score');
  const bestEl = document.getElementById('g2048-best');

  function addTile() {
    const empty = [];
    state.board.forEach((row, r) => row.forEach((v, c) => { if (!v) empty.push([r, c]); }));
    if (!empty.length) return;
    const [r, c] = empty[(Math.random() * empty.length) | 0];
    state.board[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  function paint() {
    boardEl.innerHTML = state.board.flatMap((row, r) => row.map((v, c) =>
      `<div data-test="tile" style="
        aspect-ratio:1;border-radius:10px;display:flex;align-items:center;justify-content:center;
        font-family:'Archivo Black',sans-serif;font-size:${v >= 1024 ? '1.2rem' : v >= 128 ? '1.5rem' : '1.8rem'};
        background:${v ? (COLORS[v] || '#a3e635') : 'rgba(255,255,255,.04)'};
        color:${v >= 8 ? '#fff' : '#9a9ab0'};font-weight:900;
        ${state.lastMerged?.[0] === r && state.lastMerged?.[1] === c ? 'animation:pop-in .25s ease;' : ''}
      ">${v || ''}</div>`)).join('');
  }

  function slide(row) {
    const arr = row.filter(v => v);
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] === arr[i + 1]) {
        arr[i] *= 2;
        state.score += arr[i];
        if (arr[i] === 2048 && !state.won) { state.won = true; bigWin(); ui.toast('🏆 2048! Keep going...'); }
        arr.splice(i + 1, 1);
      }
    }
    while (arr.length < N) arr.push(0);
    return arr;
  }

  function move(dir) {
    if (state.over) return;
    const before = JSON.stringify(state.board);
    const b = state.board;
    for (let i = 0; i < N; i++) {
      if (dir === 'left') b[i] = slide(b[i]);
      if (dir === 'right') b[i] = slide(b[i].slice().reverse()).reverse();
      if (dir === 'up') {
        const col = slide(b.map(r => r[i]));
        col.forEach((v, r) => b[r][i] = v);
      }
      if (dir === 'down') {
        const col = slide(b.map(r => r[i]).reverse()).reverse();
        col.forEach((v, r) => b[r][i] = v);
      }
    }
    if (JSON.stringify(state.board) === before) return;
    addTile();
    sfx.tick();
    scoreEl.textContent = state.score;
    paint();
    if (dead()) return gameOver();
  }

  function dead() {
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (!state.board[r][c]) return false;
      if (c < N - 1 && state.board[r][c] === state.board[r][c + 1]) return false;
      if (r < N - 1 && state.board[r][c] === state.board[r + 1][c]) return false;
    }
    return true;
  }

  function onKey(e) {
    const map = { ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right', ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down' };
    if (map[e.key]) { e.preventDefault(); move(map[e.key]); }
  }
  document.addEventListener('keydown', onKey);
  registerCleanup(() => document.removeEventListener('keydown', onKey));

  // touch swipe
  let tx = 0, ty = 0;
  boardEl.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  boardEl.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 30) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }, { passive: true });

  function start() {
    sfx.click();
    state.board = Array.from({ length: N }, () => Array(N).fill(0));
    state.score = 0; state.over = false; state.won = false; state.lastMerged = null;
    scoreEl.textContent = '0';
    addTile(); addTile();
    overlay.style.display = 'none';
    paint();
  }

  function gameOver() {
    state.over = true;
    sfx.lose();
    const best = store.setBest(BEST_KEY, state.score);
    bestEl.textContent = best;
    if (state.score >= 2000) bigWin();
    overlay.style.display = 'flex';
    overlay.innerHTML = `
      <div class="result-wrap" data-test="result">
        <span class="result-emoji">${state.score >= 5000 ? '🏆' : state.score >= 1000 ? '🔢' : '🧩'}</span>
        <h3 class="result-title" data-test="result-title">${state.score}</h3>
        <p class="result-msg">Best tile: <b>${Math.max(...state.board.flat())}</b></p>
        <div class="stat-row" style="justify-content:center;margin-bottom:16px">
          <div class="stat-chip hot"><b data-test="score-final">0</b><span>score</span></div>
          <div class="stat-chip"><b>${best}</b><span>best</span></div>
        </div>
        <div class="result-actions">
          <button class="btn cyan" id="g2048-share">📤 Share</button>
          <button class="btn lime" id="g2048-again">↻ Again</button>
          <a class="btn ghost" href="/" data-nav>🏠 Hub</a>
        </div>
      </div>`;
    animateNumber(overlay.querySelector('[data-test="score-final"]'), state.score);
    submitScore('g2048', state.score);
    mountLeaderboard('g2048', overlay.querySelector('.result-wrap'));
    overlay.querySelector('#g2048-again').addEventListener('click', start);
    overlay.querySelector('#g2048-share').addEventListener('click', () => {
      sfx.click();
      ui.openShareModal({
        title: 'Flex your 2048',
        grid: null,
        text: `🔢 2048\nScore: ${state.score} — think you can beat that?\nPlay → https://dopaminegames.pages.dev`
      });
    });
  }

  overlay.innerHTML = `
    <div class="result-wrap" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px">
      <span class="result-emoji">🔢</span>
      <h3 class="result-title" style="font-size:1.4rem">2048</h3>
      <p class="result-msg">Arrow keys / WASD / swipe to play</p>
    </div>`;
  overlay.style.display = 'flex';

  const controls = document.createElement('div');
  controls.className = 'race-controls';
  controls.innerHTML = `<button class="race-btn" data-test="btn-start">▶ START</button>`;
  overlay.parentElement.after(controls);
  controls.querySelector('[data-test="btn-start"]').addEventListener('click', start);

  start();
}
