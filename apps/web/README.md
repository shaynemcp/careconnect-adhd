# CareConnect web app (`apps/web`)

The responsive React web app: a daily companion for a care recipient and their caregiver.
It is a Progressive Web App (installable, works offline) built to WCAG 2.2 AA.

- **Live site:** https://shaynemcp.github.io/careconnect-adhd/ (published from `dev`; see
  [Deployment](#deployment))
- **Stack:** React 19, React Router 7, TypeScript 5 (strict), Vite 5, Tailwind CSS 3
- **State:** React Context (`src/auth/AuthContext.tsx` for the session,
  `src/context/AppContext.tsx` for medicines, appointments and the schedule), stored in
  `localStorage`. There is no backend; accounts are a mock that lives in the browser.
- **Tests:** Jest and React Testing Library (unit, component and integration), Playwright
  (end-to-end in Chromium, Firefox and WebKit), jest-axe for accessibility

The rest of the monorepo (Flutter, React Native, Electron) is described in the
[root README](../../README.md).

## Contents

- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Scripts](#scripts)
- [How the app is put together](#how-the-app-is-put-together)
- [Vite configuration](#vite-configuration)
- [Testing](#testing)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

## Quick start

Requires Node 22.14 or newer and npm 10 or newer (`.nvmrc` at the repo root). Install once
from the **repo root**; npm workspaces install the web app and the shared packages together.

```bash
npm install
```

```bash
npm run dev:web
```

The dev server is at http://localhost:5173. Sign up with any name, email and password: the
account is stored only in this browser.

To try the production build, including the service worker and offline mode:

```bash
npm run build --workspace @careconnect/web && npm run preview --workspace @careconnect/web
```

That serves `dist/` at http://localhost:4173.

## Environment variables

Nothing is required: without a `.env` the app runs fully on local mock data.

| Variable | Used by | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Landing-page chat assistant | Supabase project URL. Without it, the assistant answers from its built-in replies. |
| `VITE_SUPABASE_ANON_KEY` | Landing-page chat assistant | Public anon key (Row-Level Security protects the data). |
| `ANTHROPIC_API_KEY` | Supabase edge function only | **Server side. Never prefix it with `VITE_`**: Vite bundles every `VITE_` variable into the browser code. |
| `BASE_PATH` | Build | The folder the site is served from. `/` by default; `/careconnect-adhd/` for GitHub Pages. |
| `SITE_URL` | Build | The public URL. Turns on `sitemap.xml` and absolute share-image links. |

Copy the template at the repo root and fill in only what you need:

```bash
cp .env.example .env
```

`.env` is gitignored. For the deployed site, the two `VITE_SUPABASE_*` values are GitHub
Actions **variables** (Settings → Secrets and variables → Actions → Variables), not secrets,
because they end up in public browser code anyway.

## Scripts

Run these from the repo root with `--workspace @careconnect/web` (or from `apps/web` without it).

| Script | What it does |
| --- | --- |
| `dev` | Vite dev server with hot reload (port 5173) |
| `build` | Production build into `dist/` |
| `preview` | Serves `dist/` (port 4173) |
| `test` | Jest with coverage; fails under the coverage gate (see [Testing](#testing)) |
| `test:e2e` | Playwright end-to-end tests in Chromium, Firefox and WebKit (builds and serves the app itself) |
| `lint` | ESLint (0 warnings expected) |
| `typecheck` | `tsc --noEmit` in strict mode |
| `check:contrast` | Checks every text and UI colour pair against WCAG 2.2 AA, including High Contrast mode |
| `analyze` | Builds, then writes the bundle-size report to `docs/web/bundle-report.md` |
| `screenshots` | Captures the README screenshots into `docs/screenshots/` |

The repo root also has `npm run dev:web`, `npm run build:web` and `npm run test:e2e`.

## How the app is put together

```
src/
  App.tsx              Route tree, route guards, lazy-loaded screens, error boundaries
  main.tsx             Entry point: offline notice, app, install prompt, service worker
  auth/                Mock sign-up and sign-in (localStorage) and the AuthContext
  context/             AppContext: medicines, appointments, schedule, activity log
  components/          Layout, Button, Field, ConfirmDialog, ErrorBoundary, ChatBot, ...
  pages/               One file per screen
  hooks/               useDocumentTitle, usePageDescription, useNoIndex
  config/              Build-time values (base path, chat endpoint), kept apart so Jest can stub them
  pwa/                 Service-worker registration
  utils/               Dates, responsive images
public/
  sw.js                Service worker (offline app shell, runtime caching)
  manifest.webmanifest PWA manifest (relative URLs, so it works at / and under a sub-path)
e2e/                   Playwright tests
scripts/               Contrast check, bundle report, screenshots
```

**Routing.** Public pages are `/`, `/signin` and `/signup`. After sign-in, `/role` asks which
person is using the app, and everything else is nested under `/app/*` inside one layout. Route
guards in `components/ProtectedRoute.tsx` send signed-out visitors to the landing page, people
who haven't picked a role to `/role`, and signed-in visitors past the sign-in pages. Each `/app` screen is its own lazily loaded chunk, so the landing page doesn't
download the whole app. Deep links work: opening `/app/medications` directly lands on Medicines,
locally and on GitHub Pages.

**Errors.** `components/ErrorBoundary.tsx` catches a screen that fails to render, most often a
chunk that didn't load after a new deploy. It shows "Something went wrong" with Reload and Home
buttons, announces it to screen readers and moves focus to it. Moving to another screen clears
it. A second boundary wraps the whole route tree.

**Offline.** `public/sw.js` precaches the app shell and every route chunk (listed by the build
in `asset-manifest.json`). After one online visit, every screen opens offline and the offline
notice explains what still works.

## Vite configuration

[`vite.config.ts`](vite.config.ts) adds three things to the standard React setup:

1. **`base` from `BASE_PATH`.** Vite prefixes every built asset URL with it. The router
   (`config/basePath.ts`) and the service worker (which reads its own scope) use the same
   value, so one build works under `/careconnect-adhd/`.
2. **A `careconnect-site-files` plugin** that writes, at build time:
   - `asset-manifest.json`: every JS and CSS file, so the service worker can cache route chunks
     that `index.html` doesn't name;
   - `robots.txt`: public pages allowed, `/app` and `/role` disallowed;
   - `sitemap.xml` and absolute `og:image` / `og:url` links, only when `SITE_URL` is set;
   - `404.html`, a copy of `index.html`. GitHub Pages has no rewrite rules: it serves
     `404.html` for any path it doesn't know, which boots the app, and the router then opens the
     right screen.
3. **`optimizeDeps.exclude: ['lucide-react']`**, so the dev server doesn't pre-bundle the icon set.

Code splitting comes from `React.lazy` in `App.tsx`. Images on Memories are WebP with a `srcSet`
(`utils/responsiveImage.ts`).

## Testing

```bash
npm test --workspace @careconnect/web
```

Jest prints a coverage summary and writes the HTML report to `coverage/lcov-report/index.html`.
The whole app is measured (`collectCoverageFrom` in `jest.config.cjs`). The build fails below
75% lines, statements and functions, or 70% branches.

End-to-end tests are in `e2e/`:
- sign up, sign in, mark a medicine taken, add an appointment;
- the keyboard skip link and offline mode;
- no horizontal scroll at 375, 768 and 1440 px;
- no console errors on any main screen.

```bash
npx playwright install chromium firefox webkit
```

```bash
npm run test:e2e
```

Useful variations, run from `apps/web`:

| Command | Runs the E2E tests |
| --- | --- |
| `PW_CHANNEL=msedge npx playwright test --project=chromium` | with installed Edge, without Playwright's Chromium |
| `BASE_PATH=/careconnect-adhd/ npx playwright test` | against a build under the GitHub Pages sub-path |
| `E2E_BASE_URL=https://shaynemcp.github.io/careconnect-adhd/ npx playwright test` | against the live site, with no local server |

CI (`.github/workflows/ci.yml`) runs lint, typecheck, Jest, the contrast check, the build,
axe and Lighthouse on every pull request into `dev` and `main`. The full three-browser E2E runs
nightly (`nightly-e2e.yml`) and can be started by hand.

## Deployment

The site is on **GitHub Pages**, built and published by
[`.github/workflows/deploy-web.yml`](../../.github/workflows/deploy-web.yml):

1. **Trigger:** a push to `dev` that changes `apps/web`, `packages/` or the lockfile, or
   *Run workflow* on the Actions tab.
2. **Build:** `npm ci`, then `npm run build:web` with `BASE_PATH` and `SITE_URL` taken from the
   Pages settings, and the `VITE_SUPABASE_*` repository variables.
3. **Publish:** the `dist/` folder is uploaded and deployed to the `github-pages` environment.
4. **Check:** the Chromium E2E suite runs against the published URL. A failure there means the
   live site is broken even though the build passed.

**One-time setup** (a repo admin): Settings → Pages → Build and deployment → Source:
**GitHub Actions**. Optionally add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as
repository variables to turn on the live chat assistant.

**Custom domain** (optional): add it under Settings → Pages → Custom domain, and point a
`CNAME` DNS record at `shaynemcp.github.io`. The workflow picks up the new base path (`/`) and
URL automatically on the next run, with no code change.

**Run the same build by hand**, for example to check it before pushing:

```bash
BASE_PATH=/careconnect-adhd/ SITE_URL=https://shaynemcp.github.io/careconnect-adhd npm run build:web
```

Any static host works the same way: Netlify or Vercel can serve `apps/web/dist` at the root
(no `BASE_PATH`), with a rewrite of all paths to `/index.html`.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| A screen shows "Something went wrong" right after a deploy | The old page asked for a chunk the new deploy replaced. Choose **Reload the page**. |
| Old content keeps showing after a deploy | The service worker serves its cache first, then updates it. Reload once more, or in DevTools → Application → Service workers choose *Unregister*, then reload. |
| `npm run dev` shows no offline support | The service worker is registered only in production builds. Use `build` and `preview`. |
| Blank page on GitHub Pages, or assets 404 | The build was made without `BASE_PATH`. Build with `BASE_PATH=/careconnect-adhd/` (the workflow does this). |
| On Windows Git Bash, `BASE_PATH=/careconnect-adhd/` becomes a `C:/Program Files/Git/...` path | Prefix the command with `MSYS_NO_PATHCONV=1`, or use PowerShell. |
| Direct link to `/app/...` returns a 404 status | Expected on GitHub Pages: the page is `404.html`, which runs the app. The browser shows the right screen; only the status code differs. |
| `npm run test:e2e` says a browser is missing | Run `npx playwright install chromium firefox webkit` in `apps/web`, or use installed Edge: `PW_CHANNEL=msedge npx playwright test --project=chromium`. |
| Port 4173 is already in use | Another `vite preview` is running. Stop it, or Playwright reuses it locally (`reuseExistingServer`). |
| Jest fails with "coverage threshold not met" | New code needs tests. The HTML report (`coverage/lcov-report/index.html`) marks the uncovered lines. |
| The chat assistant gives only short scripted answers | `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not set. That's expected locally. |
