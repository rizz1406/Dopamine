// DOPAMINE end-to-end suite — drives the real site in headless Chrome.
// Run: npm run test:e2e   (uses installed Chrome/Edge, no browser download)
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const PORT = 4999;
const BASE = `http://localhost:${PORT}`;
let server, browser, context, page;
const consoleErrors = [];

const CANDIDATE_CHROMES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);

const disableInterstitials = () => page.evaluate(() =>
  localStorage.setItem('dopamine:ads', JSON.stringify({ interstitialEvery: 0 })));

/** Handle the leaderboard name modal if it appears. */
async function ensureNamed(name = 'E2E Star') {
  const modal = page.locator('[data-test="name-modal"]');
  try {
    await modal.waitFor({ state: 'visible', timeout: 4000 });
  } catch { return; }
  await page.fill('[data-test="name-input"]', name);
  await page.click('[data-test="name-save"]');
  await modal.waitFor({ state: 'detached', timeout: 4000 });
}

/** Dismiss name modal without naming (for tests that don't care). */
async function skipNamed() {
  try {
    await page.locator('[data-test="name-modal"]').waitFor({ state: 'visible', timeout: 3000 });
    await page.click('[data-test="name-skip"]');
  } catch { /* not present */ }
}

before(async () => {
  server = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT },
    stdio: 'pipe'
  });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('server start timeout')), 8000);
    server.stdout.on('data', d => { if (String(d).includes('running')) { clearTimeout(t); resolve(); } });
    server.on('exit', code => reject(new Error('server died: ' + code)));
  });

  let exe = null;
  for (const c of CANDIDATE_CHROMES) { try { await import('node:fs/promises').then(fs => fs.access(c)); exe = c; break; } catch {} }
  browser = await chromium.launch({ executablePath: exe, headless: true });
  context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  page = await context.newPage();
  page.on('pageerror', e => consoleErrors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') consoleErrors.push('console: ' + m.text()); });
});

after(async () => {
  await browser?.close();
  server?.kill();
});

