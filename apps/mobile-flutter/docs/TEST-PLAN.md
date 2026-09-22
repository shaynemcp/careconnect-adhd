# CareConnect Mobile (Flutter) — Test Plan

| | |
| --- | --- |
| **Course** | SWEN 661 — User Interface Implementation (UMGC, Fall 2026) |
| **Team** | Team E-Echo (Team 5): Shayne McPherson, Abel Tabor, Quinton Coleman |
| **Assignment** | 4 — Flutter Mobile Implementation & Testing |
| **App under test** | `apps/mobile-flutter` (`careconnect_mobile` 0.4.0+4) |
| **Version** | 1.0 — 2026-09-06 |
| **Author** | Shayne McPherson (Technical Lead) |
| **Standard** | WCAG 2.2 Level AA + the ADHD cognitive-load constraint table from the Requirements Document |

---

## 1. Purpose and scope

This plan defines how the Assignment 4 Flutter implementation of the Week 3
Figma design is verified. It covers the eleven designed screens (plus the
medication detail screen added for navigation depth), the state layer, the
persistence layer, navigation, responsive layout, and accessibility.

**In scope**

- Unit tests for models, formatting, contrast maths, mock data, persistence,
  every Riverpod notifier and every derived selector, and the routing guard.
- Widget tests for every screen, every form step, bottom navigation, back
  handling, deep links, redirects, and the four automated accessibility
  guidelines shipped with `flutter_test`.
- One integration test that drives both role journeys on a device.
- Manual accessibility passes (TalkBack / VoiceOver, 200 % text, reduce
  motion) and a cognitive-load walkthrough with the ADHD persona.

**Out of scope this week**

- Real authentication, push notifications and phone calls (all are
  prototype stand-ins by design).
- Backend or network behaviour (the app is local-only this term).
- React Native (Assignments 5–6) and desktop (7–9).

## 2. Test strategy

| Layer | Tool | What it proves | Blocks a PR? |
| --- | --- | --- | --- |
| Static analysis | `flutter analyze --fatal-infos`, `dart format` | Zero analyzer issues, consistent style | ✅ |
| Unit | `flutter test test/unit` | Business logic in isolation with a fixed clock | ✅ |
| Widget | `flutter test test/widget` | Every screen renders the design content, responds to taps, persists, and meets the automated a11y guidelines | ✅ |
| Coverage | `flutter test --coverage` + `genhtml` | ≥ 60 % line coverage (Assignment 4 floor); team target ≥ 75 % | ✅ |
| Integration | `flutter test integration_test -d <device>` | Both journeys end to end on an emulator or phone | on demand |
| Manual a11y | TalkBack, VoiceOver, OS font scaling, reduce motion | The two-thirds of barriers automation cannot see | ✅ reviewer sign-off |
| Dependency scan | `dart pub outdated --show-all` (advisories) | No known vulnerable packages | ✅ |
| Security review | NIST SP 800-218 (SSDF) — see [SECURITY-REVIEW.md](SECURITY-REVIEW.md) | Secure coding, secure defaults, fail-secure behaviour | ✅ |

**Principles**

1. **Test what the user experiences.** Widget tests find text and buttons the
   way a person or screen reader would (`find.text`, tooltips, semantics),
   never internal class names.
2. **Time is injected.** Every test runs at the Figma instant, Tuesday
   August 25 2026 at 2:14 PM, through `clockProvider`, so "Due in 20 min" is
   deterministic.
3. **Accessibility is asserted, not eyeballed.** Every screen runs
   `androidTapTargetGuideline`, `iOSTapTargetGuideline`,
   `labeledTapTargetGuideline` and `textContrastGuideline`; the token file is
   re-verified against the WCAG relative-luminance formula.
4. **Fictional data only.** A test asserts the seed uses `example.test`
   emails and 555-01xx phone numbers so no real PHI can slip in.

## 3. Environment

| Item | Value |
| --- | --- |
| Flutter / Dart | see `README.md` → Prerequisites |
| State | `flutter_riverpod` |
| Routing | `go_router` (Navigator 2.0) |
| Persistence | `shared_preferences` (in-memory mock in tests) |
| Devices | Pixel 8 AVD (Android 16, API 36); iOS Simulator when Xcode is installed; macOS desktop and Chrome for quick checks |
| Viewports under test | Phone 412×915, phone landscape 915×412, tablet 834×1194 |

## 4. Test case catalogue

IDs map to files under `test/`. Every case below is automated unless marked
**M** (manual).

