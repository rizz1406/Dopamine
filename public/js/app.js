// DOPAMINE app shell: router, hub, shared UI helpers.
import { dayNumber } from './rng.js';
import { store } from './store.js';
import { isMuted, toggleMute, sfx } from './audio.js';
import { applyAdsConfig, initServerConfig } from './ads.js';
import { shareTargets, brandIconSvg, BRANDS, nativeShare, hasNativeShare, shareImageCard } from './share.js';
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
import { renderAdmin } from './games/admin.js';

const view = document.getElementById('view');

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
  view.innerHTML = `
    <section class="hero">
      <h1>DOPAMINE.</h1>
      <p><span class="pulse-dot"></span>Puzzle <b>${dayLabel}</b> is live — same challenge for everyone, new at midnight UTC</p>
    </section>
    <section class="game-grid">
      ${gameCard({
        href: '#/reel', emoji: '🎬', name: 'REEL',
        desc: 'Guess the movie from emojis. 4 tries, hints get desperate.',
        streakKey: 'reel', glow: 'rgba(244,114,182,.25)', daily: true, cls: 'reel'
      })}
      ${gameCard({
        href: '#/higher-lower', emoji: '⚖️', name: 'HIGHER OR LOWER',
        desc: 'What does the internet search more? Build an insane streak.',
        streakKey: 'hl', glow: 'rgba(34,211,238,.22)', daily: false, cls: 'hl'
      })}
      ${gameCard({
        href: '#/word', emoji: '🔤', name: 'WORD GUESS',
        desc: 'Crack the hidden 5-letter word. 6 tries. Daily.',
        streakKey: 'word', glow: 'rgba(251,191,36,.2)', daily: true, cls: 'word'
      })}
      ${gameCard({
        href: '#/memory', emoji: '🧠', name: 'MEMORY',
        desc: 'Watch the pattern. Repeat it. How far can your brain go?',
        streakKey: 'memory', glow: 'rgba(124,58,237,.28)', daily: false, cls: 'memory'
      })}
      ${gameCard({
        href: '#/timeline', emoji: '⏳', name: 'TIMELINE',
        desc: 'Order the movies from oldest to newest. 3 strikes only.',
        streakKey: 'timeline', glow: 'rgba(251,191,36,.18)', daily: false, cls: 'timeline'
      })}
      ${gameCard({
        href: '#/flags', emoji: '🏳️', name: 'FLAG RUSH',
        desc: '10 flags, 5 seconds each. How many countries do you know?',
        streakKey: 'flags', glow: 'rgba(34,211,238,.2)', daily: false, cls: 'flags'
      })}
      ${gameCard({
        href: '#/speed', emoji: '🏎️', name: 'SPEED RUSH',
        desc: 'Dodge traffic at insane speeds. How far can you get?',
        streakKey: 'speed', glow: 'rgba(251,113,133,.22)', daily: false, cls: 'speed'
      })}
      ${gameCard({
        href: '#/snake', emoji: '🐍', name: 'SNAKE',
        desc: 'The classic. Eat apples, grow long, don\'t bite yourself.',
        streakKey: 'snake', glow: 'rgba(163,230,53,.22)', daily: false, cls: 'snake'
      })}
      ${gameCard({
        href: '#/reflex', emoji: '⚡', name: 'REFLEX',
        desc: '5 clicks. One average. Are you superhuman or just sleepy?',
        streakKey: 'reflex', glow: 'rgba(163,230,53,.2)', daily: false, cls: 'reflex'
      })}
    </section>`;
}

const ROUTES = {
  '#/': renderHub,
  '#/reel': renderReel,
  '#/higher-lower': renderHigherLower,
  '#/reflex': renderReflex,
  '#/memory': renderMemory,
  '#/timeline': renderTimeline,
  '#/word': renderWord,
  '#/flags': renderFlagRush,
  '#/speed': renderSpeed,
  '#/snake': renderSnake,
  '#/leaderboard': renderLeaderboard,
  '#/admin': renderAdmin,
};

let currentCleanup = null;

export function navigate(hash) {
  location.hash = hash;
}

function router() {
  if (typeof currentCleanup === 'function') currentCleanup();
  currentCleanup = null;
  const hash = location.hash || '#/';
  (ROUTES[hash] || renderHub)(view, cleanupFn => { currentCleanup = cleanupFn; });
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

window.addEventListener('hashchange', router);

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
