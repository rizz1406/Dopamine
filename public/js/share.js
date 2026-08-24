// Share targets — one tap to WhatsApp, Telegram, X, Reddit, or the native share sheet.
// Brand icons: simple-icons paths (CC0).

const SITE = 'https://dopamine.rizwanmirza95551.workers.dev'; // shown in share texts; update when deployed

const ICONS = {
  whatsapp: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z',
  telegram: 'M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z',
  x: 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z',
  reddit: 'M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 00.029-.463.33.33 0 00-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 00-.232-.095z',
  facebook: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z'
};

const BRANDS = {
  whatsapp: { color: '#25D366', icon: ICONS.whatsapp },
  telegram: { color: '#26A5E4', icon: ICONS.telegram },
  x: { color: '#0f1722', icon: ICONS.x },
  reddit: { color: '#FF4500', icon: ICONS.reddit },
  facebook: { color: '#1877F2', icon: ICONS.facebook }
};

/** Inline SVG markup for a brand icon. */
export function brandIconSvg(brand, size = 22) {
  const b = BRANDS[brand];
  if (!b) return '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="white" aria-hidden="true"><path d="${b.icon}"/></svg>`;
}

/**
 * Build share targets for a result text.
 * Each target opens the app/site directly via its URL scheme.
 */
export function shareTargets(text) {
  const enc = encodeURIComponent(text);
  const t = {
    whatsapp: `https://wa.me/?text=${enc}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(SITE)}&text=${enc}`,
    x: `https://twitter.com/intent/tweet?text=${enc}`,
    reddit: `https://www.reddit.com/submit?url=${encodeURIComponent(SITE)}&title=${encodeURIComponent(text.split('\n')[0])}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(SITE)}"e=${enc}`
  };
  return [
    { name: 'WhatsApp', key: 'whatsapp', url: t.whatsapp },
    { name: 'Telegram', key: 'telegram', url: t.telegram },
    { name: 'X / Twitter', key: 'x', url: t.x },
    { name: 'Reddit', key: 'reddit', url: t.reddit },
    { name: 'Facebook', key: 'facebook', url: t.facebook }
  ];
}

export { BRANDS };

/** Native share sheet (mobile). Returns true if handled. */
export async function nativeShare(text, title = 'DOPAMINE') {
  if (!navigator.share) return false;
  try { await navigator.share({ title, text }); return true; }
  catch { return false; } // user cancelled
}

export function hasNativeShare() {
  return typeof navigator !== 'undefined' && !!navigator.share;
}

/**
 * Render a branded 1000×500 result card on canvas → PNG blob.
 */
export async function renderResultCard({ headline, sub = '', grid = '' }) {
  const W = 1000, H = 500;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');

  // bg gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0b0b12'); bg.addColorStop(1, '#241640');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // glow blobs
  const blob = (x, y, r, color) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color); g.addColorStop(1, 'transparent');
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
  };
  blob(880, 60, 300, 'rgba(124,58,237,.5)');
  blob(90, 460, 260, 'rgba(34,211,238,.4)');
  blob(920, 430, 200, 'rgba(244,114,182,.3)');

  // dots
  ['#a3e635', '#22d3ee', '#f472b6', '#fbbf24', '#ffffff'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.arc(390 + i * 55, 110, 13, 0, 7); ctx.fill();
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = '900 92px "Archivo Black", "Arial Black", sans-serif';
  ctx.fillText('DOPAMINE.', W / 2, 250);

  if (grid) {
    ctx.font = '64px serif';
    ctx.fillText(grid, W / 2, 330);
  }

  ctx.font = '700 44px "Space Grotesk", sans-serif';
  ctx.fillStyle = '#a3e635';
  ctx.fillText(headline.slice(0, 42), W / 2, grid ? 410 : 360);
  if (sub) {
    ctx.font = '28px "Space Grotesk", sans-serif';
    ctx.fillStyle = 'rgba(200,200,220,.9)';
    ctx.fillText(sub.slice(0, 60), W / 2, grid ? 462 : 430);
  }

  return new Promise(resolve => cv.toBlob(b => resolve(b), 'image/png'));
}

/**
 * Share the result card as an image (native share sheet with file support),
 * falling back to a download. Returns 'shared' | 'downloaded' | null.
 */
export async function shareImageCard(opts) {
  const blob = await renderResultCard(opts);
  if (!blob) return null;
  const file = new File([blob], 'dopamine-result.png', { type: 'image/png' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: 'DOPAMINE' }); return 'shared'; }
    catch { return null; } // cancelled
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'dopamine-result.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 3000);
  return 'downloaded';
}
