# VoiceOver / TalkBack Test Plan: Issue #4 (react-mobile)

| | |
| --- | --- |
| **Issue** | [#4](https://github.com/shaynemcp/careconnect-adhd/issues/4): VoiceOver can't reach switches or Undo; no iOS announcements |
| **App under test** | `apps/react-mobile` (Expo ~57 / React Native ~0.86) |
| **Branch** | `shayne/voiceover-a11y-4` |
| **Standard** | WCAG 2.2 Level AA, plus the team's 44×44 pt touch-target floor |
| **Assistive tech** | VoiceOver (iOS), TalkBack (Android), Full Keyboard Access / hardware keyboard |
| **Version** | 1.0, 2026-09-18 |
| **Results** | [TEST_REPORT.md](TEST_REPORT.md) |

---

## 1. Purpose and scope

Issue #4 reports five defects that share one root cause. On iOS, a parent `View`
with `accessible` becomes one VoiceOver element and hides every interactive child.
This plan covers how each fix is verified by hand with a real screen reader, and
which Jest assertions stand in for those checks in CI.

**In scope**

| # | Issue item | Screens / files | SC |
| --- | --- | --- | --- |
| 1 | Switch rows unreachable | `CaregiverAccessScreen`, `NotificationsSettingsScreen`, `AppSettingsScreen` | 4.1.2, 2.1.1 |
| 2 | Undo button unreachable | `UndoSnackbar` (via Today and Medication detail) | 2.1.1 |
| 3 | No status announcements on iOS | `UndoSnackbar`, `CcTextField` errors, `MedicationFormScreen` times error | 4.1.3 |
| 4 | Unlabeled date/time field | `CcTextField` read-only mode (Add Appointment "Date & time") | 4.1.2 |
| 5 | Targets below the team floor | Remove-time icon (`MedicationFormScreen`), Undo (`UndoSnackbar`) | Team 44 pt floor (AA 2.5.8 is 24 pt) |

**Out of scope:** screens and components that #4 doesn't touch, contrast (already
gated by `check:contrast`), and the web and Flutter apps.

### Criteria used

| Criterion | Level | What "pass" means here |
| --- | --- | --- |
| **4.1.2** Name, Role, Value | A | Every control announces a name, a role (switch, button), and its current state. State changes are announced. |
| **2.1.1** Keyboard | A | Every control can be reached and operated without touch: VoiceOver or TalkBack swipe and double-tap, and a hardware keyboard (Tab and Space/Enter). |
| **4.1.3** Status Messages | AA | Confirmations and errors are spoken without moving focus, **on both platforms**, once each. |
| **2.5.8** Target Size (Minimum) | AA | ≥ 24×24 pt. This is the conformance floor. |
| **Team floor** | Team | ≥ 44×44 pt from the element's **laid-out size**. `hitSlop` doesn't count toward the team floor. |

A target between 24 and 44 pt passes AA and fails the team floor. Report the two
results separately, because merging them would record an AA failure that doesn't exist.

---

## 2. Environment

| Platform | Where | Screen reader | Notes |
| --- | --- | --- | --- |
| iOS | Physical iPhone via **Expo Go** (`npx expo start`, scan the QR code) | VoiceOver + Caption Panel | **Required for speech checks** (4.1.3 announcements, swipe order, double-tap toggles). The iOS Simulator has no VoiceOver. Screen-record with the Caption Panel on so the spoken text is captured as evidence. |
| iOS | iOS Simulator + Xcode **Accessibility Inspector** (Xcode → Open Developer Tool) | n/a (Inspector) | Shows each element's label, traits, value and frame, and can step through elements. Good for name/role/value, checking that Undo and each settings switch are single elements, and frame size. Its **Audit** flags small hit regions. It **can't** confirm speech or announcements. Needs full Xcode, not just the Command Line Tools. |
| Android | Android Emulator, Google Play system image | TalkBack (Android Accessibility Suite) | TalkBack speech works in the emulator. Install or update the suite from the Play Store if it's missing. |
| Android | Emulator | Accessibility Scanner (optional) | Touch-target check. Its default threshold is 48 dp, so read the reported size against 44. |

Start the app from `apps/react-mobile/`: `npx expo start`, then `i` (iOS Simulator),
`a` (Android), or scan the QR code in Expo Go on an iPhone. The app is managed Expo
with no `ios/` folder, so Expo Go is the quickest way onto a device. Record the
device, OS version and screen-reader version in the report for every run.

