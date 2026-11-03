# Web app audit (Assignment 10)

Evidence that the web app (`apps/web`) meets WCAG 2.2 AA, with what was and was not checked.
The desktop app (the same web code in Electron) has its own audit in
[`desktop-keyboard-checklist.md`](desktop-keyboard-checklist.md) and
[`desktop-screen-reader-report.md`](desktop-screen-reader-report.md); the mobile apps are in
[`mobile-audit.md`](mobile-audit.md).

- **Live site:** https://shaynemcp.github.io/careconnect-adhd/ (published from `dev`)
- **Stack under test:** React 19, Vite 5, TypeScript 5, Tailwind 3

## Summary

| Check | Result | Evidence |
| --- | --- | --- |
| Lighthouse (mobile, `dev` at `944fc3d`, Lighthouse 12.6.1, 2026-10-15) | Performance 97, Accessibility 100, Best Practices 100, SEO 100 | [`docs/web/lighthouse/`](../web/lighthouse/) (HTML report and score screenshot) |
| Lighthouse + axe in CI | Runs on every PR; green on PRs #96 and #97 | `Accessibility (axe + Lighthouse)` job in `.github/workflows/ci.yml` |
| Component accessibility tests | jest-axe assertions in the Jest suite | `apps/web/src/__tests__/` |
| End-to-end flows | Sign up, sign in, mark a dose taken, caregiver adds an appointment, keyboard-only skip link, offline mode | `apps/web/e2e/critical-flows.spec.ts` |
| Console errors | Public, care recipient and caregiver screens log none | `apps/web/e2e/console.spec.ts` |
| Browsers | Chromium, Firefox, WebKit | `apps/web/playwright.config.ts` |
| Responsive reflow | No horizontal scroll and navigation fits at 375, 768 and 1440 px | `apps/web/e2e/pwa-and-responsive.spec.ts`, screenshots in [`docs/web/responsive/`](../web/responsive/) |
| Installable PWA and offline | Medicines opens offline after one visit; the offline notice shows | `apps/web/e2e/pwa-and-responsive.spec.ts` |
| SEO and public pages | Pages return status 200; descriptions, robots.txt and sitemap present | `apps/web/e2e/seo.spec.ts` |
| Unit and integration coverage | Gate at 75% for statements, branches, functions and lines | `apps/web/jest.config.cjs` |
| Bundle size | First load 100.5 kB gzip; 23 route chunks load on demand | [`docs/web/bundle-report.md`](../web/bundle-report.md) |

## Re-verifying

From the repo root, after `npm install`:

```bash
npm run lint
npm run typecheck
npm test --workspace @careconnect/web
npm run test:e2e
npm run build:web
```

## Known limits

Listed so the audit does not overclaim:

- The Lighthouse report on file is from `dev` at `944fc3d`. Later commits (error boundary,
  Pages deploy, portrait-lock fix, header contrast fix) have not been re-run into a saved
  report; the CI job runs on every PR.
- The axe results in [`axe/`](axe/) were run on the Electron desktop build, not on the
  hosted web app. For the web app, axe coverage comes from jest-axe and the CI job.
- No manual screen-reader pass (NVDA, VoiceOver, TalkBack) has been recorded for the hosted
  web app. The desktop VoiceOver report covers the same components.
- Lighthouse and axe cannot judge everything. Contrast over gradients (landing hero) was
  checked by hand at 6.55:1 to 8.74:1 (see `axe/README.md`).
