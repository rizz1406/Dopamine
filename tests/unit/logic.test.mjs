import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { dayNumber, mulberry32, seededShuffle, hashString } from '../../public/js/rng.js';
import { buildDailyRounds, buildShareText, MAX_ATTEMPTS } from '../../public/js/reel-logic.js';
import { buildDeck, isHigherGuessCorrect, formatValue, streakTitle } from '../../public/js/hl-logic.js';
import { buildRound, checkPick, ROUND_COUNT, MAX_STRIKES, timelineVerdict } from '../../public/js/timeline-logic.js';
import { MOVIES, HL_ITEMS } from '../../public/js/data.js';

describe('rng', () => {
  test('epoch anchored at launch — Aug 23 2026 is Puzzle #1', () => {
    assert.equal(dayNumber(new Date('2026-08-23T00:00:00Z')), 1);
    assert.equal(dayNumber(new Date('2026-08-23T23:59:59Z')), 1);
    assert.equal(dayNumber(new Date('2026-08-22T23:59:59Z')), 0);
    assert.equal(dayNumber(new Date('2026-08-24T00:00:01Z')), 2);
  });

  test('dayNumber is deterministic and stable for today', () => {
    const d = dayNumber();
    assert.ok(d >= 1 && d < 100000, `got ${d}`);
    assert.equal(d, dayNumber());
  });

  test('mulberry32 same seed → same sequence', () => {
    const r1 = mulberry32(42), r2 = mulberry32(42);
    const seq1 = [r1(), r1(), r1()];
    const seq2 = [r2(), r2(), r2()];
    assert.deepEqual(seq1, seq2);
    seq1.forEach(v => assert.ok(v >= 0 && v < 1));
  });

  test('seededShuffle keeps elements, changes order deterministically', () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8];
    const s1 = seededShuffle(arr, 1234);
    const s2 = seededShuffle(arr, 1234);
    const s3 = seededShuffle(arr, 999);
    assert.deepEqual(s1.slice().sort(), arr);
    assert.deepEqual(s1, s2);
    assert.notDeepEqual(s1, s3);
    assert.deepEqual(arr, [1, 2, 3, 4, 5, 6, 7, 8]); // input untouched
  });

  test('hashString is stable', () => {
    assert.equal(hashString('reel:100'), hashString('reel:100'));
    assert.notEqual(hashString('reel:100'), hashString('reel:101'));
  });
});

