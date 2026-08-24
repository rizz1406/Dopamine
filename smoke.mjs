const BASE = 'https://dopaminegames.pages.dev';
const results = [];
const check = (name, ok, extra = '') => { results.push(`${ok ? '✅' : '❌'} ${name} ${extra}`); return ok; };

const home = await fetch(BASE + '/');
check('homepage 200', home.status === 200);
const reel = await fetch(BASE + '/reel');
check('/reel SPA fallback', reel.status === 200 && (await reel.text()).includes('DOPAMINE'));
const css = await fetch(BASE + '/css/style.css');
check('static asset', css.status === 200);
const lb = await fetch(BASE + '/api/leaderboard?game=reel');
check('leaderboard API', lb.status === 200 && Array.isArray((await lb.json()).top));

await fetch(BASE + '/api/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game: 'reel', name: 'DeployBot', score: 5 }) });
await fetch(BASE + '/api/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ game: 'reel', name: 'DeployBot', score: 3 }) });
const lb2 = await (await fetch(BASE + '/api/leaderboard?game=reel')).json();
const dup = lb2.top.filter(t => t.name === 'DeployBot');
check('submit + dedup', dup.length === 1 && dup[0].score === 5);

const bad = await fetch(BASE + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'wrong' }) });
check('admin rejects wrong pw', bad.status === 401);
const login = await fetch(BASE + '/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: 'Dopamine-Rush-2026!' }) });
check('admin login', login.status === 200);
const token = (await login.json()).token;
const today = new Date().toISOString().slice(0, 10);
const clr = await fetch(`${BASE}/api/admin/scores?day=${today}`, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
check('clear test scores', clr.status === 200);

for (const p of ['/sw.js', '/site.webmanifest', '/robots.txt', '/sitemap.xml', '/og.png']) {
  check(p + ' 200', (await fetch(BASE + p)).status === 200);
}

console.log(results.join('\n'));
const failed = results.filter(r => r.startsWith('❌')).length;
console.log(failed === 0 ? '\n🎉 PRODUCTION PAGES DEPLOY VERIFIED' : `\n${failed} FAILURES`);
process.exit(failed ? 1 : 0);
