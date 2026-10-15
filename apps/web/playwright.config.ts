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
