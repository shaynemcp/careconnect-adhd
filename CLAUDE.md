# CareConnect: working notes for Claude Code

CareConnect is an npm-workspaces monorepo: one product across three platform shells,
built to WCAG 2.2 AA. Team E-Echo (Team 5), SWEN 661.

Read [CONTRIBUTING.md](CONTRIBUTING.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
and [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md) before a first change here.
`docs/ARCHITECTURE.md` still describes an earlier shape (web on React 18, mobile as an
undecided placeholder); the table below reflects what is actually in the repo now.

## Repository architecture

Package manager: npm workspaces (Node >=22.14, npm >=10).

| Workspace | Stack | Status |
| --- | --- | --- |
| `apps/web` | React 19 + Vite 5 + TypeScript 5.5 | Done |
| `apps/mobile-flutter` | Flutter, Dart ^3.12, Riverpod 3.4, go_router 18 | Week 4, submitted |
| `apps/react-mobile` | Expo ~57 / React Native ~0.86 + TypeScript 6 | Week 5, submitted |
| `apps/desktop` | Electron 39 + electron-builder | Not started (target OS still open, see [ADR 0002](docs/decisions/0002-desktop-os-target.md)) |

**Known gap:** `apps/react-mobile` is not in the root `workspaces` array in
`package.json` and CI (`.github/workflows/ci.yml`) never touches it, so `npm run
<cmd> -w apps/react-mobile` will not work until that's fixed. This is tracked as
[#6](https://github.com/shaynemcp/careconnect-adhd/issues/6); don't route around it
by inventing a parallel scoping convention, fix #6 first.

## Command scoping

- `apps/web`: `npm run <cmd> --workspace @careconnect/web` (matches the root
  `package.json` scripts). Use the `@careconnect/*` package name, not the path,
  for consistency with the existing `dev:web` / `build:web` scripts.
- `apps/react-mobile`: `npm run <cmd> --workspace @careconnect/mobile` once #6 is
  fixed. Until then, `cd apps/react-mobile && npm run <cmd>` directly.
- `apps/mobile-flutter`: `flutter <cmd>` from inside `apps/mobile-flutter/`.
- `apps/desktop`: plain Electron, run from inside `apps/desktop/`. Security baseline
  is already in place in `src/main.cjs` (`contextIsolation: true`, `nodeIntegration:
  false`, IPC through a `preload.js`). Keep it that way in any new window.

## State management and routing (Flutter)

The Flutter app uses manual `Notifier` / `NotifierProvider` classes (see
`lib/state/care_data_provider.dart`) and plain string routes with `GoRoute` (see
`lib/router/app_router.dart`), not the `@riverpod` code-generation syntax or
`go_router_builder` typed routes. Neither `riverpod_generator` nor
`go_router_builder` is a dependency.

Do not migrate existing providers or routes to the code-generated style as a side
effect of an unrelated change. Week 4's Flutter app is submitted, graded, and
sitting at 99.6% line coverage; a wholesale rewrite for a style change isn't
worth the diff. New code may use either style if there's a specific reason to, but
raise it with the team first rather than mixing conventions silently.

## Branching and PRs

Branch off **`dev`**, not `main`: `<name>/<short-feature-description>` (e.g.
`shayne/patient-medications`), PR into `dev`. `main` is protected (squash-only,
linear history, one approving review, CI must pass) and only takes merges from
`dev`. `CONTRIBUTING.md` and `docs/team-charter.md` both match this now.

Use the existing [.github/pull_request_template.md](.github/pull_request_template.md)
for every PR, and don't substitute a shorter template. It already encodes the accessibility
checklist correctly, including the SC 1.4.11 distinction the blanket "4.5:1
everywhere" rule misses: body text needs 4.5:1, but large text and UI components
(borders, focus rings, icons) only need 3:1. Get that distinction right. Treating
every ratio as a 4.5:1 requirement produces false failures on borders and focus
rings that are actually compliant, and see #14 for a case where the reverse
mistake, under-shooting 3:1, was the real bug.

Commit at least once per session; write subjects in the imperative ("Add undo to
dose actions," not "Added"); reference the issue when there is one (`Closes #14`).
Conventional Commits (`<type>(<scope>): <description>`) are not yet the project's
convention: recent history is plain imperative subjects, so don't switch to it
unilaterally on a single PR.

## Accessibility is a merge requirement, not a cleanup pass

WCAG 2.2 AA applies to every screen you touch, on every platform. When modifying UI
components, check semantic labels/roles, focus order, contrast (4.5:1 text, 3:1
large text/UI components), touch targets (24×24 CSS px minimum per SC 2.5.8; team
standard is 44×44), and screen-reader announcements before opening the PR, not
after review flags it. Use `context.ccColors` / the design-token contrast tests in
Flutter, and `npm run check:contrast` for web, rather than eyeballing it.

## Verification before committing

- Web: `npm run lint`, `npm run typecheck` (matches CI in `ci.yml`).
- react-mobile: run its Jest suite from `apps/react-mobile/`.
- Flutter: `dart format --output=none --set-exit-if-changed lib test
  integration_test`, then `flutter analyze --fatal-infos`, then `flutter test`
  (matches CI in `flutter.yml`).

Prefer completing and verifying one platform's change before moving to the next
rather than generating one large cross-platform diff. It's easier to review, and
it matches how this repo's CI is split (`ci.yml` for web, `flutter.yml` for Flutter).

## E2E (Maestro)

Maestro drives both the Flutter and Expo apps with one YAML-based tool (chosen over
Detox, which fights Expo). When a change affects a flow Maestro covers, update the
matching `.yaml` flow in the same PR rather than letting it drift.