### 4.1 Unit — models and utilities

| ID | File | Case | Requirement / WCAG |
| --- | --- | --- | --- |
| U-01 | `models_test` | Medication, DoseEvent, Appointment, ActivityEntry, NotificationSettings, drafts, Session, people and CareData round-trip through JSON | persistence |
| U-02 | `models_test` | Dose is overdue only once its time passes; logged doses are never overdue; data saved with the old `undoableUntil` key still loads | US-01, undo |
| U-03 | `models_test` | Appointment summary line uses full-word dates and "Renee is taking me" / "Driving myself" | plain-language dates |
| U-04 | `date_formatting_test` | No formatter emits a numeric slash date; durations read "20 minutes" / "1 hour"; due labels: soon, later today, overdue | ADHD time-blindness rule |
| U-05 | `date_formatting_test` | Local time parsing rejects malformed and out-of-range values | error handling |
| U-06 | `contrast_test` | Every published ratio in the design doc reproduces within 0.05; every status/text colour passes 4.5:1 on background and surface in light and dark | SC 1.4.3, 1.4.11 |
| U-07 | `contrast_test` | White label text passes on every filled button colour; Neutral-500 is UI-only | SC 1.4.3 |
| U-08 | `mock_data_test` | Seed matches the Figma story; ids unique; data is fictional; seed is a pure function of the day | data guardrail |
| U-09 | `dose_status_test` | Status presentation: tone, icon, chip text and spoken text for due / overdue / taken / skipped / missed | SC 1.4.1 (not colour alone) |
| U-10 | `local_store_test` | Missing keys read null; corrupt JSON reads null instead of crashing; remove works; provider must be overridden | robustness |

### 4.2 Unit — state

