// Offline check for the PWA: first visit online, then go offline and open screens never visited.
// usage (after npm run build && npm run preview): node scripts/offline-check.mjs http://localhost:5288
import { chromium } from 'playwright';

const BASE = process.argv[2];
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const failed = [];
page.on('response', (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${new URL(r.url()).pathname}`); });

await page.goto(BASE + '/', { waitUntil: 'networkidle' });
await page.evaluate(async () => {
  await navigator.serviceWorker.ready;
  await new Promise((r) => setTimeout(r, 2500));
  localStorage.setItem('careconnect_session', JSON.stringify({ user: { id: 'off', name: 'Offline Test', email: 'off@example.test' }, role: 'patient' }));
});
await page.reload({ waitUntil: 'networkidle' }); // page is now controlled by the service worker
console.log('before offline:', JSON.stringify(await page.evaluate(async () => {
  const shell = await caches.open('careconnect-shell-v3');
  const cached = (await shell.keys()).map((r) => new URL(r.url).pathname);
  const manifest = await (await fetch('/asset-manifest.json')).json();
  return { controlled: !!navigator.serviceWorker.controller, cached: cached.length, missing: manifest.filter((u) => !cached.includes(u)).length };
})));
await ctx.setOffline(true);
for (const path of ['/app', '/app/medications', '/app/appointments', '/app/contacts']) {
  failed.length = 0;
  await page.goto(BASE + path, { waitUntil: 'load' }).catch((e) => failed.push(String(e).slice(0, 80)));
  await page.waitForTimeout(1500);
  const h1 = await page.locator('h1').first().textContent({ timeout: 3000 }).catch(() => null);
  console.log(`${path.padEnd(20)} h1=${JSON.stringify(h1)} ${failed.length ? 'errors: ' + failed.join(', ') : 'ok'}`);
}
await browser.close();
