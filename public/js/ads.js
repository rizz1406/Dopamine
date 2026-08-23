// Ad configuration engine — reads your settings, drives every ad slot on the site.
// Config lives in localStorage (set via the Admin panel at #/admin).

const KEY = 'dopamine:ads';
const COUNTER_KEY = 'dopamine:ads:count';

export const DEFAULT_ADS = {
  enabled: true,
  slots: { top: true, footer: true, inGame: true },
  interstitialEvery: 3,          // show interstitial every N game starts (0 = never)
  clientId: '',                  // e.g. ca-pub-1234567890123456
  slotIds: { top: '', footer: '', inGame: '' },
  houseText: 'ad space — your future revenue lives here'
};

let serverConfig = null;

export function getAdsConfig() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch {}
  // priority: local preview overrides server config overrides defaults
  return {
    ...DEFAULT_ADS,
    ...(serverConfig || {}),
    ...saved,
    slots: { ...DEFAULT_ADS.slots, ...(serverConfig?.slots || {}), ...(saved.slots || {}) },
    slotIds: { ...DEFAULT_ADS.slotIds, ...(serverConfig?.slotIds || {}), ...(saved.slotIds || {}) }
  };
}

/** Fetch owner config from the backend (no-op on static hosting). */
export async function initServerConfig() {
  try {
    const res = await fetch('/api/ads-config');
    if (!res.ok) return;
    const j = await res.json();
    if (j.config) {
      serverConfig = j.config;
      applyAdsConfig();
    }
  } catch { /* static hosting / offline */ }
}

export function saveAdsConfig(cfg) {
  try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch {}
  applyAdsConfig();
}

/** Paint every .ad-slot element according to config. */
export function applyAdsConfig() {
  const cfg = getAdsConfig();
  document.querySelectorAll('.ad-slot').forEach(el => {
    const pos = el.dataset.ad || 'footer';
    const on = cfg.enabled && cfg.slots[pos] !== false;
    el.style.display = on ? 'flex' : 'none';
    if (!on) return;
    if (cfg.clientId) {
      el.textContent = `✓ ${pos} slot ready · ${cfg.clientId}${cfg.slotIds[pos] ? ' · ' + cfg.slotIds[pos] : ''}`;
    } else {
      el.textContent = cfg.houseText || DEFAULT_ADS.houseText;
    }
  });
}

/** Interstitial between game starts. Returns true if shown. */
export function maybeShowInterstitial(onClose = () => {}) {
  const cfg = getAdsConfig();
  if (!cfg.enabled || !cfg.interstitialEvery) return false;
  let n = 0;
  try { n = parseInt(sessionStorage.getItem(COUNTER_KEY) || '0', 10) + 1; sessionStorage.setItem(COUNTER_KEY, String(n)); } catch { n = 1; }
  if (n % cfg.interstitialEvery !== 0) return false;

  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.setAttribute('data-test', 'interstitial');
  backdrop.innerHTML = `
    <div class="modal">
      <h3>💬 Your ad here</h3>
      <p style="color:var(--muted);margin:10px 0 18px">Interstitial slot #${n} — this pays the bills once you plug in AdSense.</p>
      <button class="btn" data-continue>▶ Continue</button>
    </div>`;
  document.body.appendChild(backdrop);
  const close = () => { backdrop.remove(); onClose(); };
  backdrop.querySelector('[data-continue]').addEventListener('click', close);
  return true;
}

/** The exact snippet to paste into index.html once AdSense approves the site. */
export function buildAdsenseSnippet(cfg = getAdsConfig()) {
  return `<!-- AdSense: paste inside <head> of index.html -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${cfg.clientId || 'YOUR_CLIENT_ID'}"
        crossorigin="anonymous"></script>

<!-- Footer banner (responsive) -->
<ins class="adsbygoogle" style="display:block"
     data-ad-client="${cfg.clientId || 'YOUR_CLIENT_ID'}"
     data-ad-slot="${cfg.slotIds.footer || 'YOUR_SLOT_ID'}"
     data-ad-format="auto" data-full-width-responsive="true"></ins>
<script>(adsbygoogle = window.adsbygoogle || []).push({});</script>`;
}
