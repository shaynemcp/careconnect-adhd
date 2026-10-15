import { expect, test, type Page } from '@playwright/test';
import { signUpAs } from './helpers';

// A11 Part 1, code quality: no console errors or uncaught exceptions on the main screens.

const PATIENT_SCREENS = ['app', 'app/schedule', 'app/medications', 'app/appointments', 'app/memories', 'app/contacts'];
const CAREGIVER_SCREENS = ['app', 'app/activity', 'app/manage-medications', 'app/manage-appointments', 'app/caregiver'];

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (message) => {
    // A failed load is checked below, where we can see what failed.
    if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) {
      errors.push(`console: ${message.text()}`);
    }
  });
  // Any script, style, image or data file that fails is an error. The page document itself is
  // not: GitHub Pages answers a deep link like /app/medications with 404.html and status 404,
  // which is how the app boots there (vite.config.ts), and the browser logs that status.
  page.on('response', (response) => {
    if (response.status() >= 400 && response.request().resourceType() !== 'document') {
      errors.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });
  page.on('pageerror', (error) => errors.push(`uncaught: ${error.message}`));
  return errors;
}

async function visitAll(page: Page, paths: string[]) {
  for (const path of paths) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    // Let the screen finish loading its chunks before leaving it. Leaving mid-load makes
    // Firefox log "A ServiceWorker intercepted the request and encountered an unexpected
    // error" for the abandoned requests: noise from the test's speed, not an app error.
    await page.waitForLoadState('networkidle');
  }
}

test('public pages log no errors', async ({ page }) => {
  const errors = collectErrors(page);
  for (const path of ['', 'signin', 'signup']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await page.waitForLoadState('networkidle');
  }
  expect(errors).toEqual([]);
});

test('care recipient screens log no errors', async ({ page }) => {
  const errors = collectErrors(page);
  await signUpAs(page, 'patient');
  await visitAll(page, PATIENT_SCREENS);
  expect(errors).toEqual([]);
});

test('caregiver screens log no errors', async ({ page }) => {
  const errors = collectErrors(page);
  await signUpAs(page, 'caregiver');
  await visitAll(page, CAREGIVER_SCREENS);
  expect(errors).toEqual([]);
});
