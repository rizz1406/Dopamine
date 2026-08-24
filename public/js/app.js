// DOPAMINE app shell: router (clean paths), hub, shared UI helpers.
import { dayNumber } from './rng.js';
import { store } from './store.js';
import { isMuted, toggleMute, sfx } from './audio.js';
import { applyAdsConfig, initServerConfig } from './ads.js';
import { shareTargets, brandIconSvg, BRANDS, nativeShare, hasNativeShare, shareImageCard } from './share.js';
import { todaySummary, nextDailyHref } from './daily.js';
import { events } from './analytics.js';
import { renderReel } from './games/reel.js';
import { renderHigherLower } from './games/higherlower.js';
import { renderReflex } from './games/reflex.js';
import { renderMemory } from './games/memory.js';
import { renderTimeline } from './games/timeline.js';
import { renderWord } from './games/word.js';
import { renderFlagRush } from './games/flagrush.js';
import { renderSpeed } from './games/speed.js';
import { renderSnake } from './games/snake.js';
import { renderLeaderboard } from './games/leaderboard.js';
import { renderStats } from './pages/stats.js';
import { renderLegal, legalMeta } from './pages/legal.js';
import { renderAdmin } from './games/admin.js';

const view = document.getElementById('view');
const SITE = 'https://dopamine.games';

// ── route table: path → { render, title, desc } ──
const ROUTES = {
  '/': { render: renderHub, title: 'DOPAMINE — Daily Arcade 🎮 | 9 Free Mini-Games', desc: 'Your daily dose of pointless brilliance. 9 free daily mini-games: emoji movie quiz, word guess, flag rush, car racing, snake and more. Same puzzles for everyone, new every day.' },
  '/reel': { render: renderReel, title: 'REEL — Guess the Movie from Emojis | Daily Puzzle', desc: 'Today\'s REEL puzzle: guess the movie from emojis in 4 tries with escalating hints. Same puzzle for everyone, new daily at 00:00 UTC. Free.' },
  '/higher-lower': { render: renderHigherLower, title: 'Higher or Lower — Search Volume Game', desc: 'Which does the internet search more? Build the longest streak in this addictive daily guessing game. Free, no account needed.' },
  '/word': { render: renderWord, title: 'Word Guess — Daily 5-Letter Word Puzzle', desc: 'A new 5-letter word every day. 6 tries, color-coded hints, streaks and a shareable grid. The daily word puzzle for word nerds.' },
  '/memory': { render: renderMemory, title: 'Memory — Simon Pattern Game', desc: 'Watch the pattern, repeat it, go as far as your brain takes you. Free online memory game with global daily leaderboard.' },
  '/timeline': { render: renderTimeline, title: 'Timeline — Order Movies by Release Year', desc: 'Can you order 4 movies from oldest to newest? A daily movie trivia game with 3 strikes. Play free.' },
  '/flags': { render: renderFlagRush, title: 'Flag Rush — Guess the Country Flag in 5 Seconds', desc: '10 flags, 5 seconds each. A fast geography quiz for flags and countries. Free, no signup.' },
  '/speed': { render: renderSpeed, title: 'Speed Rush — Free Car Dodging Racing Game', desc: 'Dodge highway traffic at insane speeds in this free browser racing game. One more try guaranteed.' },
  '/snake': { render: renderSnake, title: 'Snake — The Classic Free Browser Game', desc: 'The Snake game you love: eat apples, grow long, survive. Free in your browser, with global daily leaderboard.' },
  '/reflex': { render: renderReflex, title: 'Reflex Test — How Fast Are You Really?', desc: 'A 5-round reaction time test with instant verdicts. Average under 250ms? You might be superhuman. Free.' },
  '/leaderboard': { render: renderLeaderboard, title: 'Leaderboard — Today\'s Best Players', desc: 'The global daily leaderboard for every DOPAMINE game. Top 20 players per game, reset at 00:00 UTC.' },
  '/stats': { render: renderStats, title: 'Your Stats — Streaks, Bests & Achievements', desc: 'Your DOPAMINE stats: daily streaks, per-game bests, total games played and achievements. All stored privately on your device.' },
  '/about': { ...legalMeta('about'), render: renderLegal('about') },
  '/privacy': { ...legalMeta('privacy'), render: renderLegal('privacy') },
  '/terms': { ...legalMeta('terms'), render: renderLegal('terms') },
  '/contact': { ...legalMeta('contact'), render: renderLegal('contact') },
  '/admin': { render: renderAdmin, title: 'Admin — DOPAMINE', desc: 'Owner console.' }
};

