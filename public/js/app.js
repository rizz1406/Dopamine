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

function logo3d(cls, emoji){
  const svg = (inner, cls='') => `<svg class="logo-svg ${cls}" viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">${inner}</svg>`;
  if(cls==='reel') return svg(`
    <rect x="8" y="20" width="48" height="24" rx="3" fill="#1a1a24" stroke="#555" stroke-width="2"/>
    <circle cx="44" cy="32" r="10" fill="#333" stroke="#666" stroke-width="2"/>
    <circle cx="44" cy="32" r="4" fill="#555"/>
    <path d="M44 22 L44 26 M44 38 L44 42 M34 32 L38 32 M50 32 L54 32" stroke="#666" stroke-width="1.5" stroke-linecap="round"/>
    <rect x="12" y="24" width="5" height="4" rx="1" fill="#555"/>
    <rect x="12" y="30" width="5" height="4" rx="1" fill="#555"/>
    <rect x="12" y="36" width="5" height="4" rx="1" fill="#555"/>
    <circle class="reel-dot" cx="16" cy="26" r="1" fill="#facc15"/>
  `, 'reel-logo');
  if(cls==='hl') return svg(`
    <line x1="32" y1="28" x2="32" y2="50" stroke="#64748b" stroke-width="3" stroke-linecap="round"/>
    <polygon points="28,50 36,50 32,54" fill="#64748b"/>
    <g class="hl-beam">
      <line x1="12" y1="28" x2="52" y2="28" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
      <line x1="12" y1="28" x2="12" y2="36" stroke="#94a3b8" stroke-width="1.5"/>
      <path d="M6,36 Q6,42 12,42 Q18,42 18,36 Z" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1"/>
      <line x1="52" y1="28" x2="52" y2="36" stroke="#94a3b8" stroke-width="1.5"/>
      <path d="M46,36 Q46,42 52,42 Q58,42 58,36 Z" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1"/>
    </g>
  `, 'hl-logo');
  if(cls==='word') return svg(`
    <rect class="w-block" x="8" y="12" width="14" height="16" rx="3" fill="#22c55e"/>
    <text x="15" y="24" font-size="11" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">W</text>
    <rect class="w-block" x="25" y="12" width="14" height="16" rx="3" fill="#f59e0b"/>
    <text x="32" y="24" font-size="11" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">O</text>
    <rect class="w-block" x="42" y="12" width="14" height="16" rx="3" fill="#ef4444"/>
    <text x="49" y="24" font-size="11" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">R</text>
    <rect class="w-block" x="17" y="34" width="14" height="16" rx="3" fill="#a855f7"/>
    <text x="24" y="46" font-size="11" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">D</text>
  `, 'word-logo');
  if(cls==='memory') return svg(`
    <line x1="32" y1="32" x2="12" y2="16" stroke="#c084fc" stroke-width="1.5" opacity=".5"/>
    <line x1="32" y1="32" x2="52" y2="16" stroke="#c084fc" stroke-width="1.5" opacity=".5"/>
    <line x1="32" y1="32" x2="12" y2="48" stroke="#c084fc" stroke-width="1.5" opacity=".5"/>
    <line x1="32" y1="32" x2="52" y2="48" stroke="#c084fc" stroke-width="1.5" opacity=".5"/>
    <circle class="mem-n" cx="32" cy="32" r="7" fill="#a855f7"/>
    <circle class="mem-n n1" cx="12" cy="16" r="5" fill="#c084fc"/>
    <circle class="mem-n n2" cx="52" cy="16" r="5" fill="#c084fc"/>
    <circle class="mem-n n3" cx="12" cy="48" r="5" fill="#c084fc"/>
    <circle class="mem-n n4" cx="52" cy="48" r="5" fill="#c084fc"/>
  `, 'memory-logo');
  if(cls==='timeline') return svg(`
    <path d="M22,12 L42,12 L36,30 L28,30 Z" fill="#f59e0b" stroke="#d97706" stroke-width="1.5"/>
    <path d="M28,34 L36,34 L42,52 L22,52 Z" fill="#f59e0b" stroke="#d97706" stroke-width="1.5"/>
    <rect x="30" y="30" width="4" height="4" fill="#d97706"/>
    <line class="tl-sand" x1="32" y1="30" x2="32" y2="34" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="32" cy="50" rx="6" ry="2" fill="#fbbf24" opacity=".6"/>
  `, 'timeline-logo');
  if(cls==='flags') return svg(`
    <line x1="16" y1="10" x2="16" y2="54" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round"/>
    <ellipse cx="16" cy="54" rx="6" ry="2" fill="#64748b"/>
    <path class="flag-wave" d="M16,10 L48,14 L48,32 L16,28 Z" fill="#3b82f6">
      <animate attributeName="d" dur="1.5s" repeatCount="indefinite"
        values="M16,10 L48,14 L48,32 L16,28 Z;M16,10 L46,16 L48,30 L16,28 Z;M16,10 L48,14 L48,32 L16,28 Z"/>
    </path>
    <circle cx="32" cy="21" r="4" fill="#fbbf24"/>
  `, 'flags-logo');
  if(cls==='speed') return svg(`
    <path class="sp-body" d="M14,34 L18,26 L46,26 L52,34 L52,40 L14,40 Z" fill="#ef4444" stroke="#b91c1c" stroke-width="1"/>
    <path d="M24,26 L28,18 L40,18 L44,26 Z" fill="#93c5fd" stroke="#60a5fa" stroke-width="1"/>
    <circle class="sp-wh" cx="24" cy="42" r="5" fill="#1a1a24" stroke="#666" stroke-width="2"/>
    <circle cx="24" cy="42" r="2" fill="#888"/>
    <circle class="sp-wh" cx="44" cy="42" r="5" fill="#1a1a24" stroke="#666" stroke-width="2"/>
    <circle cx="44" cy="42" r="2" fill="#888"/>
    <line class="sp-line" x1="4" y1="30" x2="12" y2="30" stroke="#fff" stroke-width="2" opacity=".4" stroke-linecap="round"/>
    <line class="sp-line" x1="2" y1="36" x2="10" y2="36" stroke="#fff" stroke-width="2" opacity=".3" stroke-linecap="round"/>
  `, 'speed-logo');
  if(cls==='snake') return svg(`
    <circle class="sk-eye" cx="16" cy="22" r="2" fill="#fff"/>
    <circle cx="16" cy="22" r="1" fill="#000"/>
    <circle class="sk-eye" cx="22" cy="22" r="2" fill="#fff"/>
    <circle cx="22" cy="22" r="1" fill="#000"/>
    <rect class="sk-seg" x="10" y="28" width="10" height="10" rx="3" fill="#65a30d"/>
    <rect class="sk-seg" x="18" y="28" width="10" height="10" rx="3" fill="#84cc16"/>
    <rect class="sk-seg" x="26" y="28" width="10" height="10" rx="3" fill="#a3e635"/>
    <rect class="sk-seg" x="34" y="28" width="10" height="10" rx="3" fill="#bef264"/>
    <rect class="sk-seg" x="34" y="38" width="10" height="10" rx="3" fill="#a3e635"/>
    <rect class="sk-seg" x="42" y="38" width="10" height="10" rx="3" fill="#84cc16"/>
    <circle cx="50" cy="44" r="3" fill="#ef4444"/>
  `, 'snake-logo');
  if(cls==='g2048') return svg(`
    <rect class="g-tile" x="8" y="8" width="22" height="22" rx="4" fill="#94a3b8"/>
    <text x="19" y="24" font-size="14" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">2</text>
    <rect class="g-tile" x="34" y="8" width="22" height="22" rx="4" fill="#cbd5e1"/>
    <text x="45" y="24" font-size="14" font-weight="900" fill="#334155" text-anchor="middle" font-family="sans-serif">4</text>
    <rect class="g-tile" x="8" y="34" width="22" height="22" rx="4" fill="#fbbf24"/>
    <text x="19" y="50" font-size="14" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">8</text>
    <rect class="g-tile" x="34" y="34" width="22" height="22" rx="4" fill="#f97316"/>
    <text x="45" y="50" font-size="11" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">16</text>
  `, 'g2048-logo');
  if(cls==='reflex') return svg(`
    <polygon class="rf-bolt" points="30,4 38,24 28,24 36,60 22,30 32,30 24,4" fill="#facc15" stroke="#eab308" stroke-width="1"/>
    <circle class="rf-spark" cx="14" cy="16" r="3" fill="#fde047" opacity=".7"/>
    <circle class="rf-spark" cx="50" cy="20" r="2.5" fill="#fde047" opacity=".6"/>
    <circle class="rf-spark" cx="48" cy="46" r="2" fill="#fde047" opacity=".5"/>
  `, 'reflex-logo');
  if(cls==='tetris') return svg(`
    <rect class="t-blk" x="20" y="4" width="12" height="12" rx="2" fill="#22d3ee"/>
    <rect class="t-blk" x="32" y="4" width="12" height="12" rx="2" fill="#06b6d4"/>
    <rect class="t-blk" x="32" y="16" width="12" height="12" rx="2" fill="#0891b2"/>
    <rect class="t-blk" x="44" y="16" width="12" height="12" rx="2" fill="#22d3ee"/>
    <rect x="8" y="52" width="48" height="3" rx="1.5" fill="#f59e0b"/>
  `, 'tetris-logo');
  if(cls==='minesweeper') return svg(`
    <circle class="m-body" cx="32" cy="32" r="12" fill="#1a1a24"/>
    <line x1="32" y1="16" x2="32" y2="12" stroke="#1a1a24" stroke-width="3" stroke-linecap="round"/>
    <line x1="32" y1="48" x2="32" y2="52" stroke="#1a1a24" stroke-width="3" stroke-linecap="round"/>
    <line x1="16" y1="32" x2="12" y2="32" stroke="#1a1a24" stroke-width="3" stroke-linecap="round"/>
    <line x1="48" y1="32" x2="52" y2="32" stroke="#1a1a24" stroke-width="3" stroke-linecap="round"/>
    <line x1="21" y1="21" x2="17" y2="17" stroke="#1a1a24" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="43" y1="21" x2="47" y2="17" stroke="#1a1a24" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="21" y1="43" x2="17" y2="47" stroke="#1a1a24" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="43" y1="43" x2="47" y2="47" stroke="#1a1a24" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="32" cy="26" r="2" fill="#fff"/>
    <circle cx="28" cy="32" r="2" fill="#fff"/>
    <circle cx="36" cy="32" r="2" fill="#fff"/>
    <circle cx="32" cy="38" r="2" fill="#fff"/>
    <circle class="m-spark" cx="32" cy="10" r="4" fill="#f59e0b"/>
  `, 'minesweeper-logo');
  if(cls==='flappy') return svg(`
    <ellipse class="f-body" cx="30" cy="32" rx="16" ry="12" fill="#facc15" stroke="#eab308" stroke-width="1"/>
    <ellipse class="f-wing" cx="22" cy="28" rx="8" ry="5" fill="#eab308" transform="rotate(-20,22,28)"/>
    <polygon points="46,30 56,34 46,36" fill="#f97316"/>
    <circle cx="38" cy="28" r="3.5" fill="#fff"/>
    <circle cx="39" cy="28" r="2" fill="#1a1a24"/>
    <path d="M26,40 Q30,44 34,40" stroke="#eab308" stroke-width="1.5" fill="none"/>
  `, 'flappy-logo');
  if(cls==='breakout') return svg(`
    <rect x="12" y="8" width="12" height="6" rx="2" fill="#ef4444"/>
    <rect x="26" y="8" width="12" height="6" rx="2" fill="#f97316"/>
    <rect x="40" y="8" width="12" height="6" rx="2" fill="#facc15"/>
    <rect x="12" y="16" width="12" height="6" rx="2" fill="#22c55e"/>
    <rect x="26" y="16" width="12" height="6" rx="2" fill="#22d3ee"/>
    <rect x="40" y="16" width="12" height="6" rx="2" fill="#a855f7"/>
    <rect class="b-paddle" x="20" y="48" width="24" height="6" rx="3" fill="#a3e635"/>
    <circle class="b-ball" cx="32" cy="38" r="5" fill="#fff" stroke="#ccc" stroke-width="1"/>
  `, 'breakout-logo');
  if(cls==='whack') return svg(`
    <ellipse cx="32" cy="46" rx="14" ry="6" fill="#1a1a24"/>
    <ellipse class="w-mole" cx="32" cy="40" rx="10" ry="10" fill="#a16207" stroke="#854d0e" stroke-width="1"/>
    <circle cx="28" cy="37" r="2" fill="#fff"/>
    <circle cx="36" cy="37" r="2" fill="#fff"/>
    <circle cx="28" cy="37" r="1" fill="#1a1a24"/>
    <circle cx="36" cy="37" r="1" fill="#1a1a24"/>
    <ellipse cx="32" cy="42" rx="3" ry="2" fill="#713f12"/>
    <g class="w-hammer">
      <rect x="42" y="10" width="12" height="6" rx="2" fill="#78350f"/>
      <rect x="46" y="14" width="4" height="20" rx="2" fill="#92400e"/>
    </g>
  `, 'whack-logo');
  if(cls==='stack') return svg(`
    <rect x="12" y="48" width="40" height="8" rx="2" fill="#38bdf8"/>
    <rect x="14" y="38" width="36" height="8" rx="2" fill="#a855f7"/>
    <rect x="16" y="28" width="32" height="8" rx="2" fill="#facc14"/>
    <rect x="18" y="18" width="28" height="8" rx="2" fill="#ef4444"/>
    <rect class="st-fall" x="10" y="6" width="28" height="8" rx="2" fill="#22c55e" opacity=".8"/>
  `, 'stack-logo');
  return `<span class="card-emoji">${emoji}</span>`;
}
function gameCard({ href, emoji, name, desc, streakKey, glow, daily, cls, cat }) {
  const st = store.streak(streakKey);
  const hot = st.current > 0;
  return `
    <a class="game-card ${cls || ''}" href="${href}" data-nav data-cat="${cat||'arcade'}" style="--glow:${glow}">
      ${logo3d(cls, emoji)}
      <h2>${name}</h2>
      <p>${desc}</p>
      <span class="streak-pill ${hot ? 'hot' : ''}">🔥 ${st.current} ${t('streak')}${daily ? ' · ' + t('today') + (store.hasPlayed(streakKey, dayNumber()) ? ' ✓' : '') : ''}</span>
      <span class="play-hint">${t('play')} →</span>
    </a>`;
}

