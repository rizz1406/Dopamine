// TIMELINE — order movies from oldest to newest. Pure logic, testable.
import { MOVIES } from './data.js';
import { shuffle } from './rng.js';

export const ROUND_COUNT = 3;
export const MOVIES_PER_ROUND = 4;
export const MAX_STRIKES = 3;

/** One round: 4 distinct movies, guaranteed distinct years. */
export function buildRound(pool = MOVIES) {
  const byYear = new Map();
  for (const m of pool) if (!byYear.has(m.year)) byYear.set(m.year, m);
  const unique = [...byYear.values()];
  const picked = shuffle(unique).slice(0, MOVIES_PER_ROUND);
  return {
    movies: shuffle(picked),
    solution: picked.slice().sort((a, b) => a.year - b.year).map(m => m.title)
  };
}

/** Click validation: the tapped movie must be the oldest not-yet-picked one. */
export function checkPick(round, pickedTitles, clickedTitle) {
  const expected = round.solution[pickedTitles.length];
  return { correct: clickedTitle === expected };
}

export function timelineVerdict(strikes, roundsWon) {
  if (strikes === 0 && roundsWon === ROUND_COUNT) return { title: 'TIME LORD ⏳', msg: 'You ARE the timeline.' };
  if (roundsWon === ROUND_COUNT) return { title: 'FILM HISTORIAN 🎓', msg: 'Flawless sense of cinematic history.' };
  if (roundsWon >= 2) return { title: 'DECENT ARCHIVIST 🗂️', msg: 'Mostly chronological. Mostly.' };
  if (roundsWon >= 1) return { title: 'CONFUSED CINEMA GOER 🍿', msg: 'Was Titanic before or after... everything?' };
  return { title: 'LIVING IN THE NOW 🫠', msg: 'Time is a construct, apparently.' };
}
