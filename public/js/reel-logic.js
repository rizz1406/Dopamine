// REEL — daily movie emoji quiz. Pure logic, testable in Node.
import { MOVIES } from './data.js';
import { dayNumber, seededShuffle, mulberry32, hashString } from './rng.js';

export const MAX_ATTEMPTS = 4;

/**
 * Build today's 5 rounds deterministically.
 * Each round: the puzzle + 6 options (correct answer + 5 plausible distractors from same genre pool).
 */
export function buildDailyRounds(day = dayNumber()) {
  const deck = seededShuffle(MOVIES, hashString('reel:' + day));
  const chosen = deck.slice(0, 5);
  return chosen.map((movie, idx) => {
    const rand = mulberry32(hashString(`reel:${day}:${idx}:${movie.title}`));
    const sameGenre = MOVIES.filter(m => m.title !== movie.title && m.genre === movie.genre);
    const others = MOVIES.filter(m => m.title !== movie.title && m.genre !== movie.genre);
    const pool = [...seededShuffle(sameGenre, rand() * 1e9 | 0), ...seededShuffle(others, rand() * 1e9 | 0)];
    const options = [movie, ...pool.slice(0, 5)];
    return {
      index: idx,
      movie,
      options: seededShuffle(options, rand() * 1e9 | 0)
    };
  });
}

/** Result grid cell for one round: 'won' | 'lost' */
export function resultCell(won) { return won ? '🟩' : '🟥'; }

export function buildShareText(results, day = dayNumber(), scoreUrl = '') {
  // results: [{won:boolean}]
  const grid = results.map(r => resultCell(r.won)).join('');
  const score = results.filter(r => r.won).length;
  const lines = [
    `🎬 REEL #${day} — ${score}/${results.length}`,
    grid,
    'Can you beat me? → dopamine.games'
  ];
  if (scoreUrl) lines.push(scoreUrl);
  return lines.join('\n');
}

/** Human label for score */
export function scoreLabel(score, total = 5) {
  if (score === total) return 'PERFECT RUN 👑';
  if (score >= 4) return 'Certified Cinephile 🍿';
  if (score >= 3) return 'Solid Movie Night 🎟️';
  if (score >= 1) return 'Casual Watcher 🛋️';
  return 'Watch More Movies 📺';
}
