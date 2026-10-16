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
  const fields = [
    [page.getByRole('textbox', { name: /^Your name/ }), user.name],
    [page.getByRole('textbox', { name: /^Email address/ }), user.email],
    [page.getByLabel(/^Password/), user.password],
    [page.getByLabel(/^Confirm password/), user.password],
  ] as const;
  // Fill until every field holds its value. Firefox occasionally lost a field filled this fast,
  // so the form failed validation and stayed on /signup (seen once in #90's review).
  await expect(async () => {
    for (const [field, value] of fields) {
      if ((await field.inputValue()) !== value) await field.fill(value);
    }
    for (const [field, value] of fields) await expect(field).toHaveValue(value, { timeout: 500 });
  }).toPass({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Create account' }).click();
  try {
    await expect(page).toHaveURL(/\/role$/, { timeout: 10_000 });
  } catch (error) {
    // Say why sign-up didn't move on: the form's own error messages, not just the URL.
    const alerts = await page.getByRole('alert').allInnerTexts();
    throw new Error(`Sign-up stayed on ${page.url()}; on-page alerts: ${JSON.stringify(alerts)}`, { cause: error });
  }
  await page
    .getByRole('button', { name: role === 'patient' ? /I am the Care Recipient/ : /I am the Caregiver/ })
    .click();
  await expect(page).toHaveURL(/\/app$/);
  return user;
}
