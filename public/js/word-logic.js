// WORD GUESS — daily word puzzle logic. Pure, testable.
import { ANSWERS, VALID_WORDS, WORD_LENGTH, MAX_GUESSES } from './words.js';
import { dayNumber, hashString, mulberry32 } from './rng.js';

const UNIQUE_ANSWERS = [...new Set(ANSWERS.map(w => w.toUpperCase()))];
const VALID_SET = new Set(VALID_WORDS);

/** Today's answer — deterministic, same for everyone. */
export function buildDailyAnswer(day = dayNumber()) {
  const idx = mulberry32(hashString('word:' + day))() * UNIQUE_ANSWERS.length | 0;
  return UNIQUE_ANSWERS[idx];
}

export function isValidWord(word) {
  return VALID_SET.has(word.toUpperCase());
}

/**
 * Score a guess against the answer (Wordle rules, duplicates handled).
 * Returns array of 'correct' | 'present' | 'absent'.
 */
export function evaluateGuess(guess, answer) {
  const g = guess.toUpperCase();
  const a = answer.toUpperCase();
  const result = new Array(WORD_LENGTH).fill('absent');
  const remaining = {};

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (g[i] === a[i]) result[i] = 'correct';
    else remaining[a[i]] = (remaining[a[i]] || 0) + 1;
  }
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] === 'correct') continue;
    const ch = g[i];
    if (remaining[ch] > 0) {
      result[i] = 'present';
      remaining[ch]--;
    }
  }
  return result;
}

/** Emoji grid row for share text. */
export function rowEmojis(states) {
  return states.map(s => s === 'correct' ? '🟩' : s === 'present' ? '🟨' : '⬛').join('');
}

export function buildWordShare(guesses, answer, day = dayNumber(), won) {
  const header = won
    ? `🔤 WORD GUESS #${day} — ${guesses.length}/${MAX_GUESSES}`
    : `🔤 WORD GUESS #${day} — X/${MAX_GUESSES} (it was ${answer.toUpperCase()})`;
  return [header, ...guesses.map(g => rowEmojis(g.states)), 'Play → https://dopamine.games'].join('\n');
}

export function wordVerdict(guessCount) {
  if (guessCount === 1) return { title: 'FIRST TRY SORCERER 🪄', msg: 'Are you reading minds?' };
  if (guessCount <= 3) return { title: 'LEXICON LEGEND 📚', msg: 'The dictionary fears you.' };
  if (guessCount <= 4) return { title: 'WORD WIZARD 🧙', msg: 'Smooth and efficient.' };
  if (guessCount <= 5) return { title: 'PERSISTENT POET ✍️', msg: 'Got there in the end!' };
  return { title: 'DEADLINE DODGER 😅', msg: 'That was close. Too close.' };
}
