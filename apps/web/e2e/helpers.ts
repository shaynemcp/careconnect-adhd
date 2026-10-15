import { expect, type Page } from '@playwright/test';

/** A fresh account per test: the demo app keeps accounts in this browser's localStorage. */
export function newUser(tag: string) {
  const id = `${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  return { name: 'Margaret Test', email: `${id}@example.test`, password: 'e2e-password' };
}

/** Sign up through the real form, then pick a role. Ends on the app's first screen. */
export async function signUpAs(page: Page, role: 'patient' | 'caregiver') {
  const user = newUser(role);
  await page.goto('signup');
  await page.getByRole('textbox', { name: /^Your name/ }).fill(user.name);
  await page.getByRole('textbox', { name: /^Email address/ }).fill(user.email);
  await page.getByLabel(/^Password/).fill(user.password);
  await page.getByLabel(/^Confirm password/).fill(user.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/role$/);
  await page
    .getByRole('button', { name: role === 'patient' ? /I am the Care Recipient/ : /I am the Caregiver/ })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  return user;
}
