import { expect, test } from '@playwright/test';
import { signUpAs } from './helpers';

// The critical user flows for A11 Part 2, run in Chromium, Firefox and WebKit.

test('sign up, choose the care recipient role, and land on today\'s Home', async ({ page }) => {
  await signUpAs(page, 'patient');
  await expect(page).toHaveTitle('Home - CareConnect');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: /Call my caregiver/ })).toBeVisible();
});

test('a returning user signs in with the account they created', async ({ page }) => {
  const user = await signUpAs(page, 'patient');
  await page.getByRole('button', { name: /^Sign out/ }).click();
  await expect(page).toHaveURL(/\/$|\/signin$/);
  await page.goto('/signin');
  await page.getByRole('textbox', { name: /^Email address/ }).fill(user.email);
  await page.getByLabel(/^Password/).fill(user.password);
  await page.getByRole('button', { name: /^Sign in$/ }).click();
  await expect(page).toHaveURL(/\/(role|app)$/);
});

test('mark a medicine taken: the toggle reports pressed and the count drops', async ({ page }) => {
  await signUpAs(page, 'patient');
  await page.goto('/app/medications');
  const status = page.getByRole('status').filter({ hasText: /still to take today/ });
  const before = Number((await status.textContent())?.match(/\d+/)?.[0]);
  const toggle = page.getByRole('button', { name: / taken$/, pressed: false }).first();
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(status).toContainText(String(before - 1));
});

test('caregiver adds an appointment: empty save shows errors, a filled form saves it', async ({ page }) => {
  await signUpAs(page, 'caregiver');
  await page.goto('/app/manage-appointments');
  await page.getByRole('button', { name: /^Add appointment$/ }).first().click();
  const form = page.getByRole('region', { name: 'Add new appointment' });

  await form.getByRole('button', { name: /^Add appointment$/ }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Please fix the following before saving:' })).toBeVisible();

  const title = `E2E check-up ${Date.now()}`;
  await page.getByRole('textbox', { name: /^Appointment title/ }).fill(title);
  await page.getByLabel(/^Date/).fill('2030-01-15');
  await page.getByLabel(/^Time/).fill('10:30');
  await page.getByRole('combobox', { name: /^Location type/ }).selectOption({ index: 1 });
  await page.getByRole('textbox', { name: /^Location name/ }).fill('Main Street Clinic');
  await form.getByRole('button', { name: /^Add appointment$/ }).click();

  await expect(page.getByText(title)).toBeVisible();
});

test('keyboard only: the skip link is the first Tab stop and moves focus to main', async ({ page, browserName }) => {
  // Safari leaves links out of the Tab order unless "Press Tab to highlight each item" is on,
  // so this flow is checked in Chromium and Firefox.
  test.skip(browserName === 'webkit', 'Safari skips links on Tab by default');
  await signUpAs(page, 'patient');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: /Skip to main content/ });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main', { name: 'Main content' })).toBeFocused();
});
