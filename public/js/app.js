// DOPAMINE app shell: router (clean paths), hub, shared UI helpers.
import { dayNumber } from './rng.js';
import { store } from './store.js';
import { isMuted, toggleMute, sfx } from './audio.js';
import { applyAdsConfig, initServerConfig } from './ads.js';
import { shareTargets, brandIconSvg, BRANDS, nativeShare, hasNativeShare, shareImageCard } from './share.js';
import { todaySummary, nextDailyHref } from './daily.js';
import { events } from './analytics.js';
import { t, getAIHint, announceScore, checkUsername } from './i18n.js';
import { renderLegal, legalMeta } from './pages/legal.js';

// Lazy load games for code splitting
const lazy = (loader) => {
  let mod = null;
  return async (...args) => {
    if (!mod) mod = await loader();
    if (mod.default) return mod.default(...args);
    const fn = Object.values(mod).find(v => typeof v === 'function');
    return fn ? fn(...args) : null;
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
const renderSuika = lazy(() => import('./games/suika.js'));
const renderConnections = lazy(() => import('./games/connections.js'));
const renderAim = lazy(() => import('./games/aim.js'));
const renderSort = lazy(() => import('./games/sort.js'));
const renderLeaderboard = lazy(() => import('./games/leaderboard.js'));
const renderStats = lazy(() => import('./pages/stats.js'));
const renderSEO = lazy(() => import('./pages/seo.js'));
const renderAdmin = lazy(() => import('./games/admin.js'));

const view = document.getElementById('view');
const SITE = 'https://dopamine.games';

// ── route table: path → { render, title, desc } ──
const ROUTES = {
  '/': { render: renderHub, title: 'DOPAMINE — Daily Arcade 🎮 | 20 Free Mini-Games', desc: 'Your daily dose of pointless brilliance. 20 free mini-games: suika merge, connections, aim trainer, color sort, emoji movie quiz, word guess and more. Same puzzles for everyone, new every day.' },
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
  '/suika': { render: renderSuika, title: 'Suika Merge — Fruit Drop Puzzle', desc: 'Suika viral fruit merge: drop fruits, merge same to bigger, chase watermelon. Addictive physics puzzle.' },
  '/connections': { render: renderConnections, title: 'Connections — Group 16 Words Into 4', desc: 'NYT-style connections: find 4 groups of 4 words. 4 mistakes allowed. Daily puzzle.' },
  '/aim': { render: renderAim, title: 'Aim Trainer — Reflex Target Game', desc: 'Aim trainer: hit 30 targets in 30 seconds. Test speed and accuracy.' },
  '/sort': { render: renderSort, title: 'Color Sort — Water Sort Puzzle', desc: 'Water sort puzzle: sort colors into tubes. Trending logic game.' },
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

function logo3d(cls, emoji, size = 'normal'){
  const isMini = size === 'mini';
  const wrapCls = isMini ? 'logo-emblem mini' : 'logo-emblem';

  const gLinear = (id, c1, c2, x1=0, y1=0, x2=1, y2=1) =>
    `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient>`;
  const gRadial = (id, c1, c2, cx='35%', cy='30%', r='65%') =>
    `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></radialGradient>`;

  const svgWrap = (c1, c2, glow, defs, content) => `
    <div class="${wrapCls} emblem-${cls}" style="--c1:${c1};--c2:${c2};--glow:${glow}">
      <div class="emblem-backdrop"></div>
      <svg class="emblem-svg" viewBox="0 0 64 64" width="100%" height="100%" aria-hidden="true">
        <defs>
          <filter id="drop-${cls}" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="rgba(0,0,0,0.45)" />
          </filter>
          ${defs}
        </defs>
        ${content}
      </svg>
    </div>`;

  if(cls === 'reel') {
    return svgWrap('#ff2d75', '#8b5cf6', 'rgba(255,45,117,0.45)',
      gLinear('r-body', '#2d3748', '#1a202c') +
      gLinear('r-stripe', '#fef08a', '#facc15') +
      gLinear('r-film', '#f472b6', '#db2777') +
      gRadial('r-star', '#ffffff', '#fbbf24', '50%', '50%') +
      gRadial('r-lens', '#fbcfe8', '#db2777'),
      `<g filter="url(#drop-${cls})">
        <!-- 3D Clapperboard Body -->
        <path d="M10,24 L54,24 C56,24 57,25.5 57,27.5 L57,51 C57,53 55.5,54 53.5,54 L10.5,54 C8.5,54 7,53 7,51 L7,27.5 C7,25.5 8,24 10,24 Z" fill="url(#r-body)" stroke="rgba(255,255,255,0.2)" stroke-width="1"/>
        <!-- Bottom Section Grid Lines -->
        <line x1="12" y1="38" x2="52" y2="38" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
        <line x1="28" y1="38" x2="28" y2="50" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
        <!-- Star Emblem -->
        <circle cx="20" cy="45" r="5" fill="url(#r-film)"/>
        <polygon points="20,41 21.3,44 24.5,44.2 22,46.2 22.8,49.2 20,47.5 17.2,49.2 18,46.2 15.5,44.2 18.7,44" fill="url(#r-star)"/>
        <!-- Angled Clapper Top Stick -->
        <g transform="rotate(-12 10 24)">
          <rect x="7" y="14" width="50" height="10" rx="3" fill="#1e293b" stroke="rgba(255,255,255,0.25)" stroke-width="1"/>
          <path d="M14,14 L20,14 L14,24 L8,24 Z" fill="url(#r-stripe)"/>
          <path d="M26,14 L32,14 L26,24 L20,24 Z" fill="url(#r-stripe)"/>
          <path d="M38,14 L44,14 L38,24 L32,24 Z" fill="url(#r-stripe)"/>
          <path d="M50,14 L56,14 L50,24 L44,24 Z" fill="url(#r-stripe)"/>
        </g>
        <!-- Rolling 3D Film Reel on Top Right -->
        <circle cx="44" cy="44" r="7" fill="url(#r-lens)" stroke="#f472b6" stroke-width="1.5"/>
        <circle cx="44" cy="44" r="2.5" fill="#1e293b"/>
        <circle cx="44" cy="39.5" r="1" fill="#fff"/>
        <circle cx="44" cy="48.5" r="1" fill="#fff"/>
        <circle cx="39.5" cy="44" r="1" fill="#fff"/>
        <circle cx="48.5" cy="44" r="1" fill="#fff"/>
      </g>`
    );
  }

  if(cls === 'hl') {
    return svgWrap('#00f0ff', '#3b82f6', 'rgba(0,240,255,0.45)',
      gLinear('hl-metal', '#e2e8f0', '#64748b') +
      gLinear('hl-gold', '#fef08a', '#eab308') +
      gLinear('hl-up', '#4ade80', '#16a34a') +
      gLinear('hl-dn', '#f87171', '#dc2626') +
      gRadial('hl-glow', '#67e8f9', '#0284c7'),
      `<g filter="url(#drop-${cls})">
        <!-- Scale Base & Central Column -->
        <path d="M22,54 L42,54 L38,50 L26,50 Z" fill="url(#hl-gold)"/>
        <line x1="32" y1="18" x2="32" y2="50" stroke="url(#hl-metal)" stroke-width="3.5" stroke-linecap="round"/>
        <circle cx="32" cy="18" r="4" fill="url(#hl-gold)" stroke="#fff" stroke-width="1"/>
        <!-- Tilting Crossbar -->
        <g transform="rotate(-8 32 18)">
          <rect x="8" y="16.5" width="48" height="3" rx="1.5" fill="url(#hl-metal)"/>
          <!-- Left Plate (Higher - Green Arrow) -->
          <line x1="12" y1="18" x2="12" y2="28" stroke="url(#hl-metal)" stroke-width="1.5"/>
          <path d="M5,28 Q12,36 19,28 Z" fill="url(#hl-glow)" stroke="#38bdf8" stroke-width="1"/>
          <!-- 3D Up Arrow -->
          <polygon points="12,18 16,24 13.5,24 13.5,27 10.5,27 10.5,24 8,24" fill="url(#hl-up)" stroke="#fff" stroke-width="0.8"/>
          <!-- Right Plate (Lower - Red Arrow) -->
          <line x1="52" y1="18" x2="52" y2="34" stroke="url(#hl-metal)" stroke-width="1.5"/>
          <path d="M45,34 Q52,42 59,34 Z" fill="url(#hl-glow)" stroke="#38bdf8" stroke-width="1"/>
          <!-- 3D Down Arrow -->
          <polygon points="52,34 48,28 50.5,28 50.5,25 53.5,25 53.5,28 56,28" fill="url(#hl-dn)" stroke="#fff" stroke-width="0.8"/>
        </g>
      </g>`
    );
  }

  if(cls === 'word') {
    return svgWrap('#10b981', '#f59e0b', 'rgba(16,185,129,0.45)',
      gLinear('w-g-top', '#4ade80', '#22c55e') +
      gLinear('w-g-side', '#16a34a', '#15803d') +
      gLinear('w-y-top', '#fde047', '#eab308') +
      gLinear('w-y-side', '#ca8a04', '#a16207') +
      gLinear('w-r-top', '#fb7185', '#e11d48') +
      gLinear('w-r-side', '#be123c', '#9f1239') +
      gLinear('w-p-top', '#c084fc', '#9333ea') +
      gLinear('w-p-side', '#7e22ce', '#6b21a8'),
      `<g filter="url(#drop-${cls})">
        <!-- Cube W (Top-Left) -->
        <g transform="translate(10, 10)">
          <rect x="0" y="0" width="19" height="19" rx="3.5" fill="url(#w-g-top)" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
          <path d="M0,15 L0,19 C0,21 1.5,22.5 3.5,22.5 L15.5,22.5 C17.5,22.5 19,21 19,19 L19,15 Z" fill="url(#w-g-side)"/>
          <text x="9.5" y="14" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">W</text>
        </g>
        <!-- Cube O (Top-Right) -->
        <g transform="translate(35, 10)">
          <rect x="0" y="0" width="19" height="19" rx="3.5" fill="url(#w-y-top)" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
          <path d="M0,15 L0,19 C0,21 1.5,22.5 3.5,22.5 L15.5,22.5 C17.5,22.5 19,21 19,19 L19,15 Z" fill="url(#w-y-side)"/>
          <text x="9.5" y="14" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">O</text>
        </g>
        <!-- Cube R (Bottom-Left) -->
        <g transform="translate(10, 34)">
          <rect x="0" y="0" width="19" height="19" rx="3.5" fill="url(#w-r-top)" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
          <path d="M0,15 L0,19 C0,21 1.5,22.5 3.5,22.5 L15.5,22.5 C17.5,22.5 19,21 19,19 L19,15 Z" fill="url(#w-r-side)"/>
          <text x="9.5" y="14" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">R</text>
        </g>
        <!-- Cube D (Bottom-Right) -->
        <g transform="translate(35, 34)">
          <rect x="0" y="0" width="19" height="19" rx="3.5" fill="url(#w-p-top)" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
          <path d="M0,15 L0,19 C0,21 1.5,22.5 3.5,22.5 L15.5,22.5 C17.5,22.5 19,21 19,19 L19,15 Z" fill="url(#w-p-side)"/>
          <text x="9.5" y="14" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif">D</text>
        </g>
      </g>`
    );
  }

  if(cls === 'memory') {
    return svgWrap('#a855f7', '#ec4899', 'rgba(168,85,247,0.45)',
      gRadial('m-core', '#ffffff', '#a855f7') +
      gLinear('m-pad-v', '#c084fc', '#7c3aed') +
      gLinear('m-pad-c', '#67e8f9', '#0891b2') +
      gLinear('m-pad-p', '#f472b6', '#db2777') +
      gLinear('m-pad-l', '#bef264', '#65a30d'),
      `<g filter="url(#drop-${cls})">
        <!-- 4 Simon Quadrant Pads -->
        <path d="M12,12 A22,22 0 0,1 30,12 L30,28 L12,28 Z" fill="url(#m-pad-v)" stroke="rgba(255,255,255,0.3)" stroke-width="1" rx="4"/>
        <path d="M34,12 A22,22 0 0,1 52,12 L52,28 L34,28 Z" fill="url(#m-pad-c)" stroke="rgba(255,255,255,0.3)" stroke-width="1" rx="4"/>
        <path d="M12,34 L30,34 L30,50 A22,22 0 0,1 12,50 Z" fill="url(#m-pad-p)" stroke="rgba(255,255,255,0.3)" stroke-width="1" rx="4"/>
        <path d="M34,34 L52,34 L52,50 A22,22 0 0,1 34,50 Z" fill="url(#m-pad-l)" stroke="rgba(255,255,255,0.3)" stroke-width="1" rx="4"/>
        <!-- Central Glossy Sphere -->
        <circle cx="32" cy="31" r="9" fill="#1e1b4b" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
        <circle cx="32" cy="31" r="5" fill="url(#m-core)"/>
        <circle cx="30" cy="29" r="1.8" fill="#fff"/>
      </g>`
    );
  }

  if(cls === 'timeline') {
    return svgWrap('#f59e0b', '#dc2626', 'rgba(245,158,11,0.45)',
      gLinear('t-brass', '#fef08a', '#b45309') +
      gRadial('t-glass', 'rgba(255,255,255,0.6)', 'rgba(255,255,255,0.05)') +
      gLinear('t-sand', '#fde047', '#f59e0b'),
      `<g filter="url(#drop-${cls})">
        <!-- Brass Top/Bottom Caps -->
        <path d="M16,10 L48,10 C50,10 50,13 48,13 L16,13 C14,13 14,10 16,10 Z" fill="url(#t-brass)" stroke="#fff" stroke-width="0.6"/>
        <path d="M16,51 L48,51 C50,51 50,54 48,54 L16,54 C14,54 14,51 16,51 Z" fill="url(#t-brass)" stroke="#fff" stroke-width="0.6"/>
        <!-- Brass Connecting Pillars -->
        <line x1="18" y1="13" x2="18" y2="51" stroke="url(#t-brass)" stroke-width="2.5"/>
        <line x1="46" y1="13" x2="46" y2="51" stroke="url(#t-brass)" stroke-width="2.5"/>
        <!-- Glass Bulbs -->
        <path d="M22,13 L42,13 Q42,28 34,32 Q42,36 42,51 L22,51 Q22,36 30,32 Q22,28 22,13 Z" fill="url(#t-glass)" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
        <!-- Top Sand Pyramid -->
        <path d="M24,15 L40,15 L32,27 Z" fill="url(#t-sand)"/>
        <!-- Flowing Stream -->
        <line x1="32" y1="27" x2="32" y2="44" stroke="#fef08a" stroke-width="2" stroke-dasharray="2 1"/>
        <!-- Bottom Sand Mound -->
        <path d="M24,49 Q32,41 40,49 Z" fill="url(#t-sand)"/>
      </g>`
    );
  }

  if(cls === 'flags') {
    return svgWrap('#3b82f6', '#06b6d4', 'rgba(59,130,246,0.45)',
      gLinear('f-pole', '#fef08a', '#ca8a04') +
      gLinear('f-flag1', '#3b82f6', '#1d4ed8') +
      gLinear('f-flag2', '#60a5fa', '#2563eb') +
      gRadial('f-globe', '#60a5fa', '#1e3a8a'),
      `<g filter="url(#drop-${cls})">
        <!-- Golden Pole & Finial -->
        <line x1="18" y1="8" x2="18" y2="54" stroke="url(#f-pole)" stroke-width="3" stroke-linecap="round"/>
        <circle cx="18" cy="8" r="3.5" fill="url(#f-pole)" stroke="#fff" stroke-width="0.8"/>
        <!-- 3D Mini Globe Pedestal Base -->
        <ellipse cx="18" cy="54" rx="8" ry="3.5" fill="#1e293b" stroke="url(#f-pole)" stroke-width="1"/>
        <!-- Waving 3D Banner Flag -->
        <path d="M18,12 Q34,6 48,14 Q36,22 18,18 Z" fill="url(#f-flag1)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
        <path d="M18,18 Q36,22 48,14 L48,34 Q34,26 18,34 Z" fill="url(#f-flag2)" stroke="rgba(255,255,255,0.3)" stroke-width="1"/>
        <!-- Golden Star on Flag -->
        <polygon points="34,22 35.5,25 38.5,25.3 36,27.3 36.8,30.3 34,28.6 31.2,30.3 32,27.3 29.5,25.3 32.5,25" fill="#facc15"/>
      </g>`
    );
  }

  if(cls === 'speed') {
    return svgWrap('#ef4444', '#f97316', 'rgba(239,68,68,0.45)',
      gLinear('sp-car', '#ff334b', '#991b1b') +
      gLinear('sp-glass', '#38bdf8', '#0284c7') +
      gRadial('sp-wheel', '#475569', '#0f172a') +
      gLinear('sp-flame', '#fde047', '#ef4444'),
      `<g filter="url(#drop-${cls})">
        <!-- Nitro Flames Behind -->
        <path d="M4,34 Q10,32 14,35 Q10,38 4,37 Z" fill="url(#sp-flame)"/>
        <path d="M6,38 Q11,37 14,39 Q11,41 6,40 Z" fill="url(#sp-flame)"/>
        <!-- 3D Sleek Car Body -->
        <path d="M12,34 L18,24 C20,20 23,19 28,19 L42,19 C47,19 50,22 52,26 L58,34 C60,37 60,42 57,43 L15,43 C12,43 10,39 12,34 Z" fill="url(#sp-car)" stroke="rgba(255,255,255,0.35)" stroke-width="1"/>
        <!-- Aerodynamic Cyan Windshield -->
        <path d="M26,21 L40,21 L48,32 L20,32 Z" fill="url(#sp-glass)" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
        <path d="M24,23 L28,23 L23,31 L20,31 Z" fill="rgba(255,255,255,0.5)"/>
        <!-- Headlights -->
        <polygon points="56,36 59,36 58,39 55,39" fill="#fef08a"/>
        <!-- Alloy Wheels -->
        <circle cx="23" cy="43" r="6" fill="url(#sp-wheel)" stroke="#94a3b8" stroke-width="1.5"/>
        <circle cx="23" cy="43" r="2.5" fill="#f1f5f9"/>
        <circle cx="49" cy="43" r="6" fill="url(#sp-wheel)" stroke="#94a3b8" stroke-width="1.5"/>
        <circle cx="49" cy="43" r="2.5" fill="#f1f5f9"/>
      </g>`
    );
  }

  if(cls === 'snake') {
    return svgWrap('#22c55e', '#84cc16', 'rgba(34,197,94,0.45)',
      gRadial('sn-body', '#86efac', '#15803d') +
      gRadial('sn-head', '#a7f3d0', '#16a34a') +
      gRadial('sn-apple', '#f87171', '#b91c1c') +
      gLinear('sn-leaf', '#bef264', '#4d7c0f'),
      `<g filter="url(#drop-${cls})">
        <!-- Snake Body Spheres (S-Curve) -->
        <circle cx="16" cy="42" r="5.5" fill="url(#sn-body)" stroke="#15803d" stroke-width="0.8"/>
        <circle cx="23" cy="40" r="5.8" fill="url(#sn-body)" stroke="#15803d" stroke-width="0.8"/>
        <circle cx="28" cy="33" r="6.2" fill="url(#sn-body)" stroke="#15803d" stroke-width="0.8"/>
        <circle cx="24" cy="24" r="6.5" fill="url(#sn-body)" stroke="#15803d" stroke-width="0.8"/>
        <!-- Head with Cute Eyes -->
        <ellipse cx="17" cy="18" rx="8" ry="7" fill="url(#sn-head)" stroke="#15803d" stroke-width="1"/>
        <circle cx="14" cy="15" r="3" fill="#ffffff"/>
        <circle cx="14.5" cy="15" r="1.5" fill="#0f172a"/>
        <circle cx="14" cy="14" r="0.6" fill="#ffffff"/>
        <circle cx="20" cy="16" r="2.5" fill="#ffffff"/>
        <circle cx="20.5" cy="16" r="1.2" fill="#0f172a"/>
        <!-- Tongue -->
        <path d="M9,20 L5,20 L3,18 M5,20 L3,22" stroke="#ef4444" stroke-width="1.2" stroke-linecap="round"/>
        <!-- 3D Shiny Apple -->
        <circle cx="48" cy="36" r="7.5" fill="url(#sn-apple)" stroke="#991b1b" stroke-width="1"/>
        <circle cx="45.5" cy="33.5" r="2" fill="#fca5a5" opacity="0.8"/>
        <path d="M48,29 Q52,24 54,26 Q50,29 48,29 Z" fill="url(#sn-leaf)"/>
      </g>`
    );
  }

  if(cls === 'g2048') {
    return svgWrap('#f59e0b', '#9333ea', 'rgba(245,158,11,0.45)',
      gLinear('g-gold-top', '#fef08a', '#eab308') +
      gLinear('g-gold-side', '#ca8a04', '#78350f') +
      gLinear('g-purp-top', '#c084fc', '#9333ea') +
      gLinear('g-purp-side', '#6b21a8', '#3b0764') +
      gRadial('g-crown', '#fff', '#eab308'),
      `<g filter="url(#drop-${cls})">
        <!-- Smaller Back Tile (8) -->
        <g transform="translate(32, 10)">
          <rect x="0" y="0" width="22" height="22" rx="4" fill="url(#g-purp-top)" stroke="rgba(255,255,255,0.4)" stroke-width="1"/>
          <path d="M0,17 L0,22 C0,24 1.5,25.5 3.5,25.5 L18.5,25.5 C20.5,25.5 22,24 22,22 L22,17 Z" fill="url(#g-purp-side)"/>
          <text x="11" y="16" font-size="13" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">8</text>
        </g>
        <!-- Big Master Tile (2048) -->
        <g transform="translate(10, 24)">
          <rect x="0" y="0" width="44" height="26" rx="5" fill="url(#g-gold-top)" stroke="rgba(255,255,255,0.6)" stroke-width="1.2"/>
          <path d="M0,20 L0,26 C0,29 2,30.5 5,30.5 L39,30.5 C42,30.5 44,29 44,26 L44,20 Z" fill="url(#g-gold-side)"/>
          <text x="22" y="18" font-size="14" font-weight="900" fill="#ffffff" text-anchor="middle" font-family="sans-serif" letter-spacing="-0.5">2048</text>
        </g>
        <!-- Golden Crown on Top -->
        <polygon points="22,18 25,23 32,15 39,23 42,18 40,26 24,26" fill="url(#g-crown)" stroke="#b45309" stroke-width="0.8"/>
      </g>`
    );
  }

  if(cls === 'reflex') {
    return svgWrap('#eab308', '#f97316', 'rgba(234,179,8,0.45)',
      gLinear('rf-bolt-l', '#ffffff', '#fde047') +
      gLinear('rf-bolt-r', '#eab308', '#c2410c') +
      gRadial('rf-aura', 'rgba(254,240,138,0.6)', 'transparent'),
      `<g filter="url(#drop-${cls})">
        <!-- Energy Aura -->
        <circle cx="32" cy="32" r="22" fill="url(#rf-aura)"/>
        <!-- 3D Beveled Lightning Bolt -->
        <polygon points="34,6 18,34 31,34 26,58 48,26 35,26" fill="url(#rf-bolt-r)" stroke="#9a3412" stroke-width="1"/>
        <polygon points="34,6 26,34 33,34 26,58 35,26 31,26" fill="url(#rf-bolt-l)"/>
        <!-- Electric Spark Diamonds -->
        <polygon points="12,18 14,21 12,24 10,21" fill="#fef08a"/>
        <polygon points="50,44 52,47 50,50 48,47" fill="#fef08a"/>
        <polygon points="48,14 51,17 48,20 45,17" fill="#38bdf8"/>
      </g>`
    );
  }

  if(cls === 'tetris') {
    return svgWrap('#06b6d4', '#8b5cf6', 'rgba(6,182,212,0.45)',
      gLinear('t-cyan-top', '#67e8f9', '#06b6d4') +
      gLinear('t-cyan-side', '#0891b2', '#164e63') +
      gLinear('t-mag-top', '#f472b6', '#c026d3') +
      gLinear('t-mag-side', '#9333ea', '#581c87') +
      gLinear('t-amb-top', '#fde047', '#f59e0b') +
      gLinear('t-amb-side', '#d97706', '#78350f'),
      `<g filter="url(#drop-${cls})">
        <!-- T-Block (Cyan) -->
        <g transform="translate(14, 12)">
          <rect x="0" y="0" width="12" height="12" rx="2" fill="url(#t-cyan-top)" stroke="rgba(255,255,255,0.4)" stroke-width="0.8"/>
          <rect x="12" y="0" width="12" height="12" rx="2" fill="url(#t-cyan-top)" stroke="rgba(255,255,255,0.4)" stroke-width="0.8"/>
          <rect x="24" y="0" width="12" height="12" rx="2" fill="url(#t-cyan-top)" stroke="rgba(255,255,255,0.4)" stroke-width="0.8"/>
          <rect x="12" y="12" width="12" height="12" rx="2" fill="url(#t-cyan-top)" stroke="rgba(255,255,255,0.4)" stroke-width="0.8"/>
        </g>
        <!-- L-Block (Magenta) -->
        <g transform="translate(26, 26)">
          <rect x="0" y="0" width="12" height="12" rx="2" fill="url(#t-mag-top)" stroke="rgba(255,255,255,0.4)" stroke-width="0.8"/>
          <rect x="0" y="12" width="12" height="12" rx="2" fill="url(#t-mag-top)" stroke="rgba(255,255,255,0.4)" stroke-width="0.8"/>
          <rect x="12" y="12" width="12" height="12" rx="2" fill="url(#t-mag-top)" stroke="rgba(255,255,255,0.4)" stroke-width="0.8"/>
        </g>
        <!-- Grid Laser Platform -->
        <rect x="8" y="52" width="48" height="3" rx="1.5" fill="#facc15"/>
      </g>`
    );
  }

  if(cls === 'minesweeper') {
    return svgWrap('#64748b', '#ef4444', 'rgba(239,68,68,0.45)',
      gRadial('mn-steel', '#cbd5e1', '#1e293b') +
      gRadial('mn-fuse', '#fef08a', '#ea580c') +
      gLinear('mn-spike', '#e2e8f0', '#475569'),
      `<g filter="url(#drop-${cls})">
        <!-- Protruding Spikes/Horns -->
        <line x1="32" y1="16" x2="32" y2="8" stroke="url(#mn-spike)" stroke-width="4" stroke-linecap="round"/>
        <line x1="32" y1="48" x2="32" y2="56" stroke="url(#mn-spike)" stroke-width="4" stroke-linecap="round"/>
        <line x1="16" y1="32" x2="8" y2="32" stroke="url(#mn-spike)" stroke-width="4" stroke-linecap="round"/>
        <line x1="48" y1="32" x2="56" y2="32" stroke="url(#mn-spike)" stroke-width="4" stroke-linecap="round"/>
        <line x1="20" y1="20" x2="14" y2="14" stroke="url(#mn-spike)" stroke-width="3" stroke-linecap="round"/>
        <line x1="44" y1="20" x2="50" y2="14" stroke="url(#mn-spike)" stroke-width="3" stroke-linecap="round"/>
        <line x1="20" y1="44" x2="14" y2="50" stroke="url(#mn-spike)" stroke-width="3" stroke-linecap="round"/>
        <line x1="44" y1="44" x2="50" y2="50" stroke="url(#mn-spike)" stroke-width="3" stroke-linecap="round"/>
        <!-- Steel Mine Sphere -->
        <circle cx="32" cy="32" r="16" fill="url(#mn-steel)" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
        <!-- Digital Hazard Skull / Warning -->
        <polygon points="32,23 39,35 25,35" fill="#ef4444" stroke="#fff" stroke-width="0.8"/>
        <text x="32" y="33" font-size="9" font-weight="900" fill="#fff" text-anchor="middle" font-family="sans-serif">!</text>
        <!-- Sparking Fuse Top -->
        <circle cx="32" cy="7" r="4.5" fill="url(#mn-fuse)"/>
        <circle cx="32" cy="7" r="2" fill="#fff"/>
      </g>`
    );
  }

  if(cls === 'flappy') {
    return svgWrap('#f59e0b', '#ec4899', 'rgba(245,158,11,0.45)',
      gRadial('fl-body', '#fef08a', '#ea580c') +
      gRadial('fl-belly', '#fde047', '#f43f5e') +
      gLinear('fl-wing', '#fb7185', '#be123c') +
      gLinear('fl-cloud', '#ffffff', '#e2e8f0'),
      `<g filter="url(#drop-${cls})">
        <!-- Floating Cloud Base -->
        <path d="M14,50 Q18,44 24,46 Q30,40 38,44 Q46,42 50,50 Z" fill="url(#fl-cloud)" opacity="0.85"/>
        <!-- Bird Body -->
        <ellipse cx="32" cy="30" rx="16" ry="13" fill="url(#fl-body)" stroke="#c2410c" stroke-width="1"/>
        <ellipse cx="28" cy="34" rx="10" ry="7" fill="url(#fl-belly)" opacity="0.7"/>
        <!-- Flapping Wing -->
        <path d="M22,28 Q12,24 16,38 Q26,36 28,30 Z" fill="url(#fl-wing)" stroke="#9f1239" stroke-width="1"/>
        <!-- Beak -->
        <polygon points="46,28 56,33 46,37" fill="#ea580c" stroke="#9a3412" stroke-width="0.8"/>
        <!-- Cute Cartoon Eye -->
        <circle cx="40" cy="25" r="4.5" fill="#ffffff" stroke="#9a3412" stroke-width="0.8"/>
        <circle cx="41.5" cy="24.5" r="2.2" fill="#0f172a"/>
        <circle cx="42.5" cy="23.5" r="0.9" fill="#ffffff"/>
      </g>`
    );
  }

  if(cls === 'breakout') {
    return svgWrap('#ec4899', '#06b6d4', 'rgba(236,72,153,0.45)',
      gLinear('bk-r', '#fb7185', '#e11d48') +
      gLinear('bk-y', '#fde047', '#d97706') +
      gLinear('bk-g', '#4ade80', '#15803d') +
      gLinear('bk-b', '#38bdf8', '#0284c7') +
      gRadial('bk-ball', '#ffffff', '#38bdf8') +
      gLinear('bk-pad', '#a3e635', '#4d7c0f'),
      `<g filter="url(#drop-${cls})">
        <!-- Layer 1 Bricks -->
        <rect x="8" y="10" width="14" height="7" rx="2" fill="url(#bk-r)" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
        <rect x="25" y="10" width="14" height="7" rx="2" fill="url(#bk-y)" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
        <rect x="42" y="10" width="14" height="7" rx="2" fill="url(#bk-g)" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
        <!-- Layer 2 Bricks -->
        <rect x="16" y="19" width="14" height="7" rx="2" fill="url(#bk-b)" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
        <rect x="33" y="19" width="14" height="7" rx="2" fill="url(#bk-r)" stroke="rgba(255,255,255,0.4)" stroke-width="0.6"/>
        <!-- Bouncing Energy Ball -->
        <circle cx="28" cy="35" r="5" fill="url(#bk-ball)" stroke="#fff" stroke-width="1"/>
        <line x1="28" y1="35" x2="22" y2="44" stroke="rgba(56,189,248,0.5)" stroke-width="2" stroke-dasharray="2 2"/>
        <!-- Paddle at Bottom -->
        <rect x="14" y="48" width="36" height="7" rx="3.5" fill="url(#bk-pad)" stroke="#fff" stroke-width="1"/>
      </g>`
    );
  }

  if(cls === 'whack') {
    return svgWrap('#f59e0b', '#b45309', 'rgba(245,158,11,0.45)',
      gRadial('wh-fur', '#d97706', '#78350f') +
      gLinear('wh-hat', '#fde047', '#ca8a04') +
      gLinear('wh-ham', '#e2e8f0', '#475569') +
      gLinear('wh-wood', '#92400e', '#451a03'),
      `<g filter="url(#drop-${cls})">
        <!-- Hole Mound -->
        <ellipse cx="28" cy="50" rx="18" ry="6" fill="#1e1b4b" stroke="#78350f" stroke-width="1.5"/>
        <!-- Mole Body Peeking -->
        <ellipse cx="28" cy="40" rx="12" ry="12" fill="url(#wh-fur)"/>
        <!-- Eyes & Snout -->
        <circle cx="24" cy="38" r="2.2" fill="#fff"/>
        <circle cx="24.5" cy="38" r="1.1" fill="#000"/>
        <circle cx="32" cy="38" r="2.2" fill="#fff"/>
        <circle cx="32.5" cy="38" r="1.1" fill="#000"/>
        <ellipse cx="28" cy="42" rx="3.5" ry="2.2" fill="#fb7185"/>
        <!-- Builder's Hardhat -->
        <path d="M18,34 Q28,24 38,34 Z" fill="url(#wh-hat)" stroke="#fff" stroke-width="0.8"/>
        <!-- Swinging 3D Hammer Top Right -->
        <g transform="rotate(-30 46 20)">
          <rect x="42" y="8" width="14" height="24" rx="2" fill="url(#wh-ham)" stroke="#fff" stroke-width="0.8"/>
          <rect x="47" y="32" width="4" height="22" rx="2" fill="url(#wh-wood)"/>
          <polygon points="38,12 40,8 44,11" fill="#fde047"/>
          <polygon points="56,12 59,8 57,14" fill="#fde047"/>
        </g>
      </g>`
    );
  }

  if(cls === 'stack') {
    return svgWrap('#38bdf8', '#6366f1', 'rgba(56,189,248,0.45)',
      gLinear('st-1', '#38bdf8', '#0284c7') +
      gLinear('st-2', '#a855f7', '#7e22ce') +
      gLinear('st-3', '#facc15', '#ca8a04') +
      gLinear('st-4', '#f43f5e', '#be123c') +
      gRadial('st-star', '#fff', '#fde047'),
      `<g filter="url(#drop-${cls})">
        <!-- Isometric Tower Slabs -->
        <g transform="translate(10, 44)">
          <path d="M0,4 L22,0 L44,4 L22,8 Z" fill="#7dd3fc"/>
          <path d="M0,4 L22,8 L22,12 L0,8 Z" fill="url(#st-1)"/>
          <path d="M44,4 L22,8 L22,12 L44,8 Z" fill="#0369a1"/>
        </g>
        <g transform="translate(12, 34)">
          <path d="M0,4 L20,0 L40,4 L20,8 Z" fill="#c084fc"/>
          <path d="M0,4 L20,8 L20,12 L0,8 Z" fill="url(#st-2)"/>
          <path d="M40,4 L20,8 L20,12 L40,8 Z" fill="#581c87"/>
        </g>
        <g transform="translate(14, 24)">
          <path d="M0,4 L18,0 L36,4 L18,8 Z" fill="#fef08a"/>
          <path d="M0,4 L18,8 L18,12 L0,8 Z" fill="url(#st-3)"/>
          <path d="M36,4 L18,8 L18,12 L36,8 Z" fill="#854d0e"/>
        </g>
        <!-- Top Sliding Coral Slab -->
        <g transform="translate(8, 14)">
          <path d="M0,4 L18,0 L36,4 L18,8 Z" fill="#fda4af"/>
          <path d="M0,4 L18,8 L18,12 L0,8 Z" fill="url(#st-4)"/>
          <path d="M36,4 L18,8 L18,12 L36,8 Z" fill="#881337"/>
        </g>
        <!-- Apex Gold Star -->
        <polygon points="32,4 34,9 39,9.5 35,13 36.5,18 32,15 27.5,18 29,13 25,9.5 30,9" fill="url(#st-star)"/>
      </g>`
    );
  }

  if(cls === 'suika') {
    return svgWrap('#ff6b6b', '#4ecdc4', 'rgba(255,107,107,0.45)',
      gRadial('su-wm', '#86efac', '#15803d') +
      gRadial('su-flesh', '#f87171', '#dc2626') +
      gLinear('su-rind', '#22c55e', '#166534'),
      `<g filter="url(#drop-${cls})">
        <circle cx="32" cy="34" r="18" fill="url(#su-wm)" stroke="#166534" stroke-width="1.5"/>
        <circle cx="32" cy="34" r="14" fill="url(#su-flesh)" opacity="0.95"/>
        <ellipse cx="28" cy="28" rx="6" ry="5" fill="rgba(255,255,255,0.25)"/>
        <circle cx="26" cy="36" r="1.8" fill="#1f2937"/><circle cx="32" cy="40" r="1.8" fill="#1f2937"/><circle cx="38" cy="36" r="1.8" fill="#1f2937"/><circle cx="32" cy="30" r="1.8" fill="#1f2937"/>
        <circle cx="18" cy="18" r="6" fill="#f97316" stroke="#9a3412" stroke-width="1"/><circle cx="18" cy="18" r="1" fill="#fff"/>
        <circle cx="46" cy="20" r="5" fill="#eab308" stroke="#854d0e" stroke-width="1"/><circle cx="46" cy="20" r="1" fill="#fff"/>
      </g>`
    );
  }

  if(cls === 'connections') {
    return svgWrap('#8b5cf6', '#06b6d4', 'rgba(139,92,246,0.45)',
      gLinear('co-a', '#a78bfa', '#7c3aed') + gLinear('co-b', '#67e8f9', '#0891b2') + gLinear('co-c', '#fde68a', '#eab308') + gLinear('co-d', '#86efac', '#16a34a'),
      `<g filter="url(#drop-${cls})">
        <rect x="8" y="12" width="24" height="18" rx="3" fill="url(#co-a)" stroke="rgba(255,255,255,.4)" stroke-width="1"/><text x="20" y="24" font-size="5" font-weight="900" fill="#fff" text-anchor="middle">APPLE</text>
        <rect x="34" y="12" width="24" height="18" rx="3" fill="url(#co-a)" stroke="rgba(255,255,255,.4)" stroke-width="1"/><text x="46" y="24" font-size="5" font-weight="900" fill="#fff" text-anchor="middle">BASS</text>
        <rect x="8" y="34" width="24" height="18" rx="3" fill="url(#co-b)" stroke="rgba(255,255,255,.4)" stroke-width="1"/><text x="20" y="46" font-size="5" font-weight="900" fill="#fff" text-anchor="middle">GOLD</text>
        <rect x="34" y="34" width="24" height="18" rx="3" fill="url(#co-c)" stroke="rgba(255,255,255,.4)" stroke-width="1"/><text x="46" y="46" font-size="5" font-weight="900" fill="#4a044e" text-anchor="middle">MARS</text>
      </g>`
    );
  }

  if(cls === 'aim') {
    return svgWrap('#ef4444', '#f59e0b', 'rgba(239,68,68,0.45)',
      gRadial('aim-out', '#fca5a5', '#dc2626') + gRadial('aim-mid', '#fef08a', '#f59e0b') + gRadial('aim-in', '#fff', '#e5e7eb'),
      `<g filter="url(#drop-${cls})">
        <circle cx="32" cy="32" r="20" fill="url(#aim-out)" stroke="#fff" stroke-width="1.5"/>
        <circle cx="32" cy="32" r="13" fill="url(#aim-mid)" stroke="#fff" stroke-width="1"/>
        <circle cx="32" cy="32" r="6" fill="url(#aim-in)" stroke="#dc2626" stroke-width="1"/>
        <circle cx="32" cy="32" r="2.5" fill="#dc2626"/>
        <line x1="32" y1="8" x2="32" y2="14" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
        <line x1="32" y1="50" x2="32" y2="56" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
        <line x1="8" y1="32" x2="14" y2="32" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
        <line x1="50" y1="32" x2="56" y2="32" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
      </g>`
    );
  }

  if(cls === 'sort') {
    return svgWrap('#a855f7', '#ec4899', 'rgba(168,85,247,0.45)',
      gLinear('so-r', '#f87171', '#dc2626') + gLinear('so-g', '#4ade80', '#16a34a') + gLinear('so-b', '#60a5fa', '#2563eb') + gLinear('so-y', '#fde047', '#ca8a04'),
      `<g filter="url(#drop-${cls})">
        <rect x="10" y="18" width="10" height="28" rx="5" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.3)" stroke-width="1"/>
        <rect x="11" y="38" width="8" height="7" rx="2" fill="url(#so-r)"/><rect x="11" y="30" width="8" height="7" rx="2" fill="url(#so-g)"/><rect x="11" y="22" width="8" height="7" rx="2" fill="url(#so-b)"/>
        <rect x="27" y="18" width="10" height="28" rx="5" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.3)" stroke-width="1"/>
        <rect x="28" y="38" width="8" height="7" rx="2" fill="url(#so-y)"/><rect x="28" y="30" width="8" height="7" rx="2" fill="url(#so-r)"/><rect x="28" y="22" width="8" height="7" rx="2" fill="url(#so-g)"/>
        <rect x="44" y="18" width="10" height="28" rx="5" fill="rgba(255,255,255,.12)" stroke="rgba(255,255,255,.3)" stroke-width="1"/>
        <rect x="45" y="38" width="8" height="7" rx="2" fill="url(#so-b)"/><rect x="45" y="30" width="8" height="7" rx="2" fill="url(#so-y)"/>
        <path d="M22,12 L28,8 L34,12 Z" fill="#facc15" opacity="0.9"/>
      </g>`
    );
  }

  return `<div class="${wrapCls}"><span class="card-emoji">${emoji}</span></div>`;
}

function gameCard({ href, emoji, name, desc, streakKey, glow, daily, cls, cat }) {
  const st = store.streak(streakKey);
  const hot = st.current > 0;
  const tagLabel = daily ? 'DAILY' : (cat === '3d' ? '3D' : cat.toUpperCase());
  return `
    <a class="game-card ${cls || ''}" href="${href}" data-nav data-cat="${cat||'arcade'}" style="--glow:${glow}">
      <div class="card-tag-pill ${daily ? 'daily' : (cat === '3d' ? 'tag-3d' : '')}">${tagLabel}</div>
      <div class="card-emblem-slot">
        ${logo3d(cls, emoji)}
      </div>
      <div class="card-content">
        <h2 class="card-title">${name}</h2>
        <p class="card-desc">${desc}</p>
        <div class="card-action-bar">
          <span class="streak-pill ${hot ? 'hot' : ''}">🔥 ${st.current} ${t('streak')}${daily ? ' · ' + t('today') + (store.hasPlayed(streakKey, dayNumber()) ? ' ✓' : '') : ''}</span>
          <span class="card-play-btn">PLAY <span class="play-arrow">▶</span></span>
        </div>
      </div>
    </a>`;
}

// Removed old anime.js logo animations - now using pure CSS emblem animations

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
        <a class="featured-card" href="/reel" data-nav>${logo3d('reel','🎬','mini')}<b>REEL</b><small>Daily</small></a>
        <a class="featured-card" href="/stack" data-nav>${logo3d('stack','🧊','mini')}<b>STACK 3D</b><small>3D</small></a>
        <a class="featured-card" href="/flappy" data-nav>${logo3d('flappy','🐦','mini')}<b>FLAPPY 3D</b><small>3D</small></a>
        <a class="featured-card" href="/tetris" data-nav>${logo3d('tetris','🧱','mini')}<b>TETRIS</b><small>Puzzle</small></a>
      </div>
    </section>

    <!-- Filter bar — sticky on mobile -->
    <div class="filter-bar" data-test="filter-bar">
      <button class="filter-btn active" data-filter="all">All 20</button>
      <button class="filter-btn" data-filter="daily">Daily</button>
      <button class="filter-btn" data-filter="3d">3D</button>
      <button class="filter-btn" data-filter="puzzle">Puzzle</button>
      <button class="filter-btn" data-filter="arcade">Arcade</button>
    </div>

    <div style="margin:12px 0 8px;position:relative">
      <input id="hub-search" type="search" placeholder="Search games…" aria-label="Search games" autocomplete="off"
        style="width:100%;background:var(--surface);border:1px solid var(--border);border-radius:14px;color:var(--text);padding:12px 16px 12px 40px;font-family:inherit;outline:none" />
      <span style="position:absolute;left:14px;top:50%;transform:translateY(-50%);opacity:.6">🔍</span>
    </div>

    <h3 class="hub-section-title">${t('arcade')}</h3>
    <section class="game-grid" id="game-grid">
      ${gameCard({
        href: '/reel', emoji: '🎬', name: 'REEL',
        desc: 'Guess the movie from emojis. 4 tries, hints get desperate.',
        streakKey: 'reel', glow: 'rgba(244,114,182,.25)', daily: true, cls: 'reel', cat: 'daily'
      })}
      ${gameCard({
        href: '/hl', emoji: '⚖️', name: 'HIGHER OR LOWER',
        desc: 'What does the internet search more? Build an insane streak.',
        streakKey: 'hl', glow: 'rgba(34,211,238,.22)', daily: false, cls: 'hl', cat: 'arcade'
      })}
      ${gameCard({
        href: '/word', emoji: '🔤', name: 'WORD GUESS',
        desc: 'Crack the hidden 5-letter word. 6 tries. Daily.',
        streakKey: 'word', glow: 'rgba(251,191,36,.2)', daily: true, cls: 'word', cat: 'daily'
      })}
      ${gameCard({
        href: '/memory', emoji: '🧠', name: 'MEMORY',
        desc: 'Watch the pattern. Repeat it. How far can your brain go?',
        streakKey: 'memory', glow: 'rgba(124,58,237,.28)', daily: false, cls: 'memory', cat: 'puzzle'
      })}
      ${gameCard({
        href: '/timeline', emoji: '⏳', name: 'TIMELINE',
        desc: 'Order the movies from oldest to newest. 3 strikes only.',
        streakKey: 'timeline', glow: 'rgba(251,191,36,.18)', daily: false, cls: 'timeline', cat: 'puzzle'
      })}
      ${gameCard({
        href: '/flags', emoji: '🏳️', name: 'FLAG RUSH',
        desc: '10 flags, 5 seconds each. How many countries do you know?',
        streakKey: 'flags', glow: 'rgba(34,211,238,.2)', daily: false, cls: 'flags', cat: 'puzzle'
      })}
      ${gameCard({
        href: '/speed', emoji: '🏎️', name: 'SPEED RUSH',
        desc: 'Dodge traffic at insane speeds. How far can you get?',
        streakKey: 'speed', glow: 'rgba(251,113,133,.22)', daily: false, cls: 'speed', cat: 'arcade'
      })}
      ${gameCard({
        href: '/snake', emoji: '🐍', name: 'SNAKE',
        desc: 'The classic. Eat apples, grow long, don\'t bite yourself.',
        streakKey: 'snake', glow: 'rgba(163,230,53,.22)', daily: false, cls: 'snake', cat: 'arcade'
      })}
      ${gameCard({
        href: '/2048', emoji: '🔢', name: '2048',
        desc: 'Slide, merge, chase the legendary 2048 tile.',
        streakKey: 'g2048', glow: 'rgba(168,85,247,.22)', daily: false, cls: 'g2048', cat: 'puzzle'
      })}
      ${gameCard({
        href: '/reflex', emoji: '⚡', name: 'REFLEX',
        desc: '5 clicks. One average. Are you superhuman or just sleepy?',
        streakKey: 'reflex', glow: 'rgba(163,230,53,.2)', daily: false, cls: 'reflex', cat: 'arcade'
      })}
      ${gameCard({
        href: '/tetris', emoji: '🧱', name: 'TETRIS',
        desc: 'Stack blocks, clear lines. The timeless stacking puzzle.',
        streakKey: 'tetris', glow: 'rgba(34,211,238,.22)', daily: false, cls: 'tetris', cat: 'puzzle'
      })}
      ${gameCard({
        href: '/minesweeper', emoji: '💣', name: 'MINESWEEPER',
        desc: 'Flag the mines, clear the board. Logic at its purest.',
        streakKey: 'minesweeper', glow: 'rgba(239,68,68,.22)', daily: false, cls: 'minesweeper', cat: 'puzzle'
      })}
      ${gameCard({
        href: '/flappy', emoji: '🐦', name: 'FLAPPY 3D',
        desc: 'True 3D flight — tap to flap wings, dodge pipes.',
        streakKey: 'flappy', glow: 'rgba(250,204,21,.22)', daily: false, cls: 'flappy', cat: '3d'
      })}
      ${gameCard({
        href: '/breakout', emoji: '🎯', name: 'BREAKOUT',
        desc: 'Bounce the ball, smash the bricks. Pure arcade joy.',
        streakKey: 'breakout', glow: 'rgba(168,85,247,.22)', daily: false, cls: 'breakout', cat: 'arcade'
      })}
      ${gameCard({
        href: '/whack', emoji: '🔨', name: 'WHACK-A-MOLE',
        desc: '30 seconds, 9 holes. How fast can you hammer?',
        streakKey: 'whack', glow: 'rgba(251,146,60,.22)', daily: false, cls: 'whack', cat: 'arcade'
      })}
      ${gameCard({
        href: '/stack', emoji: '🧊', name: 'STACK 3D',
        desc: 'Time the drop, build the tower. How high can you get?',
        streakKey: 'stack', glow: 'rgba(56,189,248,.22)', daily: false, cls: 'stack', cat: '3d'
      })}
      ${gameCard({
        href: '/suika', emoji: '🍉', name: 'SUIKA MERGE',
        desc: 'Drop fruits, merge same — chase the watermelon!',
        streakKey: 'suika', glow: 'rgba(239,68,68,.22)', daily: false, cls: 'suika', cat: 'puzzle'
      })}
      ${gameCard({
        href: '/connections', emoji: '🔗', name: 'CONNECTIONS',
        desc: 'Find 4 groups of 4 words. 4 mistakes only.',
        streakKey: 'connections', glow: 'rgba(139,92,246,.22)', daily: false, cls: 'connections', cat: 'puzzle'
      })}
      ${gameCard({
        href: '/aim', emoji: '🎯', name: 'AIM TRAINER',
        desc: 'Hit 30 targets in 30 seconds. How fast are you?',
        streakKey: 'aim', glow: 'rgba(239,68,68,.22)', daily: false, cls: 'aim', cat: 'arcade'
      })}
      ${gameCard({
        href: '/sort', emoji: '🧪', name: 'COLOR SORT',
        desc: 'Sort colors into tubes. Trending puzzle.',
        streakKey: 'sort', glow: 'rgba(168,85,247,.22)', daily: false, cls: 'sort', cat: 'puzzle'
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
  // filter + search
  const hubSearch = document.getElementById('hub-search');
  function applyHubFilters() {
    const f = view.querySelector('.filter-btn.active')?.dataset.filter || 'all';
    const q = (hubSearch?.value || '').toLowerCase().trim();
    view.querySelectorAll('.game-card').forEach(c=>{
      const catOk = f==='all' || c.dataset.cat===f;
      const text = (c.textContent || '').toLowerCase();
      const searchOk = !q || text.includes(q);
      c.style.display = (catOk && searchOk) ? '' : 'none';
    });
  }
  hubSearch?.addEventListener('input', applyHubFilters);
  view.querySelectorAll('.filter-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      view.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      applyHubFilters();
      sfx.click();
    });
  });
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
