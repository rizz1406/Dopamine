// FLAG RUSH — timed country quiz logic. Pure, testable.
import { COUNTRIES, ROUNDS } from './flags.js';
import { shuffle } from './rng.js';

const OPTIONS_PER_ROUND = 4;

/** One round: a country + 4 options (answer included), all distinct. */
export function buildFlagRound(pool = COUNTRIES) {
  const deck = shuffle(pool);
  const answer = deck[0];
  const distractors = deck.slice(1, OPTIONS_PER_ROUND);
  return {
    answer,
    options: shuffle([answer, ...distractors])
  };
}

/** A full game: ROUNDS distinct countries (no repeats). */
export function buildFlagGame(pool = COUNTRIES) {
  const deck = shuffle(pool).slice(0, ROUNDS);
  return deck.map(answer => ({
    answer,
    options: shuffle([answer, ...shuffle(pool.filter(c => c.code !== answer.code)).slice(0, OPTIONS_PER_ROUND - 1)])
  }));
}

export function flagScoreTitle(score, total = ROUNDS) {
  const pct = score / total;
  if (pct === 1) return { title: 'CARTOGRAPHER ROYALTY 🗺️', msg: 'Perfect. Do you work at the UN?' };
  if (pct >= 0.8) return { title: 'GLOBETROTTER 🌍', msg: 'You have definitely binge-watched travel vlogs.' };
  if (pct >= 0.6) return { title: 'SOLID TOURIST 🧳', msg: 'Respectable flag game.' };
  if (pct >= 0.4) return { title: 'ARMCHAIR EXPLORER 🛋️', msg: 'Half the world, half the time.' };
  return { title: 'LOST TOURIST 🧭', msg: 'The map was upside down, huh?' };
}