If no physical iPhone is available, **don't record iOS speech cases as passed.**
Record them as "Not run (no device)". In the conformance write-up, say that iOS
announcements were verified by unit test and Accessibility Inspector only.

Optional follow-up: a Maestro flow on the Simulator can assert that Undo and each
switch are exposed by accessibility label. That's a reachability regression check,
not a speech check. The repo has no Maestro flows yet.

**Turning the screen reader on**

- VoiceOver: Settings → Accessibility → VoiceOver, or set Accessibility Shortcut to
  VoiceOver and triple-click the side button.
- TalkBack: Settings → Accessibility → TalkBack, or hold both volume keys for 3 s once
  the shortcut is enabled.
- Speech log: on Android, turn on TalkBack Settings → Advanced → Developer settings →
  "Display speech output" so you can copy exact wording. On iOS, write down what you
  hear, or turn on the VoiceOver Caption Panel (Settings → Accessibility → VoiceOver →
  Caption Panel).

### Gesture reference

| Action | VoiceOver (iOS) | TalkBack (Android) |
| --- | --- | --- |
| Next / previous element | Swipe right / left (one finger) | Swipe right / left (one finger) |
| Activate focused element | Double-tap | Double-tap |
| Explore by touch | Drag one finger | Drag one finger |
| Read from top | Two-finger swipe up | TalkBack menu → Read from top |
| Custom actions | Rotor (two-finger twist) → **Actions**, then swipe up/down | TalkBack menu (three-finger tap) → **Actions** |
| Scroll | Three-finger swipe up/down | Two-finger swipe up/down |
| Stop speech | Two-finger tap | Tap with one finger |

**Keyboard (SC 2.1.1).** iOS: Settings → Accessibility → Keyboards → Full Keyboard
Access, with a Bluetooth keyboard or the simulator's hardware keyboard. Tab moves
focus and Space activates. Android emulator: the host keyboard passes through. Tab
moves focus and Enter or Space activates.

### Test data

Sign in as **Care Recipient** (Sign in screen → "I am a…" → Care Recipient →
"Continue with Face ID / Passkey"). The demo caregiver is **Renee**. The demo
medication is **Metformin**. Use Settings → App Settings → "Reset sample data" before
each run so the state is known.

---

## 3. Reading the expected speech

Word order and exact phrasing vary by OS and screen-reader version. For example,
VoiceOver may say "switch button, on" or "on, switch button", and older TalkBack may
say "On, Share with Renee, switch". A case **passes when every required token is
heard**:

- **Name**: the label in quotes,
- **Role**: "switch button" (iOS) or "switch" (Android), or "button",
- **State**: "on"/"off" (iOS) or "on"/"off", "checked"/"not checked" (Android), and
  "dimmed" (iOS) or "disabled" (Android) where noted,

and **nothing else counts against it**: no extra focus stop for the same control, no
second copy of the same announcement, and no bare "button" without a name.

Hints ("double-tap to toggle setting") are optional and don't affect the result.

---

## 4. Test cases

### 4.1 Item 1: switch rows (SC 4.1.2, 2.1.1)

The fix may make the whole row the switch (row gets `accessibilityRole="switch"`,
`accessibilityState={{ checked }}` and an activation handler) or drop `accessible`
from the row and label the `Switch` directly. The expected speech below is the same
for both. The **one-focus-stop rule** is what catches a half-applied fix.

