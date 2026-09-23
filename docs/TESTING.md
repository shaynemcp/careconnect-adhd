# Testing Strategy

**Owner:** QA / Testing Lead on rotation (Weeks 1–2: Quinton Coleman)
**Coverage gate:** 60–75%, enforced in CI
**Accessibility gate:** axe-core (no critical/serious) + Lighthouse a11y ≥ 95

---

## Layers

| Layer | Tool | Runs | Blocks a PR? |
| --- | --- | --- | --- |
| Unit / component | Jest + React Testing Library | Every PR | ✅ Yes |
| Type safety | `tsc --noEmit` (strict) | Every PR | ✅ Yes |
| Lint | ESLint + `eslint-plugin-jsx-a11y` | Every PR | ✅ Yes |
| Contrast | `check:contrast` in `@careconnect/design-tokens` | Every PR | ✅ Yes |
| Accessibility (automated) | axe-core against the web build | Every PR | ✅ Yes |
| Accessibility (budget) | Lighthouse CI | Every PR | ✅ Yes |
| End-to-end | Playwright | Nightly + `run-e2e` label | ❌ No |
| Accessibility (manual) | Keyboard + screen reader | Every UI PR, by hand | ✅ Yes — reviewer sign-off |

E2E is deliberately off the PR-blocking path: browser E2E is the slowest and
flakiest layer, and a three-person team cannot afford a red build that means
nothing. It runs nightly, and on demand via the `run-e2e` label.

> **Not yet configured.** Jest and Playwright are not installed. Today CI runs
> lint, typecheck, contrast, and build. Add the test layers as the assignments
> that require them land, and update this table when they do.

---

## What to test

**Unit and component.** Anything with a branch: dose status transitions, undo
windows, reminder scheduling, date formatting, form validation. Render components
and assert on **accessible queries** — `getByRole`, `getByLabelText` — not on class
names or test IDs. A test that passes when the accessible name disappears is not
testing the thing that matters.

**Do not test:** framework behavior, third-party libraries, or static token values.

## Accessibility testing

Automated tools catch roughly a third of real barriers. The manual pass is not
optional.

### Every UI pull request

1. **Keyboard only.** Unplug the mouse. Reach and operate every control. Focus
   order is logical, focus is always visible, nothing traps.
2. **Screen reader.** VoiceOver (`Cmd+F5`, macOS) or NVDA (Windows). Every control
   announces a meaningful name, role, and state; status changes are announced.
3. **Reflow.** 320px viewport, no horizontal scrolling.
4. **Zoom.** 200%, nothing clipped or overlapping.
5. **Reduced motion.** Enable the OS setting; confirm animation is suppressed.
6. **axe DevTools.** Zero violations on the changed screens.

Record the result in the PR template's accessibility section. "Looks fine" is not
a result.

### Cognitive-load testing *(the row the instructor's table calls "Testing")*

Automated tools cannot detect "got lost" or "felt overwhelmed" — the specific
failure this product exists to prevent. Each assignment's mock-user session must
include at least one participant working through the ADHD patient persona, with:

- Task completion without assistance
- Time to identify "what do I do next" from a cold open
- Points where the participant hesitated, backtracked, or asked what to do
- Any moment they had to remember something from a previous screen

Findings go in `docs/demos/` alongside the walkthrough video for that week.

---

## Conventions

- Test files sit beside their subject: `Button.tsx` → `Button.test.tsx`
- One behavior per test; the name states the behavior, not the function name
- No snapshot tests for anything a human should be reading — snapshots pass while
  the accessible name silently disappears

---

## Flutter mobile app (`apps/mobile-flutter`)

The Flutter app has its own toolchain and its own test pyramid, described in
full in [`apps/mobile-flutter/docs/TEST-PLAN.md`](../apps/mobile-flutter/docs/TEST-PLAN.md).

| Layer | Tool | Runs | Blocks a PR? |
| --- | --- | --- | --- |
| Static analysis | `flutter analyze --fatal-infos` + `dart format` | Every PR | ✅ Yes |
| Unit | `flutter test test/unit` | Every PR | ✅ Yes |
| Widget (incl. a11y guidelines) | `flutter test test/widget` | Every PR | ✅ Yes |
| Coverage gate | `flutter test --coverage` + lcov, **≥ 60 %** | Every PR | ✅ Yes |
| Integration | `flutter test integration_test -d <device>` | On demand / before demo | ❌ No |
| Manual a11y | TalkBack / VoiceOver, 200 % text, reduce motion | Every UI PR | ✅ Reviewer sign-off |

Workflow: `.github/workflows/flutter.yml`. The HTML coverage report is committed
under `apps/mobile-flutter/coverage/html/` because Assignment 4 requires it.

---

## React Native mobile app (`apps/react-mobile`)

| Layer | Tool | Runs | Blocks a PR? |
| --- | --- | --- | --- |
| Unit / component | Jest + React Native Testing Library | Every PR | ✅ Yes |
| Type safety | `tsc --noEmit` | Every PR | ✅ Yes |
| Lint | ESLint (`eslint-plugin-react-native`) | Every PR | ✅ Yes |
| Coverage gate | `jest --coverage`, **≥ 60 %** (`jest.config.js`) | Every PR | ✅ Yes |
| E2E | Maestro flows under `apps/react-mobile/e2e/` | On demand (not yet wired into CI) | ❌ No |
| Manual a11y | TalkBack (Android) / VoiceOver (iOS) | Every UI PR | ✅ Reviewer sign-off |

E2E follows the same reasoning as the web app's Playwright layer above, more so:
a Maestro run needs a booted emulator, which is even less something a three-person
team wants gating every PR. See `apps/react-mobile/e2e/README.md` for what the
flows cover and how to run them, and `docs/accessibility/mobile-audit.md` for the
Week 6 TalkBack-focused pass (source-level fixes + Jest assertions; an actual
on-device TalkBack walkthrough is still owed — that doc says so plainly).

The HTML coverage report is committed under `apps/react-mobile/coverage/` for the
same reason as Flutter's.
