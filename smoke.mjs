// Post-deploy smoke test against the LIVE deployment.
const BASE = 'https://dopamine.rizwanmirza95551.workers.dev';
const results = [];
const check = (name, ok, extra = '') => { results.push(`${ok ? '✅' : '❌'} ${name} ${extra}`); return ok; };

// 1. homepage
const home = await fetch(BASE + '/');
check('homepage 200', home.status === 200);
check('homepage is HTML', (home.headers.get('content-type') || '').includes('text/html'));

// 2. path route SPA fallback
const reel = await fetch(BASE + '/reel');
check('/reel SPA fallback 200', reel.status === 200 && (await reel.text()).includes('DOPAMINE'));

// 3. static asset
const css = await fetch(BASE + '/css/style.css');
check('static asset served', css.status === 200);

// 4. API: leaderboard empty
const lb = await fetch(BASE + '/api/leaderboard?game=reel');
const lbBody = await lb.json();
check('leaderboard API JSON', lb.status === 200 && Array.isArray(lbBody.top));

// 5. API: submit + dedup
await fetch(BASE + '/api/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game: 'reel', name: 'DeployBot', score: 5 }) });
await fetch(BASE + '/api/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game: 'reel', name: 'DeployBot', score: 3 }) });
const lb2 = await (await fetch(BASE + '/api/leaderboard?game=reel')).json();
const dup = lb2.top.filter(t => t.name === 'DeployBot');
check('score submit + dedup (1 row, best=5)', dup.length === 1 && dup[0].score === 5);

// 6. admin auth
const badLogin = await fetch(BASE + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'wrong' }) });
check('admin rejects wrong password', badLogin.status === 401);
const login = await fetch(BASE + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'Dopamine-Rush-2026!' }) });
check('admin login works', login.status === 200);

// 7. ads-config endpoint
const ads = await (await fetch(BASE + '/api/ads-config')).json();
check('ads-config endpoint', 'config' in ads);

// 8. PWA files
for (const p of ['/sw.js', '/site.webmanifest', '/robots.txt', '/sitemap.xml', '/og.png']) {
  const r = await fetch(BASE + p);
  check(p + ' 200', r.status === 200);
}

console.log(results.join('\n'));
const failed = results.filter(r => r.startsWith('❌')).length;
console.log(failed === 0 ? '\n🎉 ALL SMOKE TESTS PASSED' : `\n${failed} FAILURES`);
process.exit(failed === 0 ? 0 : 1);