| ID | Case | Preconditions | Steps (gestures) | Expected: VoiceOver | Expected: TalkBack | Pass criteria |
| --- | --- | --- | --- | --- | --- | --- |
| **SW-01** | "Share with Renee" is announced as a switch with its state | Care Recipient, sharing **on** (sample default). Settings tab → "My Caregiver Access" | Swipe right until the Sharing card is focused | "Share with Renee, switch button, on", then the hint "Sharing is on. Renee sees the list above." | "Share with Renee, switch, on" | Name + role + state heard. The focus ring surrounds the card or the switch, never just the title text. |
| **SW-02** | Toggle sharing with double-tap | SW-01 focused | Double-tap | "off" (the updated state), and the description updates to "Sharing is paused…" | "off" / "not checked" | The state flips in the UI **and** in speech. Swipe left then right: the re-read state matches the visible switch (no stale value). |
| **SW-03** | One focus stop per switch | SW-01 | From the "Sharing" heading, swipe right through to the end of the screen | Exactly one stop for the sharing control | Same | No second "switch" stop for the same setting, and no bare "switch button" without a name. |
| **SW-04** | "Daily digest" switch | Settings → Notifications | Swipe right to the row, double-tap, swipe away and back | "Daily digest, switch button, off/on" (the description may follow) | "Daily digest, switch, off/on" | As SW-01 to SW-03. The store value changes (leave and re-enter the screen: state persists). |
| **SW-05** | "Overdue alerts" is always on and can't be changed | Settings → Notifications | Swipe right to the Overdue alerts row, double-tap | "Overdue alerts, always on, switch button, on, dimmed" (hint follows) | "Overdue alerts, always on, switch, on, disabled" | State "on" and disabled are both conveyed (the label saying "Always on" also satisfies this). Double-tap changes nothing. One focus stop. |
| **SW-06** | "Demo clock" on goes through its confirmation | Settings → App Settings, demo clock **off** | Swipe right to "Demo clock", double-tap | Row reads "Demo clock, switch button, off". The confirmation alert opens and VoiceOver focus moves into it. | Same, and the dialog is announced | The confirm dialog appears exactly as it does for a sighted tap. After you confirm: state "on" is announced when you return to the row, and "Demo clock on. Sample data reset." is spoken (see AN-05). After you cancel: state stays "off". |
| **SW-07** | "Demo clock" off is immediate | Demo clock **on** | Focus row, double-tap | "off" | "off" | No dialog, and the state is re-announced. |
| **SW-08** | Keyboard reaches and toggles every switch (SC 2.1.1) | Full Keyboard Access (iOS) or hardware keyboard (Android) | Tab to each of SW-01, SW-04, SW-06; press Space (iOS) or Enter/Space (Android) | Visible focus lands on the control | Same | Every switch reachable by Tab and toggled by the key. SW-06 still shows its confirmation. |
| **SW-09** | Custom action (only if the row uses `accessibilityActions`) | SW-01 focused | VoiceOver: rotor → Actions. TalkBack: menu → Actions | The action (e.g. "Activate" / "Toggle") is listed once | Same | Performing it toggles exactly once. Skip with "N/A" if no custom action is registered. |

### 4.2 Item 2: Undo in the snackbar (SC 2.1.1, 4.1.2)

The undo window is **10 seconds** (`DOSE_UNDO_WINDOW_MS`). Run each case in one go:
a screen-reader user who has to hunt for Undo is the failure this item describes.

| ID | Case | Preconditions | Steps (gestures) | Expected: VoiceOver | Expected: TalkBack | Pass criteria |
| --- | --- | --- | --- | --- | --- | --- |
| **UN-01** | Undo is a separate, named button | Today tab, a dose is due ("Mark as Taken" visible) | Focus "Mark as Taken", double-tap. Then swipe right (or explore by touch at the bottom of the screen) to the snackbar. | The message ("Metformin logged at …") is readable. Next stop: "Undo, button" | Same: "Undo, button" | Undo is its **own** focus stop with name + role. The message isn't lost when Undo becomes focusable. |
| **UN-02** | Undo works from the screen reader | UN-01, Undo focused | Double-tap | The dose returns to due. **Nothing is announced** after Undo (AN-03). | Same | Dose status reverts, the snackbar closes, and focus lands somewhere sensible (record where and what is spoken there). |
| **UN-03** | Undo reachable inside the window | Fresh dose, stopwatch | Start timing at the "Mark as Taken" double-tap. Reach Undo with swipes or touch exploration. | n/a | n/a | Undo can be focused and activated before the snackbar closes. **Record the swipe count and seconds** as an observation for Risk R2. How long the window lasts is out of scope for #4, so a slow reach doesn't fail this case. |
| **UN-04** | Undo from "Skip this dose" | Medications → Metformin → a due dose | Double-tap "Skip this dose", then reach Undo as UN-01 | "Metformin skipped at …" then "Undo, button" | Same | As UN-01 and UN-02 |
| **UN-05** | Undo by keyboard (SC 2.1.1) | Hardware keyboard / FKA | Activate "Mark as Taken" with the keyboard, Tab to Undo, press Space/Enter | Visible focus on Undo | Same | Undo reachable and operable by keyboard within the window |
| **UN-06** | No phantom Undo on plain confirmations | Settings → App Settings → "Reset sample data" → confirm | Swipe to the snackbar | "Sample data reset" only | Same | No "Undo" stop and no empty button. |

