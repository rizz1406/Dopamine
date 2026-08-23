// HIGHER OR LOWER — endless search-volume duel.
import { buildDeck, isHigherGuessCorrect, formatValue, streakTitle } from '../hl-logic.js';
import { store } from '../store.js';
import { sfx } from '../audio.js';
import { burst, bigWin } from '../confetti.js';
import { animateNumber } from '../juice.js';
import { submitScore, mountLeaderboard } from '../scores.js';
import { maybeShowInterstitial } from '../ads.js';
import { ui } from '../app.js';

const BEST_KEY = 'hl-streak';

export function renderHigherLower(view) {
  maybeShowInterstitial();
  const deck = buildDeck(60);
  const state = { pairIdx: 0, streak: 0, over: false };

  view.innerHTML = `
    <div class="game-head">
      <button class="back-btn" data-nav href="#/" aria-label="Back">←</button>
      <div class="game-title">
        <h2>⚖️ HIGHER OR LOWER</h2>
        <p>Which one does the internet search more?</p>
      </div>
      <div class="stat-row">
        <div class="stat-chip hot"><b id="streak-num" data-test="streak">0</b><span>streak</span></div>
        <div class="stat-chip"><b id="best-num">${store.best(BEST_KEY)}</b><span>best</span></div>
      </div>
    </div>
    <section class="stage" id="stage"></section>`;

  const stage = document.getElementById('stage');
  const streakEl = document.getElementById('streak-num');
  const bestEl = document.getElementById('best-num');

  function renderPair() {
    const pair = deck[state.pairIdx];
    stage.innerHTML = `
      ${state.streak >= 3 ? `<span class="hl-streak-flash" data-test="streak-flash">${streakTitle(state.streak)} ×${state.streak}</span>` : ''}
      <p class="hl-question">Is <b>${pair.right.name}</b> searched <b>higher</b> or <b>lower</b> than <b>${pair.left.name}</b>?</p>
      <div class="hl-duel">
        <div class="hl-card" data-test="card-left">
          <span class="emoji">${pair.left.emoji}</span>
          <span class="name">${pair.left.name}</span>
          <span class="value-reveal" data-test="val-left" style="display:none">🔍 ${formatValue(pair.left.v)}</span>
        </div>
        <div class="hl-vs">VS</div>
        <button class="hl-card clickable" data-test="pick-higher">
          <span class="emoji">${pair.right.emoji}</span>
          <span class="name">${pair.right.name}</span>
          <span class="sub">⬆️ HIGHER</span>
          <span class="value-reveal" data-test="val-right" style="display:none">🔍 ${formatValue(pair.right.v)}</span>
        </button>
        <button class="hl-card clickable" data-test="pick-lower" style="grid-column:1/-1;min-height:0;padding:14px 20px;flex-direction:row;gap:10px">
          <span class="name">⬇️ LOWER</span>
          <span class="sub">(than ${pair.left.name})</span>
        </button>
      </div>`;

    stage.querySelector('[data-test="pick-higher"]').addEventListener('click', () => guess('right'));
    stage.querySelector('[data-test="pick-lower"]').addEventListener('click', () => guess('left'));
  }

  function guess(pickedLeft) {
    if (state.over) return;
    const pair = deck[state.pairIdx];
    const correct = isHigherGuessCorrect(pair, pickedLeft ? 'left' : 'right');

    // reveal both values
    stage.querySelectorAll('.value-reveal').forEach(el => el.style.display = '');
    stage.querySelectorAll('[data-test="pick-higher"],[data-test="pick-lower"]').forEach(b => b.disabled = true);

    const rightCard = stage.querySelector('[data-test="pick-higher"]');
    const leftCard = stage.querySelector('[data-test="card-left"]');

    if (correct) {
      state.streak++;
      sfx.correct();
      streakEl.textContent = state.streak;
      bestEl.textContent = store.setBest(BEST_KEY, state.streak);
      rightCard.classList.add('winner');
      burst(rightCard.getBoundingClientRect().right - 30, rightCard.getBoundingClientRect().top + 40, 34, 7);
      if (state.streak > 0 && state.streak % 10 === 0) bigWin();
      setTimeout(() => { state.pairIdx++; renderPair(); }, 950);
    } else {
      state.over = true;
      sfx.lose();
      rightCard.classList.add('loser');
      leftCard.classList.add('winner');
      gameOver(pair);
    }
  }

  function gameOver(lastPair) {
    store.pushHistory('hl', { streak: state.streak, day: new Date().toISOString().slice(0, 10) });
    const best = store.best(BEST_KEY);
    setTimeout(() => {
      stage.innerHTML = `
        <div class="result-wrap" data-test="result">
          <span class="result-emoji">${state.streak >= 15 ? '🔮' : state.streak >= 5 ? '🔥' : '💀'}</span>
          <h3 class="result-title" data-test="result-title">${state.streak} in a row</h3>
          <p class="result-msg">${state.streak === 0 ? 'Rough start. Shake it off.' : `It was actually... close? No. No it was not.`}</p>
          <div class="stat-row" style="justify-content:center;margin-bottom:22px">
            <div class="stat-chip hot"><b data-test="streak-final">${state.streak}</b><span>this run</span></div>
            <div class="stat-chip"><b>${best}</b><span>best</span></div>
          </div>
          <div class="result-actions">
            <button class="btn cyan" id="share-hl">📤 Share Streak</button>
            <button class="btn lime" id="again-hl">↻ Play Again</button>
            <a class="btn ghost" href="#/" data-nav>🏠 Hub</a>
          </div>
        </div>`;
      animateNumber(stage.querySelector('[data-test="streak-final"]'), state.streak);
      submitScore('hl', state.streak);
      mountLeaderboard('hl', stage.querySelector('.result-wrap'));
      stage.querySelector('#again-hl').addEventListener('click', () => { sfx.click(); renderHigherLower(view); });
      stage.querySelector('#share-hl').addEventListener('click', () => {
        sfx.click();
        ui.openShareModal({
          title: 'Flex your streak',
          grid: null,
          text: `⚖️ HIGHER OR LOWER\nStreak: ${state.streak} ${state.streak >= 15 ? '🔮' : '🔥'} (best: ${best})\nBeat me → dopamine.games`
        });
      });
    }, 900);
  }

  renderPair();
}
