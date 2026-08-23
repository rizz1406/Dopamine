// Deterministic daily randomness — everyone on Earth gets the same puzzle each day.

// Launch day anchor: Aug 23 2026 = Puzzle #1. Numbers now mean something:
// #1 = launch day, #2 = tomorrow, etc.
export const EPOCH = Date.UTC(2026, 7, 22);

/** Days since epoch — changes at UTC midnight. Puzzle #N. */
export function dayNumber(now = new Date()) {
  return Math.floor((Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - EPOCH) / 86400000);
}

/** mulberry32 — tiny fast seeded PRNG. Returns float [0,1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seededShuffle(arr, seed) {
  const rand = mulberry32(seed);
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function pickN(arr, n, rand) {
  return seededShuffle(arr, Math.floor(rand() * 2 ** 31)).slice(0, n);
}

/** Non-seeded shuffle for endless modes. */
export function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
