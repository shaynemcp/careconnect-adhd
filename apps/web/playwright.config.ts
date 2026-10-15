import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests (A11 Part 2): the critical user flows in Chromium, Firefox and
 * WebKit (Safari's engine), against the production build served by `vite preview`,
 * so the service worker and offline behavior are the real ones.
 *
 * Locally without Playwright's own browsers, run Chromium through installed Edge:
 *   PW_CHANNEL=msedge npx playwright test --project=chromium
 */
const PORT = 4173;

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
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], channel: process.env.PW_CHANNEL } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
