// WORD GUESS — daily 5-letter puzzle with on-screen + physical keyboard.
import { WORD_LENGTH, MAX_GUESSES } from '../words.js';import { buildDailyAnswer, isValidWord, evaluateGuess, buildWordShare, wordVerdict } from '../word-logic.js';
import { dayNumber } from '../rng.js';
import { store } from '../store.js';
import { sfx } from '../audio.js';
import { burst, bigWin } from '../confetti.js';
import { animateNumber, staggerGrid, winJuice } from '../juice.js';
import { submitScore, mountLeaderboard } from '../scores.js';
import { events } from '../analytics.js';
import { maybeShowInterstitial } from '../ads.js';
import { ui } from '../app.js';

const KEYS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['ENTER', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'BACK']
];

export function renderWord(view, registerCleanup) {
  maybeShowInterstitial();
  const day = dayNumber();
  const answer = buildDailyAnswer(day);
  const already = store.hasPlayed('word', day);
  const state = {
    row: 0, col: 0, done: false, won: false, busy: false,
    grid: Array.from({ length: MAX_GUESSES }, () => Array(WORD_LENGTH).fill('')),
    guesses: []
  };

  view.innerHTML = `
    <div class="game-head">
      <button class="back-btn" data-nav href="#/" aria-label="Back">←</button>
      <div class="game-title">
        <h2>🔤 WORD GUESS</h2>
        <p>Puzzle #${day} · crack the 5-letter word in 6 tries</p>
      </div>
      <div class="stat-row">
        <div class="stat-chip hot"><b id="w-streak">${store.streak('word').current}</b><span>streak</span></div>
      </div>
    </div>
    <section class="stage" style="padding:clamp(14px,3vw,26px)">
      <div class="word-board" id="word-board" data-test="board">
        ${Array.from({ length: MAX_GUESSES }, (_, r) => `
          <div class="word-row">
            ${Array.from({ length: WORD_LENGTH }, (_, c) => `<div class="word-tile" data-test="tile" data-row="${r}" data-col="${c}"></div>`).join('')}
          </div>`).join('')}
      </div>
      <div class="word-keyboard" id="word-kb" data-test="keyboard">
        ${KEYS.map(row => `<div class="kb-row">${row.map(k => `<button class="kb-key ${k.length > 1 ? 'wide' : ''}" data-key="${k}" data-test="key-${k}">${k === 'BACK' ? '⌫' : k}</button>`).join('')}</div>`).join('')}
      </div>
    </section>`;

  const board = document.getElementById('word-board');
  document.getElementById('word-kb').addEventListener('click', e => {
    const key = e.target.closest('.kb-key');
    if (key) handleKey(key.dataset.key);
  });
  document.addEventListener('keydown', onPhysicalKey);
  registerCleanup(() => document.removeEventListener('keydown', onPhysicalKey));

  function onPhysicalKey(e) {
    if (state.done) return;
    if (e.key === 'Enter') { e.preventDefault(); handleKey('ENTER'); }
    else if (e.key === 'Backspace') handleKey('BACK');
    else if (/^[a-zA-Z]$/.test(e.key)) handleKey(e.key.toUpperCase());
  }

  function tile(r, c) { return board.children[r].children[c]; }

  function paint() {
    for (let r = 0; r < MAX_GUESSES; r++) {
      for (let c = 0; c < WORD_LENGTH; c++) {
        const el = tile(r, c);
        const ch = state.grid[r][c];
        if (!el.classList.contains('correct') && !el.classList.contains('present') && !el.classList.contains('absent')) {
          el.textContent = ch || '';
          el.classList.toggle('filled', !!ch);
        }
        el.classList.toggle('current', r === state.row && !state.done);
      }
    }
  }

  function handleKey(k) {
    if (state.done || state.busy) return;
    if (k === 'ENTER') return submit();
    if (k === 'BACK') {
      if (state.col > 0) { state.col--; state.grid[state.row][state.col] = ''; sfx.tick(); }
      paint();
      return;
    }
    if (state.col < WORD_LENGTH) {
      state.grid[state.row][state.col] = k;
      state.col++;
      sfx.tick();
      paint();
    }
  }

  async function submit() {
    const guess = state.grid[state.row].join('');
    if (state.col < WORD_LENGTH) { ui.toast('Not enough letters'); return; }
    if (!isValidWord(guess)) {
      sfx.wrong();
      board.children[state.row].classList.add('shake-it');
      setTimeout(() => board.children[state.row].classList.remove('shake-it'), 450);
      ui.toast('"' + guess + '" is not in our word list');
      return;
    }

    const states = evaluateGuess(guess, answer);
    state.guesses.push({ word: guess, states });
    state.busy = true;

    for (let c = 0; c < WORD_LENGTH; c++) {
      const el = tile(state.row, c);
      el.classList.add('flipping');
      const cls = states[c];
      setTimeout(() => {
        el.classList.remove('flipping', 'filled');
        el.classList.add(cls);
        el.textContent = guess[c];
      }, c * 240);
      await new Promise(r => setTimeout(r, 240));
    }
    updateKeyboard(guess, states);
    paint();

    if (guess === answer.toUpperCase()) return win();
    state.row++;
    state.col = 0;
    state.busy = false;
    if (state.row >= MAX_GUESSES) return lose();
    paint();
  }

  function updateKeyboard(guess, states) {
    const best = { correct: 3, present: 2, absent: 1 };
    for (let i = 0; i < guess.length; i++) {
      const key = document.querySelector('[data-key="' + guess[i] + '"]');
      if (!key) continue;
      const cur = ['correct', 'present', 'absent'].find(c => key.classList.contains(c));
      if (!cur || best[states[i]] > best[cur]) {
        key.classList.remove('correct', 'present', 'absent');
        key.classList.add(states[i]);
      }
    }
  }

  function win() {
    state.done = true; state.won = true;
    winJuice(true);
    finish(true);
  }

  function lose() {
    state.done = true;
    sfx.lose();
    finish(false);
  }

  function finish(won) {
    const firstToday = !already;
    let streak = store.streak('word').current;
    if (firstToday) streak = store.recordDaily('word', won, day).current;
    document.getElementById('w-streak').textContent = streak;
    store.setDailyResult('word', new Date().toISOString().slice(0, 10), { score: state.guesses.length, won });
    events.gameCompleted('word', { score: state.guesses.length, won, puzzleId: day });

    const v = wordVerdict(state.guesses.length);
    if (won && state.guesses.length <= 3) bigWin();
    const overlay = document.createElement('div');
    overlay.className = 'result-wrap';
    overlay.setAttribute('data-test', 'result');
    overlay.innerHTML = `
      <span class="result-emoji">${won ? '🔤' : '📕'}</span>
      <h3 class="result-title" data-test="result-title">${won ? v.title : 'OUT OF TRIES'}</h3>
      <p class="result-msg">${won ? v.msg : 'The word was <b>' + answer.toUpperCase() + '</b>'}</p>
      <div class="result-grid" data-test="result-grid">${state.guesses.map(g => g.states.map(s => s === 'correct' ? '🟩' : s === 'present' ? '🟨' : '⬛').join('')).join('<br>')}</div>
      <div class="stat-row" style="justify-content:center;margin-bottom:18px">
        <div class="stat-chip hot"><b data-test="streak-final">${streak}</b><span>day streak</span></div>
      </div>
      <div class="result-actions">
        <button class="btn cyan" id="w-share" data-test="share-btn">📤 Share</button>
        <a class="btn ghost" href="#/" data-nav>🏠 Hub</a>
      </div>`;
    board.style.display = 'none';
    document.getElementById('word-kb').style.display = 'none';
    board.parentElement.appendChild(overlay);

    staggerGrid(overlay.querySelector('[data-test="result-grid"]'));
    animateNumber(overlay.querySelector('[data-test="streak-final"]'), streak);
    if (won) submitScore('word', MAX_GUESSES + 1 - state.guesses.length);
    mountLeaderboard('word', overlay);

    overlay.querySelector('#w-share').addEventListener('click', () => {
      sfx.click();
      ui.openShareModal({
        title: 'Your Word Guess result',
        grid: null,
        text: buildWordShare(state.guesses, answer, day, won)
      });
    });
    if (!firstToday) ui.toast('Already counted today — replaying for fun 🎈');
  }

  paint();
}