describe('reel logic', () => {
  test('builds exactly 5 rounds with valid structure', () => {
    const rounds = buildDailyRounds(1500);
    assert.equal(rounds.length, 5);
    for (const r of rounds) {
      assert.ok(MOVIES.some(m => m.title === r.movie.title), 'answer must be from dataset');
      assert.equal(r.options.length, 6);
      assert.ok(r.options.some(o => o.title === r.movie.title), 'correct answer among options');
      assert.equal(new Set(r.options.map(o => o.title)).size, 6, 'options unique');
      assert.ok(r.movie.emojis.length >= 3, 'has emoji clues');
    }
  });

  test('same day → identical puzzles everywhere (the core promise)', () => {
    const a = buildDailyRounds(2000);
    const b = buildDailyRounds(2000);
    assert.deepEqual(a.map(r => r.movie.title), b.map(r => r.movie.title));
    assert.deepEqual(a[0].options.map(o => o.title), b[0].options.map(o => o.title));
  });

  test('different days → different puzzles (mostly)', () => {
    const titles = new Set();
    for (let d = 100; d < 130; d++) titles.add(buildDailyRounds(d)[0].movie.title);
    assert.ok(titles.size > 5, 'first puzzle should vary across days');
  });

  test('rounds do not repeat movies within one day', () => {
    const rounds = buildDailyRounds(777);
    const titles = rounds.map(r => r.movie.title);
    assert.equal(new Set(titles).size, 5);
  });

  test('share text format contains score + grid', () => {
    const results = [{ won: true }, { won: true }, { won: false }, { won: true }, { won: false }];
    const text = buildShareText(results, 1234);
    assert.match(text, /REEL #1234 — 3\/5/);
    assert.match(text, /🟩🟩🟥🟩🟥/);
  });

  test('MAX_ATTEMPTS sanity', () => {
    assert.equal(MAX_ATTEMPTS, 4);
  });
});

describe('timeline logic', () => {
  test('builds rounds with distinct movies and distinct years', () => {
    for (let i = 0; i < 20; i++) {
      const r = buildRound();
      assert.equal(r.movies.length, 4);
      assert.equal(new Set(r.movies.map(m => m.title)).size, 4);
      assert.equal(new Set(r.movies.map(m => m.year)).size, 4, 'years must be distinct');
      // solution is ascending by year and covers the same movies
      assert.deepEqual(r.solution.slice().sort(), r.movies.map(m => m.title).sort());
      const years = r.solution.map(t => r.movies.find(m => m.title === t).year);
      assert.deepEqual(years, [...years].sort((a, b) => a - b));
    }
  });

  test('checkPick validates the tapped card against oldest-first order', () => {
    const round = {
      movies: [
        { title: 'New', year: 2020 }, { title: 'Old', year: 1970 },
        { title: 'Mid', year: 1995 }, { title: 'Older', year: 1980 }
      ],
      solution: ['Old', 'Older', 'Mid', 'New']
    };
    assert.equal(checkPick(round, [], 'Old').correct, true);
    assert.equal(checkPick(round, [], 'New').correct, false);
    assert.equal(checkPick(round, ['Old'], 'Older').correct, true);
    assert.equal(checkPick(round, ['Old'], 'Mid').correct, false);
    assert.equal(checkPick(round, ['Old', 'Older', 'Mid'], 'New').correct, true);
  });

  test('verdicts escalate with performance', () => {
    assert.equal(timelineVerdict(0, 3).title, 'TIME LORD ⏳');
    assert.ok(timelineVerdict(2, 3).title !== timelineVerdict(0, 0).title);
  });

  test('constants sanity', () => {
    assert.equal(ROUND_COUNT, 3);
    assert.equal(MAX_STRIKES, 3);
  });
});

describe('higher-lower logic', () => {
  test('deck builds valid chained pairs', () => {
    const deck = buildDeck(30);
    assert.ok(deck.length >= 20);
    for (const p of deck) {
      assert.ok(p.left.v > 0 && p.right.v > 0);
      assert.notEqual(p.left.name, p.right.name);
    }
    for (let i = 1; i < deck.length; i++) {
      assert.equal(deck[i].left.name, deck[i - 1].right.name, 'pairs chain');
    }
  });

  test('guess correctness resolves against real values', () => {
    const pair = { left: { name: 'A', v: 100 }, right: { name: 'B', v: 50 } };
    assert.equal(isHigherGuessCorrect(pair, 'left'), true);
    assert.equal(isHigherGuessCorrect(pair, 'right'), false);
  });

  test('formatValue abbreviates nicely', () => {
    assert.equal(formatValue(450000), '450K');
    assert.equal(formatValue(1400000), '1.4M');
  });

  test('streak titles escalate', () => {
    assert.equal(streakTitle(1), '');
    assert.ok(streakTitle(30).length > streakTitle(5).length || streakTitle(30) !== streakTitle(5));
  });

  test('dataset has no duplicate names and enough items', () => {
    assert.ok(HL_ITEMS.length >= 80, 'need variety');
    assert.equal(new Set(HL_ITEMS.map(i => i.name)).size, HL_ITEMS.length);
  });

  test('movies dataset has no duplicate titles', () => {
    assert.equal(new Set(MOVIES.map(m => m.title)).size, MOVIES.length);
    MOVIES.forEach(m => {
      assert.ok(m.title && m.year > 1900 && m.genre && m.hint && Array.isArray(m.emojis));
    });
  });
});
