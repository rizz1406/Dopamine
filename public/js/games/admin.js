// ⚙️ ADMIN — owner control room. Local preview + server-synced settings behind password.
import { getAdsConfig, saveAdsConfig, applyAdsConfig, buildAdsenseSnippet, DEFAULT_ADS } from '../ads.js';
import { ui } from '../app.js';
import { sfx } from '../audio.js';

const TOKEN_KEY = 'dopamine:admin:token';

function getToken() {
  try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function setToken(t) {
  try { t ? sessionStorage.setItem(TOKEN_KEY, t) : sessionStorage.removeItem(TOKEN_KEY); } catch {}
}
async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(getToken() ? { Authorization: 'Bearer ' + getToken() } : {}), ...(opts.headers || {}) }
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || ('HTTP ' + res.status));
  return j;
}

export function renderAdmin(view) {
  const cfg = getAdsConfig();
  const token = getToken();

  view.innerHTML = `
    <div class="game-head">
      <button class="back-btn" data-nav href="#/" aria-label="Back">←</button>
      <div class="game-title">
        <h2>⚙️ AD SETTINGS</h2>
        <p>Owner control room — server settings sync to every visitor</p>
      </div>
    </div>

    <section class="stage" style="text-align:left" data-test="admin-panel">
      <h4 class="admin-h">🔐 Owner access</h4>
      ${token ? `
        <div class="admin-row" style="cursor:default">
          <span>✅</span>
          <div><b>Logged in</b><small>settings below save to the server for everyone</small></div>
          <button class="btn ghost" id="admin-logout" style="margin-left:auto;padding:8px 16px;font-size:.8rem" data-test="admin-logout">Log out</button>
        </div>
        <div class="admin-row" style="cursor:default;flex-direction:column;align-items:stretch;gap:10px">
          <div style="display:flex;align-items:center;gap:10px">
            <span>📊</span><b>Today's scores</b>
            <button class="btn ghost" id="scores-refresh" style="margin-left:auto;padding:8px 16px;font-size:.8rem" data-test="scores-refresh">↻</button>
            <button class="btn ghost" id="scores-clear" style="padding:8px 16px;font-size:.8rem;color:var(--red)" data-test="scores-clear">Clear today</button>
          </div>
          <pre id="scores-view" data-test="scores-view" style="max-height:220px;overflow:auto;font-size:.72rem;color:var(--muted);white-space:pre-wrap;background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:12px"></pre>
        </div>
      ` : `
        <div class="admin-row" style="cursor:default;flex-direction:column;align-items:stretch;gap:10px">
          <div><b>Login</b><small>password is set via the ADMIN_PASSWORD environment variable on your server</small></div>
          <div style="display:flex;gap:10px">
            <input type="password" id="admin-pass" data-test="admin-pass" placeholder="Owner password"
              style="flex:1;background:var(--bg);border:1px solid var(--border);border-radius:11px;color:var(--text);padding:11px 14px;font-family:inherit;outline:none" />
            <button class="btn" id="admin-login" data-test="admin-login" style="padding:11px 22px">Login</button>
          </div>
          <small style="color:var(--muted)">Without login, settings below only preview in <b>your</b> browser.</small>
        </div>
      `}

      <h4 class="admin-h">Master & slots</h4>
      <label class="admin-row">
        <input type="checkbox" id="ads-enabled" data-test="ads-enabled" ${cfg.enabled ? 'checked' : ''} />
        <div><b>Ads enabled</b><small>master switch for every slot on the site</small></div>
      </label>
      ${[['top', 'Top leaderboard'], ['inGame', 'In-game banner'], ['footer', 'Footer banner']].map(([k, label]) => `
        <label class="admin-row">
          <input type="checkbox" data-slot="${k}" data-test="slot-${k}" ${cfg.slots[k] ? 'checked' : ''} />
          <div><b>${label}</b><small>data-ad="${k}"</small></div>
        </label>`).join('')}

      <h4 class="admin-h">AdSense account</h4>
      <label class="admin-field">
        <span>Client ID</span>
        <input type="text" id="ads-client" data-test="ads-client" placeholder="ca-pub-XXXXXXXXXXXXXXXX" value="${cfg.clientId}" />
      </label>
      ${[['top', 'Top slot ID'], ['inGame', 'In-game slot ID'], ['footer', 'Footer slot ID']].map(([k, label]) => `
        <label class="admin-field">
          <span>${label}</span>
          <input type="text" data-slotid="${k}" placeholder="1234567890" value="${cfg.slotIds[k] || ''}" />
        </label>`).join('')}

      <h4 class="admin-h">Interstitial</h4>
      <label class="admin-field">
        <span>Show every N game starts (0 = never)</span>
        <input type="number" id="ads-inter" data-test="ads-inter" min="0" max="20" value="${cfg.interstitialEvery}" />
      </label>

      <h4 class="admin-h">House ad text</h4>
      <label class="admin-field">
        <input type="text" id="ads-house" value="${cfg.houseText}" />
      </label>

      <div class="result-actions" style="justify-content:flex-start;margin-top:24px">
        <button class="btn lime" id="ads-save" data-test="ads-save">💾 Save${token ? ' to Server' : ' (local preview)'}</button>
        <button class="btn cyan" id="ads-export" data-test="ads-export">📤 Export Snippet</button>
        <button class="btn ghost" id="ads-reset">↺ Reset</button>
      </div>
    </section>`;

  const readForm = () => {
    const next = getAdsConfig();
    next.enabled = view.querySelector('#ads-enabled').checked;
    view.querySelectorAll('[data-slot]').forEach(cb => next.slots[cb.dataset.slot] = cb.checked);
    next.clientId = view.querySelector('#ads-client').value.trim();
    view.querySelectorAll('[data-slotid]').forEach(inp => next.slotIds[inp.dataset.slotid] = inp.value.trim());
    next.interstitialEvery = Math.max(0, parseInt(view.querySelector('#ads-inter').value, 10) || 0);
    next.houseText = view.querySelector('#ads-house').value.trim() || DEFAULT_ADS.houseText;
    return next;
  };

  // ── auth ──
  const loginBtn = view.querySelector('#admin-login');
  if (loginBtn) loginBtn.addEventListener('click', async () => {
    const pass = view.querySelector('#admin-pass').value;
    try {
      const j = await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: pass }) });
      setToken(j.token);
      sfx.correct();
      ui.toast('✅ Welcome back, boss');
      renderAdmin(view);
    } catch (e) {
      sfx.wrong();
      ui.toast('❌ ' + e.message);
    }
  });
  view.querySelector('#admin-logout')?.addEventListener('click', () => { setToken(null); renderAdmin(view); });

  // ── save ──
  view.querySelector('#ads-save').addEventListener('click', async () => {
    const next = readForm();
    saveAdsConfig(next); // local preview always applies
    if (getToken()) {
      try {
        await api('/api/admin/ads-config', { method: 'POST', body: JSON.stringify({ config: next }) });
        sfx.correct();
        ui.toast('✅ Saved to server — live for everyone');
      } catch (e) {
        sfx.wrong();
        ui.toast('⚠️ Server save failed: ' + e.message);
      }
    } else {
      sfx.correct();
      ui.toast('✅ Saved (local preview only)');
    }
  });

  // ── scores viewer ──
  async function loadScores() {
    try {
      const j = await api('/api/admin/scores?day=' + new Date().toISOString().slice(0, 10));
      const games = Object.entries(j.scores || {});
      view.querySelector('#scores-view').textContent = games.length
        ? games.map(([g, list]) => `${g}: ${list.length} scores — ` + list.slice().sort((a, b) => b.score - a.score).slice(0, 5).map(s => `${s.name}(${s.score})`).join(', ')).join('\n')
        : 'No scores yet today.';
    } catch (e) {
      view.querySelector('#scores-view').textContent = 'Failed to load: ' + e.message;
    }
  }
  view.querySelector('#scores-refresh')?.addEventListener('click', () => { sfx.click(); loadScores(); });
  view.querySelector('#scores-clear')?.addEventListener('click', async () => {
    try {
      await api('/api/admin/scores?day=' + new Date().toISOString().slice(0, 10), { method: 'DELETE' });
      sfx.correct();
      ui.toast('Today\'s scores cleared');
      loadScores();
    } catch (e) { ui.toast('⚠️ ' + e.message); }
  });
  if (token) loadScores();

  // ── export ──
  view.querySelector('#ads-export').addEventListener('click', () => {
    sfx.click();
    const snippet = buildAdsenseSnippet();
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" style="text-align:left;max-width:560px" data-test="export-modal">
        <h3>📤 Deploy checklist</h3>
        <p style="color:var(--muted);font-size:.85rem;margin:6px 0 12px">
          1. Deploy (Render/Railway run this server as-is) · 2. Set ADMIN_PASSWORD env ·
          3. After AdSense approval, paste this into <b>index.html</b> head:</p>
        <div class="share-box" data-test="snippet">${snippet.replace(/</g, '&lt;')}</div>
        <button class="btn" data-copy>📋 Copy Snippet</button>
        <button class="btn ghost" style="margin-top:10px" data-close>Close</button>
      </div>`;
    document.body.appendChild(backdrop);
    backdrop.querySelector('[data-close]').addEventListener('click', () => backdrop.remove());
    backdrop.querySelector('[data-copy]').addEventListener('click', async e => {
      try { await navigator.clipboard.writeText(snippet); } catch {}
      e.target.textContent = '✅ Copied!';
      setTimeout(() => backdrop.remove(), 1200);
    });
  });

  view.querySelector('#ads-reset').addEventListener('click', () => {
    sfx.click();
    saveAdsConfig({ ...DEFAULT_ADS, slots: { ...DEFAULT_ADS.slots }, slotIds: { ...DEFAULT_ADS.slotIds } });
    renderAdmin(view);
    ui.toast('Reset to defaults (local)');
  });

  applyAdsConfig();
}