| ID | File | Case | Requirement |
| --- | --- | --- | --- |
| U-11 | `care_data_notifier_test` | First launch seeds and persists; later launches reload; a new day generates due doses | persistence, attention recovery |
| U-12 | `care_data_notifier_test` | markTaken / skipDose record time and append a plain-language timeline entry attributed to the actor | US-01, US-22 |
| U-13 | `care_data_notifier_test` | Undo restores the dose and removes the entry; has no time limit (SC 2.2.1, #10); cannot run twice | undo over confirm |
| U-14 | `care_data_notifier_test` | ensureDosesForDay is idempotent and runs automatically on day change | scheduling |
| U-15 | `care_data_notifier_test` | Medications: add creates today's doses; schedule change regenerates only due doses; delete is soft and keeps history | data model |
| U-16 | `care_data_notifier_test` | Appointments add / update / delete; unknown ids ignored; resetDemoData | data model |
| U-17 | `care_selectors_test` | Next action = earliest upcoming dose, then most recent overdue, then none; later-today and overdue lists | US-01 |
| U-18 | `care_selectors_test` | Per-medication status prefers overdue → due → last logged; upcoming appointments drop the past; timeline groups by day and filters | lists |
| U-19 | `session_and_settings_test` | Session sign-in / sign-out persist; role defaults; app settings persist; demo clock freezes time; notification settings persist | SC 3.3.8, US-14 |
| U-20 | `drafts_test` | Drafts autosave after the debounce (Saving → Saved), restore on reload, keep interrupted work, prefill on edit, clear on save | SC 3.3.7 Redundant Entry |
| U-21 | `redirects_test` | Signed-out → sign-in; signed-in → role home; roles cannot cross | navigation guard |

### 4.3 Widget — screens

| ID | File | Screen | Case |
| --- | --- | --- | --- |
| W-01 | `sign_in_screen_test` | 01 Sign In | Content, passkey path, role choice, plain-language email errors, radio-style semantics, tablet width |
| W-02 | `today_screen_test` | 02 Today | Orientation bar, dominant dose card, later list; Mark as Taken → undo; undo still works after the clock moves on, stays until closed, and says so when it can’t undo (#10); empty state; phone / landscape / tablet layouts; 200 % text; Call my caregiver sheet; live-region semantics |
| W-03 | `medications_screens_test` | 03 Medications | Four statuses with icon + text; tablet grid; detail screen; skip with undo; delete dialog cancel / confirm; missing id; empty state |
| W-04 | `appointment_screens_test` | 04 Appointments, 08 form | Full-word rows; add through both steps with date + time pickers; edit prefill, save, delete; Back keeps draft; empty state |
| W-05 | `medication_form_test` | 07 Add / Edit Medication | Three steps with progress fractions 1/3 → 2/3 → 3/3; per-field errors; autosave Saving → Saved; time add / remove; review; save; draft restore; edit prefill; deep link; live-region step indicator |
| W-06 | `settings_screens_test` | 05, 09, 11, App Settings | Rows navigate; digest toggle persists; overdue alerts always on; lead-time single select with checked semantics; caregiver access list and sharing pause; theme switch; demo clock confirm + reset; reset sample data; sign out |
| W-07 | `caregiver_screens_test` | 06, 10, Manage | Violet theme; overdue alert opens medication; Log now with undo; View full history; empty state; tablet columns; Manage lists and actions; timeline grouping and filter; new actions appear |
| W-08 | `navigation_test` | shells | All tabs both roles; per-tab stacks; app-bar back and system back; deep links with back stack; forms cover the nav; redirect guard; reduce-motion pages |
| W-09 | `accessibility_test` | all | Four guidelines on every screen and form step; dark-mode contrast; 200 % text without overflow; headings exposed; undo action labelled |
| W-10 | `shared_widgets_test` | components | StepIndicator fraction + assertion; AutosaveIndicator; StatusChip icon + text; AlertCard semantics; list item sizes ≥ 48; heading scale; responsive switch at 600 px; app bar back; empty state; dark themes |

### 4.4 Integration

| ID | File | Journey |
| --- | --- | --- |
| I-01 | `integration_test/app_test.dart` | Sign in → Today → mark taken → undo → add medication (3 steps) → sign out → caregiver sign in → dashboard Log now → timeline shows the entry |

### 4.5 Manual accessibility pass (per UI PR)

| ID | Check | Pass criterion |
| --- | --- | --- |
| M-01 | TalkBack (Android) / VoiceOver (iOS) on every screen | Every control announces name, role and state; status changes ("Metformin logged at 2:14 PM. Undo, button") are announced |
| M-02 | OS font size at maximum (≈ 200 %) | No clipped or overlapping text; single-column reflow; nothing lost |
| M-03 | Reduce motion on | No route transition animation |
| M-04 | Keyboard (Bluetooth / desktop) | Focus order matches visual order; 2 px coral focus ring visible; no traps |
| M-05 | Dark mode | Every status still readable; token test U-06 backs this |
| M-06 | Cognitive-load walkthrough (ADHD persona, cold open) | Time-to-first-action ≤ 5 s; task completed without help; no step requires remembering a previous screen |

Record results in the PR template's accessibility section.

## 5. Coverage

- Generate: `flutter test --coverage`
- Report: `genhtml coverage/lcov.info -o coverage/html`
- Floor: **60 %** (Assignment 4). Team target: **75 %** (rubric's top band).
- The `coverage/` folder is committed (assignment requirement) and CI fails
  below the floor (`.github/workflows/flutter.yml`).

**Result (2026-09-07): 225 tests passing, `flutter analyze` clean, line
coverage 99.6 % (2 707 of 2 719 lines across 62 source files).**

Two files carry no coverage data and this is expected, not a gap:

- `lib/main.dart` — the entry point. Widget tests pump `CareConnectApp`
  directly with an injected `SharedPreferences`; `main()` itself runs only on
  a real device and is exercised by the integration test.
- `lib/core/theme/app_spacing.dart` — compile-time constants only, so it has
  no executable lines for lcov to instrument.

See `coverage/summary.txt`, the HTML report in `coverage/html/`, and the
screenshot in `docs/screenshots/mobile-flutter/coverage.png`.

## 6. Entry and exit criteria

**Entry:** `flutter analyze` clean; app launches on the Pixel 8 AVD.

**Exit (Definition of Done):** all automated cases green in CI; coverage ≥ 60 %
with HTML report committed; manual pass M-01…M-06 recorded; PR reviewed by
one teammate; demoed to the team.

## 7. Risks

| Risk | Mitigation |
| --- | --- |
| Riverpod 3 pauses provider subscriptions on hidden routes and, in 3.3.x, can invalidate a provider mid-build when a route pops (fixed upstream in 3.4.0, which needs Dart ≥ 3.12) | Pin the toolchain documented in README; the navigation and form tests cover every pop path |
| iOS builds need Xcode, which is not installed on the lead's Mac yet | Android APK is the graded artifact; iOS is "if available" per the assignment |
| Real-time seed drift (doses seeded as taken at 8:04 AM look wrong before 8 AM on first launch) | Demo clock + Reset sample data in App Settings; documented in Known issues |
