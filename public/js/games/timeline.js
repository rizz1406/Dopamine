// TIMELINE — tap the movies from OLDEST to NEWEST. 3 rounds, 3 strikes.
import { buildRound, checkPick, ROUND_COUNT, MAX_STRIKES, timelineVerdict } from '../timeline-logic.js';
import { store } from '../store.js';
import { sfx } from '../audio.js';
import { burst, bigWin } from '../confetti.js';
import { winJuice } from '../juice.js';
import { submitScore, mountLeaderboard } from '../scores.js';
import { maybeShowInterstitial } from '../ads.js';
import { ui } from '../app.js';

const BEST_KEY = 'timeline-rounds';

export function renderTimeline(view) {
  maybeShowInterstitial();
  const state = { round: 0, strikes: 0, roundsWon: 0, picked: [], roundData: null, over: false };

  view.innerHTML = `
    <div class="game-head">
      <button class="back-btn" data-nav href="#/" aria-label="Back">←</button>
      <div class="game-title">
        <h2>⏳ TIMELINE</h2>
        <p>Tap the movies from OLDEST to NEWEST</p>
      </div>
      <div class="stat-row">
        <div class="stat-chip" data-test="round-chip"><b id="round-num" data-test="round">1/${ROUND_COUNT}</b><span>round</span></div>
        <div class="stat-chip hot"><b id="strikes-num" data-test="strikes">❤️❤️❤️</b><span>strikes</span></div>
        <div class="stat-chip"><b id="best-num">${store.best(BEST_KEY)}</b><span>best</span></div>
      </div>
    </div>
    <section class="stage" id="stage"></section>`;

  const stage = document.getElementById('stage');
  const strikesEl = document.getElementById('strikes-num');
  const roundEl = document.getElementById('round-num');
  const bestEl = document.getElementById('best-num');

  function renderRound() {
    state.roundData = buildRound();
    state.picked = [];
    roundEl.textContent = `${state.round + 1}/${ROUND_COUNT}`;
    stage.innerHTML = `
      <p class="hl-question" data-test="tl-hint">Round ${state.round + 1} — oldest first 👇</p>
      <div class="tl-slots" data-test="tl-slots">
        ${state.roundData.movies.map((_, i) => `<span class="tl-slot" data-test="tl-slot-${i}">${i + 1}</span>`).join('')}
      </div>
      <div class="tl-movies" data-test="tl-movies">
        ${state.roundData.movies.map(m => `
          <button class="tl-card" data-test="tl-movie" data-title="${m.title}" data-year="${m.year}">
            <span class="tl-emoji">🎬</span>
            <span class="tl-title">${m.title}</span>
            <span class="tl-year">????</span>
          </button>`).join('')}
      </div>`;
    stage.querySelector('[data-test="tl-movies"]').addEventListener('click', onPick);
  }

  function onPick(e) {
    if (state.over) return;
    const card = e.target.closest('[data-test="tl-movie"]');
    if (!card || card.classList.contains('picked')) return;
    const title = card.dataset.title;
    const { correct } = checkPick(state.roundData, state.picked, title);
    if (!correct) {
      state.strikes++;
      sfx.wrong();
      card.classList.add('shake-it');
      setTimeout(() => card.classList.remove('shake-it'), 450);
      strikesEl.textContent = '❤️'.repeat(Math.max(0, MAX_STRIKES - state.strikes)) || '💀';
      if (state.strikes >= MAX_STRIKES) return gameOver();
      stage.querySelector('[data-test="tl-hint"]').innerHTML = `❌ Nope — <b>${MAX_STRIKES - state.strikes}</b> strikes left`;
      return;
    }

    // correct: reveal year, lock card, fill slot
    sfx.correct();
    card.classList.add('picked', 'good');
    card.querySelector('.tl-year').textContent = card.dataset.year;
    const slot = stage.querySelector(`[data-test="tl-slot-${state.picked.length}"]`);
    slot.textContent = card.dataset.year;
    slot.classList.add('filled');
    state.picked.push(title);

    if (state.picked.length === state.roundData.movies.length) {
      state.roundsWon++;
      bestEl.textContent = store.setBest(BEST_KEY, state.roundsWon);
      const r = stage.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + 80, 50, 8);
      if (state.round < ROUND_COUNT - 1) {
        state.round++;
        setTimeout(renderRound, 900);
      } else {
        setTimeout(gameOver, 900);
      }
    }
  }

  function gameOver() {
    state.over = true;
    const won = state.roundsWon === ROUND_COUNT;
    won ? winJuice(true) : sfx.lose();
    const v = timelineVerdict(state.strikes, state.roundsWon);
    const best = store.best(BEST_KEY);
    stage.innerHTML = `
      <div class="result-wrap" data-test="result">
        <span class="result-emoji">${state.roundsWon === ROUND_COUNT ? '⏳' : '🕰️'}</span>
        <h3 class="result-title" data-test="result-title">${v.title}</h3>
        <p class="result-msg">${v.msg}</p>
        <div class="stat-row" style="justify-content:center;margin-bottom:22px">
          <div class="stat-chip hot"><b data-test="rounds-final">${state.roundsWon}/${ROUND_COUNT}</b><span>rounds</span></div>
          <div class="stat-chip"><b>${best}/${ROUND_COUNT}</b><span>best</span></div>
        </div>
        <div class="result-actions">
          <button class="btn cyan" id="tl-share">📤 Share</button>
          <button class="btn lime" id="tl-again">↻ Again</button>
          <a class="btn ghost" href="#/" data-nav>🏠 Hub</a>
        </div>
      </div>`;
    submitScore('timeline', state.roundsWon);
    mountLeaderboard('timeline', stage.querySelector('.result-wrap'));
    stage.querySelector('#tl-again').addEventListener('click', () => { sfx.click(); renderTimeline(view); });
    stage.querySelector('#tl-share').addEventListener('click', () => {
      sfx.click();
      ui.openShareModal({
        title: 'Flex your film history',
        grid: null,
        text: `⏳ TIMELINE\n${state.roundsWon}/${ROUND_COUNT} rounds — ${v.title}\nBeat me → https://dopaminegames.pages.dev`
      });
    });
  }

  renderRound();
}
