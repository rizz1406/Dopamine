// FLAG RUSH — 10 rounds, 5 seconds each. Go with your gut.
import { ROUNDS, ROUND_SECONDS, flagUrl } from '../flags.js';
import { buildFlagGame, flagScoreTitle } from '../flag-logic.js';
import { store } from '../store.js';
import { sfx } from '../audio.js';
import { burst, bigWin } from '../confetti.js';
import { winJuice } from '../juice.js';
import { submitScore, mountLeaderboard } from '../scores.js';
import { maybeShowInterstitial } from '../ads.js';
import { ui } from '../app.js';

const BEST_KEY = 'flag-score';

export function renderFlagRush(view) {
  maybeShowInterstitial();
  const game = buildFlagGame();
  const state = { round: 0, score: 0, locked: false, timer: null, deadline: 0 };

  view.innerHTML = `
    <div class="game-head">
      <button class="back-btn" data-nav href="#/" aria-label="Back">←</button>
      <div class="game-title">
        <h2>🏳️ FLAG RUSH</h2>
        <p>${ROUNDS} flags · ${ROUND_SECONDS}s each · trust your gut</p>
      </div>
      <div class="stat-row">
        <div class="stat-chip hot"><b id="flag-score" data-test="score">0</b><span>score</span></div>
        <div class="stat-chip"><b id="flag-best">${store.best(BEST_KEY)}</b><span>best</span></div>
      </div>
    </div>
    <section class="stage" id="stage"></section>`;

  const stage = document.getElementById('stage');
  const scoreEl = document.getElementById('flag-score');
  const bestEl = document.getElementById('flag-best');

  function renderRound() {
    if (state.round >= ROUNDS) return finish();
    state.locked = false;
    const { answer, options } = game[state.round];

    stage.innerHTML = `
      <div class="flag-timer" data-test="timer"><div class="flag-timer-fill" id="timer-fill"></div></div>
      <p class="hl-question" data-test="round-label">Flag ${state.round + 1} of ${ROUNDS}</p>
      <div class="flag-img-wrap" data-test="flag-wrap">
        <img class="flag-img" data-test="flag" src="${flagUrl(answer.code)}" alt="Mystery flag" draggable="false" />
      </div>
      <div class="options-grid" id="flag-options" style="max-width:480px;margin:18px auto 0">
        ${options.map(o => `<button class="option-btn" data-test="flag-option" data-name="${o.name}" data-correct="${o.code === answer.code ? 1 : 0}">${o.name}</button>`).join('')}
      </div>
      <div class="reveal-banner" id="flag-reveal" style="display:none" data-test="reveal"></div>`;

    // timer bar
    requestAnimationFrame(() => {
      const fill = document.getElementById('timer-fill');
      if (fill) {
        fill.style.transition = `width ${ROUND_SECONDS}s linear`;
        fill.style.width = '0%';
      }
    });
    state.deadline = Date.now() + ROUND_SECONDS * 1000;
    state.timer = setTimeout(() => answerPicked(null, true), ROUND_SECONDS * 1000);

    stage.querySelector('#flag-options').addEventListener('click', e => {
      const btn = e.target.closest('[data-test="flag-option"]');
      if (btn) answerPicked(btn, false);
    });
  }

  function answerPicked(btn, timedOut) {
    if (state.locked) return;
    state.locked = true;
    clearTimeout(state.timer);

    const { answer } = game[state.round];
    const correct = !timedOut && btn.dataset.correct === '1';
    const reveal = document.getElementById('flag-reveal');

    stage.querySelectorAll('[data-test="flag-option"]').forEach(b => {
      b.disabled = true;
      if (b.dataset.correct === '1') b.classList.add('correct');
      else if (b === btn) b.classList.add('wrong');
    });

    if (correct) {
      state.score++;
      scoreEl.textContent = state.score;
      sfx.correct();
      const r = btn.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top, 26, 6);
    } else {
      sfx.wrong();
    }

    reveal.style.display = 'block';
    reveal.className = `reveal-banner ${correct ? 'good' : 'bad'}`;
    reveal.innerHTML = correct
      ? `✅ <b>${answer.name}</b> — sharp!`
      : `${timedOut ? '⏰ Too slow!' : '❌ Nope!'} It's <b>${answer.name}</b> (${answer.continent})`;

    state.round++;
    setTimeout(() => { state.round >= ROUNDS ? finish() : renderRound(); }, 1150);
  }

  function finish() {
    const best = store.setBest(BEST_KEY, state.score);
    bestEl.textContent = best;
    const v = flagScoreTitle(state.score);
    state.score >= 8 ? winJuice(true) : sfx.correct();

    stage.innerHTML = `
      <div class="result-wrap" data-test="result">
        <span class="result-emoji">${state.score >= 8 ? '🌍' : state.score >= 5 ? '🧳' : '🧭'}</span>
        <h3 class="result-title" data-test="result-title">${state.score}/${ROUNDS}</h3>
        <p class="result-msg">${v.msg}</p>
        <p class="hint-line">${v.title} · best: ${best}/${ROUNDS}</p>
        <div class="result-actions">
          <button class="btn cyan" id="flag-share">📤 Share</button>
          <button class="btn lime" id="flag-again">↻ Play Again</button>
          <a class="btn ghost" href="#/" data-nav>🏠 Hub</a>
        </div>
      </div>`;
    submitScore('flags', state.score);
    mountLeaderboard('flags', stage.querySelector('.result-wrap'));
    stage.querySelector('#flag-again').addEventListener('click', () => { sfx.click(); renderFlagRush(view); });
    stage.querySelector('#flag-share').addEventListener('click', () => {
      sfx.click();
      ui.openShareModal({
        title: 'Flex your flag game',
        grid: null,
        text: `🏳️ FLAG RUSH\n${state.score}/${ROUNDS} — ${v.title}\nBeat me → https://dopaminegames.pages.dev`
      });
    });
  }

  renderRound();
}
