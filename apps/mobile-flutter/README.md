# CareConnect Mobile — Flutter

![Flutter](https://img.shields.io/badge/Flutter-3.47%20stable-02569B?logo=flutter&logoColor=white)
![Riverpod](https://img.shields.io/badge/state-Riverpod%203-5B4B8A)
![go_router](https://img.shields.io/badge/navigation-go__router-1B5E7A)
![WCAG 2.2 AA](https://img.shields.io/badge/WCAG-2.2%20AA-success)
![Tests](https://img.shields.io/badge/tests-225%20passing-2E7D4F)
![Coverage](https://img.shields.io/badge/line%20coverage-99.6%25-2E7D4F)

**Assignment 4 — Flutter Mobile Implementation & Testing** · SWEN 661 (UMGC,
Fall 2026) · Team E-Echo (Team 5)

The Week 3 Figma design — eleven care-recipient and caregiver screens, plus
landscape and tablet variants — implemented as a working Flutter app with
Riverpod state management, go_router navigation, local persistence, a full
unit / widget / integration test suite, and an HTML coverage report.

> Design source: *CareConnect — Mobile Design in Figma* and *CareConnect —
> Design Documentation* (Week 3 submission, Abel Tabor). The Figma team folder
> is linked from the root README.

---

## Contents

- [What is implemented](#what-is-implemented)
- [Architecture overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [How to run the app](#how-to-run-the-app)
- [How to run the tests](#how-to-run-the-tests)
- [Coverage report](#coverage-report)
- [Building release artifacts](#building-release-artifacts)
- [Deep links](#deep-links)
- [Accessibility](#accessibility)
- [Security and dependency scanning](#security-and-dependency-scanning)
- [Known issues and limitations](#known-issues-and-limitations)
- [Future enhancements](#future-enhancements)
- [Team contributions this week](#team-contributions-this-week)
- [AI usage summary](#ai-usage-summary)

---

## What is implemented

| # | Figma frame | Screen | Route |
| --- | --- | --- | --- |
| 01 | Sign In / Role Selection | `SignInScreen` — passkey first, email second, "I am a…" role cards | `/sign-in` |
| 02 | Today (Home) | `TodayScreen` — orientation bar, one dominant dose card, "Later today", undo with no time limit | `/patient/today` |
| 03 | Medications List | `MedicationsScreen` — icon + text status per medication, tablet grid | `/patient/medications` |
| — | *(added)* Medication detail | `MedicationDetailScreen` — schedule, today's doses, mark / skip with undo, edit, delete dialog | `/patient/medications/:id` |
| 04 | Appointments List | `AppointmentsScreen` — full-word dates, "who is taking me" | `/patient/appointments` |
| 05 | My Caregiver Access | `CaregiverAccessScreen` — closed list of what the caregiver sees, sharing pause | `/patient/settings/caregiver-access` |
| 06 | Caregiver Dashboard | `CaregiverDashboardScreen` — "Needs attention today": overdue alerts, "Log now" | `/caregiver/dashboard` |
| 07 | Manage Medications (Step 1 of 3) | `MedicationFormScreen` — 3 steps, step indicator with fractional progress, autosave, plain-language errors | `/medications/new`, `/medications/:id/edit` |
| 08 | Manage Appointments (Step 2 of 2) | `AppointmentFormScreen` — 2 steps, date + time pickers, companion | `/appointments/new`, `/appointments/:id/edit` |
| 09 | Notifications Settings | `NotificationsSettingsScreen` — daily digest, always-on overdue alerts, lead-time chips | `…/settings/notifications` |
| 10 | Activity Timeline | `ActivityTimelineScreen` — grouped by day, newest first, filter | `/caregiver/activity` |
| 11 | Settings | `SettingsScreen` — Notifications / My Caregiver Access / App Settings | `/patient/settings`, `/caregiver/settings` |
| — | *(added)* App Settings | `AppSettingsScreen` — profile, theme, demo clock, reset sample data, sign out | `…/settings/app` |
| — | Caregiver "Manage" tab | `ManageScreen` — medications and appointments with add / edit | `/caregiver/manage` |

Every screen has the phone layout from the "Mobile" Figma page and switches
to the two-column "Landscape" / "Tablet" layout at 600 dp
(`core/widgets/responsive.dart`).

### Design decisions carried into code

| Design principle (Week 3 doc) | Where it lives |
| --- | --- |
| **One next action, always** — one accent-coloured CTA per screen | `DoseCard` is the only Focus Coral element; `nextActionDoseProvider` picks it |
| **Undo over confirm** — Undo stays on screen until the user taps it or closes it, so there is no time limit (SC 2.2.1) | `CareDataNotifier.markTaken / skipDose / undoDoseChange`, `showUndoSnackBar` |
| **Never re-learned, never re-entered** — orientation, position and drafts persist | `OrientationBar`, per-tab navigation stacks, `MedicationDraftNotifier` / `AppointmentDraftNotifier` autosave |
| Status never carried by colour alone | `StatusChip` = fixed icon + text; `DoseStatusPresentation` |
| Full-word dates, never "8/25" | `DateFormatting` (tested to never emit `/`) |
| 44×44 / 48×48 targets | `TapTarget` constants, `MaterialTapTargetSize.padded`, guideline tests |
| Contrast-verified tokens | `AppColors` + `contrast_test.dart` reproduce every ratio in the design doc |
| Consistent Help (SC 3.2.6) | `CallContactButton` in the same top-right slot on every screen |
| Role identification (SC 3.2.4) | `RoleThemed` re-themes teal ↔ violet from the signed-in role |

## Architecture overview

```
lib/
├── main.dart                 # opens SharedPreferences, injects it, runs the app
├── app.dart                  # MaterialApp.router + RoleThemed
├── core/
│   ├── theme/                # tokens (colors, type scale, spacing), ThemeData builder
│   ├── utils/                # clock, date formatting, WCAG contrast maths, ids
│   └── widgets/              # the Figma component library (buttons/cards/chips/…)
├── models/                   # immutable domain types with JSON (mirror packages/mock-data)
├── data/
│   ├── mock_data.dart        # Figma-matching fictional seed, relative to a day
│   └── local_store.dart      # SharedPreferences JSON layer + StoreKeys
├── state/                    # Riverpod notifiers + derived selectors
│   ├── clock_provider.dart   # injectable "now"; demo clock freezes at the Figma instant
│   ├── session_provider.dart
│   ├── settings_provider.dart
│   ├── notification_settings_provider.dart
│   ├── care_data_provider.dart   # single aggregate: medications, doses, appointments, activity
│   ├── care_selectors.dart       # next action, later today, overdue, timeline…
│   └── draft_providers.dart      # autosaving form drafts
├── router/
│   ├── app_router.dart       # GoRouter: two StatefulShellRoutes + full-screen forms
│   └── redirects.dart        # pure routing guard
└── features/
    ├── auth/  patient/  caregiver/  medications/  appointments/  settings/
```

**State management.** Riverpod `Notifier`s own all mutable state. `CareData`
is one immutable aggregate; every mutation produces a new value and writes it
to local storage, which keeps undo, autosave and "reset sample data" trivial.
Derived `Provider`s (`nextActionDoseProvider`, `overdueDosesProvider`, …)
hold the "what should I do next?" rules in one place, and screens only watch
those.

**Time.** Nothing calls `DateTime.now()` directly. `clockProvider` is injected
and `currentTimeProvider` ticks every 30 s, so "Due in 20 min" stays honest and
tests are deterministic. **Demo clock** (App Settings) freezes time at
*Tuesday, August 25, 2:14 PM* — the instant every Figma frame is drawn at —
and reseeds the data so screenshots match the Week 3 design exactly.

**Navigation.** `go_router` on Navigator 2.0: one `StatefulShellRoute` per
role (each tab keeps its own stack), nested detail / settings routes, and
full-screen form routes on the root navigator so they cover the bottom nav.
The `redirect` guard sends signed-out users to sign-in and keeps roles on
their own screens. Route transitions are suppressed under the OS
reduce-motion setting.

**Persistence.** `shared_preferences` holds the session, app settings,
notification settings, the care-data aggregate and both form drafts as JSON.
Corrupt entries read as "absent" rather than crashing.

## Prerequisites

| Tool | Version | Notes |
| --- | --- | --- |
| Flutter (stable) | **3.47+ / Dart 3.12+** | required by `flutter_riverpod ^3.4.3` — see Known issues #3 |
| Java (for Android builds) | **17** | Gradle 8.14 does not support Java 21+; set with `flutter config --jdk-dir` |
| Android Studio + SDK | API 36 (Android 16), build-tools 36, an AVD | needed for `flutter build apk` and the emulator |
| Xcode | 16+ | iOS only, macOS only, optional |
| lcov | any | `brew install lcov` — provides `genhtml` |

Team machines: Shayne (macOS, Apple silicon), Abel and Quinton (Windows 10/11).
Windows cannot build iOS; everything else is identical.

```bash
flutter config --jdk-dir "/Library/Java/JavaVirtualMachines/openjdk-17.jdk/Contents/Home"
```

## How to run the app

From the repository root:

```bash
cd apps/mobile-flutter && flutter pub get
```

Pick a device (`flutter devices` / `flutter emulators`), then:

```bash
flutter run -d emulator-5554
```

```bash
flutter run -d chrome
```

```bash
flutter run -d macos
```

Start the team's Pixel 8 AVD with `flutter emulators --launch careconnect_pixel8`
(create it once in Android Studio → Device Manager, or with `avdmanager`).

**Sign-in:** there is no real authentication. Tap *Continue with Face ID /
Passkey* (or enter any email) and choose *Care Recipient* or *Caregiver*.

**Reproducing the Figma frames:** Settings → App Settings → *Demo clock* →
Turn on. Every screen then shows the exact Week 3 state (Metformin due in
20 minutes, Atorvastatin 45 minutes overdue, …).

## How to run the tests

```bash
cd apps/mobile-flutter && flutter analyze && flutter test
```

| Command | What runs |
| --- | --- |
| `flutter test test/unit` | models, formatting, contrast, mock data, store, every notifier and selector, routing guard |
| `flutter test test/widget` | every screen and form step, navigation, redirects, accessibility guidelines |
| `flutter test --coverage` | everything, writing `coverage/lcov.info` |
| `flutter test integration_test/app_test.dart -d <device>` | both role journeys end to end on a device |

The full catalogue of test cases, the manual accessibility pass and the
cognitive-load walkthrough are in **[docs/TEST-PLAN.md](docs/TEST-PLAN.md)**.

## Coverage report

```bash
flutter test --coverage && genhtml coverage/lcov.info -o coverage/html && open coverage/html/index.html
```

**Current result: 225 tests passing, line coverage 99.6 % (2 707 of 2 719
lines across 62 source files).**

- **HTML report:** [`coverage/html/index.html`](coverage/html/index.html) (committed, per the assignment)
- **Raw data:** [`coverage/lcov.info`](coverage/lcov.info)
- **Summary:** [`coverage/summary.txt`](coverage/summary.txt)
- **Screenshot:** [`../../docs/screenshots/mobile-flutter/coverage.png`](../../docs/screenshots/mobile-flutter/coverage.png)

Two files carry no coverage data, which is expected rather than a gap:
`lib/main.dart` (the entry point — widget tests pump `CareConnectApp` directly
and the integration test exercises the real launch) and
`lib/core/theme/app_spacing.dart` (compile-time constants only, so there are no
executable lines to instrument).

CI (`.github/workflows/flutter.yml`) fails the build below the 60 % floor and
uploads the HTML report and a release APK as artifacts on every push.

## Building release artifacts

```bash
flutter build apk --release
```

Output: `build/app/outputs/flutter-apk/app-release.apk` (≈ 53 MB). Install on
a device with:

```bash
adb install -r build/app/outputs/flutter-apk/app-release.apk
```

```bash
flutter build ios --release
```

The release build is signed with the debug key (see
`android/app/build.gradle.kts`), which is fine for coursework and side-loading;
a real store release needs a keystore.

## Deep links

Scheme `careconnect://app` maps straight onto the router paths on Android
(intent filter in `AndroidManifest.xml`) and iOS (`CFBundleURLTypes` in
`Info.plist`):

```bash
adb shell am start -a android.intent.action.VIEW -d "careconnect://app/patient/medications/med-metformin"
```

Signed-out users are redirected to sign-in and returned home afterwards; a
deep link into a nested screen builds the full back stack (covered by
`test/widget/navigation_test.dart`).

## Accessibility

- **Semantics on every interactive element** — Material widgets provide
  roles; custom controls (`ChoiceGroup`, `AlertCard`, list rows) declare
  `button`, `checked`, `inMutuallyExclusiveGroup`, labels and hints.
- **Live regions** for the orientation bar, step indicator, autosave status
  and undo snackbar, so state changes are announced without moving focus.
- **Text scaling** — no fixed heights; layouts reflow to one column at 200 %.
- **Reduce motion** honoured for route transitions.
- **Dark mode** with its own contrast-verified token set.
- **Automated guidelines** run on every screen in `accessibility_test.dart`;
  the manual TalkBack / VoiceOver pass is in the test plan.

**One documented deviation from the design's type scale:** bottom-navigation
labels are 14 px rather than the 16 px "Button/Label" floor. Four destinations
on a 411 dp phone give each label about 100 dp, and "Appointments" at 16 px
wraps mid-word, which reads as broken. 14 px keeps every label on one line and
still sits above Material's own 12 sp guidance for navigation labels; the tap
target remains 48 dp and the label scales with the OS font setting. All body
copy, buttons, form labels and status text remain at 16 px or larger.

## Security and dependency scanning

The app was reviewed against **NIST SP 800-218 (SSDF v1.1)**, focusing on the
PW (Produce Well-Secured Software) and PS (Protect the Software) practice
groups. Full findings and control mapping: **[docs/SECURITY-REVIEW.md](docs/SECURITY-REVIEW.md)**.

Controls in place:

- **PW.5.1 — secure coding.** No secrets, keys or credentials in source (the
  app has no auth provider or network calls at all). All user input is
  validated with plain-language errors. There is no SQL, shell, or template
  interpolation anywhere, so the classic injection classes do not arise.
- **PW.5.1 — fail securely.** Stored documents are structurally untrusted: a
  truncated write or an edited preferences file on a rooted device can leave
  valid JSON with the wrong shape. `LocalStore.readAs` catches that,
  discards the bad document and falls back to a known-good value, so a
  corrupt entry can never leave the app unable to start. Covered by tests.
- **PW.6 / PW.9.1 — secure defaults.** `flutter analyze` runs with strict
  casts, strict inference and strict raw types, and reports zero issues.
  The Android manifest sets `allowBackup=false`, `fullBackupContent=false`,
  a `data_extraction_rules.xml` that excludes all domains, and
  `usesCleartextTraffic=false`.
- **PW.4.1 — third-party components.** Four well-maintained direct
  dependencies. `pubspec.lock` is committed, so every build resolves the
  same versions. `dart pub outdated --show-all` surfaces pub.dev security
  advisories and runs in CI.
- **PW.8 — security testing.** Negative and boundary cases are tested
  explicitly: malformed stored state, corrupt JSON, out-of-range times,
  an Undo whose change was already superseded, and unknown record ids.
- **PS.1.1 — data protection.** No real protected health information: a unit
  test asserts the seed uses the reserved `example.test` domain and 555-01xx
  phone numbers.

**Accepted risks for a course prototype**, documented rather than hidden:
the release APK is signed with the debug keystore; `SharedPreferences` is
app-private but not encrypted; and the deep-link activity is necessarily
exported. Each is analysed in the security review with the fix that a real
deployment would need.

## Known issues and limitations

1. **Prototype stand-ins.** Sign-in, "Call my caregiver" and notifications
   are UI patterns only — no auth provider, phone call or push service.
2. **First-launch seed vs. real time.** Sample data is seeded relative to the
   day the app is first opened, with the morning doses already logged at
   8:04 / 8:15 AM. Opening the app before 8 AM shows those as logged in the
   future. *Reset sample data* or the *Demo clock* fixes it.
3. **Toolchain floor.** Riverpod 3.3 pauses subscriptions on hidden routes and
   can invalidate a provider mid-build when a route pops
   ("setState() or markNeedsBuild() called during build"). Fixed upstream in
   Riverpod 3.4.0, which requires Dart ≥ 3.12 — hence the Flutter 3.47+
   prerequisite. Android builds additionally require Java 17, because
   Gradle 8.14 rejects Java 21+.
4. **iOS untested on hardware.** The lead's Mac had no Xcode at submission
   time; the iOS project builds from the template and carries the deep-link
   configuration, but no simulator run is recorded yet.
5. **Persona naming.** The Week 3 Figma mixes "Mom's care" with "Muhammad R.";
   the app uses one coherent pair (care recipient Muhammad R., caregiver
   Renee).
6. **Single care recipient.** The caregiver experience assumes one care
   recipient, matching the design; multi-patient support is out of scope.
7. **Security items accepted for this build** (see the security review):
   the release APK is signed with the **debug keystore**, so it is fine for
   side-loading and coursework but is not a store-ready artifact; and local
   state is stored unencrypted in app-private `SharedPreferences`, which is
   acceptable only because the data is fictional.
8. **Harmless build warning.** `flutter build apk` prints a note about
   `CupertinoIcons` fonts because `package:flutter/cupertino.dart` is imported
   for the iOS page transition. No Cupertino icon is used and the APK is
   unaffected.

## Future enhancements

- Local notifications (`flutter_local_notifications`) driven by
  `NotificationSettings.leadTime`, with the snooze options already in the
  data model.
- Refill tracking and "running low" warnings (US-11).
- Task steps with save-and-resume (the `Task` entity from the web data model).
- iOS simulator / TestFlight run once Xcode is installed; TalkBack and
  VoiceOver recordings for Assignment 6.
- Shared design tokens generated from `packages/design-tokens` instead of the
  hand-mirrored `AppColors`.

## Team contributions this week

| Member | Week 4 contribution |
| --- | --- |
| **Shayne McPherson** (Technical Lead) | Repository migration to the shared team repo and the `dev` branch workflow; full Flutter implementation of all 11 designed screens plus the medication-detail and app-settings screens; Riverpod state, go_router navigation, persistence; 225 unit / widget tests, the integration test, coverage report and CI workflow; the app README, test plan, ADRs 0001 and 0003, and the screenshots. |
| **Abel Tabor** (Documentation Lead) | Week 3 design system, Figma frames (mobile, landscape, tablet) and the design documentation this implementation follows; created and administers the shared GitHub repository. *(Add Week 4 items here.)* |
| **Quinton Coleman** (QA / Testing Lead) | Week 3 Figma colour and text style setup, documented in *CareConnect Figma Progress Screenshots*. *(Add Week 4 items here.)* |

## AI usage summary

Claude Code (Anthropic) was used as a pair programmer for this assignment,
with every output reviewed and run locally before commit:

- **Design-to-code:** translating the Week 3 Figma PDF export and design
  documentation into the token file, component library and screens.
- **Tests:** generating unit, widget and integration tests and edge cases
  (undo-window expiry, day rollover, corrupt storage, 200 % text scale), then
  fixing the ones that exposed real defects — including the mid-word wrap of
  the "Appointments" navigation label found while screenshotting the emulator.
- **Debugging:** diagnosing the Riverpod 3.3 mid-build invalidation and
  tracing it to the upstream fix in 3.4.0, and the Gradle/Java 25
  incompatibility in the Android build.
- **Documentation and security review:** this README, the test plan, ADR 0003,
  the CI workflow, and the dependency-advisory check.

Design decisions (single next action, undo over confirm, plain-language dates,
role colour cue) come from the team's Week 2–3 documents, not from AI.
