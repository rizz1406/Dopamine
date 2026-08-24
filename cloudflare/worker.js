// DOPAMINE Cloudflare Worker — same API as server.js, powered by D1.
// Deploys as one Worker serving both the API and the static site (assets binding).
// Free tier: 100k requests/day, no cold starts. See DEPLOY-CLOUDFLARE.md.

const GAMES = ['reel', 'hl', 'word', 'memory', 'timeline', 'flags', 'reflex', 'speed', 'snake'];
const SCORE_LIMITS = { reel: [0, 5], hl: [0, 100000], word: [0, 6], memory: [0, 1000], timeline: [0, 3], flags: [0, 10], reflex: [0, 1000], speed: [0, 1000000], snake: [0, 100000] };

const json = (obj, code = 200) =>
  new Response(JSON.stringify(obj), {
    status: code,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });

const err = (msg, code) => json({ error: msg }, code);

async function readBody(request) {
  try {
    const body = await request.json();
    return body;
  } catch {
    return null;
  }
}

function cleanName(v) {
  return String(v || '').replace(/[<>&"'`]/g, '').trim().slice(0, 16) || 'anon';
}

function cleanDay(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? v : new Date().toISOString().slice(0, 10);
}

async function hmac(secret, payload) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // API routes → handler; everything else → static assets
    if (url.pathname.startsWith('/api/')) {
      try {
        return await handleApi(request, env, url);
      } catch (e) {
        return err(e.message || 'server error', 500);
      }
    }
    return env.ASSETS.fetch(request);
  }
};

async function handleApi(request, env, url) {
  const db = env.DB;
  const path = url.pathname;
  const today = new Date().toISOString().slice(0, 10);

  // ── public ──
  if (path === '/api/score' && request.method === 'POST') {
    const body = await readBody(request);
    if (!body) return err('bad json', 400);
    const game = String(body.game || '');
    if (!GAMES.includes(game)) return err('bad game', 400);
    const [min, max] = SCORE_LIMITS[game];
    const score = Math.round(Number(body.score));
    if (!Number.isFinite(score) || score < min || score > max) return err('bad score', 400);
    const day = cleanDay(body.day);
    if (day !== today && day !== new Date(Date.now() - 86400000).toISOString().slice(0, 10)) {
      return err('bad day', 400);
    }
    const name = cleanName(body.name);
    await db.prepare('INSERT INTO scores (day, game, name, score, ts) VALUES (?, ?, ?, ?, ?)')
      .bind(day, game, name, score, Date.now()).run();
    // prune older than 8 days (lazy)
    await db.prepare("DELETE FROM scores WHERE day < ?").bind(new Date(Date.now() - 8 * 86400000).toISOString().slice(0, 10)).run();
    const rank = await bestRank(db, day, game, name);
    return json({ ok: true, rank });
  }

  if (path === '/api/leaderboard' && request.method === 'GET') {
    const game = url.searchParams.get('game') || '';
    if (!GAMES.includes(game)) return err('bad game', 400);
    const day = cleanDay(url.searchParams.get('day'));
    const { results } = await db.prepare(`
      SELECT name, MAX(score) AS score, MIN(ts) AS ts
      FROM scores WHERE day = ? AND game = ?
      GROUP BY name ORDER BY score DESC, ts ASC LIMIT 20
    `).bind(day, game).all();
    return json({ day, game, top: results || [] });
  }

  if (path === '/api/ads-config' && request.method === 'GET') {
    const row = await db.prepare("SELECT value FROM config WHERE key = 'ads'").first();
    return json({ config: row ? JSON.parse(row.value) : null });
  }

  // ── admin auth ──
  if (path === '/api/admin/login' && request.method === 'POST') {
    const body = await readBody(request);
    if (!body) return err('bad json', 400);
    const pw = String(body.password || '');
    const ok = timingSafeEqual(pw, env.ADMIN_PASSWORD || 'dopamine-admin');
    if (!ok) return err('wrong password', 401);
    return json({ token: await hmac(env.SECRET, 'admin') });
  }

  const auth = request.headers.get('authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const expected = await hmac(env.SECRET, 'admin');
  if (!token || !timingSafeEqual(token, expected)) return err('unauthorized', 401);

  // ── admin (authed) ──
  if (path === '/api/admin/scores' && request.method === 'GET') {
    const day = cleanDay(url.searchParams.get('day'));
    const { results } = await db.prepare('SELECT game, name, score, ts FROM scores WHERE day = ? ORDER BY ts DESC')
      .bind(day).all();
    const grouped = {};
    for (const r of results || []) (grouped[r.game] = grouped[r.game] || []).push(r);
    return json({ day, scores: grouped });
  }

  if (path === '/api/admin/scores' && request.method === 'DELETE') {
    const day = cleanDay(url.searchParams.get('day'));
    await db.prepare('DELETE FROM scores WHERE day = ?').bind(day).run();
    return json({ ok: true });
  }

  if (path === '/api/admin/ads-config' && request.method === 'GET') {
    const row = await db.prepare("SELECT value FROM config WHERE key = 'ads'").first();
    return json({ config: row ? JSON.parse(row.value) : null });
  }

  if (path === '/api/admin/ads-config' && request.method === 'POST') {
    const body = await readBody(request);
    const cfg = body?.config;
    if (typeof cfg !== 'object' || cfg == null) return err('bad config', 400);
    const safe = {
      enabled: !!cfg.enabled,
      slots: { top: !!cfg.slots?.top, footer: !!cfg.slots?.footer, inGame: !!cfg.slots?.inGame },
      interstitialEvery: Math.max(0, Math.min(50, Math.round(Number(cfg.interstitialEvery) || 0))),
      clientId: String(cfg.clientId || '').slice(0, 64).replace(/[<>&"']/g, ''),
      slotIds: {
        top: String(cfg.slotIds?.top || '').slice(0, 32).replace(/[<>&"']/g, ''),
        footer: String(cfg.slotIds?.footer || '').slice(0, 32).replace(/[<>&"']/g, ''),
        inGame: String(cfg.slotIds?.inGame || '').slice(0, 32).replace(/[<>&"']/g, '')
      },
      houseText: String(cfg.houseText || '').slice(0, 120).replace(/[<>]/g, '')
    };
    await db.prepare("INSERT INTO config (key, value) VALUES ('ads', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
      .bind(JSON.stringify(safe)).run();
    return json({ ok: true, config: safe });
  }

  return err('not found', 404);
}

async function bestRank(db, day, game, name) {
  const { results } = await db.prepare(`
    SELECT name, MAX(score) AS score, MIN(ts) AS ts
    FROM scores WHERE day = ? AND game = ?
    GROUP BY name ORDER BY score DESC, ts ASC
  `).bind(day, game).all();
  const mine = (results || []).find(r => r.name === name);
  if (!mine) return null;
  return (results || []).filter(r => r.score > mine.score).length + 1;
}
