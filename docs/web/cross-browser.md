# Cross-browser testing (A12 Part 1)

Run on November 3, 2026, against the production build (`vite build` + `vite preview`), in GitHub Actions.
The `run-e2e` label on PR #100 started the job (CI run 41581855950, job "End-to-end (Playwright)").

## Results

| Browser | Engine tested | Result | Notes |
| --- | --- | --- | --- |
| Chrome | Chromium (Playwright) | 13 of 13 passed | Includes the offline service-worker test |
| Firefox | Firefox (Playwright) | 12 passed, 1 skipped | Console-error test on care-recipient screens passed on retry (flaky, not a failure). Offline test skipped by design (see below) |
| Safari | WebKit (Playwright, Safari's engine) | 11 passed, 2 skipped | Keyboard skip-link test and offline test skipped by design (see below) |
| Edge | Chromium (same engine as Chrome) | Covered by the Chromium run | Manual check: WAVE run on the signed-in dashboard in Microsoft Edge on 11/2/2026 reported 0 errors and 0 contrast errors |

Totals: 39 tests, 35 passed, 1 flaky (passed on retry), 3 skipped, 0 failed.

## What each browser ran

Every browser ran the same suite in `apps/web/e2e/`:

- Sign up, choose the care recipient role and land on today's Home
- Returning user signs in with the account they created
- Mark a medicine taken: the toggle reports pressed and the count drops
- Caregiver adds an appointment: an empty save shows errors, a filled form saves it
- Keyboard only: the skip link is the first Tab stop and moves focus to main
- Offline: after one online visit, Medicines still opens and the offline notice shows
- No horizontal scroll at 375px, 768px and 1440px
- No console errors on public, care-recipient and caregiver screens

## Known browser-specific issues

1. **Safari, keyboard skip link (test skipped in WebKit).** By default, Safari does not move focus to links with Tab. Option+Tab does, or users can turn on "Press Tab to highlight each item on a webpage" in Safari settings. This is browser behavior, not an app defect. The skip link works in Chromium and Firefox.
2. **Offline service worker (test skipped in Firefox and WebKit).** Playwright can only control service-worker offline mode reliably in Chromium. Offline support was checked in Chromium. Manual offline checks in Firefox and Safari are still to do.
3. **Firefox console test was flaky once.** The care-recipient screens test passed on its retry. No app error was reported. We will watch for it in later runs.

No critical cross-browser bugs were found, so no fixes were needed.

## Still to do by hand

- Real Safari on macOS: sign in, mark a dose, and Tab with Option held (Shayne's Mac).
- Offline check in Firefox and Safari.