describe('DOPAMINE E2E', () => {

  test('hub loads with 9 game cards + puzzle #1 chip', async () => {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    assert.equal(await page.locator('.game-card').count(), 9);
    const dayChip = await page.locator('#day-chip').textContent();
    assert.match(dayChip, /^#\d[\d,]*$/, 'day chip shows puzzle number');
    assert.match(await page.locator('.hero p').textContent(), /Puzzle #\d+ · \w{3} \d+/);
    assert.match(await page.title(), /DOPAMINE/);
  });

  test('PWA: manifest, service worker, robots, sitemap, og image all live', async () => {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    for (const path of ['/site.webmanifest', '/robots.txt', '/sitemap.xml', '/og.png', '/icons/icon-192.png', '/icons/icon-512.png', '/sw.js']) {
      const res = await page.request.get(BASE + path);
      assert.equal(res.status(), 200, path + ' should exist');
    }
    const swReady = await page.evaluate(() =>
      Promise.race([
        navigator.serviceWorker.ready.then(() => true),
        new Promise(r => setTimeout(() => r(false), 8000))
      ]));
    assert.equal(swReady, true, 'service worker registered');
  });

  test('REEL: full perfect game → results, streak=1, share to WhatsApp/X/copy', async () => {
    await disableInterstitials();
    await page.locator('.game-card', { hasText: 'REEL' }).click();
    await assert.doesNotReject(() => page.waitForSelector('[data-test="clue"]'));

    for (let round = 0; round < 5; round++) {
      const correctTitle = await page.evaluate(async () => {
        const done = document.querySelectorAll('.p-dot.won, .p-dot.lost').length;
        const m = await import('./js/reel-logic.js');
        return m.buildDailyRounds()[done].movie.title;
      });
      await page.click(`[data-test="option"][data-title="${correctTitle.replace(/"/g, '&quot;')}"]`);
      await page.waitForSelector('[data-test="reveal"]');
      await page.click('[data-test="next-round"]');
    }
    await page.waitForSelector('[data-test="result"]');
    await ensureNamed('E2E Star');
    const grid = await page.locator('[data-test="result-grid"]').textContent();
    assert.match(grid, /^[🟩⬛🟨]+$/u);
    // streak chip counts up from 0 — wait for the animation to land
    await page.waitForFunction(() =>
      document.querySelector('[data-test="streak-final"]')?.textContent === '1', { timeout: 5000 });

    // share modal: brand SVG icons + app targets + clipboard
    await page.click('[data-test="share-btn"]');
    await page.waitForSelector('[data-test="share-apps"]');
    assert.equal(await page.locator('.share-chip svg').count(), 5, '5 brand SVG icons rendered');
    const wa = await page.locator('[data-test="share-whatsapp"]').getAttribute('href');
    assert.match(wa, /wa\.me\/\?text=/);
    assert.match(decodeURIComponent(wa), /REEL #\d+/);
    assert.match(await page.locator('[data-test="share-x"]').getAttribute('href'), /twitter\.com\/intent/);
    await page.click('[data-copy]');
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    assert.match(clip, /REEL #\d+/);
    assert.match(clip, /[🟩🟥]{5}/u);
    await page.click('[data-close]');
  });

  test('REEL: streak persists across reload (localStorage)', async () => {
    await page.goto(BASE + '/#/', { waitUntil: 'networkidle' });
    await assert.doesNotReject(() =>
      page.locator('.game-card', { hasText: 'REEL' }).locator('.streak-pill', { hasText: '1 streak' })
        .waitFor({ timeout: 3000 }));
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('dopamine:v1')).streaks.reel.current);
    assert.equal(stored, 1);
  });

  test('WORD GUESS: invalid word rejected, then correct answer wins', async () => {
    await disableInterstitials();
    await page.goto(BASE + '/#/word', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-test="board"]');

    const answer = await page.evaluate(async () => {
      const m = await import('./js/word-logic.js');
      return m.buildDailyAnswer();
    });

    const type = async (word) => {
      for (const ch of word) await page.click(`[data-test="key-${ch}"]`);
      await page.click('[data-test="key-ENTER"]');
    };

    // invalid word → toast + row NOT consumed (still 6 rows, row 0 current)
    await type('QWZXV');
    await assert.doesNotReject(() => page.locator('.toast', { hasText: 'not in our word list' }).waitFor({ timeout: 3000 }));
    assert.equal(await page.locator('#word-board .word-row:first-child [data-test="tile"].filled').count(), 5, 'letters still on row 0');
    for (let i = 0; i < 5; i++) await page.click('[data-test="key-BACK"]');

    // guess the answer directly → win
    await type(answer.toUpperCase());
    await page.waitForSelector('[data-test="result"]', { timeout: 10000 });
      const grid = await page.locator('[data-test="result-grid"]').textContent();
    assert.match(grid.replace(/<br>/g, ''), /^[🟩⬛🟨]+$/u);
    assert.match(await page.locator('[data-test="result-title"]').textContent(), /SORCERER|LEXICON|WIZARD|POET/);
    // streak chip counts up from 0 — wait for the animation to land
    await page.waitForFunction(() =>
      document.querySelector('[data-test="streak-final"]')?.textContent === '1', { timeout: 5000 });

    // leaderboard panel mounted with today's entries
    await assert.doesNotReject(() => page.locator('[data-test="lb-panel"]').waitFor({ timeout: 5000 }));
  });

  test('FLAG RUSH: 10 rounds answered correctly → 10/10', async () => {
    await disableInterstitials();
    await page.goto(BASE + '/#/flags', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-test="flag"]');

    for (let round = 0; round < 10; round++) {
      await page.waitForFunction(r =>
        document.querySelector('[data-test="round-label"]')?.textContent === `Flag ${r + 1} of 10`,
        round, { timeout: 8000 });
      await page.click('[data-test="flag-option"][data-correct="1"]');
      // reveal shows; next round renders ~1.15s later
      if (round < 9) await page.waitForTimeout(1400);
    }
    await page.waitForSelector('[data-test="result"]');
    assert.match(await page.locator('[data-test="result-title"]').textContent(), /10\/10/);
    assert.match(await page.locator('.hint-line').textContent(), /ROYALTY/);
    await skipNamed();
  });

  test('LEADERBOARD: page shows submitted names across tabs', async () => {
    await disableInterstitials();
    await page.goto(BASE + '/#/leaderboard', { waitUntil: 'networkidle' });
    // 'E2E Star' was saved during the WORD test → check the word tab
    await page.click('.lb-tab[data-game="word"]');
    await assert.doesNotReject(() =>
      page.locator('.lb-row', { hasText: 'E2E Star' }).first().waitFor({ timeout: 5000 }));
    // switch tabs without errors
    await page.click('.lb-tab[data-game="flags"]');
    await page.waitForTimeout(600);
    assert.ok((await page.locator('[data-test="lb-list"]').textContent()).length > 0);
  });

  test('SPEED RUSH: start, drive, eventually crash → result', async () => {
    await disableInterstitials();
    await page.goto(BASE + '/#/speed', { waitUntil: 'networkidle' });
    await page.click('[data-test="btn-start"]');
    // drive blind: stationary car gets hit by random-lane traffic eventually
    await page.waitForSelector('[data-test="result"]', { timeout: 45000 });
    const final = parseInt(await page.locator('[data-test="score-final"]').textContent(), 10);
    assert.ok(final >= 0, 'meters recorded: ' + final);
    await skipNamed();
  });

  test('SNAKE: start → wall hit → result', async () => {
    await disableInterstitials();
    await page.goto(BASE + '/#/snake', { waitUntil: 'networkidle' });
    await page.click('[data-test="btn-start"]');
    // snake starts moving right → deterministic wall death in ~1.5s
    await page.waitForSelector('[data-test="result"]', { timeout: 10000 });
    await skipNamed();
  });

  test('HIGHER OR LOWER: play until game over, result screen + replay', async () => {
    await disableInterstitials();
    await page.goto(BASE + '/#/', { waitUntil: 'networkidle' });
    await page.locator('.game-card', { hasText: 'HIGHER OR LOWER' }).click();
    await page.waitForSelector('[data-test="pick-higher"]');

    let clicks = 0;
    while (clicks < 40) {
      if ((await page.locator('[data-test="result"]').count()) > 0) break;
      try {
        await page.locator('[data-test="pick-higher"]:not([disabled])').click({ timeout: 2500 });
      } catch { continue; } // game-over window: buttons briefly disabled
      clicks++;
      await page.waitForTimeout(1200);
    }
    const result = page.locator('[data-test="result"]');
    assert.ok(await result.isVisible(), 'game over screen reached within 40 guesses');
    assert.ok(await page.locator('#share-hl').isVisible());
    assert.ok(await page.locator('#again-hl').isVisible());
    await skipNamed();

    await page.click('#again-hl');
    await page.waitForSelector('[data-test="pick-higher"]');
    assert.equal(await page.locator('[data-test="streak"]').textContent(), '0', 'new run starts at streak 0');
  });

  test('MEMORY: repeat 3 sequences, then fail → verdict + share', async () => {
    await disableInterstitials();
    await page.goto(BASE + '/#/memory', { waitUntil: 'networkidle' });
    await page.click('[data-test="start-btn"]');

    for (let level = 1; level <= 3; level++) {
      // wait for input phase (pads unlocked)
      await page.waitForFunction(() =>
        document.querySelectorAll('.mem-pad.locked').length === 0, { timeout: 15000 });
      const seq = (await page.locator('[data-test="seq"]').textContent()).split(',').filter(Boolean);
      assert.equal(seq.length, level, `sequence length matches level ${level}`);
      for (const idx of seq) {
        await page.click(`[data-test="pad-${idx}"]`);
        await page.waitForTimeout(120);
      }
      await page.waitForFunction(l =>
        parseInt(document.querySelector('[data-test="level"]').textContent) === l + 1,
        level, { timeout: 8000 });
    }
    // fail on purpose at level 4: wait for input phase, then click a wrong pad
    let failed = false;
    for (let attempt = 0; attempt < 5 && !failed; attempt++) {
      await page.waitForFunction(() =>
        document.querySelectorAll('.mem-pad.locked').length === 0, { timeout: 20000 });
      const seq = (await page.locator('[data-test="seq"]').textContent()).split(',').filter(Boolean).map(Number);
      if (seq.length !== 4) continue; // caught mid-transition — retry
      const bad = [0, 1, 2, 3].find(i => i !== seq[0]); // wrong at input position 0, always
      await page.click(`[data-test="pad-${bad}"]`);
      failed = true;
    }
    assert.ok(failed, 'managed to fail at level 4');
    await page.waitForSelector('[data-test="result"]', { timeout: 20000 });
    assert.match(await page.locator('[data-test="result-title"]').textContent(), /Level 4/);
    // level-final counts up from 0 — wait for the animation to land
    await page.waitForFunction(() =>
      document.querySelector('[data-test="level-final"]')?.textContent === '4', { timeout: 5000 });
    await skipNamed();
  });

  test('TIMELINE: 3 perfect rounds → TIME LORD verdict', async () => {
    await disableInterstitials();
    await page.goto(BASE + '/#/timeline', { waitUntil: 'networkidle' });

    for (let round = 0; round < 3; round++) {
      await page.waitForFunction(r =>
        document.querySelector('[data-test="round"]').textContent === `${r + 1}/3`, round, { timeout: 8000 });
      // click movies oldest-first using the years hidden in the DOM
      const cards = await page.locator('[data-test="tl-movie"]').evaluateAll(els =>
        els.map(el => ({ title: el.dataset.title, year: parseInt(el.dataset.year, 10) })));
      const ordered = cards.slice().sort((a, b) => a.year - b.year);
      for (const c of ordered) {
        await page.click(`[data-test="tl-movie"][data-title="${c.title.replace(/"/g, '&quot;')}"]`);
        await page.waitForTimeout(150);
      }
      if (round < 2) await page.waitForTimeout(1100); // round transition
    }
    await page.waitForSelector('[data-test="result"]');
    assert.match(await page.locator('[data-test="result-title"]').textContent(), /TIME LORD/);
    assert.equal(await page.locator('[data-test="rounds-final"]').textContent(), '3/3');
    await skipNamed();
  });

  test('REFLEX: 5 rounds measured → verdict screen', async () => {
    await disableInterstitials();
    await page.goto(BASE + '/#/reflex', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-test="zone"]');

    for (let i = 0; i < 5; i++) {
      await page.click('[data-test="zone"]');
      await page.waitForSelector('[data-test="go-signal"]', { timeout: 5000 });
      await page.click('[data-test="go-signal"]');
      await page.waitForSelector('[data-test="ms"]');
      if (i < 4) await page.click('[data-test="zone"]');
    }
    await page.click('[data-test="zone"]');
    await page.waitForSelector('[data-test="result"]');
    const avg = parseInt(await page.locator('[data-test="avg-final"]').textContent(), 10);
    assert.ok(avg > 30 && avg < 2000, 'avg ms plausible: ' + avg);
    assert.ok(await page.locator('#share-rx').isVisible());
    await skipNamed();
  });

  test('ADMIN: login, server-synced ads, interstitial fires, export', async () => {
    await page.goto(BASE + '/#/admin', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-test="admin-panel"]');

    // login as owner (server default password)
    await page.fill('[data-test="admin-pass"]', 'dopamine-admin');
    await page.click('[data-test="admin-login"]');
    await assert.doesNotReject(() => page.locator('[data-test="admin-logout"]').waitFor({ timeout: 5000 }));
    await assert.doesNotReject(() => page.locator('[data-test="scores-view"]').waitFor({ timeout: 5000 }));

    // hermetic reset: wipe any server-side ads config from previous runs
    await page.evaluate(async () => {
      const token = sessionStorage.getItem('dopamine:admin:token');
      await fetch('/api/admin/ads-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ config: { enabled: true, slots: { top: true, footer: true, inGame: true }, interstitialEvery: 0, clientId: '', slotIds: {}, houseText: '' } })
      });
      localStorage.removeItem('dopamine:ads');
    });
    await page.goto(BASE + '/#/admin', { waitUntil: 'networkidle' });

    // wrong password is rejected
    await page.click('[data-test="admin-logout"]');
    await page.fill('[data-test="admin-pass"]', 'wrong-password');
    await page.click('[data-test="admin-login"]');
    await assert.doesNotReject(() => page.locator('.toast', { hasText: 'wrong password' }).waitFor({ timeout: 3000 }));
    await page.fill('[data-test="admin-pass"]', 'dopamine-admin');
    await page.click('[data-test="admin-login"]');
    await page.locator('[data-test="admin-logout"]').waitFor({ timeout: 5000 });

    // master off → footer slot hides on hub
    await page.uncheck('[data-test="ads-enabled"]');
    await page.click('[data-test="ads-save"]');
    await page.goto(BASE + '/#/', { waitUntil: 'networkidle' });
    assert.equal(await page.locator('.ad-slot[data-ad="footer"]').evaluate(el => getComputedStyle(el).display), 'none');

    // back on: footer slot on, client id + interstitial every 1 → save to SERVER
    await page.goto(BASE + '/#/admin', { waitUntil: 'networkidle' });
    await page.check('[data-test="ads-enabled"]');
    await page.check('[data-test="slot-footer"]');
    await page.fill('[data-test="ads-client"]', 'ca-pub-TEST123456');
    await page.fill('[data-test="ads-inter"]', '1');
    await page.click('[data-test="ads-save"]');
    await page.goto(BASE + '/#/', { waitUntil: 'networkidle' });
    const footerText = await page.locator('.ad-slot[data-ad="footer"]').textContent();
    assert.match(footerText, /ca-pub-TEST123456/, 'slot shows configured client id');

    // server actually persisted it
    const serverCfg = await (await page.request.get(BASE + '/api/ads-config')).json();
    assert.equal(serverCfg.config.clientId, 'ca-pub-TEST123456');

    // interstitial appears on next game start
    await page.goto(BASE + '/#/higher-lower', { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-test="interstitial"]');
    await page.click('[data-continue]');
    await page.waitForSelector('[data-test="pick-higher"]');

    // export modal contains the AdSense snippet with the client id
    await page.goto(BASE + '/#/admin', { waitUntil: 'networkidle' });
    await page.click('[data-test="ads-export"]');
    await page.waitForSelector('[data-test="export-modal"]');
    const snippet = await page.locator('[data-test="snippet"]').textContent();
    assert.match(snippet, /adsbygoogle/);
    assert.match(snippet, /ca-pub-TEST123456/);
    await page.click('[data-copy]');

    // cleanup: reset server config to neutral + logout
    await page.evaluate(async () => {
      const token = sessionStorage.getItem('dopamine:admin:token');
      await fetch('/api/admin/ads-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ config: { enabled: true, slots: { top: true, footer: true, inGame: true }, interstitialEvery: 0, clientId: '', slotIds: {}, houseText: '' } })
      });
    });
    await page.click('[data-test="admin-logout"]').catch(() => {});
    await page.evaluate(() => localStorage.removeItem('dopamine:ads'));
  });

  test('mute toggle flips icon and persists', async () => {
    await page.goto(BASE + '/#/', { waitUntil: 'networkidle' });
    const btn = page.locator('#mute-btn');
    const before = await btn.textContent();
    await btn.click();
    const after = await btn.textContent();
    assert.notEqual(after, before);
    await page.reload({ waitUntil: 'networkidle' });
    assert.equal(await page.locator('#mute-btn').textContent(), after, 'muted state survives reload');
  });

  test('no uncaught page errors during entire session', () => {
    const fatal = consoleErrors.filter(e =>
      !e.includes('favicon') &&
      !e.includes('net::') &&
      !e.includes('fonts.g') &&
      !e.includes('401')); // expected: admin wrong-password test
    assert.deepEqual(fatal, [], 'unexpected errors: ' + fatal.join(' | '));
  });
});
