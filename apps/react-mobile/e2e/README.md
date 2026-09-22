# E2E (Maestro)

Assignment 6 / Week 6 deliverable (`docs/build-plan.md` Phase 5): mobile E2E tests
under `apps/mobile-*/e2e/`. These are [Maestro](https://maestro.mobile.dev) flows —
plain-YAML UI scripts that drive a real build of the app on a simulator, emulator,
or device, the same way `apps/mobile-flutter` uses its own integration-test layer.

They are **not** a substitute for the manual TalkBack/VoiceOver pass required by
`docs/TESTING.md` §"Accessibility testing" — Maestro drives the app through its
accessibility tree (so it can only reach an element a screen reader could also
reach), but it doesn't turn TalkBack on and listen to what gets spoken. Treat a
green flow as "the interaction still works, structurally" and the manual pass as
the thing that actually tells you what gets announced.

## Prerequisites

- [Maestro CLI](https://maestro.mobile.dev/getting-started/installing-maestro) installed
  (`curl -Ls "https://get.maestro.mobile.dev" | bash`).
- A booted Android emulator (for TalkBack-relevant flows) or iOS simulator, with a
  dev build of the app installed and reachable at `appId: test.careconnect.mobile`
  (see `app.json`). `npx expo run:android` / `run:ios` from this directory builds one.
- The app's demo data reset to a known state. Every flow's first real step turns on
  **Demo clock** in App Settings (`AppSettingsScreen.tsx`), which freezes the clock
  and resets the sample data — the same mechanism the app itself offers for getting
  back to a reproducible state, so these flows don't depend on wall-clock time or
  on what a previous run left behind.

## Running

```sh
maestro test e2e/sign-in-role-order.yaml
maestro test e2e/undo-persists.yaml
maestro test e2e/settings-switches-reachable.yaml

# or the whole directory
maestro test e2e/
```

`maestro studio` is the fastest way to find/confirm a selector while editing these.

## Flows

| File | Covers | Issue |
| --- | --- | --- |
| `sign-in-role-order.yaml` | The "I am a…" role choice is on screen and actually drives sign-in, before/without needing either Continue button to be reached first | #27 |
| `undo-persists.yaml` | Marking a dose taken offers Undo with an explicit, individually-reachable Close control, and both work correctly (the *duration* claim — "still there well past 10s" — is checked precisely with fake timers in `UndoSnackbar.test.tsx` instead; Maestro has no unconditional sleep, by design) | #18, #28 |
| `settings-switches-reachable.yaml` | Each settings switch is individually tappable by its own accessible name (not swallowed into a merged row) | #4 (item 1) |

## CI

Not wired into CI yet — see `docs/TESTING.md`: E2E is nightly / `run-e2e`-label only
for the web app's Playwright suite, and the same reasoning applies here even more
strongly (an emulator step is heavier than a browser). Follow-up: add a
`run-e2e`-gated job that boots an Android emulator and runs this directory.