function initLogoAnimations() {
  if (typeof anime === 'undefined') return;
  document.querySelectorAll('.game-card').forEach(card => {
    const svg = card.querySelector('.logo-svg');
    if (!svg) return;
    card.addEventListener('mouseenter', () => {
      const cls = [...svg.classList].find(c => c !== 'logo-svg');
      animateLogo(svg, cls);
    });
  });
  document.querySelectorAll('.featured-card').forEach(card => {
    const svg = card.querySelector('.logo-svg');
    if (!svg) return;
    card.addEventListener('mouseenter', () => {
      const cls = [...svg.classList].find(c => c !== 'logo-svg');
      animateLogo(svg, cls);
    });
  });
}

function animateLogo(svg, cls) {
  if (!svg || typeof anime === 'undefined') return;
  const dur = 800;
  const ease = 'easeInOutSine';
  switch(cls) {
    case 'reel-logo':
      anime({ targets: svg.querySelector('.reel-dot'), cx: [16,40,40,16,16], cy: [26,26,38,38,26], duration: dur*1.5, easing: ease, loop: false });
      anime({ targets: svg.querySelector('circle:nth-child(2)'), rotate: '1turn', transformOrigin: '50% 50%', duration: dur, easing: 'linear', loop: false });
      break;
    case 'hl-logo':
      anime({ targets: svg.querySelector('.hl-beam'), rotate: [0,8,-8,0], duration: dur*1.5, easing: ease });
      break;
    case 'word-logo':
      anime({ targets: svg.querySelectorAll('.w-block'), rotateX: [0,360,0], duration: dur, delay: anime.stagger(100), easing });
      break;
    case 'memory-logo':
      anime({ targets: svg.querySelectorAll('.mem-n'), scale: [1,1.4,1], duration: dur, delay: anime.stagger(80), easing });
      break;
    case 'timeline-logo':
      anime({ targets: svg.querySelector('.tl-sand'), y1: [30,34], y2: [30,34], opacity: [1,0,1], duration: dur, easing, loop: 2 });
      break;
    case 'flags-logo':
      anime({ targets: svg.querySelector('.flag-wave'), skewX: [0,3,-3,0], duration: dur, easing });
      break;
    case 'speed-logo':
      anime({ targets: svg.querySelectorAll('.sp-wh'), rotate: '2turn', duration: dur, easing: 'linear' });
      anime({ targets: svg.querySelectorAll('.sp-line'), x: [-20,0], opacity: [0.4,0], duration: 400, delay: anime.stagger(100), loop: 2 });
      anime({ targets: svg.querySelector('.sp-body'), translateY: [0,-2,0], duration: 300, easing });
      break;
    case 'snake-logo':
      anime({ targets: svg.querySelectorAll('.sk-seg'), translateY: [0,-4,4,0], duration: dur, delay: anime.stagger(60), easing });
      anime({ targets: svg.querySelectorAll('.sk-eye'), scale: [1,0.6,1], duration: 400, easing });
      break;
    case 'g2048-logo':
      anime({ targets: svg.querySelectorAll('.g-tile'), scale: [1,0.7,1.1,1], duration: dur, delay: anime.stagger(100), easing });
      break;
    case 'reflex-logo':
      anime({ targets: svg.querySelector('.rf-bolt'), scale: [1,1.2,1], opacity: [1,0.6,1], duration: 300, easing, loop: 2 });
      anime({ targets: svg.querySelectorAll('.rf-spark'), scale: [0.5,1.5,0.5], opacity: [0.3,1,0.3], duration: 300, delay: anime.stagger(80), easing, loop: 2 });
      break;
    case 'tetris-logo':
      anime({ targets: svg.querySelectorAll('.t-blk'), translateY: [0,36], duration: dur, delay: anime.stagger(120), easing: 'easeInQuad' });
      break;
    case 'minesweeper-logo':
      anime({ targets: svg.querySelector('.m-spark'), scale: [1,1.5,1], opacity: [1,0.5,1], duration: 300, easing, loop: 2 });
      anime({ targets: svg.querySelector('.m-body'), translateX: [0,2,-2,0], duration: 200, easing, loop: 1 });
      break;
    case 'flappy-logo':
      anime({ targets: svg.querySelector('.f-wing'), rotate: [-20,20,-20], duration: 300, easing });
      anime({ targets: svg.querySelector('.f-body'), translateY: [0,-4,0], duration: 600, easing });
      break;
    case 'breakout-logo':
      anime({ targets: svg.querySelector('.b-ball'), cx: [32,20,44,32], cy: [38,24,24,38], duration: dur, easing });
      anime({ targets: svg.querySelector('.b-paddle'), x: [20,24,16,20], duration: dur, easing });
      break;
    case 'whack-logo':
      anime({ targets: svg.querySelector('.w-hammer'), rotate: [0,-45,0], transformOrigin: '100% 100%', duration: 400, easing });
      anime({ targets: svg.querySelector('.w-mole'), translateY: [0,-8,0], duration: 500, delay: 100, easing });
      break;
    case 'stack-logo':
      anime({ targets: svg.querySelector('.st-fall'), y: [6,18], duration: dur, easing: 'easeInQuad' });
      break;
  }
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

    <!-- Featured carousel — no scroll needed for top games -->
    <section class="featured" aria-label="Featured games">
      <h3 class="hub-section-title">🔥 Featured</h3>
      <div class="featured-track" data-test="featured-track">
        <a class="featured-card" href="/reel" data-nav>${logo3d('reel','🎬')}<b>REEL</b><small>Daily</small></a>
        <a class="featured-card" href="/stack" data-nav>${logo3d('stack','🧊')}<b>STACK 3D</b><small>3D</small></a>
        <a class="featured-card" href="/flappy" data-nav>${logo3d('flappy','🐦')}<b>FLAPPY 3D</b><small>3D</small></a>
        <a class="featured-card" href="/tetris" data-nav>${logo3d('tetris','🧱')}<b>TETRIS</b><small>Puzzle</small></a>
      </div>
    </section>

    <!-- Filter bar — sticky on mobile -->
    <div class="filter-bar" data-test="filter-bar">
      <button class="filter-btn active" data-filter="all">All 16</button>
      <button class="filter-btn" data-filter="daily">Daily</button>
      <button class="filter-btn" data-filter="3d">3D</button>
      <button class="filter-btn" data-filter="puzzle">Puzzle</button>
      <button class="filter-btn" data-filter="arcade">Arcade</button>
    </div>

    <h3 class="hub-section-title">${t('arcade')}</h3>
    <section class="game-grid" id="game-grid">
      ${gameCard({
        href: '/reel', emoji: '🎬', name: 'REEL',
        desc: 'Guess the movie from emojis. 4 tries, hints get desperate.',
        streakKey: 'reel', glow: 'rgba(244,114,182,.25)', daily: true, cls: 'reel', cat: 'daily', cat: 'daily'
      })}
      ${gameCard({
        href: '/hl', emoji: '⚖️', name: 'HIGHER OR LOWER',
        desc: 'What does the internet search more? Build an insane streak.',
        streakKey: 'hl', glow: 'rgba(34,211,238,.22)', daily: false, cls: 'hl', cat: 'arcade', cat: 'arcade'
      })}
      ${gameCard({
        href: '/word', emoji: '🔤', name: 'WORD GUESS',
        desc: 'Crack the hidden 5-letter word. 6 tries. Daily.',
        streakKey: 'word', glow: 'rgba(251,191,36,.2)', daily: true, cls: 'word', cat: 'daily', cat: 'daily'
      })}
      ${gameCard({
        href: '/memory', emoji: '🧠', name: 'MEMORY',
        desc: 'Watch the pattern. Repeat it. How far can your brain go?',
        streakKey: 'memory', glow: 'rgba(124,58,237,.28)', daily: false, cls: 'memory', cat: 'puzzle', cat: 'puzzle'
      })}
      ${gameCard({
        href: '/timeline', emoji: '⏳', name: 'TIMELINE',
        desc: 'Order the movies from oldest to newest. 3 strikes only.',
        streakKey: 'timeline', glow: 'rgba(251,191,36,.18)', daily: false, cls: 'timeline', cat: 'puzzle', cat: 'puzzle'
      })}
      ${gameCard({
        href: '/flags', emoji: '🏳️', name: 'FLAG RUSH',
        desc: '10 flags, 5 seconds each. How many countries do you know?',
        streakKey: 'flags', glow: 'rgba(34,211,238,.2)', daily: false, cls: 'flags', cat: 'puzzle', cat: 'puzzle'
      })}
      ${gameCard({
        href: '/speed', emoji: '🏎️', name: 'SPEED RUSH',
        desc: 'Dodge traffic at insane speeds. How far can you get?',
        streakKey: 'speed', glow: 'rgba(251,113,133,.22)', daily: false, cls: 'speed', cat: 'arcade', cat: 'arcade'
      })}
      ${gameCard({
        href: '/snake', emoji: '🐍', name: 'SNAKE',
        desc: 'The classic. Eat apples, grow long, don\'t bite yourself.',
        streakKey: 'snake', glow: 'rgba(163,230,53,.22)', daily: false, cls: 'snake', cat: 'arcade', cat: 'arcade'
      })}
      ${gameCard({
        href: '/2048', emoji: '🔢', name: '2048',
        desc: 'Slide, merge, chase the legendary 2048 tile.',
        streakKey: 'g2048', glow: 'rgba(168,85,247,.22)', daily: false, cls: 'g2048', cat: 'puzzle', cat: 'puzzle'
      })}
      ${gameCard({
        href: '/reflex', emoji: '⚡', name: 'REFLEX',
        desc: '5 clicks. One average. Are you superhuman or just sleepy?',
        streakKey: 'reflex', glow: 'rgba(163,230,53,.2)', daily: false, cls: 'reflex', cat: 'arcade', cat: 'arcade'
      })}
      ${gameCard({
        href: '/tetris', emoji: '🧱', name: 'TETRIS',
        desc: 'Stack blocks, clear lines. The timeless stacking puzzle.',
        streakKey: 'tetris', glow: 'rgba(34,211,238,.22)', daily: false, cls: 'tetris', cat: 'puzzle', cat: 'puzzle'
      })}
      ${gameCard({
        href: '/minesweeper', emoji: '💣', name: 'MINESWEEPER',
        desc: 'Flag the mines, clear the board. Logic at its purest.',
        streakKey: 'minesweeper', glow: 'rgba(239,68,68,.22)', daily: false, cls: 'minesweeper', cat: 'puzzle', cat: 'puzzle'
      })}
      ${gameCard({
        href: '/flappy', emoji: '🐦', name: 'FLAPPY 3D',
        desc: 'True 3D flight — tap to flap wings, dodge pipes.',
        streakKey: 'flappy', glow: 'rgba(250,204,21,.22)', daily: false, cls: 'flappy', cat: '3d'
      })}
      ${gameCard({
        href: '/breakout', emoji: '🎯', name: 'BREAKOUT',
        desc: 'Bounce the ball, smash the bricks. Pure arcade joy.',
        streakKey: 'breakout', glow: 'rgba(168,85,247,.22)', daily: false, cls: 'breakout', cat: 'arcade', cat: 'arcade'
      })}
      ${gameCard({
        href: '/whack', emoji: '🔨', name: 'WHACK-A-MOLE',
        desc: '30 seconds, 9 holes. How fast can you hammer?',
        streakKey: 'whack', glow: 'rgba(251,146,60,.22)', daily: false, cls: 'whack', cat: 'arcade', cat: 'arcade'
      })}
      ${gameCard({
        href: '/stack', emoji: '🧊', name: 'STACK 3D',
        desc: 'Time the drop, build the tower. How high can you get?',
        streakKey: 'stack', glow: 'rgba(56,189,248,.22)', daily: false, cls: 'stack', cat: '3d'
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
  // filter bar
  view.querySelectorAll('.filter-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      view.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const f=btn.dataset.filter;
      view.querySelectorAll('.game-card').forEach(c=>{
        c.style.display=(f==='all'||c.dataset.cat===f)?'':'none';
      });
      sfx.click();
    });
  });
  setTimeout(initLogoAnimations, 50);
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
