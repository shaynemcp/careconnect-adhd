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
| Final evaluation of the final build (2026-11-03) | Lighthouse 12.6.1 accessibility 100 on 14 screens in mobile and desktop modes; axe-core 4.10.3, 0 violations on 15 screens at 1280 and 320 px | [`web-final-2026-11-03/`](web-final-2026-11-03/README.md) |
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

- The final evaluation ran on the production build served locally, not on the hosted site. The hosted site is deployed from the same `dev` code.
- The saved axe screenshots in [`axe/`](axe/) were taken on the Electron desktop build. For the web app, see [`web-final-2026-11-03/`](web-final-2026-11-03/README.md), jest-axe and the CI job.
- The hosted web app has a short NVDA recording (11/2/2026) rather than a full manual pass. The
  desktop VoiceOver report and its 11/3/2026 retest cover the same components.
- The final evaluation found three problems that automated scores do not show: badge text running into the next word (#52), focus falling to the page body after a delete on the Manage screens, and the bottom navigation covering focus. The [web VPAT](SWEN661_F26_Team5_VPAT_Web_Final_v2.0.pdf) lists them.
- Lighthouse and axe cannot judge everything. Contrast over gradients (landing hero) was
  checked by hand at 6.55:1 to 8.74:1 (see `axe/README.md`).
