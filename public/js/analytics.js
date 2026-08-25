// analytics.js — privacy-friendly event abstraction. Provider-agnostic:
// events go to window.dataLayer (GTM/GA4-ready) + GA4/Plausible when configured
// in index.html (window.DOPAMINE_CONFIG). No personal data: only game keys,
// scores, puzzle ids, result flags.

const cfg = (typeof window !== 'undefined' && window.DOPAMINE_CONFIG) || {};
let gaLoaded = false;
let plausibleLoaded = false;

function loadGA4() {
  if (gaLoaded || !cfg.gaId) return;
  gaLoaded = true;
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${cfg.gaId}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', cfg.gaId);
}

function loadPlausible() {
  if (plausibleLoaded || !cfg.plausibleDomain) return;
  plausibleLoaded = true;
  const s = document.createElement('script');
  s.defer = true;
  s.dataset.domain = cfg.plausibleDomain;
  s.src = 'https://plausible.io/js/script.js';
  document.head.appendChild(s);
  window.plausible = window.plausible || ((...a) => (window.plausible.q = window.plausible.q || []).push(a));
}

loadGA4();
loadPlausible();

const enabled = true;

export function track(event, props = {}) {
  if (!enabled) return;
  const payload = { event, ...props, ts: Date.now() };
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
  } catch {}
  try {
    if (window.gtag) window.gtag('event', event, props);
    if (window.plausible) window.plausible(event, { props });
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
