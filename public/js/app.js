// DOPAMINE app shell: router (clean paths), hub, shared UI helpers.
import { dayNumber } from './rng.js';
import { store } from './store.js';
import { isMuted, toggleMute, sfx } from './audio.js';
import { applyAdsConfig, initServerConfig } from './ads.js';
import { shareTargets, brandIconSvg, BRANDS, nativeShare, hasNativeShare, shareImageCard } from './share.js';
import { todaySummary, nextDailyHref } from './daily.js';
import { events } from './analytics.js';
import { t, getLang, setLang } from './i18n.js';
import { renderLegal, legalMeta } from './pages/legal.js';

// Lazy load games for code splitting
const lazy = (loader) => {
  let mod = null;
  return async (...args) => {
    if (!mod) mod = await loader();
    return mod.default ? mod.default(...args) : mod[Object.keys(mod)[0]](...args);
  };
};

const renderReel = lazy(() => import('./games/reel.js'));
const renderHigherLower = lazy(() => import('./games/higherlower.js'));
const renderReflex = lazy(() => import('./games/reflex.js'));
const renderMemory = lazy(() => import('./games/memory.js'));
const renderTimeline = lazy(() => import('./games/timeline.js'));
const renderWord = lazy(() => import('./games/word.js'));
const renderFlagRush = lazy(() => import('./games/flagrush.js'));
const renderSpeed = lazy(() => import('./games/speed.js'));
const renderSnake = lazy(() => import('./games/snake.js'));
const render2048 = lazy(() => import('./games/g2048.js'));
const renderTetris = lazy(() => import('./games/tetris.js'));
const renderMinesweeper = lazy(() => import('./games/minesweeper.js'));
const renderFlappy = lazy(() => import('./games/flappy.js'));
const renderBreakout = lazy(() => import('./games/breakout.js'));
const renderWhack = lazy(() => import('./games/whack.js'));
const renderStack = lazy(() => import('./games/stack.js'));
const renderLeaderboard = lazy(() => import('./games/leaderboard.js'));
const renderStats = lazy(() => import('./pages/stats.js'));
const renderSEO = lazy(() => import('./pages/seo.js'));
const renderAdmin = lazy(() => import('./games/admin.js'));

const view = document.getElementById('view');
const SITE = 'https://dopamine.games';

