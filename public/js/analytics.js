// analytics.js — privacy-friendly event abstraction. Provider-agnostic:
// events go to window.dataLayer (GTM/GA4-ready) + console.debug in dev.
// No personal data: only game keys, scores, puzzle ids, result flags.

const enabled = true;

export function track(event, props = {}) {
  if (!enabled) return;
  const payload = { event, ...props, ts: Date.now() };
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
  } catch {}
  if (location.hostname === 'localhost') {
    // dev visibility without polluting production consoles
    console.debug('[analytics]', event, props);
  }
}

export const events = {
  pageView: (path) => track('page_view', { path }),
  gameOpened: (game) => track('game_opened', { game }),
  gameCompleted: (game, { score, won, puzzleId } = {}) =>
    track('game_completed', { game, score, won: !!won, puzzle_id: puzzleId ?? null }),
  gameFailed: (game, { score, puzzleId } = {}) =>
    track('game_failed', { game, score, puzzle_id: puzzleId ?? null }),
  shareClicked: (game) => track('share_clicked', { game }),
  shareCompleted: (game, method) => track('share_completed', { game, method }),
  leaderboardViewed: (game) => track('leaderboard_viewed', { game }),
  achievementUnlocked: (id) => track('achievement_unlocked', { achievement: id }),
  dailyCompleted: ({ points, day }) => track('daily_challenge_completed', { points, day })
};
