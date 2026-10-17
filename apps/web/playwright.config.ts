import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests (A11 Part 2): the critical user flows in Chromium, Firefox and
 * WebKit (Safari's engine), against the production build served by `vite preview`,
 * so the service worker and offline behavior are the real ones.
 *
 * Locally without Playwright's own browsers, run Chromium through installed Edge:
 *   PW_CHANNEL=msedge npx playwright test --project=chromium
 *
 * Under the GitHub Pages sub-path (the build and the server both use BASE_PATH):
 *   BASE_PATH=/careconnect-adhd/ npx playwright test
 * Against the deployed site, with no local server (A11 Part 3):
 *   E2E_BASE_URL=https://shaynemcp.github.io/careconnect-adhd/ npx playwright test
 *
 * Tests navigate with relative paths (page.goto('app/medications')), so the same tests run
 * at "/" and under a sub-path. The base URL must end in "/" for that to resolve.
 */
const PORT = 4173;
const BASE_PATH = `/${(process.env.BASE_PATH ?? '/').replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/');
const REMOTE = process.env.E2E_BASE_URL?.replace(/\/*$/, '/');

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: true,
  // Every test builds a fresh account and three browsers share one preview server;
  // more workers than this made Chromium time out on a laptop.
  workers: process.env.CI ? 2 : 4,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: REMOTE ?? `http://localhost:${PORT}${BASE_PATH}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: REMOTE
    ? undefined
    : {
        // vite.config.ts reads BASE_PATH too, so the build and the server agree.
        command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
        url: `http://localhost:${PORT}${BASE_PATH}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
