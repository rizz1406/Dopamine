// DOPAMINE server — static files + global leaderboard API + owner admin API.
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const DATA = join(ROOT, 'data');
const PORT = process.env.PORT || 4173;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'dopamine-admin';

const GAMES = ['reel', 'hl', 'word', 'memory', 'timeline', 'flags', 'reflex', 'speed', 'snake', 'g2048'];
const SCORE_LIMITS = { reel: [0, 5], hl: [0, 100000], word: [0, 6], memory: [0, 1000], timeline: [0, 3], flags: [0, 10], reflex: [0, 1000], g2048: [0, 1000000], speed: [0, 1000000], snake: [0, 100000] };

// ── storage ───────────────────────────────────────────────
let scores = {};   // { 'YYYY-MM-DD': { game: [{name, score, ts}] } }
let adsConfig = null;
let secret = null;

async function loadState() {
  await mkdir(DATA, { recursive: true });
  try { scores = JSON.parse(await readFile(join(DATA, 'scores.json'), 'utf8')); } catch { scores = {}; }
  try { adsConfig = JSON.parse(await readFile(join(DATA, 'ads.json'), 'utf8')); } catch { adsConfig = null; }
  try { secret = (await readFile(join(DATA, 'secret.key'), 'utf8')).trim(); } catch {
    secret = randomBytes(32).toString('hex');
    await writeFile(join(DATA, 'secret.key'), secret);
  }
}

let saveScheduled = false;
function persistScores() {
  if (saveScheduled) return;
  saveScheduled = true;
  setTimeout(async () => {
    saveScheduled = false;
    try { await writeFile(join(DATA, 'scores.json'), JSON.stringify(scores)); } catch {}
  }, 300);
}

function pruneOld() {
  const cutoff = Date.now() - 8 * 86400000;
  for (const day of Object.keys(scores)) {
    if (new Date(day + 'T00:00:00Z').getTime() < cutoff) delete scores[day];
  }
}

function utcToday() {
  return new Date().toISOString().slice(0, 10);
}

// ── helpers ───────────────────────────────────────────────
function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function readBody(req, limit = 10240) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(new Error('too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new Error('bad json')); }
    });
    req.on('error', reject);
  });
}

