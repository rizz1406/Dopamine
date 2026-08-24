// SPEED RUSH — dodge traffic, survive, go fast. Canvas arcade.
import { store } from '../store.js';
import { sfx } from '../audio.js';
import { burst, bigWin } from '../confetti.js';
import { animateNumber } from '../juice.js';
import { submitScore, mountLeaderboard } from '../scores.js';
import { maybeShowInterstitial } from '../ads.js';
import { ui } from '../app.js';

const BEST_KEY = 'speed-m';
const W = 360, H = 540;
const LANES = [70, 150, 230];

export function renderSpeed(view, registerCleanup) {
  maybeShowInterstitial();
  const state = {
    running: false, over: false,
    lane: 1, x: LANES[1],
    obs: [], dist: 0, speed: 3.2, spawnIn: 40,
    raf: null, keys: null
  };

  view.innerHTML = `
    <div class="game-head">
      <button class="back-btn" data-nav href="#/" aria-label="Back">←</button>
      <div class="game-title">
        <h2>🏎️ SPEED RUSH</h2>
        <p>Dodge the traffic. Every meter counts.</p>
      </div>
      <div class="stat-row">
        <div class="stat-chip hot"><b id="speed-score" data-test="score">0</b><span>meters</span></div>
        <div class="stat-chip"><b id="speed-best">${store.best(BEST_KEY)}</b><span>best</span></div>
      </div>
    </div>
    <section class="stage" style="padding:14px" id="stage">
      <div class="race-wrap" data-test="race-wrap">
        <canvas id="race-cv" data-test="canvas" width="${W}" height="${H}" style="max-width:100%;border-radius:16px;display:block;margin:0 auto"></canvas>
        <div class="race-overlay" id="race-overlay" data-test="overlay"></div>
      </div>
      <div class="race-controls" data-test="controls">
        <button class="race-btn" data-test="btn-left" aria-label="Left">◀</button>
        <button class="race-btn" data-test="btn-start">▶ START</button>
        <button class="race-btn" data-test="btn-right" aria-label="Right">▶</button>
      </div>
    </section>`;

  const cv = document.getElementById('race-cv');
  const ctx = cv.getContext('2d');
  const overlay = document.getElementById('race-overlay');
  const scoreEl = document.getElementById('speed-score');
  const bestEl = document.getElementById('speed-best');

  // ── drawing ──
  function drawRoad() {
    ctx.fillStyle = '#14141d';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#1e1e2a';
    ctx.fillRect(40, 0, W - 80, H);
    ctx.strokeStyle = 'rgba(255,255,255,.25)';
    ctx.lineWidth = 4;
    ctx.setLineDash([26, 22]);
    ctx.lineDashOffset = -(state.dist * 2) % 48;
    for (const x of [110, 190, 270]) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.fillStyle = '#7c3aed';
    ctx.fillRect(36, 0, 6, H); ctx.fillRect(W - 42, 0, 6, H);
  }

  function drawCar(x, y, color, isPlayer) {
    const w = 56, h = 92;
    ctx.save();
    ctx.fillStyle = color;
    roundRect(x - w / 2, y - h / 2, w, h, 12); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.25)';
    roundRect(x - w / 2 + 8, y - h / 2 + 12, w - 16, 20, 6); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    roundRect(x - w / 2 + 8, y + h / 2 - 26, w - 16, 16, 6); ctx.fill();
    if (isPlayer) {
      ctx.fillStyle = 'rgba(251,191,36,.9)';
      ctx.fillRect(x - w / 2 + 6, y + h / 2 - 4, 12, 6);
      ctx.fillRect(x + w / 2 - 18, y + h / 2 - 4, 12, 6);
    }
    ctx.restore();
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

  function draw() {
    drawRoad();
    for (const o of state.obs) drawCar(o.x, o.y, o.color, false);
    drawCar(state.x, H - 90, '#f472b6', true);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.font = '700 20px "Space Grotesk", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(Math.floor(state.dist) + ' m', 52, 40);
  }

  // ── loop ──
  function tick() {
    if (!state.running) return;
    state.dist += state.speed * 0.6;
    state.speed = Math.min(11, 3.2 + state.dist / 900);
    scoreEl.textContent = Math.floor(state.dist);

    state.spawnIn--;
    if (state.spawnIn <= 0) {
      const lane = Math.floor(Math.random() * 3);
      if (!state.obs.some(o => o.lane === lane && o.y < 120)) {
        const colors = ['#22d3ee', '#a3e635', '#fbbf24', '#fb7185'];
        state.obs.push({ lane, x: LANES[lane], y: -100, color: colors[(Math.random() * colors.length) | 0] });
      }
      state.spawnIn = Math.max(26, 60 - Math.floor(state.dist / 60));
    }
    for (const o of state.obs) o.y += state.speed;
    state.obs = state.obs.filter(o => o.y < H + 120);

    // smooth lane change
    state.x += (LANES[state.lane] - state.x) * 0.25;

    // collision
    const px = state.x, py = H - 90;
    for (const o of state.obs) {
      if (Math.abs(o.y - py) < 84 && Math.abs(o.x - px) < 50) return crash();
    }

    draw();
    state.raf = requestAnimationFrame(tick);
  }

  function move(dir) {
    if (!state.running) return;
    state.lane = Math.max(0, Math.min(2, state.lane + dir));
    sfx.tick();
  }

  function onKey(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a') { e.preventDefault(); move(-1); }
    if (e.key === 'ArrowRight' || e.key === 'd') { e.preventDefault(); move(1); }
  }
  document.addEventListener('keydown', onKey);
  registerCleanup(() => {
    document.removeEventListener('keydown', onKey);
    cancelAnimationFrame(state.raf);
    clearTimeout(state.timer);
  });

  function start() {
    sfx.click();
    Object.assign(state, { running: true, over: false, lane: 1, x: LANES[1], obs: [], dist: 0, speed: 3.2, spawnIn: 30 });
    overlay.style.display = 'none';
    state.raf = requestAnimationFrame(tick);
  }

  function crash() {
    state.running = false; state.over = true;
    cancelAnimationFrame(state.raf);
    sfx.lose();
    const m = Math.floor(state.dist);
    const best = store.setBest(BEST_KEY, m);
    bestEl.textContent = best;
    if (m >= 500) { bigWin(); } else burst(cv.getBoundingClientRect().left + W / 2, H, 50, 9);

    overlay.style.display = 'flex';
    overlay.innerHTML = `
      <div class="result-wrap" data-test="result">
        <span class="result-emoji">${m >= 1000 ? '🏆' : m >= 500 ? '🏎️' : '💨'}</span>
        <h3 class="result-title" data-test="result-title">${m} m</h3>
        <p class="result-msg">${m >= 1000 ? 'Speed demon. The law is looking for you.' : m >= 500 ? 'Nice driving!' : 'Parked. Permanently.'}</p>
        <div class="stat-row" style="justify-content:center;margin-bottom:16px">
          <div class="stat-chip hot"><b data-test="score-final">0</b><span>meters</span></div>
          <div class="stat-chip"><b>${best}</b><span>best</span></div>
        </div>
        <div class="result-actions">
          <button class="btn cyan" id="speed-share">📤 Share</button>
          <button class="btn lime" id="speed-again">↻ Again</button>
          <a class="btn ghost" href="#/" data-nav>🏠 Hub</a>
        </div>
      </div>`;
    animateNumber(overlay.querySelector('[data-test="score-final"]'), m);
    submitScore('speed', m);
    mountLeaderboard('speed', overlay.querySelector('.result-wrap'));

    overlay.querySelector('#speed-again').addEventListener('click', start);
    overlay.querySelector('#speed-share').addEventListener('click', () => {
      sfx.click();
      ui.openShareModal({
        title: 'Flex your drive',
        grid: null,
        text: `🏎️ SPEED RUSH\n${m} meters — think you can beat that?\nPlay → https://dopaminegames.pages.dev`
      });
    });
  }

  overlay.innerHTML = `
    <div class="result-wrap" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:10px">
      <span class="result-emoji">🏎️</span>
      <h3 class="result-title" style="font-size:1.4rem">SPEED RUSH</h3>
      <p class="result-msg">← → or the buttons to switch lanes</p>
    </div>`;
  overlay.style.display = 'flex';

  view.querySelector('[data-test="btn-start"]').addEventListener('click', start);
  view.querySelector('[data-test="btn-left"]').addEventListener('click', () => move(-1));
  view.querySelector('[data-test="btn-right"]').addEventListener('click', () => move(1));

  draw();
  state.timer = setTimeout(() => {}, 0);
}