### 4.3 Item 3: status announcements (SC 4.1.3)

iOS needs an explicit `AccessibilityInfo.announceForAccessibility` call. Android
already speaks `accessibilityLiveRegion`. The Android risk is the opposite of the
iOS one: **the same message spoken twice** if both mechanisms fire. Keep focus where
it is. None of these cases should move focus.

Announcement copy comes from `apps/react-mobile/src/data/announcements.ts`.

| ID | Case | Preconditions | Steps | Expected: VoiceOver | Expected: TalkBack | Pass criteria |
| --- | --- | --- | --- | --- | --- | --- |
| **AN-01** | Undoable action is announced | Today, a dose due | Double-tap "Mark as Taken", then **don't touch the screen** | "Metformin logged at 8:04 AM. Undo available" (time varies) | Same text, spoken **once** | Spoken without moving focus. Not cut off by the post-activation focus speech (if truncated, see Risk R3). Exactly once on Android. |
| **AN-02** | Plain confirmation is announced | Add a medication and save it | Wait on the destination screen | "<name> added" | Same, once | As AN-01 |
| **AN-03** | No undo-result announcement | UN-02 | Double-tap Undo | No "Undone" or other result message. Only whatever VoiceOver says for the element that gets focus next. | Same | No result is spoken. This is deliberate for this branch, because an unconditional "Undone" would be false if the undo failed. Undo result feedback is tracked as Risk R7. |
| **AN-04** | Form errors on step 1 are announced together | Medications → "Add Medication", both fields empty | Focus "Continue", double-tap | Two queued announcements, in field order: "Medication name: Enter the medication name, like Metformin", then "Dosage: Enter the dose, like 25 mg" | Both errors, each once | Every error heard. The second one doesn't cut off the first (iOS uses `queue: true`). Android doesn't repeat any. Focus stays on Continue. |
| **AN-05** | Error for the times step | Step 2 with no times | Double-tap "Continue" | "Add at least one time, like 8:00 AM" | Same, once | As AN-04 |
| **AN-06** | Errors don't re-announce on unrelated renders | AN-04 errors showing | Focus the Dosage field and type one character. Then swipe around the form. | Nothing new is spoken except typing echo. The name error isn't re-announced. | Same | No announcement fires on re-render, only on a new validation. |
| **AN-07** | Field error is part of the field's name | AN-04 | Swipe to the "Medication name" field | "Medication name. Enter the medication name, like Metformin, text field" (a hint may repeat the error) | Same, plus "error" on some versions | The error is tied to the field (SC 3.3.1 support). |
| **AN-08** | Appointment form errors | Appointments → "Add Appointment", empty step 1 → Continue | As AN-04 | Queued, in field order: the title field's error, then the location field's error, each prefixed with its label | Each once | As AN-04 |

### 4.4 Item 4: "Date & time" field (SC 4.1.2)

The only read-only `CcTextField` in the app is the **"Date & time" field on the Add /
Edit Appointment form** (`src/screens/appointments/AppointmentFormScreen.tsx`,
`testID="appointment-when"`, step 2 "Date, time & companion"). Its Jest stand-ins
belong in the new `AppointmentFormScreen.test.tsx`, as well as `CcTextField.test.tsx`.
Also run DT-01 and DT-02 through **Edit** (Manage → an appointment, caregiver role),
where the field starts with a value.

| ID | Case | Preconditions | Steps | Expected: VoiceOver | Expected: TalkBack | Pass criteria |
| --- | --- | --- | --- | --- | --- | --- |
| **DT-01** | Field has a name, not just "button" | Appointments → "Add Appointment", fill step 1, Continue to "Date, time & companion" | Swipe right to the date control | "Date & time. Choose the date and time, button", then the hint "Opens a picker to change it" | Same, "…, button" / "double-tap to activate" | Name contains "Date & time". Never announced as a bare "button". |
| **DT-02** | Chosen value is announced | DT-01 | Double-tap, pick a date and a time, return | Picker opens. Afterwards the control reads "Date & time, <formatted date and time>, button". | Same | The value in speech matches the value on screen. |
| **DT-03** | One focus stop | DT-01 | Swipe through the field | The visible "Date & time" caption may be a static text stop. The control itself is **one** stop. | Same | No separate unnamed text-field stop behind the button. |
| **DT-04** | Error on the date field | Add Appointment step 2, date left empty; double-tap "Save appointment" | Listen, then swipe to the field | "Date & time: Choose the date and time" announced (AN rules). The field's name is "Date & time. Choose the date and time", said **once**, not twice. | Same | As AN-04 and DT-01 |
| **DT-05** | Keyboard opens the picker (SC 2.1.1) | Hardware keyboard | Tab to the field, press Space/Enter | Picker opens | Same | Reachable and operable. |