const HASH_ALIASES = { '/': '#/', '/reel': '#/reel', '/higher-lower': '#/higher-lower', '/word': '#/word', '/memory': '#/memory', '/timeline': '#/timeline', '/flags': '#/flags', '/speed': '#/speed', '/snake': '#/snake', '/reflex': '#/reflex', '/leaderboard': '#/leaderboard', '/stats': '#/stats', '/admin': '#/admin' };

function setMeta(title, desc) {
  document.title = title;
  const set = (sel, attr, val) => {
    const el = document.querySelector(sel);
    if (el) el.setAttribute(attr, val);
  };
  set('meta[name="description"]', 'content', desc);
  set('meta[property="og:title"]', 'content', title);
  set('meta[property="og:description"]', 'content', desc);
  set('meta[property="og:url"]', 'content', SITE + location.pathname);
  set('link[rel="canonical"]', 'href', SITE + location.pathname);
}

function resolveRoute() {
  // legacy hash URLs (#/reel) take priority when present
  const hash = (location.hash || '').slice(1);
  if (hash && ROUTES[hash]) return { path: hash, route: ROUTES[hash] };
  const path = location.pathname.replace(/\/+$/, '') || '/';
  if (ROUTES[path]) return { path, route: ROUTES[path] };
  return { path: '/', route: ROUTES['/'] };
}

export function navigate(href) {
  const path = HASH_ALIASES[href] ? href.slice(1) : (href.startsWith('#') ? '/' : href);
  history.pushState({}, '', path);
  router();
}

export const ui = {
  toast(msg) {
    const root = document.getElementById('toast-root');
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    root.appendChild(el);
    setTimeout(() => el.remove(), 2600);
  },

  openShareModal({ title, grid, text }) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    const targets = shareTargets(text);
    backdrop.innerHTML = `
      <div class="modal" role="dialog" aria-label="${title}">
        <h3>${title}</h3>
        ${grid ? `<div class="share-grid">${grid}</div>` : ''}
        <div class="share-box">${text.replace(/</g, '&lt;')}</div>
        <div class="share-apps" data-test="share-apps">
          ${targets.map(t => `<a class="share-app" data-test="share-${t.key}" href="${t.url}" target="_blank" rel="noopener"><span class="share-chip" style="--bc:${BRANDS[t.key].color}">${brandIconSvg(t.key)}</span><span>${t.name}</span></a>`).join('')}
        </div>
        ${hasNativeShare() ? `<button class="btn" style="width:100%" data-native>📱 More apps...</button>` : ''}
        <button class="btn" style="width:100%;margin-top:10px" data-image data-test="share-image">📸 Share as Image</button>
        <button class="btn" style="width:100%;margin-top:10px" data-copy>📋 Copy Result</button>
        <button class="btn ghost" style="width:100%;margin-top:10px" data-close>Close</button>
      </div>`;
    document.body.appendChild(backdrop);
    const close = () => backdrop.remove();
    backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
    backdrop.querySelector('[data-close]').addEventListener('click', () => { sfx.click(); close(); });
    const nativeBtn = backdrop.querySelector('[data-native]');
    if (nativeBtn) nativeBtn.addEventListener('click', () => nativeShare(text));
    backdrop.querySelector('[data-image]').addEventListener('click', async e => {
      sfx.click();
      e.target.disabled = true;
      const result = await shareImageCard({
        headline: text.split('\n')[0].replace(/^🎬 |^⚖️ |^🔤 |^🧠 |^⏳ |^🏳️ |^🏎️ |^🐍 |^⚡ /, ''),
        sub: 'play → dopamine.games',
        grid: grid || ''
      });
      e.target.disabled = false;
      if (result === 'shared') { ui.toast('📤 Shared!'); close(); }
      else if (result === 'downloaded') ui.toast('📸 Image downloaded — post it!');
      else e.target.disabled = false;
    });
    backdrop.querySelector('[data-copy]').addEventListener('click', async e => {
      sfx.correct();
      try {
        await navigator.clipboard.writeText(text);
        e.target.textContent = '✅ Copied! Now go brag';
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove();
        e.target.textContent = '✅ Copied!';
      }
      setTimeout(close, 1400);
    });
    return backdrop;
  }
};

