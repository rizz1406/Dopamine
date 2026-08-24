// 🏆 LEADERBOARD — global daily rankings for all games.
import { GAME_LABELS } from '../scores.js';
import { sfx } from '../audio.js';
import { events } from '../analytics.js';

const GAMES = Object.keys(GAME_LABELS);

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function renderLeaderboard(view) {
  let current = 'reel';

  view.innerHTML = `
    <div class="game-head">
      <button class="back-btn" data-nav href="#/" aria-label="Back">←</button>
      <div class="game-title">
        <h2>🏆 LEADERBOARD</h2>
        <p>Today's global top 20 · resets at midnight UTC</p>
      </div>
    </div>
    <section class="stage">
      <div class="lb-tabs" data-test="lb-tabs">
        ${GAMES.map(g => `<button class="lb-tab" data-game="${g}">${GAME_LABELS[g]}</button>`).join('')}
      </div>
      <div class="lb-list" id="lb-list" data-test="lb-list"></div>
    </section>`;

  const list = document.getElementById('lb-list');

  async function load(game) {
    current = game;
    events.leaderboardViewed(game);
    view.querySelectorAll('.lb-tab').forEach(t => t.classList.toggle('active', t.dataset.game === game));
    list.innerHTML = '<div class="lb-empty">Loading…</div>';
    try {
      const res = await fetch(`/api/leaderboard?game=${encodeURIComponent(game)}&day=${new Date().toISOString().slice(0, 10)}`);
      if (!res.ok) throw new Error();
      const j = await res.json();
      let me = null;
      try { me = localStorage.getItem('dopamine:name'); } catch {}
      if (!j.top.length) {
        list.innerHTML = '<div class="lb-empty">No scores yet today. Be the first legend 🏆</div>';
        return;
      }
      list.innerHTML = j.top.map((r, i) => `
        <div class="lb-row" data-test="lb-row">
          <span class="lb-rank">${['🥇', '🥈', '🥉'][i] || '#' + (i + 1)}</span>
          <span class="lb-name ${r.name === me ? 'you' : ''}">${esc(r.name)}</span>
          <span class="lb-score" data-test="lb-score">${r.score}</span>
        </div>`).join('');
    } catch {
      list.innerHTML = '<div class="lb-empty">Leaderboard unavailable right now 😢</div>';
    }
  }

  view.querySelector('.lb-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.lb-tab');
    if (tab && tab.dataset.game !== current) { sfx.click(); load(tab.dataset.game); }
  });

  load(current);
}