### 4.5 Item 5: touch targets (team 44 pt floor; AA 2.5.8 24 pt)

Measure the **element's own frame**, not the area a finger happens to hit. `hitSlop`
enlarges the touchable area, but it isn't shown in the Inspector frame or the
screen-reader focus box and doesn't count toward the team floor.

| ID | Case | Steps | Tool | Pass: team floor | Pass: AA |
| --- | --- | --- | --- | --- | --- |
| **TG-01** | Remove-time button ("Remove 8:00 AM") | Add Medication → step 2 → add a time. Inspect the ✕ button. | Accessibility Inspector frame (iOS). Layout Inspector or "Show layout bounds" (Android). | Frame ≥ 44 × 44 pt | Frame ≥ 24 × 24 pt |
| **TG-02** | Undo button | Trigger UN-01 and inspect Undo inside the 10 s window (or reproduce with the demo clock) | Same | Frame ≥ 44 × 44 pt | ≥ 24 × 24 pt |
| **TG-03** | Focus box matches the target | Focus each with VoiceOver/TalkBack | Visual | The focus outline is at least as large as the visible target | n/a |
| **TG-04** | No layout breakage from the larger target | Look at the time row and snackbar at default and largest text size | Visual | Text isn't clipped, the row doesn't overflow, and the snackbar message is still readable | n/a |

---

## 5. Automated coverage mapping

Jest with React Native Testing Library (RNTL 12.9) runs in CI-style from
`apps/react-mobile/` (`npx jest`). These assertions **stand in** for the manual
cases in regression runs. They don't replace the first manual pass. The exact test
names are listed in [TEST_REPORT.md](TEST_REPORT.md) once the fix lands.

| Manual case | Jest assertion that stands in | What Jest can't show |
| --- | --- | --- |
| SW-01, SW-04 | Row (or `Switch`) found by `getByRole('switch', { name })` with `accessibilityState.checked` equal to the store value | Real speech, word order |
| SW-02, SW-07 | Activation (`fireEvent.press` or an `accessibilityAction` event on the switch element) flips the store, and a **re-query** shows the new `checked` | That VoiceOver re-announces the new state |
| SW-03, DT-03 | **Structural:** no ancestor of the switch / Undo / remove-time button has `accessible={true}`. If the row is the switch, the inner `Switch` is hidden from accessibility, so there are no duplicate stops. | Native focus traversal order |
| SW-05 | Disabled switch exposes `accessibilityState.disabled` (or equivalent) and doesn't toggle | "Dimmed"/"disabled" wording |
| SW-06 | Activating demo clock "on" calls `Alert.alert` (the same path as the Switch), and cancel leaves the state unchanged | Where VoiceOver focus goes when the alert opens |
| UN-01, UN-02, UN-04 | `getByRole('button', { name: 'Undo' })` **plus the structural check**. Pressing it calls `onUndo` once and hides the bar. | Swipe count and timing (UN-03) |
| AN-03 | Pressing Undo makes **no** `announceForAccessibility*` call beyond the snackbar's own one | Where focus lands after the bar disappears |
| AN-01, AN-02, AN-04, AN-05, AN-08 | `jest.spyOn` on `AccessibilityInfo.announceForAccessibility` / `announceForAccessibilityWithOptions`, called **once** per message with the exact copy from `data/announcements.ts` (and `{ queue: true }` where two can fire together) | Whether speech is audible, queued, or cut off. Whether TalkBack speaks it twice. |
| AN-06 | After `rerender` or typing, the spy's call count is unchanged | Real render timing on device |
| DT-01, DT-02 | In `AppointmentFormScreen.test.tsx` (step 2) and `CcTextField.test.tsx`: `getByRole('button', { name: /Date & time/ })`, the name includes the current value (Edit) or the empty-state text (Add), and pressing it opens the picker stub | Picker accessibility (native component) |
| TG-01, TG-02 | Flattened `style` of the pressable itself has `minWidth` and `minHeight` ≥ `TapTarget.minimum` (44) | **Real laid-out size.** Jest has no layout engine, so it can't catch a parent that squeezes the element. |
| SW-08, UN-05, DT-05 | None. Keyboard focus isn't modelled. | All of it (manual only) |

