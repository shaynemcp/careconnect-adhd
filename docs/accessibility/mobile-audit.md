# Mobile accessibility audit — React Native app (Assignment 6)

**Scope:** `apps/react-mobile`. **Standard:** WCAG 2.2 AA plus Android and iOS
platform guidance (48 dp targets, screen-reader semantics).

**Status (updated 2026-09-22, after #19):** Part 1 is a static review of the
source code, written before #19 (the #4 fix) landed. The status table after it
says what #19 fixed and what is still open. Part 2 now has results: VoiceOver
on the iOS Simulator (2026-09-21) and on an iPhone 13 Pro Max (2026-09-22), and
Antonio Wilson's TalkBack pass on the Android emulator (2026-09-22, re-checked
on `f498db5`). The full evidence is in
[`docs/qa/voiceover-a11y/TEST_REPORT.md`](../qa/voiceover-a11y/TEST_REPORT.md)
§7–8 and on PR #19. Cells marked *not run* are still open.

## Part 1 — Static review findings

| # | Sev. | Where | Finding | Suggested fix |
|---|------|-------|---------|---------------|
| 1 | High, verify | `AppSettingsScreen.tsx` (Demo clock row), `NotificationsSettingsScreen.tsx` (Daily digest, Overdue alerts), `CaregiverAccessScreen.tsx` (Share row) | Each switch row is an `accessible` View with a fixed `accessibilityLabel` that never says on or off, has no role, and no `onPress`. On Android the row takes focus as a unit, so double-tap may do nothing and the state may not be announced. | Make the row a `Pressable` with `accessibilityRole="switch"`, `accessibilityState={{ checked }}`, and `onPress` toggling the value; hide the inner `Switch` from the accessibility tree. Keep the label to the row title. |
| 2 | High, verify | `UndoSnackbar.tsx` (~lines 79–92) | The snackbar is an `accessible` View wrapping the "Undo" button, so TalkBack may read the message as one item and not offer Undo as its own control. Undo also disappears after 10 s, which is short for a screen-reader user swiping through the screen. | Keep the live region on a non-accessible container so Undo is separately focusable. Consider a longer window when `AccessibilityInfo.isScreenReaderEnabled()` is true. |
| 3 | Medium, fixed in code, verify on device | `SignInScreen.tsx` lines 12 and 56 | Uses React Native's deprecated `SafeAreaView`, which only insets on iOS. With Android edge-to-edge (default on current Expo) the "CareConnect" heading may sit under the status bar. | Import `SafeAreaView` from `react-native-safe-area-context`, as the rest of the app already does through its provider. **Done:** the import was switched; still check the heading position on an emulator with edge-to-edge on. |
| 4 | Medium, verify | `CcTextField.tsx` (~lines 91–95), used by the Date & time field | The read-only date field is a `TextInput` (`editable={false}`) inside a button `Pressable`. TalkBack may announce it as a disabled edit box, and may not read the chosen value. | Give the wrapping `Pressable` an `accessibilityLabel` of "Date & time, <value>" with a hint "Opens the date picker", and hide the inner input from the accessibility tree. |
| 5 | Medium | `MedicationFormScreen.tsx` (~lines 229–238) | The "Remove <time>" button is a 20 dp icon with `hitSlop` 8, roughly 36 dp, below the 48 dp Android target (the app's own `TapTarget.icon` is 48). | Give the button `minWidth` and `minHeight` of `TapTarget.icon`. |
| 6 | Low | `MedicationDetailScreen.tsx` (~lines 197–210) | Every due dose row has an identical "Mark as taken" and "Skip this dose" button. A screen-reader user cannot tell which dose each belongs to. | Set `accessibilityLabel` to e.g. "Mark the 6:00 PM dose as taken". |
| 7 | Low, verify | All screens with `MaterialIcons` inside buttons (sign-in, Add buttons, sign-out) | Icon glyphs are rendered as text inside an accessible parent, so a screen reader might read them. | Set `accessible={false}` and `importantForAccessibility="no"` on decorative icons. |

### Status of each finding (2026-09-22)

| # | Status |
|---|--------|
| 1 | **Fixed in #19.** Each row is one `switch` with name, hint and on/off. Verified with VoiceOver (Simulator and device) and TalkBack. TalkBack found an extra silent stop on Share with Renee, fixed in `f498db5` and re-checked by Antonio. A hardware-keyboard Tab still stops on the toggle; tracked in #4. |
| 2 | **Fixed in #19** for reachability: Undo is its own 52.7 × 44 pt button, reached in 3 swipes (about 5 s) on the device. The short undo window is still open: #28. |
| 3 | **Fixed in #31.** The heading position with Android edge-to-edge is still to be checked on an emulator. |
| 4 | **Fixed in #19.** "Date & time. Choose the date and time", button, one stop, with a hint; the chosen value is read on existing appointments. Verified with VoiceOver and TalkBack. |
| 5 | **Fixed in #19.** Remove-time measures 48.0 × 48.0 pt on the Simulator. |
| 6 | **Open.** The detail screen's "Mark as taken" and "Skip this dose" labels still don't name the dose time. |
| 7 | **Confirmed** on the Simulator (", Add a time", ", Sign out"). Tracked in #26. |

Also found during the screen-reader runs (not in the static review): the
sign-in screen reads the role question after the Continue buttons (#27); iOS
dropped announcements posted right after a double-tap and spoke only the last
of two field errors (QA-03 and QA-04, both fixed in #19); and the iOS date and
time wheels only report a value once a wheel moves (#1).

What already looks right in the code: tab labels are always shown; screen and
section titles use `accessibilityRole="header"`; form errors are announced
(`accessibilityLiveRegion="polite"` and appended to the field label); radio
groups use `radiogroup` / `radio` with selected state; the step indicator is a
`progressbar` with a value; the call button and back button have labels.

## Part 2 — TalkBack / VoiceOver walkthrough

Setup: Android emulator (API 34) with Google Play, Settings → Accessibility →
TalkBack on. Also test at font size 200 % and with animations off. For iOS,
VoiceOver on an iPhone or the Simulator's Accessibility Inspector. Use the demo
clock (App Settings) so the screens match the design.

For every row: swipe right through the whole screen once and record whether the
order is logical, every control has a spoken name and role, and every action
works with double-tap. Then run the specific checks.

| Screen | Specific check | TalkBack | VoiceOver | Notes |
|--------|----------------|----------|-----------|-------|
| Sign in | Heading read first; passkey and email buttons named; role radios say selected/not selected; email error announced when Continue is pressed empty | *not run* | Role question read after the Continue buttons (#27) |  |
| Today | Orientation bar read as one sentence; dose card "Mark as Taken" works; after logging, snackbar text is announced and **Undo is reachable** (finding 2) | Undo announcement and Undo button work (Antonio) | Device: snackbar spoken after the QA-04 fix; Undo reached in 3 swipes, about 5 s | Undo window still short: #28 |
| Today | "Later today" items say "Opens the medication" | *not run* | *not run* |  |
| Medications list and detail | Cards named "Medication, dose"; status chip read; Mark as taken / Skip work; which dose is which (finding 6) | *not run* | *not run* | Finding 6 still open |
| Add medication (3 steps) | Step change announced ("Step 2 of 3, Schedule"); errors announced; Add a time opens the picker; Remove time is reachable and large enough (finding 5) | Validation announcements and remove-time label work (Antonio) | Device: "2 errors. Medication name: … Dosage: …" spoken; remove-time 48 × 48 pt (Simulator) |  |
| Appointments and form | Date & time field announces its value and opens the picker (finding 4); date then time dialogs work | Date & time control works (Antonio) | Device: name, hint, one stop; picker wheels read normally |  |
| Appointment edit and delete | Delete button reachable; confirm dialog read; focus returns sensibly afterward | *not run* | *not run* |  |
| Settings → Notifications | Daily digest switch announces name and on/off and toggles with double-tap (finding 1); Overdue alerts announced as always on | Switches and disabled Overdue alerts work (Antonio) | Device: "Daily digest, Switch button, on"; Overdue alerts "dimmed" |  |
| Settings → App Settings | Demo clock switch (finding 1); theme radios; Reset sample data confirm dialog; Sign out | Demo clock confirmation works (Antonio) | Device: focus moves into the Demo clock confirmation |  |
| Settings → Caregiver access | Each "can see" item read once (icon says "Shared"); share switch (finding 1) | Works after `f498db5` (Antonio) | Simulator: Share with Renee is one switch | TalkBack extra stop found and fixed in #19 |
| Caregiver Dashboard | Overdue alert card read as "Alert: …", hint "Opens the medication to log it"; Log now works | *not run* | *not run* |  |
| Caregiver Manage and Activity | Filter radios announce selected state; day headings are headings | *not run* | *not run* |  |
| Every screen | Focus order matches visual order; no unlabeled controls; nothing focusable that is off-screen; targets at least 48 dp | *not run* | Decorative icons add an empty piece to names (#26) | Keyboard Tab stops on toggles: #4 |
| Every screen | 200 % font size: nothing clipped, no horizontal scroll; landscape works | *not run* | *not run* |  |

Log any failure as a GitHub issue with the `accessibility` template
(`.github/ISSUE_TEMPLATE/accessibility_issue.yml`), and link it in the Notes column.
