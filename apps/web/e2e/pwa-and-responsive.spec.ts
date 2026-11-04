import { expect, test } from '@playwright/test';
import { signUpAs } from './helpers';

// PWA (offline) and responsive behavior at the assignment's three widths.

test('offline: after one online visit, Medicines still opens and the offline notice shows', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Service-worker offline control is reliable in Playwright only on Chromium');
  await signUpAs(page, 'patient');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload(); // now controlled by the service worker
  await context.setOffline(true);
  await page.goto('app/medications');
  await expect(page.getByRole('heading', { name: 'Medicines', level: 1 })).toBeVisible();
  // A page loaded while offline does not always see navigator.onLine === false in headless
  // CI Chromium, so drop the connection again with the page open: that fires the real
  // `offline` event the notice listens for. (Load-while-offline is covered in pwaSeo.test.tsx.)
  await context.setOffline(false);
  await context.setOffline(true);
  await expect(page.getByRole('status').filter({ hasText: "You're offline." })).toBeVisible();
  await context.setOffline(false);
});

for (const [label, width, height] of [
  ['mobile', 375, 812],
  ['tablet', 768, 1024],
  ['desktop', 1440, 900],
] as const) {
  test(`${label} ${width}px: no horizontal scroll, and navigation fits the width`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await signUpAs(page, 'patient');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    await expect(nav.getByRole('link', { name: /Medicines/ })).toBeVisible();
    // Touch targets: every main navigation link is at least 44 x 44 px.
    for (const box of await nav.getByRole('link').evaluateAll((els) =>
      els.map((e) => e.getBoundingClientRect()).map((r) => ({ w: r.width, h: r.height })),
    )) {
      expect(box.w).toBeGreaterThanOrEqual(44);
      expect(box.h).toBeGreaterThanOrEqual(44);
    }
  });
}
