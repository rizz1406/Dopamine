import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const PORT = 4980;
const server = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT } });
await new Promise(r => server.stdout.on('data', d => String(d).includes('running') && r()));

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage();
page.on('pageerror', e => console.log('[pageerror]', e.message));
await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });

await page.click('a[href="/leaderboard"][data-nav]');
await page.waitForTimeout(800);
console.log('URL:', page.url());
console.log('title:', await page.title());
console.log('has lb-tabs:', await page.locator('.lb-tab').count());
console.log('view text starts:', (await page.locator('#view').textContent()).slice(0, 80));
await browser.close(); server.kill();