function sign(payload) {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

function isAuthed(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return false;
  const expected = sign('admin');
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function cleanName(v) {
  return String(v || '').replace(/[<>&"'`]/g, '').trim().slice(0, 16) || 'anon';
}

function cleanDay(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? v : utcToday();
}

// naive in-memory rate limiter
const hits = new Map();
function rateLimited(ip, bucket, max, windowMs) {
  const key = ip + ':' + bucket;
  const now = Date.now();
  const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > max;
}

function rankOf(day, game, name) {
  const list = scores[day]?.[game] || [];
  const mine = list.filter(s => s.name === name);
  if (!mine.length) return null;
  const best = Math.max(...mine.map(s => s.score));
  const rank = list.filter(s => s.score > best).length + 1;
  return rank;
}

// ── API router ────────────────────────────────────────────
async function handleApi(req, res, url) {
  const ip = req.socket.remoteAddress || 'x';
  const path = url.pathname;

  if (path === '/api/score' && req.method === 'POST') {
    if (rateLimited(ip, 'score', 30, 60000)) return json(res, 429, { error: 'slow down' });
    const body = await readBody(req);
    const game = String(body.game || '');
    if (!GAMES.includes(game)) return json(res, 400, { error: 'bad game' });
    const [min, max] = SCORE_LIMITS[game];
    const score = Math.round(Number(body.score));
    if (!Number.isFinite(score) || score < min || score > max) return json(res, 400, { error: 'bad score' });
    const day = cleanDay(body.day);
    if (day !== utcToday() && day !== new Date(Date.now() - 86400000).toISOString().slice(0, 10)) {
      return json(res, 400, { error: 'bad day' });
    }
    const name = cleanName(body.name);
    scores[day] = scores[day] || {};
    scores[day][game] = scores[day][game] || [];
    scores[day][game].push({ name, score, ts: Date.now() });
    pruneOld();
    persistScores();
    return json(res, 200, { ok: true, rank: rankOf(day, game, name) });
  }

  if (path === '/api/leaderboard' && req.method === 'GET') {
    const game = url.searchParams.get('game') || '';
    if (!GAMES.includes(game)) return json(res, 400, { error: 'bad game' });
    const range = url.searchParams.get('range') || 'daily';
    if (!['daily', 'weekly', 'all'].includes(range)) return json(res, 400, { error: 'bad range' });
    const day = cleanDay(url.searchParams.get('day'));
    const cutoff = range === 'weekly' ? new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10) : day;

    // collect entries in range
    let entries = [];
    for (const [d, games] of Object.entries(scores)) {
      if (range === 'daily' && d !== day) continue;
      if (range === 'weekly' && d < cutoff) continue;
      for (const s of games[game] || []) entries.push({ ...s, day: d });
    }
    // per player: best score per day, summed across days; daily = single day so best overall
    const perPlayer = new Map();
    for (const s of entries) {
      const cur = perPlayer.get(s.name) || { name: s.name, score: 0 };
      if (range === 'daily') {
        cur.score = Math.max(cur.score, s.score);
      } else {
        const dayBest = cur['d' + s.day] || 0;
        if (s.score > dayBest) {
          cur.score += s.score - dayBest;
          cur['d' + s.day] = s.score;
        }
      }
      cur.ts = Math.min(cur.ts ?? Infinity, s.ts);
      perPlayer.set(s.name, cur);
    }
    const top = [...perPlayer.values()]
      .map(({ name, score, ts }) => ({ name, score, ts }))
      .sort((a, b) => b.score - a.score || a.ts - b.ts)
      .slice(0, 20);
    return json(res, 200, { day, game, range, top });
  }

  if (path === '/api/ads-config' && req.method === 'GET') {
    return json(res, 200, { config: adsConfig });
  }

  if (path === '/api/admin/login' && req.method === 'POST') {
    if (rateLimited(ip, 'login', 10, 300000)) return json(res, 429, { error: 'too many attempts' });
    const body = await readBody(req);
    const pw = String(body.password || '');
    const a = Buffer.from(pw), b = Buffer.from(ADMIN_PASSWORD);
    const ok = a.length === b.length && timingSafeEqual(a, b);
    if (!ok) return json(res, 401, { error: 'wrong password' });
    return json(res, 200, { token: sign('admin') });
  }

  // everything below requires auth
  if (!isAuthed(req)) return json(res, 401, { error: 'unauthorized' });

  if (path === '/api/admin/scores' && req.method === 'GET') {
    const day = cleanDay(url.searchParams.get('day'));
    return json(res, 200, { day, scores: scores[day] || {} });
  }

  if (path === '/api/admin/scores' && req.method === 'DELETE') {
    const day = cleanDay(url.searchParams.get('day'));
    delete scores[day];
    persistScores();
    return json(res, 200, { ok: true });
  }

  if (path === '/api/admin/ads-config' && req.method === 'GET') {
    return json(res, 200, { config: adsConfig });
  }

  if (path === '/api/admin/ads-config' && req.method === 'POST') {
    const body = await readBody(req);
    const cfg = body.config;
    if (typeof cfg !== 'object' || cfg == null) return json(res, 400, { error: 'bad config' });
    adsConfig = {
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
    await writeFile(join(DATA, 'ads.json'), JSON.stringify(adsConfig));
    return json(res, 200, { ok: true, config: adsConfig });
  }

  return json(res, 404, { error: 'not found' });
}

// ── static + server ───────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2'
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (url.pathname.startsWith('/api/')) {
      await handleApi(req, res, url);
      return;
    }
    let path = decodeURIComponent(url.pathname);
    if (path === '/') path = '/index.html';
    const file = normalize(join(ROOT, 'public', path));
    if (!file.startsWith(normalize(join(ROOT, 'public')))) throw new Error('forbidden');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': MIME[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch (err) {
    if (err.message === 'bad json' || err.message === 'too large') return json(res, 400, { error: err.message });
    try {
      const body = await readFile(join(ROOT, 'public', 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(body);
    } catch {
      res.writeHead(404); res.end('nope');
    }
  }
});

await loadState();
server.listen(PORT, () => console.log(`DOPAMINE running → http://localhost:${PORT}`));
