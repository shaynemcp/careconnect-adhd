# Mobile Accessibility Audit — React Native (TalkBack focus)

**Assignment:** 6 — Mobile Accessibility & UI Testing (Week 6)
**App:** `apps/react-mobile`
**Owner:** Quinton Coleman (charter focus area: *Testing and coverage · TalkBack (React Native)*)
**Date:** 2026-09-22 (updated 2026-09-23 — finding 5 closed, see its row below)
**Feeds into:** the mobile VPAT (v0.2, in review) and the three issues Shayne filed from it — #27, #28, #29.

## Method — read this before the findings

Everything below comes from a **source-level accessibility review plus automated
Jest/React Native Testing Library assertions**, not a live TalkBack session on an
Android device or emulator. I didn't have one available for this pass. Concretely,
that means:

- Every fix here is verified by (a) reading the actual accessibility props RN emits
  and how they compose (does an `accessible={true}` ancestor swallow a child's role
  and state? does a `Pressable` wrapper have its own label, or is it relying on a
  child's?), and (b) a Jest/RTL test asserting the resulting `accessibilityRole` /
  `accessibilityLabel` / `accessibilityState` / `accessibilityLiveRegion` props are
  what they should be.
- **What that can't catch:** RNTL's renderer builds the same React element tree a
  real app would, but it does not simulate the native accessibility-tree merging
  that `accessible={true}` triggers on-device. That's exactly the bug class most of
  the fixes below are — so, notably, `getByRole('switch')` in the *old* switch-row
  tests passed even though the switches were genuinely unreachable on a real
  device (see finding 3). A green Jest suite was never going to catch this one;
  only reading the actual prop tree, or an on-device pass, would. The three Maestro
  flows added under `apps/react-mobile/e2e/` are a step in that direction — they
  drive the app through its real accessibility tree — but Maestro taps by selector,
  it doesn't turn TalkBack on and listen, so it can't confirm what actually gets
  *announced* either.
- Per `docs/ACCESSIBILITY.md`'s own status definition, none of the rows below are
  "Verified" yet — that requires a tool **and** a hand pass. This document is the
  "Implemented, needs a hand pass" half. **A real TalkBack walkthrough on a device
  or emulator (Assignment 6's actual instructions) is still owed**, ideally by
  whoever picks up the VPAT row, or me in a follow-up session with device access.

## Findings and fixes

| # | Finding | Where | Status | Verified on-device? |
|---|---|---|---|---|
| 1 | Sign-in reads "Continue" before the role question that decides what it does (WCAG 1.3.2, 3.3.2) | `SignInScreen.tsx` | **Fixed** — role choice moved above both Continue buttons | No — needs TalkBack pass |
| 2 | Undo confirmation auto-dismissed on a fixed 10s timer, faster than a screen-reader/switch-control user can reach it; no explicit Close control (WCAG 2.2.1) | `UndoSnackbar.tsx`, `types.ts`, `careDataStore.ts` (port of Flutter's #18 fix) | **Fixed** — no auto-dismiss timer on the undo offer; explicit Close button; failed-undo now shows a fallback message instead of silently vanishing | No — needs TalkBack pass, esp. confirming the live-region announcement actually fires |
| 3 | Three settings switches sit inside a `accessible accessibilityLabel="…"` parent `View`, which merges the whole row into one opaque node and removes the `Switch` from the focus-navigation tree entirely — this is a cross-platform RN behavior, not VoiceOver-specific, so it affects TalkBack the same way | `AppSettingsScreen.tsx` (Demo clock), `CaregiverAccessScreen.tsx` (Share with…), `NotificationsSettingsScreen.tsx` (Daily digest, Overdue alerts) | **Fixed** — removed the merging wrapper; label/role/state now live on each `Switch` directly, which also happened to remove a duplicated "Always on" announcement on the Overdue alerts row | No — this is the finding most worth confirming by hand (§Method): the old code *looked* fine in Jest |
| 4 | Read-only "Date & time" field's `Pressable` wrapper has `accessibilityRole="button"` but no `accessibilityLabel` of its own, so TalkBack announces a bare "button" | `CcTextField.tsx` (shared — fixes every read-only field, e.g. `AppointmentFormScreen`) | **Fixed** — wrapper now carries the same computed label (title + error) the inner field already had | No |
| 5 | iOS has no equivalent of `accessibilityLiveRegion` (Android-only) — form errors and snackbar text aren't actively announced to VoiceOver | `UndoSnackbar.tsx` (this pass); `Field`-style error text is still open | **Fixed for the snackbar** — `core/utils/announce.ts` adds `announceAfterDelay`, a single platform-gated call site: iOS calls `AccessibilityInfo.announceForAccessibilityWithOptions` (`{ queue: true }`), Android is a no-op since its live region already speaks the change. `SnackbarHost` calls it from an effect keyed on each new snackbar (`data/announcements.ts` builds the spoken text so the test asserting it and the component announcing it can't drift apart). Form-error text elsewhere is **not** covered by this pass — narrower than #4's original scope, re-opened as a follow-up. | No — needs a VoiceOver pass confirming the announcement is actually heard, not just called |
| 6 | Two interactive elements measure ~36×36px, short of the team's 44px target (still clears WCAG's 24px minimum) | Remove-time icon in `MedicationFormScreen.tsx` (20pt icon + 8pt hitSlop); Undo button in `UndoSnackbar.tsx` | **Fixed** — the Undo button was already brought up to 44×44 as a side effect of finding 2's rewrite (`actionButton`/`closeButton` styles, real layout size rather than `hitSlop`, now apply to both its buttons); the remove-time icon gets an explicit `minWidth`/`minHeight: TapTarget.minimum` style, `hitSlop` kept as extra margin on top | No |

Finding 5 above is now fixed for the one place this pass targeted (the undo
snackbar); the wider "every form error, too" scope #4 originally asked for is
still open and would need its own pass over `Field`-style error text.

## Tests added / changed

- `SignInScreen.test.tsx` — a reading-order assertion (pre-order index of the role
  group vs. both Continue buttons in the render tree) so finding 1 can't regress
  silently.
- `UndoSnackbar.test.tsx` (new, then extended to close finding 5) — no file
  existed for this component before. Covers: no auto-dismiss timer on the undo
  offer, the Close control, Undo success and fallback-on-failure (including the
  async case), the Android live-region prop, and — added for finding 5 — that
  each new snackbar is announced exactly once on iOS (naming the Undo action
  when there is one), that Android stays silent (the live region already
  speaks it there), and that pressing Undo itself doesn't trigger a second,
  unrequested announcement. The store `SnackbarHost` reads is module-level
  (by design, so `showUndoSnackbar` can be called from outside a component),
  so `beforeEach` now resets it explicitly — same pattern already used for
  `useSessionStore`/`useSettingsStore` in `sessionAndSettings.test.ts` —
  otherwise a snackbar left over from one test (or its Undo handler's result
  still resolving as a microtask when the test ended) was bleeding into the
  next test's initial render.
- `CcTextField.test.tsx` (new) — the read-only wrapper's accessible name, with and
  without an error.
- `careDataStore.test.ts` / `models.test.ts` — updated for the removed
  `undoableUntil` time gate: undo now succeeds well past the old 10s mark, fails
  only once already used, and a stray `undoableUntil` key in old persisted data is
  ignored rather than crashing hydration.
- `MedicationFormScreen.test.tsx` — a new test for finding 6: asserts the
  remove-time icon's own style resolves to a ≥44×44 box, then exercises the
  control end to end (press it, confirm the time is actually removed).

## Coverage

Before → after this pass (`apps/react-mobile/coverage/coverage-summary.json`,
regenerated in this commit); the "after" column now includes finding 5's
`core/utils/announce.ts` and `data/announcements.ts`, both at 100%:

| Metric | Before | After | Gate (`jest.config.js`) |
|---|---|---|---|
| Statements | 81.45% | 85.35% | ≥60% |
| Branches | 69.36% | 71.10% | ≥60% |
| Functions | 81.00% | 85.42% | ≥60% |
| Lines | 83.04% | 86.04% | ≥60% |

`npx tsc --noEmit`, `npx eslint .`, and `npx jest --coverage` all pass clean
(30 suites, 215 tests) as of this commit.

## E2E (Maestro)

Added `apps/react-mobile/e2e/` (`docs/build-plan.md`'s Phase 5 deliverable — "E2E
mobile tests (Maestro or Detox) under `apps/mobile-*/e2e/`"): three flows covering
the sign-in role order, the undo offer's Close/Undo controls, and each settings
switch being individually tappable by its own accessible id rather than by hoping
a tap on the row lands on the control inside. See `apps/react-mobile/e2e/README.md`
for what each flow does and doesn't prove, prerequisites, and how to run them.

## CI

Added `.github/workflows/react-mobile.yml` — `apps/react-mobile` had no dedicated
workflow before this (`docs/build-plan.md`'s Phase 4 already promised one). Three
jobs:

- **`quality`** (blocks every PR touching `apps/react-mobile/**`): lint, typecheck,
  `npx jest --coverage --ci`. Coverage enforcement is `jest.config.js`'s existing
  60% `coverageThreshold`, not a separate script, so a regression fails the step
  directly. Uploads the HTML coverage report as a build artifact.
- **`bundle`** (blocks every PR, runs after `quality`): an advisory `expo-doctor`
  check (`continue-on-error`, since two of its checks call external services that
  can flake for reasons unrelated to the diff) plus `expo export --platform
  android`, a smoke test that the app's whole import graph still bundles for a
  device — something the Jest suite alone can't confirm. Uploads the bundle as a
  build artifact.
- **`e2e`** (label-gated, not PR-blocking): runs the three Maestro flows above
  against a booted Android emulator, only when a PR carries the `run-e2e` label
  (or via manual `workflow_dispatch`) — same reasoning `docs/TESTING.md` already
  gives for the web app's nightly/`run-e2e` Playwright job, only more so, since an
  emulator boot is heavier than a browser. Needs `macos-latest` runners for
  hardware-accelerated virtualization; `ubuntu-latest` can't boot the emulator.

**Same caveat as everything else in this doc:** this workflow was authored and
code-reviewed against the repo's existing `ci.yml`/`flutter.yml` patterns, but not
actually run — I have no way to trigger GitHub Actions from this environment.
Whoever merges it should fire a `workflow_dispatch` run once, expect the `bundle`
and `e2e` jobs in particular to need a round of iteration (an Expo/Android export
and an emulator boot in CI are exactly the kind of thing that needs one real run
to shake out), and add the `run-e2e` label to a PR to confirm that gate fires
correctly.

## Next steps

1. **The actual TalkBack pass.** Everything above is a code-level fix; Assignment
   6 asks for a real VoiceOver/TalkBack walkthrough with findings recorded per
   `docs/TESTING.md`'s "Every UI pull request" checklist. I don't have Android
   tooling in this environment — needs picking up with a device or emulator.
2. Finding 5's wider scope — iOS live-region announcements for form-error text,
   not just the undo snackbar — is still open; Shayne's lane per the charter.
3. Update `docs/ACCESSIBILITY.md` §2/§4 status columns once the on-device pass
   happens — right now they still mostly read "Not started," which understates
   what's fixed here but shouldn't be bumped to "Verified" without the hand pass.
4. Trigger the new `.github/workflows/react-mobile.yml` once by hand (see
   §CI above) and confirm the `bundle` and `e2e` jobs actually run clean — both
   are wired up but unverified.
