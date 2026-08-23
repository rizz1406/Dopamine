// localStorage shim BEFORE importing store (ESM import hoisting handled via dynamic import).
const mem = new Map();
globalThis.localStorage = {
  getItem: k => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: k => mem.delete(k),
  clear: () => mem.clear()
};

const { test, describe, beforeEach } = await import('node:test');
const assert = (await import('node:assert/strict')).default;
const { store } = await import('../../public/js/store.js');

describe('store', () => {
  beforeEach(() => mem.clear());

  test('get/set roundtrip with fallback', () => {
    assert.equal(store.get('nope', 'fallback'), 'fallback');
    store.set('x', { n: 1 });
    assert.deepEqual(store.get('x'), { n: 1 });
  });

  test('recordDaily starts and extends streaks only once per day', () => {
    const s1 = store.recordDaily('reel', true, 100);
    assert.equal(s1.current, 1);
    // same day again → not double counted
    const s2 = store.recordDaily('reel', true, 100);
    assert.equal(s2.current, 1);
    assert.equal(s2.played, 1);
    // next day win → streak grows
    const s3 = store.recordDaily('reel', true, 101);
    assert.equal(s3.current, 2);
    assert.equal(s3.best, 2);
    // skip a day → streak resets but best kept
    const s4 = store.recordDaily('reel', true, 105);
    assert.equal(s4.current, 1);
    assert.equal(s4.best, 2);
    // loss breaks streak
    const s5 = store.recordDaily('reel', false, 106);
    assert.equal(s5.current, 0);
    assert.equal(s5.played, 4);
  });

  test('hasPlayed tracks last played day', () => {
    assert.equal(store.hasPlayed('reel', 100), false);
    store.recordDaily('reel', true, 100);
    assert.equal(store.hasPlayed('reel', 100), true);
    assert.equal(store.hasPlayed('reel', 101), false);
  });

  test('best scores only go up', () => {
    assert.equal(store.setBest('hl-streak', 12), 12);
    assert.equal(store.setBest('hl-streak', 8), 12);
    assert.equal(store.setBest('hl-streak', 20), 20);
    assert.equal(store.best('reflex-avg'), 0);
  });

  test('history caps at 30 entries, newest first', () => {
    for (let i = 0; i < 35; i++) store.pushHistory('hl', { streak: i });
    const h = store.history('hl');
    assert.equal(h.length, 30);
    assert.equal(h[0].streak, 34);
  });
});