function gameCard({ href, emoji, name, desc, streakKey, glow, daily, cls }) {
  const st = store.streak(streakKey);
  const hot = st.current > 0;
  return `
    <a class="game-card ${cls || ''}" href="${href}" data-nav style="--glow:${glow}">
      <span class="card-emoji">${emoji}</span>
      <h2>${name}</h2>
      <p>${desc}</p>
      <span class="streak-pill ${hot ? 'hot' : ''}">🔥 ${st.current} streak${daily ? ' · today' + (store.hasPlayed(streakKey, dayNumber()) ? ' ✓' : '') : ''}</span>
      <span class="play-hint">play →</span>
    </a>`;
}

function renderHub() {
  const day = dayNumber();
  const dayLabel = `#${day.toLocaleString()} · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
  const s = todaySummary();
  const bestStreak = Math.max(store.streak('reel').best, store.streak('word').best);
  const challengeBtn = s.complete
    ? `<a class="btn lime big" href="/stats" data-nav>✅ Challenge complete — ${s.points} pts · see stats</a>`
    : `<a class="btn big" href="${nextDailyHref()}" data-nav data-test="continue-btn">▶ Continue Today's Challenge</a>`;

  view.innerHTML = `
    <section class="hero">
      <h1>DOPAMINE.</h1>
      <p><span class="pulse-dot"></span>Puzzle <b>${dayLabel}</b> is live — same challenge for everyone, new at midnight UTC</p>
    </section>

    <section class="challenge-card" data-test="challenge-card">
      <div class="cc-left">
        <h3>Today's Challenge</h3>
        <div class="cc-games">
          ${s.games.map(g => `<span class="cc-game ${g.done ? 'done' : ''}">${g.done ? '✅' : '⬜'} ${g.label}</span>`).join('')}
        </div>
        <p class="cc-sub">${s.doneCount}/${s.total} complete · <b>${s.points}</b> points today</p>
      </div>
      <div class="cc-right">${challengeBtn}</div>
    </section>

    <h3 class="hub-section-title">🕹️ Daily Arcade</h3>
    <section class="game-grid">
      ${gameCard({
        href: '/reel', emoji: '🎬', name: 'REEL',
        desc: 'Guess the movie from emojis. 4 tries, hints get desperate.',
        streakKey: 'reel', glow: 'rgba(244,114,182,.25)', daily: true, cls: 'reel'
      })}
      ${gameCard({
        href: '/higher-lower', emoji: '⚖️', name: 'HIGHER OR LOWER',
        desc: 'What does the internet search more? Build an insane streak.',
        streakKey: 'hl', glow: 'rgba(34,211,238,.22)', daily: false, cls: 'hl'
      })}
      ${gameCard({
        href: '/word', emoji: '🔤', name: 'WORD GUESS',
        desc: 'Crack the hidden 5-letter word. 6 tries. Daily.',
        streakKey: 'word', glow: 'rgba(251,191,36,.2)', daily: true, cls: 'word'
      })}
      ${gameCard({
        href: '/memory', emoji: '🧠', name: 'MEMORY',
        desc: 'Watch the pattern. Repeat it. How far can your brain go?',
        streakKey: 'memory', glow: 'rgba(124,58,237,.28)', daily: false, cls: 'memory'
      })}
      ${gameCard({
        href: '/timeline', emoji: '⏳', name: 'TIMELINE',
        desc: 'Order the movies from oldest to newest. 3 strikes only.',
        streakKey: 'timeline', glow: 'rgba(251,191,36,.18)', daily: false, cls: 'timeline'
      })}
      ${gameCard({
        href: '/flags', emoji: '🏳️', name: 'FLAG RUSH',
        desc: '10 flags, 5 seconds each. How many countries do you know?',
        streakKey: 'flags', glow: 'rgba(34,211,238,.2)', daily: false, cls: 'flags'
      })}
      ${gameCard({
        href: '/speed', emoji: '🏎️', name: 'SPEED RUSH',
        desc: 'Dodge traffic at insane speeds. How far can you get?',
        streakKey: 'speed', glow: 'rgba(251,113,133,.22)', daily: false, cls: 'speed'
      })}
      ${gameCard({
        href: '/snake', emoji: '🐍', name: 'SNAKE',
        desc: 'The classic. Eat apples, grow long, don\'t bite yourself.',
        streakKey: 'snake', glow: 'rgba(163,230,53,.22)', daily: false, cls: 'snake'
      })}
      ${gameCard({
        href: '/reflex', emoji: '⚡', name: 'REFLEX',
        desc: '5 clicks. One average. Are you superhuman or just sleepy?',
        streakKey: 'reflex', glow: 'rgba(163,230,53,.2)', daily: false, cls: 'reflex'
      })}
    </section>

    <section class="hub-strip" data-test="streak-strip">
      <div>🔥 <b>${bestStreak}</b> best daily streak</div>
      <div>🏆 <a href="/leaderboard" data-nav>Today's leaderboard</a></div>
      <div>📊 <a href="/stats" data-nav>Your stats</a></div>
    </section>

    <section class="how-it-works">
      <h3 class="hub-section-title">❓ How it works</h3>
      <div class="hiw-grid">
        <div class="hiw"><span>1</span><b>Play the daily games</b><p>REEL and Word Guess refresh every day at 00:00 UTC — identical for every player on Earth.</p></div>
        <div class="hiw"><span>2</span><b>Build your streak</b><p>Finish a daily game to keep the fire alive. Miss a day, and it resets to zero. Brutal. Fair.</p></div>
        <div class="hiw"><span>3</span><b>Share & compete</b><p>Post your result grid (no spoilers), climb the global daily leaderboard, come back tomorrow.</p></div>
      </div>
    </section>`;
}

let currentCleanup = null;

function router() {
  if (typeof currentCleanup === 'function') currentCleanup();
  currentCleanup = null;
  const { route } = resolveRoute();
  setMeta(route.title || ROUTES['/'].title, route.desc || ROUTES['/'].desc);
  events.pageView(location.pathname + location.hash);
  route.render(view, cleanupFn => { currentCleanup = cleanupFn; });
  view.focus({ preventScroll: true });
  window.scrollTo({ top: 0 });
}

document.addEventListener('click', e => {
  const nav = e.target.closest('[data-nav]');
  if (!nav) return;
  e.preventDefault();
  sfx.whoosh();
  navigate(nav.getAttribute('href'));
});

window.addEventListener('popstate', router);

// chrome
document.getElementById('mute-btn').addEventListener('click', function () {
  this.textContent = toggleMute() ? '🔇' : '🔊';
});
if (isMuted()) document.getElementById('mute-btn').textContent = '🔇';
document.getElementById('foot-year').textContent = new Date().getFullYear();
document.getElementById('day-chip').textContent = '#' + dayNumber();
applyAdsConfig();
initServerConfig();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

router();
