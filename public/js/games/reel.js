// REEL — guess the movie from emojis. 5 daily rounds, escalating hints.
import { buildDailyRounds, buildShareText, MAX_ATTEMPTS } from '../reel-logic.js';
import { dayNumber } from '../rng.js';
import { store } from '../store.js';
import { sfx } from '../audio.js';
import { burst, bigWin } from '../confetti.js';
import { animateNumber, staggerGrid, winJuice } from '../juice.js';
import { submitScore, mountLeaderboard } from '../scores.js';
import { events } from '../analytics.js';
import { ui } from '../app.js';

const HINT_STAGES = [
  m => `Genre: <b>${m.genre}</b>`,
  m => `Released: <b>${m.year}</b>`,
  m => `💬 “<i>${m.hint}</i>”`,
];

export function renderReel(view, registerCleanup) {
  const day = dayNumber();
  const rounds = buildDailyRounds(day);
  const state = {
    roundIdx: 0,
    attempt: 0,
    results: [], // {won:boolean}
    finished: false
  };

  view.innerHTML = `
    <div class="game-head">
      <button class="back-btn" data-nav href="#/" aria-label="Back">←</button>
      <div class="game-title">
        <h2>🎬 REEL</h2>
        <p>Puzzle #${day.toLocaleString()} · guess the movie from the emojis</p>
      </div>
      <div class="stat-row">
        <div class="stat-chip"><b id="score-num">0</b><span>score</span></div>
        <div class="stat-chip hot"><b id="streak-num">${store.streak('reel').current}</b><span>streak</span></div>
      </div>
    </div>
    <section class="stage" id="stage"></section>
    <div class="ad-slot slim" data-ad="inGame">ad space</div>`;

  registerCleanup(() => {});

  const stage = document.getElementById('stage');
  const scoreEl = document.getElementById('score-num');
  const streakEl = document.getElementById('streak-num');

  function updateStats() {
    scoreEl.textContent = state.results.filter(r => r.won).length;
    streakEl.textContent = store.streak('reel').current;
  }

  function renderRound() {
    const round = rounds[state.roundIdx];
    const { movie } = round;
    stage.innerHTML = `
      <div class="progress">
        ${rounds.map((_, i) => {
          const res = state.results[i];
          const cls = res ? (res.won ? 'won' : 'lost') : (i === state.roundIdx ? 'active current' : '');
          return `<span class="p-dot ${cls}"></span>`;
        }).join('')}
      </div>
      <div class="clue-emoji" data-test="clue">${movie.emojis.map(e => `<span>${e}</span>`).join('')}</div>
      <p class="hint-line" id="hint-line">Pick the movie these emojis describe</p>
      <div class="options-grid" id="options">
        ${round.options.map(o => `<button class="option-btn" data-test="option" data-title="${o.title}">${o.title}</button>`).join('')}
      </div>`;
    stage.querySelector('#options').addEventListener('click', onPick);
  }

  function onPick(e) {
    const btn = e.target.closest('.option-btn');
    if (!btn || btn.disabled) return;
    const round = rounds[state.roundIdx];
    const correct = btn.dataset.title === round.movie.title;

    if (correct) {
      sfx.correct();
      btn.classList.add('correct');
      disableOptions();
      state.results.push({ won: true });
      const r = btn.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top);
      showReveal(true);
    } else {
      sfx.wrong();
      btn.classList.add('wrong');
      btn.disabled = true;
      btn.classList.add('dim');
      state.attempt++;
      // escalate hints
      const hintEl = document.getElementById('hint-line');
      const stage2 = Math.min(state.attempt - 1, HINT_STAGES.length - 1);
      if (state.attempt >= MAX_ATTEMPTS) {
        state.results.push({ won: false });
        markAnswer(round.movie.title);
        showReveal(false);
      } else {
        hintEl.innerHTML = `${HINT_STAGES[stage2](round.movie)} · <b>${MAX_ATTEMPTS - state.attempt}</b> tries left`;
      }
    }
    updateStats();
  }

  function disableOptions() {
    stage.querySelectorAll('.option-btn').forEach(b => b.disabled = true);
  }
  function markAnswer(title) {
    stage.querySelectorAll('.option-btn').forEach(b => {
      b.disabled = true;
      if (b.dataset.title === title) b.classList.add('correct');
    });
  }

  function showReveal(won) {
    const round = rounds[state.roundIdx];
    const banner = document.createElement('div');
    banner.className = `reveal-banner ${won ? 'good' : 'bad'}`;
    banner.setAttribute('data-test', 'reveal');
    banner.innerHTML = won
      ? `✅ <b>${round.movie.title}</b> (${round.movie.year}) — nailed it!`
      : `❌ It was <b>${round.movie.title}</b> (${round.movie.year}). “${round.movie.hint}”`;
    stage.querySelector('.progress').insertAdjacentElement('afterend', banner);

    const next = document.createElement('button');
    next.className = 'btn big';
    next.id = 'next-btn';
    next.dataset.test = 'next-round';
    next.style.marginTop = '18px';
    next.textContent = state.roundIdx === rounds.length - 1 ? 'See Results 🏁' : 'Next Round →';
    next.addEventListener('click', () => { sfx.click(); advance(); });
    stage.appendChild(next);
    next.focus();
  }

  function advance() {
    if (state.roundIdx < rounds.length - 1) {
      state.roundIdx++;
      state.attempt = 0;
      renderRound();
    } else {
      finish();
    }
  }

  function finish() {
    state.finished = true;
    const firstToday = !store.hasPlayed('reel', day);
    let streak = store.streak('reel').current;
    if (firstToday) {
      streak = store.recordDaily('reel', true, day).current;
    }
    const score = state.results.filter(r => r.won).length;
    store.setDailyResult('reel', new Date().toISOString().slice(0, 10), { score, won: true });
    events.gameCompleted('reel', { score, won: true, puzzleId: day });
    updateStats();

    const perfect = score === rounds.length;
    if (perfect) winJuice(true); else { burst(innerWidth / 2, innerHeight * 0.3, 70, 9); sfx.correct(); }

    stage.innerHTML = `
      <div class="result-wrap" data-test="result">
        <span class="result-emoji">${perfect ? '👑' : '🍿'}</span>
        <h3 class="result-title" data-test="result-title">${perfect ? 'PERFECT RUN' : `${score}/${rounds.length}`}</h3>
        <p class="result-msg">${perfect ? 'Flawless. Scorsese is shaking.' : score >= 3 ? 'Solid movie knowledge!' : 'Time for a rewatch marathon...'}</p>
        <div class="result-grid" data-test="result-grid">${state.results.map(r => r.won ? '🟩' : '🟥').join('')}</div>
        <div class="stat-row" style="justify-content:center;margin-bottom:22px">
          <div class="stat-chip hot"><b data-test="streak-final">${streak}</b><span>day streak</span></div>
          <div class="stat-chip"><b>${store.streak('reel').best}</b><span>best</span></div>
        </div>
        <div class="result-actions">
          <button class="btn cyan" id="share-btn" data-test="share-btn">📤 Share Result</button>
          <a class="btn ghost" href="#/" data-nav>🏠 Hub</a>
        </div>
      </div>`;

    staggerGrid(stage.querySelector('[data-test="result-grid"]'));
    animateNumber(stage.querySelector('[data-test="streak-final"]'), streak);
    submitScore('reel', score);
    mountLeaderboard('reel', stage.querySelector('.result-wrap'));

    stage.querySelector('#share-btn').addEventListener('click', () => {
      sfx.click();
      ui.openShareModal({
        title: 'Your Reel result',
        grid: state.results.map(r => r.won ? '🟩' : '🟥').join(''),
        text: buildShareText(state.results, day)
      });
    });

    if (!firstToday) {
      ui.toast('Already counted for today — replaying just for fun 🎈');
    }
  }

  renderRound();
}
