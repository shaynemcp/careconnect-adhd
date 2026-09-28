# react-mobile E2E results (Assignment 6)

| | |
| --- | --- |
| **Date** | 2026-09-22, 10:28–10:33 PM EDT |
| **Build** | `shayne/voiceover-a11y-4` at `aa71fc1` (`dev` + PR #31 + PR #19), served by Metro to Expo Go |
| **Device** | iPhone 13 Pro Max, iOS 26.6.1 |
| **Tester** | Shayne McPherson |
| **Method** | **Manual.** The scenarios from the Maestro flows in `flows/` were run by hand and screen-recorded (`ScreenRecording_09-22-2026 22-28-34_1.MP4`, 5 min 21 s). |
| **Result** | **4 of 5 passed.** E2E-4 (add an appointment) failed. |

## Why this run is manual

The flows couldn't be automated on this Mac tonight:

- **Native iOS build:** `expo run:ios` builds, but the app stops at launch on the
  iOS 27 Simulator (`EXC_BREAKPOINT` in
  `_UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption`). iOS 27 won't
  launch an app that hasn't adopted the UIScene lifecycle, and the generated
  project hasn't. Only the iOS 27 simulator runtime is installed.
- **Expo Go on the Simulator:** the app loads and Maestro can read the screen
  (`signin-passkey` is in the view tree), but taps never reach the app, whether
  by id, by text or by screen point. So every flow stops on the sign-in screen.
- **Maestro can't drive a physical iPhone,** and there is no Android emulator on
  this machine.

The flows are unchanged and still meant for Android (see [README.md](README.md)).
Running them on an Android emulator or in CI is still to do.

## Results

| ID | Scenario (Maestro flow) | Steps | Expected | Result |
| --- | --- | --- | --- | --- |
| E2E-1 | Sign in and keep the session (`01`) | Care Recipient → Continue with Face ID / Passkey, then reopen the project | Today screen with "Later today"; still signed in after reopening | **Pass** |
| E2E-2 | Email validation (`02`) | Continue with Email when empty → `not-an-email` → `muhammad@example.test` | The empty and invalid-email errors, then the Today screen | **Pass** |
| E2E-3 | Mark dose taken, then Undo (`04`) | App Settings → Demo clock → Turn on → Today → Mark as Taken → Undo | "Demo clock on. Sample data reset."; dose logged; Undo restores it | **Pass** |
| E2E-4 | Add an appointment (`06`) | Appointments → Add → both errors → title and place → Continue → no-date error → pick a date and time → Save | "Appointment added", and the new appointment in the list | **Fail** (below) |
| E2E-5 | Sign out (`07`) | App Settings → Sign out → reopen the project | The sign-in screen both times | **Pass** |

### E2E-4 failure

- The iOS date and time wheels are inline spinners. After they were moved, the
  **Date & time field still read "Choose the date and time"**, with the time wheel
  still open (recording 10:32).
- **Save appointment** then showed the **"Appointment added"** snackbar and went
  back to the list, but **"Maestro checkup" wasn't in the list**. Only the three
  sample appointments were there.
- So the app reported success without an upcoming appointment to show. Either
  the wheel's value was never stored, or it was stored as a date before
  "today" (the demo clock was on, set to August 25). `getUpcomingAppointments`
  hides past appointments. This is the iOS picker defect in **#1**.
- Also seen: the first time, **Add Appointment opened pre-filled** with
  "Dr. Alvarez — Cardiology follow-up / Regional Medical", a leftover draft,
  rather than an empty form.

Step 1 of this scenario passed: both empty-field errors were shown, and
Continue moved on once they were filled.
