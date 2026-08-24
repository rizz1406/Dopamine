// SNAKE — the classic. Eat, grow, don't bite yourself.
import { store } from '../store.js';
import { sfx } from '../audio.js';
import { burst, bigWin } from '../confetti.js';
import { animateNumber } from '../juice.js';
import { submitScore, mountLeaderboard } from '../scores.js';
import { maybeShowInterstitial } from '../ads.js';
import { ui } from '../app.js';

const BEST_KEY = 'snake-score';
const GRID = 20;
const CELL = 24;

export function renderSnake(view, registerCleanup) {
  maybeShowInterstitial();
  const state = {
    running: false, over: false,
    snake: [], dir: { x: 1, y: 0 }, nextDir: { x: 1, y: 0 },
    food: null, score: 0, tickMs: 140, timer: null
  };
  const W = GRID * CELL;

  view.innerHTML = `
    <div class="game-head">
      <button class="back-btn" data-nav href="#/" aria-label="Back">←</button>
      <div class="game-title">
        <h2>🐍 SNAKE</h2>
        <p>Eat. Grow. Don't bite yourself. You know the deal.</p>
      </div>
      <div class="stat-row">
        <div class="stat-chip hot"><b id="snake-score" data-test="score">0</b><span>score</span></div>
        <div class="stat-chip"><b id="snake-best">${store.best(BEST_KEY)}</b><span>best</span></div>
      </div>
    </div>
    <section class="stage" style="padding:14px">
      <div class="race-wrap" style="position:relative">
        <canvas id="snake-cv" data-test="canvas" width="${W}" height="${W}" style="max-width:100%;border-radius:16px;display:block;margin:0 auto"></canvas>
        <div class="race-overlay" id="snake-overlay" data-test="overlay"></div>
      </div>
      <div class="race-controls" data-test="controls">
        <button class="race-btn" data-test="btn-left" aria-label="Left">◀</button>
        <button class="race-btn" data-test="btn-up" aria-label="Up">▲</button>
        <button class="race-btn" data-test="btn-down" aria-label="Down">▼</button>
        <button class="race-btn" data-test="btn-right" aria-label="Right">▶</button>
      </div>
    </section>`;

  const cv = document.getElementById('snake-cv');
  const ctx = cv.getContext('2d');
  const overlay = document.getElementById('snake-overlay');
  const scoreEl = document.getElementById('snake-score');
  const bestEl = document.getElementById('snake-best');

  function spawnFood() {
    do {
      state.food = { x: (Math.random() * GRID) | 0, y: (Math.random() * GRID) | 0 };
    } while (state.snake.some(s => s.x === state.food.x && s.y === state.food.y));
  }

  function draw() {
    ctx.fillStyle = '#101018';
    ctx.fillRect(0, 0, W, W);
    ctx.strokeStyle = 'rgba(255,255,255,.04)';
    for (let i = 1; i < GRID; i++) {
      ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, W); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(W, i * CELL); ctx.stroke();
    }
    // food
    ctx.font = `${CELL - 4}px serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('🍎', state.food.x * CELL + CELL / 2, state.food.y * CELL + CELL / 2 + 1);
    // snake
    state.snake.forEach((s, i) => {
      const t = i / state.snake.length;
      ctx.fillStyle = i === 0 ? '#a3e635' : `rgba(124,58,237,${0.95 - t * 0.55})`;
      roundRect(s.x * CELL + 2, s.y * CELL + 2, CELL - 4, CELL - 4, i === 0 ? 9 : 7);
      ctx.fill();
    });
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function step() {
    if (!state.running) return;
    state.dir = state.nextDir;
    const head = { x: state.snake[0].x + state.dir.x, y: state.snake[0].y + state.dir.y };

    if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID ||
        state.snake.some(s => s.x === head.x && s.y === head.y)) return die();

    state.snake.unshift(head);
    if (head.x === state.food.x && head.y === state.food.y) {
      state.score += 10;
      scoreEl.textContent = state.score;
      sfx.correct();
      spawnFood();
      if (state.score % 50 === 0) state.tickMs = Math.max(70, state.tickMs - 8);
    } else {
      state.snake.pop();
    }
    draw();
    state.timer = setTimeout(step, state.tickMs);
  }

  function turn(x, y) {
    if (!state.running) return;
    if (state.dir.x === -x && state.dir.y === -y) return; // no 180°
    state.nextDir = { x, y };
  }

  function onKey(e) {
    const map = {
      ArrowUp: [0, -1], w: [0, -1],
      ArrowDown: [0, 1], s: [0, 1],
      ArrowLeft: [-1, 0], a: [-1, 0],
      ArrowRight: [1, 0], d: [1, 0]
    };
    const m = map[e.key];
    if (m) { e.preventDefault(); turn(m[0], m[1]); }
  }
  document.addEventListener('keydown', onKey);
  registerCleanup(() => {
    document.removeEventListener('keydown', onKey);
    clearTimeout(state.timer);
  });

  function start() {
    sfx.click();
    Object.assign(state, {
      running: true, over: false,
      snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }],
      dir: { x: 1, y: 0 }, nextDir: { x: 1, y: 0 },
      score: 0, tickMs: 140
    });
    scoreEl.textContent = '0';
    spawnFood();
    overlay.style.display = 'none';
    draw();
    state.timer = setTimeout(step, state.tickMs);
  }

  function die() {
    state.running = false; state.over = true;
    clearTimeout(state.timer);
    sfx.lose();
    const best = store.setBest(BEST_KEY, state.score);
    bestEl.textContent = best;
    if (state.score >= 200) bigWin(); else burst(cv.getBoundingClientRect().right - 60, cv.getBoundingClientRect().top + 60, 45, 8);

    overlay.style.display = 'flex';
    overlay.innerHTML = `
      <div class="result-wrap" data-test="result">
        <span class="result-emoji">${state.score >= 200 ? '🐍👑' : '🍎'}</span>
        <h3 class="result-title" data-test="result-title">${state.score}</h3>
        <p class="result-msg">${state.score === 0 ? 'The apple remains uneaten.' : state.score >= 200 ? 'Absolute serpent.' : 'Tasty while it lasted.'}</p>
        <div class="stat-row" style="justify-content:center;margin-bottom:16px">
          <div class="stat-chip hot"><b data-test="score-final">0</b><span>score</span></div>
          <div class="stat-chip"><b>${best}</b><span>best</span></div>
        </div>
        <div class="result-actions">
          <button class="btn cyan" id="snake-share">📤 Share</button>
          <button class="btn lime" id="snake-again">↻ Again</button>
          <a class="btn ghost" href="#/" data-nav>🏠 Hub</a>
        </div>
      </div>`;
    animateNumber(overlay.querySelector('[data-test="score-final"]'), state.score);
    submitScore('snake', state.score);
    mountLeaderboard('snake', overlay.querySelector('.result-wrap'));

    overlay.querySelector('#snake-again').addEventListener('click', start);
    overlay.querySelector('#snake-share').addEventListener('click', () => {
      sfx.click();
      ui.openShareModal({
        title: 'Flex your serpent',
        grid: null,
        text: `🐍 SNAKE\nScore: ${state.score} — think you can beat that?\nPlay → https://dopaminegames.pages.dev`
      });
    });
  }

  overlay.innerHTML = `
    <div class="result-wrap" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px">
      <span class="result-emoji">🐍</span>
      <h3 class="result-title" style="font-size:1.4rem">SNAKE</h3>
      <p class="result-msg">Arrow keys / WASD or the buttons</p>
    </div>`;
  overlay.style.display = 'flex';

  view.querySelector('[data-test="btn-start"]')?.remove();
  const controls = view.querySelector('[data-test="controls"]');
  const startBtn = document.createElement('button');
  startBtn.className = 'race-btn';
  startBtn.dataset.test = 'btn-start';
  startBtn.textContent = '▶ START';
  controls.insertBefore(startBtn, controls.children[1]);
  startBtn.addEventListener('click', start);

  view.querySelector('[data-test="btn-left"]').addEventListener('click', () => turn(-1, 0));
  view.querySelector('[data-test="btn-right"]').addEventListener('click', () => turn(1, 0));
  view.querySelector('[data-test="btn-up"]').addEventListener('click', () => turn(0, -1));
  view.querySelector('[data-test="btn-down"]').addEventListener('click', () => turn(0, 1));

  spawnFood();
  state.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  draw();
}
