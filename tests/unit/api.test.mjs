// API tests — spawns the server, exercises leaderboard + admin endpoints.
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const PORT = 4599;
const BASE = `http://localhost:${PORT}`;
let server;
let adminToken;

before(async () => {
  server = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT, ADMIN_PASSWORD: 'test-pass-123' },
    stdio: 'pipe'
  });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('server timeout')), 8000);
    server.stdout.on('data', d => { if (String(d).includes('running')) { clearTimeout(t); resolve(); } });
    server.on('exit', c => reject(new Error('server died: ' + c)));
  });
  // hermetic start: clear today's scores (data/ dir may hold leftovers from other runs)
  const login = await post('/api/admin/login', { password: 'test-pass-123' });
  adminToken = (await login.json()).token;
  const day = new Date().toISOString().slice(0, 10);
  await fetch(`${BASE}/api/admin/scores?day=${day}`, {
    method: 'DELETE', headers: { Authorization: 'Bearer ' + adminToken }
  });
});

after(async () => { server?.kill(); });

const post = (path, body, headers = {}) =>
  fetch(BASE + path, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

const get = (path, headers = {}) => fetch(BASE + path, { headers });

describe('leaderboard API', () => {
  test('submit score → rank returned, leaderboard sorted', async () => {
    const day = new Date().toISOString().slice(0, 10);
    const r1 = await post('/api/score', { game: 'reel', name: 'Alpha', score: 5, day });
    assert.equal(r1.status, 200);
    assert.equal((await r1.json()).rank, 1);

    await post('/api/score', { game: 'reel', name: 'Beta', score: 3, day });
    await post('/api/score', { game: 'reel', name: 'Gamma', score: 4, day });

    const lb = await (await get(`/api/leaderboard?game=reel&day=${day}`)).json();
    assert.deepEqual(lb.top.map(t => t.name), ['Alpha', 'Gamma', 'Beta']);
    assert.deepEqual(lb.top.map(t => t.score), [5, 4, 3]);
  });

  test('same player twice keeps best rank', async () => {
    const day = new Date().toISOString().slice(0, 10);
    const r = await post('/api/score', { game: 'reel', name: 'Beta', score: 5, day });
    assert.equal((await r.json()).rank, 1); // tied with Alpha → 0 higher → rank 1
  });

  test('rejects bad game / bad score / bad day', async () => {
    const day = new Date().toISOString().slice(0, 10);
    assert.equal((await post('/api/score', { game: 'hack', name: 'x', score: 1, day })).status, 400);
    assert.equal((await post('/api/score', { game: 'reel', name: 'x', score: 999, day })).status, 400);
    assert.equal((await post('/api/score', { game: 'reel', name: 'x', score: 1, day: '2001-01-01' })).status, 400);
    assert.equal((await post('/api/score', { game: 'reel', name: 'x', score: 'abc', day })).status, 400);
  });

  test('names are sanitized', async () => {
    const day = new Date().toISOString().slice(0, 10);
    await post('/api/score', { game: 'hl', name: '<script>alert(1)</script>', score: 12, day });
    const lb = await (await get(`/api/leaderboard?game=hl&day=${day}`)).json();
    const stored = lb.top.find(t => t.name.includes('script'));
    if (stored) assert.doesNotMatch(stored.name, /[<>]/);
  });

  test('leaderboard rejects unknown game', async () => {
    assert.equal((await get('/api/leaderboard?game=nope')).status, 400);
  });
});

describe('admin API', () => {
  let token;

  test('wrong password → 401', async () => {
    const r = await post('/api/admin/login', { password: 'wrong' });
    assert.equal(r.status, 401);
  });

  test('correct password → token works', async () => {
    const r = await post('/api/admin/login', { password: 'test-pass-123' });
    assert.equal(r.status, 200);
    token = (await r.json()).token;
    const scores = await get('/api/admin/scores', { Authorization: 'Bearer ' + token });
    assert.equal(scores.status, 200);
  });

  test('protected endpoints reject missing token', async () => {
    assert.equal((await get('/api/admin/scores')).status, 401);
    const r = await fetch(BASE + '/api/admin/ads-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: { enabled: false } })
    });
    assert.equal(r.status, 401);
  });

  test('ads-config: save → public GET returns it', async () => {
    const cfg = {
      enabled: true,
      slots: { top: true, footer: false, inGame: true },
      interstitialEvery: 4,
      clientId: 'ca-pub-TEST',
      slotIds: { top: '111', footer: '222', inGame: '333' },
      houseText: 'test house ad'
    };
    const save = await post('/api/admin/ads-config', { config: cfg }, { Authorization: 'Bearer ' + token });
    assert.equal(save.status, 200);

    const pub = await (await get('/api/ads-config')).json();
    assert.equal(pub.config.clientId, 'ca-pub-TEST');
    assert.equal(pub.config.slots.footer, false);
    assert.equal(pub.config.interstitialEvery, 4);
  });

  test('clear today scores', async () => {
    const day = new Date().toISOString().slice(0, 10);
    const r = await fetch(`${BASE}/api/admin/scores?day=${day}`, {
      method: 'DELETE', headers: { Authorization: 'Bearer ' + token }
    });
    assert.equal(r.status, 200);
    const lb = await (await get(`/api/leaderboard?game=reel&day=${day}`)).json();
    assert.equal(lb.top.length, 0);
  });
});
