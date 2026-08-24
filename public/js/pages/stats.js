// 📊 STATS — personal stats + achievements (all local, no account needed).
import { store } from '../store.js';
import { evaluateAchievements } from '../achievements.js';
import { todaySummary } from '../daily.js';
import { GAME_LABELS } from '../scores.js';
import { events } from '../analytics.js';

export function renderStats(view) {
  const s = todaySummary();
  const t = evaluateAchievements();
  t.unlockedNow.forEach(id => events.achievementUnlocked(id));

  const bestStreak = Math.max(store.streak('reel').best, store.streak('word').best);
  const totalPlays = store.get('plays:total', 0);
  const gameKeys = Object.keys(GAME_LABELS);

  const gameRows = gameKeys.map(k => {
    const st = store.streak(k);
    const played = store.get('plays:' + k, 0);
    const bestMap = {
      reel: st.best, word: store.streak('word').best,
      hl: store.best('hl-streak'), memory: store.best('memory-level'),
      timeline: store.best('timeline-rounds'), flags: store.best('flag-score'),
      reflex: store.best('reflex-avg'), speed: store.best('speed-m'), snake: store.best('snake-score')
    };
    const best = bestMap[k] || 0;
    const unit = k === 'reflex' ? 'ms' : k === 'speed' ? 'm' : '';
    return `
      <div class="lb-row" data-test="stat-row">
        <span class="lb-name">${GAME_LABELS[k]}</span>
        <span class="stat-mini">played <b>${played}</b></span>
        <span class="stat-mini">best <b>${best}${unit}</b></span>
      </div>`;
  }).join('');

  view.innerHTML = `
    <div class="game-head">
      <button class="back-btn" data-nav href="/" aria-label="Back">←</button>
      <div class="game-title">
        <h2>📊 YOUR STATS</h2>
        <p>Everything stays on this device — no account needed</p>
      </div>
    </div>

    <section class="stat-cards" data-test="stat-cards">
      <div class="stat-big hot"><b>🔥 ${bestStreak}</b><span>best daily streak</span></div>
      <div class="stat-big"><b>🎮 ${totalPlays}</b><span>games played</span></div>
      <div class="stat-big"><b>${s.doneCount}/${s.total}</b><span>today's challenge</span></div>
      <div class="stat-big"><b>${s.points}</b><span>points today</span></div>
    </section>

    <section class="stage" style="margin-top:18px">
      <h3 class="admin-h" style="margin-top:0">🏆 ACHIEVEMENTS — ${t.achievements.filter(a => a.unlocked).length}/${t.achievements.length}</h3>
      <div class="ach-grid" data-test="achievements">
        ${t.achievements.map(a => `
          <div class="ach ${a.unlocked ? 'unlocked' : ''}" data-test="ach" title="${a.desc}">
            <span class="ach-icon">${a.unlocked ? a.icon : '🔒'}</span>
            <b>${a.name}</b>
            <small>${a.desc}</small>
          </div>`).join('')}
      </div>
    </section>

    <section class="stage" style="margin-top:18px">
      <h3 class="admin-h" style="margin-top:0">🎮 BY GAME</h3>
      <div class="lb-list">${gameRows}</div>
    </section>`;
}