// ── route table: path → { render, title, desc } ──
const ROUTES = {
  '/': { render: renderHub, title: 'DOPAMINE — Daily Arcade 🎮 | 16 Free Mini-Games', desc: 'Your daily dose of pointless brilliance. 16 free mini-games: emoji movie quiz, word guess, flag rush, car racing, snake and more. Same puzzles for everyone, new every day.' },
  '/reel': { render: renderReel, title: 'REEL — Guess the Movie from Emojis | Daily Puzzle', desc: 'Today\'s REEL puzzle: guess the movie from emojis in 4 tries with escalating hints. Same puzzle for everyone, new daily at 00:00 UTC. Free.' },
  '/hl': { render: renderHigherLower, title: 'Higher or Lower — Search Volume Game', desc: 'Which does the internet search more? Build the longest streak in this addictive daily guessing game. Free, no account needed.' },
  '/word': { render: renderWord, title: 'Word Guess — Daily 5-Letter Word Puzzle', desc: 'A new 5-letter word every day. 6 tries, color-coded hints, streaks and a shareable grid. The daily word puzzle for word nerds.' },
  '/memory': { render: renderMemory, title: 'Memory — Simon Pattern Game', desc: 'Watch the pattern, repeat it, go as far as your brain takes you. Free online memory game with global daily leaderboard.' },
  '/timeline': { render: renderTimeline, title: 'Timeline — Order Movies by Release Year', desc: 'Can you order 4 movies from oldest to newest? A daily movie trivia game with 3 strikes. Play free.' },
  '/flags': { render: renderFlagRush, title: 'Flag Rush — Guess the Country Flag in 5 Seconds', desc: '10 flags, 5 seconds each. A fast geography quiz for flags and countries. Free, no signup.' },
  '/speed': { render: renderSpeed, title: 'Speed Rush — Free Car Dodging Racing Game', desc: 'Dodge highway traffic at insane speeds in this free browser racing game. One more try guaranteed.' },
  '/snake': { render: renderSnake, title: 'Snake — The Classic Free Browser Game', desc: 'The Snake game you love: eat apples, grow long, survive. Free in your browser, with global daily leaderboard.' },
  '/2048': { render: render2048, title: '2048 — Free Online Slide & Merge Puzzle', desc: 'The legendary 2048 number puzzle: slide tiles, merge equals, chase the 2048 tile. Free in your browser with a global leaderboard.' },
  '/tetris': { render: renderTetris, title: 'Tetris — Free Online Stacking Puzzle', desc: 'Play Tetris free in your browser. Stack blocks, clear lines, chase the high score. Global daily leaderboard.' },
  '/minesweeper': { render: renderMinesweeper, title: 'Minesweeper — Free Classic Logic Puzzle', desc: 'Classic Minesweeper free online. 3 difficulties, flag the mines, beat the clock. Global leaderboard.' },
  '/flappy': { render: renderFlappy, title: 'Flappy Bird — Free Tap to Fly Game', desc: 'Flappy Bird free in your browser. Tap to fly, dodge pipes, beat your best. Global daily leaderboard.' },
  '/breakout': { render: renderBreakout, title: 'Breakout — Free Brick Breaker Game', desc: 'Breakout free online. Bounce the ball, smash the bricks, clear the level. Global leaderboard.' },
  '/whack': { render: renderWhack, title: 'Whack-a-Mole — Free Speed Tap Game', desc: 'Whack-a-Mole free online. 30 seconds, 9 holes, how many can you tap? Global leaderboard.' },
  '/stack': { render: renderStack, title: 'Stack 3D — Free Tower Stack Game', desc: 'Stack 3D free online. Time the drop, build the tower. How high can you go? Global leaderboard.' },
  '/games-like-wordle': { render: renderSEO('games-like-wordle'), title: '10 Free Games Like Wordle — Daily Puzzle Games', desc: 'Love Wordle? Discover 10 free daily puzzle games like Wordle — emoji movie quizzes, flag quizzes, memory games and more. No signup.' },
  '/brain-games': { render: renderSEO('brain-games'), title: 'Free Brain Games — Train Memory, Reflexes & Logic Daily', desc: 'Free online brain games to train memory, reaction time and logic. Short daily challenges, a global leaderboard and streaks. No signup.' },
  '/reflex': { render: renderReflex, title: 'Reflex Test — How Fast Are You Really?', desc: 'A 5-round reaction time test with instant verdicts. Average under 250ms? You might be superhuman. Free.' },
  '/leaderboard': { render: renderLeaderboard, title: 'Leaderboard — Today\'s Best Players', desc: 'The global daily leaderboard for every DOPAMINE game. Top 20 players per game, reset at 00:00 UTC.' },
  '/stats': { render: renderStats, title: 'Your Stats — Streaks, Bests & Achievements', desc: 'Your DOPAMINE stats: daily streaks, per-game bests, total games played and achievements. All stored privately on your device.' },
  '/about': { ...legalMeta('about'), render: renderLegal('about') },
  '/privacy': { ...legalMeta('privacy'), render: renderLegal('privacy') },
  '/terms': { ...legalMeta('terms'), render: renderLegal('terms') },
  '/contact': { ...legalMeta('contact'), render: renderLegal('contact') },
  '/admin': { render: renderAdmin, title: 'Admin — DOPAMINE', desc: 'Owner console.' }
};


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
  // accepts '/reel', '#/reel', '#/' — always lands on a clean path
  const path = href.startsWith('#') ? (href.slice(1) || '/') : href;
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
    events.shareClicked(text.split('\n')[0]);
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
        ${hasNativeShare() ? `<button class="btn" style="width:100%" data-native>${t('moreApps')}</button>` : ''}
        <button class="btn" style="width:100%;margin-top:10px" data-image data-test="share-image">${t('shareImage')}</button>
        <button class="btn" style="width:100%;margin-top:10px" data-copy>${t('copyResult')}</button>
        <button class="btn ghost" style="width:100%;margin-top:10px" data-close>${t('close')}</button>
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
      <span class="streak-pill ${hot ? 'hot' : ''}">🔥 ${st.current} ${t('streak')}${daily ? ' · ' + t('today') + (store.hasPlayed(streakKey, dayNumber()) ? ' ✓' : '') : ''}</span>
      <span class="play-hint">${t('play')} →</span>
    </a>`;
}

function renderHub() {
  const day = dayNumber();
  applyAdsConfig(); // paint dynamic ad slots created by this template
  const dayLabel = `#${day.toLocaleString()} · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`;
  const s = todaySummary();
  const bestStreak = Math.max(store.streak('reel').best, store.streak('word').best);
  const challengeBtn = s.complete
    ? `<a class="btn lime big" href="/stats" data-nav>${t('challengeDone')} — ${s.points} pts · ${t('seeStats')}</a>`
    : `<a class="btn big" href="${nextDailyHref()}" data-nav data-test="continue-btn">${t('continueChallenge')}</a>`;

  view.innerHTML = `
    <section class="hero">
      <h1>DOPAMINE.</h1>
      <p><span class="pulse-dot"></span>Puzzle <b>${dayLabel}</b> ${t('tagline')}</p>
    </section>

    <section class="challenge-card" data-test="challenge-card">
      <div class="cc-left">
        <h3>${t('challenge')}</h3>
        <div class="cc-games">
          ${s.games.map(g => `<span class="cc-game ${g.done ? 'done' : ''}">${g.done ? '✅' : '⬜'} ${g.label}</span>`).join('')}
        </div>
        <p class="cc-sub">${s.doneCount}/${s.total} ${t('complete')} · <b>${s.points}</b> ${t('pointsToday')}</p>
      </div>
      <div class="cc-right">${challengeBtn}</div>
    </section>

    <!-- AD SLOT: below challenge card, above arcade grid -->
    <div class="ad-slot" data-ad="top" style="display:none">ad space</div>

    <h3 class="hub-section-title">${t('arcade')}</h3>
    <section class="game-grid">
      ${gameCard({
        href: '/reel', emoji: '🎬', name: 'REEL',
        desc: 'Guess the movie from emojis. 4 tries, hints get desperate.',
        streakKey: 'reel', glow: 'rgba(244,114,182,.25)', daily: true, cls: 'reel'
      })}
      ${gameCard({
        href: '/hl', emoji: '⚖️', name: 'HIGHER OR LOWER',
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
        href: '/2048', emoji: '🔢', name: '2048',
        desc: 'Slide, merge, chase the legendary 2048 tile.',
        streakKey: 'g2048', glow: 'rgba(168,85,247,.22)', daily: false, cls: 'g2048'
      })}
      ${gameCard({
        href: '/reflex', emoji: '⚡', name: 'REFLEX',
        desc: '5 clicks. One average. Are you superhuman or just sleepy?',
        streakKey: 'reflex', glow: 'rgba(163,230,53,.2)', daily: false, cls: 'reflex'
      })}
      ${gameCard({
        href: '/tetris', emoji: '🧱', name: 'TETRIS',
        desc: 'Stack blocks, clear lines. The timeless stacking puzzle.',
        streakKey: 'tetris', glow: 'rgba(34,211,238,.22)', daily: false, cls: 'tetris'
      })}
      ${gameCard({
        href: '/minesweeper', emoji: '💣', name: 'MINESWEEPER',
        desc: 'Flag the mines, clear the board. Logic at its purest.',
        streakKey: 'minesweeper', glow: 'rgba(239,68,68,.22)', daily: false, cls: 'minesweeper'
      })}
      ${gameCard({
        href: '/flappy', emoji: '🐦', name: 'FLAPPY',
        desc: 'Tap to fly, dodge pipes. One more try guaranteed.',
        streakKey: 'flappy', glow: 'rgba(250,204,21,.22)', daily: false, cls: 'flappy'
      })}
      ${gameCard({
        href: '/breakout', emoji: '🎯', name: 'BREAKOUT',
        desc: 'Bounce the ball, smash the bricks. Pure arcade joy.',
        streakKey: 'breakout', glow: 'rgba(168,85,247,.22)', daily: false, cls: 'breakout'
      })}
      ${gameCard({
        href: '/whack', emoji: '🔨', name: 'WHACK-A-MOLE',
        desc: '30 seconds, 9 holes. How fast can you hammer?',
        streakKey: 'whack', glow: 'rgba(251,146,60,.22)', daily: false, cls: 'whack'
      })}
      ${gameCard({
        href: '/stack', emoji: '🧊', name: 'STACK 3D',
        desc: 'Time the drop, build the tower. How high can you get?',
        streakKey: 'stack', glow: 'rgba(56,189,248,.22)', daily: false, cls: 'stack'
      })}
    </section>

    <section class="hub-strip" data-test="streak-strip">
      <div>🔥 <b>${bestStreak}</b> ${t('bestStreak')}</div>
      <div>🏆 <a href="/leaderboard" data-nav>${t('todaysLeaderboard')}</a></div>
      <div>📊 <a href="/stats" data-nav>${t('yourStats')}</a></div>
    </section>

    <section class="how-it-works">
      <h3 class="hub-section-title">${t('howItWorks')}</h3>
      <div class="hiw-grid">
        <div class="hiw"><span>1</span><b>${t('hiw1')}</b><p>${t('hiw1p')}</p></div>
        <div class="hiw"><span>2</span><b>${t('hiw2')}</b><p>${t('hiw2p')}</p></div>
        <div class="hiw"><span>3</span><b>${t('hiw3')}</b><p>${t('hiw3p')}</p></div>
      </div>
    </section>`;
}

let currentCleanup = null;

async function router() {
  if (typeof currentCleanup === 'function') currentCleanup();
  currentCleanup = null;
  const { route } = resolveRoute();
  setMeta(route.title || ROUTES['/'].title, route.desc || ROUTES['/'].desc);
  events.pageView(location.pathname + location.hash);
  view.innerHTML = '<div class="loading" aria-label="Loading..."><div class="spinner"></div></div>';
  await new Promise(r => setTimeout(r, 10));
  await route.render(view, cleanupFn => { currentCleanup = cleanupFn; });
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

const langBtn = document.getElementById('lang-btn');
function paintLang() { langBtn.textContent = getLang() === 'hi' ? 'A' : 'अ'; }
langBtn.addEventListener('click', () => {
  sfx.click();
  setLang(getLang() === 'hi' ? 'en' : 'hi');
  paintLang();
  router();
});
paintLang();
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
