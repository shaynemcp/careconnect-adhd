# Mobile Accessibility Audit — React Native (TalkBack focus)

**Assignment:** 6 — Mobile Accessibility & UI Testing (Week 6)
**App:** `apps/react-mobile`
**Owner:** Quinton Coleman (charter focus area: *Testing and coverage · TalkBack (React Native)*)
**Date:** 2026-09-22
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
| 5 | iOS has no equivalent of `accessibilityLiveRegion` (Android-only) — form errors and snackbar text aren't actively announced to VoiceOver | throughout — `UndoSnackbar.tsx`, `Field`-style error text | **Not done this pass** — this is specifically an iOS/VoiceOver gap (Shayne's focus area per the charter), and I can't verify an `AccessibilityInfo.announceForAccessibility` call without a simulator. Tracked under #4. | — |
| 6 | Two interactive elements measure ~36×36px, short of the team's 44px target (still clears WCAG's 24px minimum) | Not re-located this pass | **Not done** — needs the specific elements identified again; flagging so it isn't lost | — |

Findings 5 and 6 are carried over from #4 as still-open; I didn't want to mark
that whole issue closed when only its TalkBack-relevant items (3, and the same
underlying bug as 2) are actually fixed.

## Tests added / changed

- `SignInScreen.test.tsx` — a reading-order assertion (pre-order index of the role
  group vs. both Continue buttons in the render tree) so finding 1 can't regress
  silently.
- `UndoSnackbar.test.tsx` (new) — no file existed for this component before. Covers:
  no auto-dismiss timer on the undo offer, the Close control, Undo success and
  fallback-on-failure (including the async case), and the live-region prop.
- `CcTextField.test.tsx` (new) — the read-only wrapper's accessible name, with and
  without an error.
- `careDataStore.test.ts` / `models.test.ts` — updated for the removed
  `undoableUntil` time gate: undo now succeeds well past the old 10s mark, fails
  only once already used, and a stray `undoableUntil` key in old persisted data is
  ignored rather than crashing hydration.

## Coverage

Before → after this pass (`apps/react-mobile/coverage/coverage-summary.json`,
regenerated in this commit):

| Metric | Before | After | Gate (`jest.config.js`) |
|---|---|---|---|
| Statements | 81.45% | 84.92% | ≥60% |
| Branches | 69.36% | 70.81% | ≥60% |
| Functions | 81.00% | 84.50% | ≥60% |
| Lines | 83.04% | 85.76% | ≥60% |

`npx tsc --noEmit`, `npx eslint .`, and `npx jest --coverage` all pass clean
(30 suites, 208 tests) as of this commit.

## E2E (Maestro)

Added `apps/react-mobile/e2e/` (`docs/build-plan.md`'s Phase 5 deliverable — "E2E
mobile tests (Maestro or Detox) under `apps/mobile-*/e2e/`"): three flows covering
the sign-in role order, the undo offer's Close/Undo controls, and each settings
switch being individually tappable by its own accessible id rather than by hoping
a tap on the row lands on the control inside. See `apps/react-mobile/e2e/README.md`
for what each flow does and doesn't prove, prerequisites, and how to run them —
none of this repo's CI runs them yet (mirrors the web app's Playwright layer being
nightly/`run-e2e`-only per `docs/TESTING.md`, only more so for something that needs
a booted emulator).

## Next steps

1. **The actual TalkBack pass.** Everything above is a code-level fix; Assignment
   6 asks for a real VoiceOver/TalkBack walkthrough with findings recorded per
   `docs/TESTING.md`'s "Every UI pull request" checklist. I don't have Android
   tooling in this environment — needs picking up with a device or emulator.
2. Findings 5 and 6 above, still open.
3. Update `docs/ACCESSIBILITY.md` §2/§4 status columns once the on-device pass
   happens — right now they still mostly read "Not started," which understates
   what's fixed here but shouldn't be bumped to "Verified" without the hand pass.
4. Wire `apps/react-mobile/e2e/` into CI behind a `run-e2e` label once an Android
   emulator step exists for this repo (matches the reasoning already written down
   for the web Playwright suite).
