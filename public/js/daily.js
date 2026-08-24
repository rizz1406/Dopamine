// daily.js — the daily challenge layer: which games are daily, scoring, completion state.
import { store } from './store.js';
import { dayNumber } from './rng.js';

/** Games that form today's challenge (deterministic daily content). */
export const DAILY_GAMES = [
  { key: 'reel', label: '🎬 REEL', href: '/reel', max: 100 },
  { key: 'word', label: '🔤 Word Guess', href: '/word', max: 100 }
];

/** Points earned for a daily game result. Simple and explainable. */
export function pointsFor(game, { score, won }) {
  if (game === 'reel') return Math.min(100, score * 20);           // 5 correct = 100
  if (game === 'word') return won ? Math.min(100, (7 - score) * 20) : 0; // score = guesses used
  return 0;
}

/** Today's challenge state: per-game results, points, completion. */
export function todaySummary(now = new Date()) {
  const day = dayNumber(now);
  const dayKey = now.toISOString().slice(0, 10);
  const results = store.getDailySummary(dayKey);
  const games = DAILY_GAMES.map(g => {
    const r = results[g.key];
    return {
      ...g,
      done: !!r,
      won: !!r?.won,
      raw: r?.score ?? null,
      points: r ? pointsFor(g.key, r) : 0
    };
  });
  const points = games.reduce((a, g) => a + g.points, 0);
  const doneCount = games.filter(g => g.done).length;
  return {
    day,
    dayKey,
    games,
    points,
    doneCount,
    total: games.length,
    complete: doneCount === games.length
  };
}

/** First incomplete daily game href — for the Continue button. */
export function nextDailyHref() {
  const s = todaySummary();
  const next = s.games.find(g => !g.done);
  return next ? next.href : (s.complete ? '/stats' : DAILY_GAMES[0].href);
}
