// achievements.js — data-driven achievement definitions, evaluated from local stats.
import { store } from './store.js';

export const ACHIEVEMENTS = [
  { id: 'first-game', icon: '🎮', name: 'First Blood', desc: 'Play your first game', check: s => s.totalPlays >= 1 },
  { id: 'games-25', icon: '🎯', name: 'Regular', desc: 'Play 25 games', check: s => s.totalPlays >= 25 },
  { id: 'games-100', icon: '🎯', name: 'Arcade Rat', desc: 'Play 100 games', check: s => s.totalPlays >= 100 },
  { id: 'streak-3', icon: '🔥', name: 'Warming Up', desc: '3-day daily streak', check: s => s.bestStreak >= 3 },
  { id: 'streak-7', icon: '🔥', name: 'Week Warrior', desc: '7-day daily streak', check: s => s.bestStreak >= 7 },
  { id: 'streak-30', icon: '🏆', name: 'Unstoppable', desc: '30-day daily streak', check: s => s.bestStreak >= 30 },
  { id: 'perfect-reel', icon: '🎬', name: 'Cinephile', desc: 'Perfect REEL run (5/5)', check: s => s.best.reel >= 5 },
  { id: 'word-ace', icon: '🔤', name: 'Word Ace', desc: 'Win Word Guess in 2 tries', check: s => s.wordBest >= 5 },
  { id: 'snake-100', icon: '🐍', name: 'Serpent', desc: 'Score 100+ in Snake', check: s => s.best.snake >= 100 },
  { id: 'speed-500', icon: '🏎️', name: 'Lead Foot', desc: 'Drive 500m in Speed Rush', check: s => s.best.speed >= 500 },
  { id: 'flags-8', icon: '🌎', name: 'Globetrotter', desc: '8+/10 in Flag Rush', check: s => s.best.flags >= 8 },
  { id: 'hl-10', icon: '🧠', name: 'Big Brain', desc: '10 streak in Higher/Lower', check: s => s.best['hl-streak'] >= 10 },
  { id: 'memory-8', icon: '💥', name: 'Photographic', desc: 'Reach level 8 in Memory', check: s => s.best['memory-level'] >= 8 },
  { id: 'daily-done', icon: '✅', name: 'Daily Dose', desc: 'Complete the full daily challenge', check: s => s.dailyComplete }
];

/**
 * Evaluate all achievements against current local stats.
 * Returns [{...def, unlocked}] and the list of newly unlocked ids (vs store).
 */
export function evaluateAchievements() {
  const bestStreak = Math.max(
    store.streak('reel').best,
    store.streak('word').best,
    0
  );
  const snapshot = {
    totalPlays: store.get('plays:total', 0),
    bestStreak,
    best: {
      reel: store.best('reel') ? Math.max(store.streak('reel').best, 0) : 0,
      snake: store.best('snake-score'),
      speed: store.best('speed-m'),
      flags: store.best('flag-score'),
      'hl-streak': store.best('hl-streak'),
      'memory-level': store.best('memory-level')
    },
    wordBest: store.best('word-score'),
    dailyComplete: false
  };
  // any day with all dailies done
  try {
    const db = JSON.parse(localStorage.getItem('dopamine:v1') || '{}');
    const daily = db.daily || {};
    snapshot.dailyComplete = Object.values(daily).some(d => 'reel' in d && 'word' in d);
  } catch {}

  const unlockedNow = [];
  const seen = store.get('achievements', []);
  const out = ACHIEVEMENTS.map(a => {
    const unlocked = seen.includes(a.id) || a.check(snapshot);
    if (unlocked && !seen.includes(a.id)) unlockedNow.push(a.id);
    return { ...a, unlocked };
  });
  if (unlockedNow.length) store.set('achievements', [...seen, ...unlockedNow]);
  return { achievements: out, unlockedNow };
}
