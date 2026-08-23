// HIGHER OR LOWER — endless duel logic. Pure logic, testable.
import { HL_ITEMS } from './data.js';
import { shuffle } from './rng.js';

/**
 * Generate an endless sequence of pairs with no immediate repeats.
 * Returns array of {left, right} where right items chain (right of pair N = left of pair N+1).
 */
export function buildDeck(size = 60) {
  const deck = shuffle(HL_ITEMS).slice(0, Math.min(size + 1, HL_ITEMS.length));
  const pairs = [];
  for (let i = 0; i < deck.length - 1; i++) {
    pairs.push({ left: deck[i], right: deck[i + 1] });
  }
  return pairs;
}

export function isHigherGuessCorrect(pair, guess) {
  return guess === 'right'
    ? pair.right.v > pair.left.v
    : pair.left.v > pair.right.v;
}

export function formatValue(v) {
  if (v >= 1000000) return (v / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1000) return (v / 1000).toFixed(0).replace(/\.0$/, '') + 'K';
  return String(v);
}

export function streakTitle(streak) {
  if (streak >= 25) return 'ORACLE 🔮';
  if (streak >= 15) return 'DATA WIZARD 🧙';
  if (streak >= 10) return 'BIG BRAIN 🧠';
  if (streak >= 5) return 'ON FIRE 🔥';
  if (streak >= 3) return 'HEATING UP ♨️';
  return '';
}
