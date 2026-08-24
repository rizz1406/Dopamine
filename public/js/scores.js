// scores.js — global daily leaderboard client: name handling, score submit, result panels.
import { dayNumber } from './rng.js';
import { sfx } from './audio.js';

const NAME_KEY = 'dopamine:name';
export const GAME_LABELS = {
  reel: '🎬 REEL', hl: '⚖️ Higher/Lower', word: '🔤 Word Guess',
  memory: '🧠 Memory', timeline: '⏳ Timeline', flags: '🏳️ Flag Rush', reflex: '⚡ Reflex',
  speed: '🏎️ Speed Rush', snake: '🐍 Snake'
};

export function getName() {
  try { return localStorage.getItem(NAME_KEY) || null; } catch { return null; }
}
export function setName(name) {
  try { localStorage.setItem(NAME_KEY, name); } catch {}
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

/** Ask once for a leaderboard name. Resolves name or null if skipped. */
export function promptName() {
  return new Promise(resolve => {
    if (getName()) return resolve(getName());
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" data-test="name-modal">
        <h3>🏆 You made the board!</h3>
        <p style="color:var(--muted);font-size:.88rem;margin:8px 0 16px">Pick a name for the global daily leaderboard</p>
        <input type="text" id="lb-name" maxlength="16" placeholder="e.g. PuzzleKing" data-test="name-input"
               style="width:100%;background:var(--bg);border:1px solid var(--border);border-radius:12px;color:var(--text);padding:13px 16px;font-family:inherit;font-size:1rem;outline:none;text-align:center" />
        <button class="btn" style="width:100%;margin-top:12px" data-test="name-save">Save & Join</button>
        <button class="btn ghost" style="width:100%;margin-top:10px" data-test="name-skip">Skip, stay anonymous</button>
      </div>`;
    document.body.appendChild(backdrop);
    const input = backdrop.querySelector('#lb-name');
    input.focus();
    const close = v => { backdrop.remove(); resolve(v); };
    const save = () => {
      const v = input.value.trim().slice(0, 16).replace(/[<>&"]/g, '');
      if (v) { setName(v); sfx.correct(); close(v); } else input.focus();
    };
    backdrop.querySelector('[data-test="name-save"]').addEventListener('click', save);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') save(); });
    backdrop.querySelector('[data-test="name-skip"]').addEventListener('click', () => close(null));
  });
}

/** Submit a score. Returns {rank} or null. Silent on failure (offline-safe). */
export async function submitScore(game, score) {
  try {
    const name = await promptName();
    if (!name) return null;
    const res = await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game, name, score, day: today() })
    });
    if (!res.ok) return null;
    const j = await res.json();
    return j.rank != null ? { rank: j.rank } : null;
  } catch { return null; }
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * Mount a "today's top 5" panel into container (appended, never replaces content). Silent-fail.
 */
export async function mountLeaderboard(game, container) {
  if (!container) return;
  try {
    const res = await fetch(`/api/leaderboard?game=${encodeURIComponent(game)}&day=${today()}`);
    if (!res.ok) return;
    const j = await res.json();
    if (container.querySelector('.lb-panel')) return; // already mounted
    const me = getName();
    const rows = (j.top || []).slice(0, 5).map((r, i) => `
      <div class="lb-row" data-test="lb-row">
        <span class="lb-rank">${['🥇', '🥈', '🥉'][i] || '#' + (i + 1)}</span>
        <span class="lb-name ${r.name === me ? 'you' : ''}">${esc(r.name)}</span>
        <span class="lb-score">${r.score}</span>
      </div>`).join('');
    container.insertAdjacentHTML('beforeend', `
      <div class="lb-panel" data-test="lb-panel">
        <h4>🏆 Today's Top 5 · ${GAME_LABELS[game] || game}</h4>
        ${rows || '<div class="lb-empty">First score of the day — be legendary.</div>'}
      </div>`);
  } catch { /* offline / no backend */ }
}
