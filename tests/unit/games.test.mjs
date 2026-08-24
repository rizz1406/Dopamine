import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildDailyAnswer, evaluateGuess, isValidWord, buildWordShare, wordVerdict } from '../../public/js/word-logic.js';
import { buildFlagRound, buildFlagGame, flagScoreTitle } from '../../public/js/flag-logic.js';
import { ANSWERS, VALID_WORDS, WORD_LENGTH, MAX_GUESSES } from '../../public/js/words.js';
import { COUNTRIES, ROUNDS, flagUrl } from '../../public/js/flags.js';

describe('word logic', () => {
  test('daily answer is deterministic + from the answer pool', () => {
    const a = buildDailyAnswer(100);
    const b = buildDailyAnswer(100);
    assert.equal(a, b);
    assert.ok((new Set(ANSWERS.map(w => w.toUpperCase()))).has(a));
    const c = buildDailyAnswer(101);
    assert.notEqual(a, c);
  });

  test('evaluateGuess marks exact positions', () => {
    assert.deepEqual(evaluateGuess('CRANE', 'CRANE'), ['correct', 'correct', 'correct', 'correct', 'correct']);
    // R exists in STORM (position 3), so it's present
    assert.deepEqual(evaluateGuess('CRANE', 'STORM'), ['absent', 'present', 'absent', 'absent', 'absent']);
    assert.deepEqual(evaluateGuess('PIZZA', 'STORM'), ['absent', 'absent', 'absent', 'absent', 'absent']);
  });

  test('duplicate letters follow Wordle rules', () => {
    // answer SPEED, guess KEELS: pos2 E aligns exactly; pos1 E consumes the spare E; pos4 S present
    const r = evaluateGuess('KEELS', 'SPEED');
    assert.deepEqual(r, ['absent', 'present', 'correct', 'absent', 'present']);
    // answer ABBEY (A-B-B-E-Y), guess EBBED: pos0 E absent (no spare E), B/B/B/E all align exactly, D absent
    const r2 = evaluateGuess('EBBED', 'ABBEY');
    assert.deepEqual(r2, ['absent', 'correct', 'correct', 'correct', 'absent']);
    // true present-case: answer ABBEY, guess BEAST → B present, E present, A present
    const r4 = evaluateGuess('BEAST', 'ABBEY');
    assert.deepEqual(r4, ['present', 'present', 'present', 'absent', 'absent']);
    // more B's guessed than exist: extras go absent
    const r3 = evaluateGuess('BBBBB', 'ABBEB');
    assert.deepEqual(r3, ['absent', 'correct', 'correct', 'absent', 'correct']);
  });

  test('validation accepts real words, rejects junk', () => {
    assert.equal(isValidWord('CRANE'), true);
    assert.equal(isValidWord('crane'), true); // case-insensitive
    assert.equal(isValidWord('XQZJW'), false);
    assert.equal(isValidWord('AAAAA'), false);
  });

  test('dataset integrity: all answers are clean 5-letter words', () => {
    assert.ok(ANSWERS.length >= 150, 'enough daily answers');
    const bad = ANSWERS.filter(w => !/^[a-z]{5}$/.test(w));
    assert.deepEqual(bad, []);
  });

  test('share text has grid + score', () => {
    const guesses = [
      { word: 'CRANE', states: ['absent', 'correct', 'absent', 'absent', 'present'] },
      { word: 'STORM', states: ['correct', 'correct', 'correct', 'correct', 'correct'] }
    ];
    const text = buildWordShare(guesses, 'STORM', 5, true);
    assert.match(text, /WORD GUESS #5 — 2\/6/);
    assert.match(text, /⬛🟩⬛⬛🟨/);
    assert.match(text, /🟩🟩🟩🟩🟩/);
  });

  test('verdict escalates down', () => {
    assert.match(wordVerdict(1).title, /SORCERER/);
    assert.match(wordVerdict(6).title, /DEADLINE/);
  });

  test('constants', () => {
    assert.equal(WORD_LENGTH, 5);
    assert.equal(MAX_GUESSES, 6);
    assert.ok(VALID_WORDS.length >= 2000, 'guess dictionary size');
  });
});

describe('flag logic', () => {
  test('round has answer + 4 unique options incl. answer', () => {
    for (let i = 0; i < 30; i++) {
      const r = buildFlagRound();
      assert.equal(r.options.length, 4);
      assert.equal(new Set(r.options.map(o => o.code)).size, 4);
      assert.ok(r.options.some(o => o.code === r.answer.code));
    }
  });

  test('full game: 10 rounds, no repeated answers', () => {
    const game = buildFlagGame();
    assert.equal(game.length, ROUNDS);
    assert.equal(new Set(game.map(r => r.answer.code)).size, ROUNDS);
    game.forEach(r => {
      assert.equal(r.options.length, 4);
      assert.ok(r.options.some(o => o.code === r.answer.code));
    });
  });

  test('score titles escalate', () => {
    assert.match(flagScoreTitle(10).title, /ROYALTY/);
    assert.match(flagScoreTitle(0).title, /LOST/);
    assert.notEqual(flagScoreTitle(10).title, flagScoreTitle(5).title);
  });

  test('country data valid + unique', () => {
    assert.ok(COUNTRIES.length >= 170, 'variety');
    const codes = new Set(COUNTRIES.map(c => c.code));
    assert.equal(codes.size, COUNTRIES.length);
    COUNTRIES.forEach(c => {
      assert.match(c.code, /^[a-z]{2}$/);
      assert.ok(c.name.length > 2);
      assert.ok(['Asia', 'Europe', 'Africa', 'Americas', 'Oceania'].includes(c.continent));
    });
  });

  test('flagUrl builds flagcdn link', () => {
    assert.equal(flagUrl('in'), 'https://flagcdn.com/w320/in.png');
    assert.equal(flagUrl('us', 160), 'https://flagcdn.com/w160/us.png');
  });
});
