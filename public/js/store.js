// localStorage persistence with graceful fallback (private mode safe).

const KEY = 'dopamine:v1';

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function write(db) {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {}
}

export const store = {
  get(key, fallback = null) {
    const db = read();
    return key in db ? db[key] : fallback;
  },
  set(key, value) {
    const db = read();
    db[key] = value;
    write(db);
    return value;
  },

  // ── streaks ──
  /** Update streak for a game after a daily result. playedToday guards double-count. */
  recordDaily(game, won, day) {
    const db = read();
    const s = db.streaks?.[game];
    let streak;
    if (s && s.lastDay === day) {
      // already played today — keep as-is
      streak = s;
    } else if (!s) {
      streak = { lastDay: day, current: won ? 1 : 0, best: Math.max(0, won ? 1 : 0), played: 1 };
    } else {
      const consecutive = day === s.lastDay + 1;
      const current = consecutive && won ? s.current + 1 : won ? 1 : 0;
      streak = { lastDay: day, current, best: Math.max(s.best || 0, current), played: (s.played || 0) + 1 };
    }
    db.streaks = { ...(db.streaks || {}), [game]: streak };
    write(db);
    return streak;
  },
  streak(game) {
    return read().streaks?.[game] || { current: 0, best: 0, played: 0 };
  },
  hasPlayed(game, day) {
    return read().streaks?.[game]?.lastDay === day;
  },

  // ── misc records ──
  best(key) { return this.get('best:' + key, 0); },
  setBest(key, value) {
    if (value > this.best(key)) this.set('best:' + key, value);
    return this.best(key);
  },
  history(key) { return this.get('history:' + key, []); },
  pushHistory(key, entry) {
    const h = this.history(key);
    h.unshift(entry);
    this.set('history:' + key, h.slice(0, 30));
  }
};