### Honest limits of Jest here

1. **Jest can't hear anything.** It checks props and function calls. It can't show
   that VoiceOver or TalkBack actually speaks, in what order, or whether one utterance
   cuts off another.
2. **RNTL doesn't model iOS grouping.** Checked in RNTL 12.9's
   `isHiddenFromAccessibility`: it treats `aria-hidden`,
   `accessibilityElementsHidden`, `importantForAccessibility="no-hide-descendants"`,
   `display: none` and modal siblings as hiding. It **doesn't** treat an `accessible`
   ancestor as hiding. So `getByRole('button', { name: 'Undo' })` **passes on the
   original, broken code.** Only the structural "no accessible ancestor" assertion
   catches issue #4 items 1 and 2 in Jest.
3. **No layout.** Style values can be asserted, and on-screen size can't. `hitSlop`
   is invisible to any size assertion and must not be treated as meeting the floor.
4. **Platform is a single mock value per test.** `Platform.OS` defaults to `ios` under
   `jest-expo`. An Android double-announcement only shows up if a test sets
   `Platform.OS = 'android'` explicitly, or on a device.
5. **Native components are mocked.** `DateTimePicker` is a `View` stub
   (`jest.setup.js`), so picker accessibility is manual only.

---

## 6. Entry and exit criteria

**Entry:** the fixes for items 1 to 5 are in the working tree, and `npx jest`,
`npm run lint` and `npm run typecheck` are green from `apps/react-mobile/`
(baseline: 27 suites / 190 tests).

**Exit (issue #4 can close):**

- Every case in §4 passes on **both** a VoiceOver device and a TalkBack emulator
  (TG cases on at least one of each), or has a recorded, accepted exception.
- The automated mapping in §5 exists for every row that has a Jest stand-in.
- **Branch coverage for `apps/react-mobile` is ≥ 75 %** (global, from `npx jest
  --coverage`). Baseline at `HEAD` is 69.36 % (532 / 767). Measure with
  `--coverageDirectory` pointed at a scratch folder, **never** the committed
  `apps/react-mobile/coverage/`, and confirm `git status` shows no changes under that
  directory.
- Results are recorded in [TEST_REPORT.md](TEST_REPORT.md) and in the
  verification log in `docs/ACCESSIBILITY.md` §4, with date, device and tester.
  A case isn't *Verified* until a person has heard it.

## 7. Risks

| ID | Risk | Mitigation |
| --- | --- | --- |
| R1 | Android speaks each status message twice (live region + `announceForAccessibility`) | AN cases require "once". Announce only on iOS, or drop the live region. |
| R2 | A 10 s undo window is tight for a VoiceOver user who has to swipe to the bottom of the screen | **Known risk, out of scope for #4.** The undo duration is handled in PR #18, which currently changes only Flutter files, so the react-mobile side is still open there. UN-03 records swipes and time as evidence for #18. SC 2.2.1 isn't breached because undo is additive. |
| R7 | Undo gives a screen-reader user no spoken result. The "Undone" announcement was dropped from this branch because it was unconditional and would claim success even if the undo failed. | **Known follow-up, out of scope for #4, tied to PR #18** alongside R2. A result announcement should fire only after `undoDoseChange` resolves, with a different message on failure. AN-03 checks that nothing false is spoken today. |
| R3 | iOS cuts off an announcement that fires at the same moment as the focus speech after a double-tap | AN-01 listens for truncation. `announceForAccessibilityWithOptions(msg, { queue: true })` on iOS queues it instead. |
| R4 | The row-as-switch fix leaves the inner `Switch` focusable, giving two stops | SW-03 and the structural Jest check |
| R5 | `accessibilityState.checked` is computed once and goes stale after an async store write | SW-02 re-reads the state after swiping away and back. The Jest re-query checks the same thing. |
| R6 | Simulator-only runs get reported as VoiceOver verified | §2: VoiceOver speech needs a physical iPhone. Inspector results are recorded as "Inspector", not "VoiceOver". |

## 8. Recording results

Copy this table into the report for each run.

| Case | Platform | Device / OS / AT version | Result (Pass / Fail / N/A) | Speech heard (verbatim) | Notes | Tester | Date |
| --- | --- | --- | --- | --- | --- | --- | --- |
