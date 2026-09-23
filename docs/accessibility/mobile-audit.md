# Mobile accessibility audit — React Native app (Assignment 6)

**Scope:** `apps/react-mobile`. **Standard:** WCAG 2.2 AA plus Android and iOS
platform guidance (48 dp targets, screen-reader semantics).

**Status (updated 2026-09-23, after #19 and the #28 fix below):** Part 1 is a
static review of the source code, written before #19 (the #4 fix) landed. The
status table after it says what #19 fixed and what is still open. Part 2 has
on-device results: VoiceOver on the iOS Simulator (2026-09-21) and on an
iPhone 13 Pro Max (2026-09-22), and Antonio Wilson's TalkBack pass on the
Android emulator (2026-09-22, re-checked on `f498db5`). The full evidence is
in [`docs/qa/voiceover-a11y/TEST_REPORT.md`](../qa/voiceover-a11y/TEST_REPORT.md)
§7–8 and on PR #19. Cells marked *not run* are still open. **Addendum below**
covers #28 (the undo window), fixed in code on `quinton/talkback-a11y-maestro-w6`
after this document's Part 1/2 were written — see that section for its own
status and what's still owed.

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
| 2 | **Fixed in #19** for reachability: Undo is its own 52.7 × 44 pt button, reached in 3 swipes (about 5 s) on the device. The short undo window itself was tracked as #28 — **fixed in code as of 2026-09-23, not yet device-verified; see the Addendum below.** |
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
| Today | Orientation bar read as one sentence; dose card "Mark as Taken" works; after logging, snackbar text is announced and **Undo is reachable** (finding 2) | Undo announcement and Undo button work (Antonio) | Device: snackbar spoken after the QA-04 fix; Undo reached in 3 swipes, about 5 s | Undo window fix (#28) is code-complete, needs re-run on device — see Addendum |
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

## Addendum — #28, the undo window (Quinton, 2026-09-23)

Part 1/2 above (Shayne, #19) fixed Undo's *reachability* (finding 2, first
half) but left its 10-second auto-dismiss timer in place — flagged there as
"still open: #28," since a screen-reader or switch-control user who needs
several seconds and several swipes to reach the button could still watch it
disappear, or tap it after it had silently stopped working. This addendum is
a source-level fix for that timer, done without device access, so — consistent
with how the rest of this document treats "fixed" vs. "verified" — it is
**code-complete, not yet device-verified**. A TalkBack/VoiceOver pass on this
specific behavior is still owed, ideally by whoever next has device access.

**Changed:** `UndoSnackbar.tsx` (plus `types.ts` and `careDataStore.ts`, which
`onUndo` now reports success/failure through instead of a time gate). The undo
offer no longer auto-dismisses; it stays up until the user acts. An explicit,
separately-labeled Close button sits next to Undo so a screen-reader user can
dismiss it deliberately rather than relying on a timer. If `onUndo` reports
failure — e.g. the same dose was already undone from another screen — the bar
swaps to a fallback message ("That change can't be undone anymore.") instead
of vanishing silently, so the outcome is always confirmed one way or the
other. A plain confirmation snackbar (no action) is unaffected and still
auto-dismisses after 4 s, since WCAG 2.2.1's timing-adjustable concern doesn't
apply where there's nothing to reach before it disappears.

**Tests:** `UndoSnackbar.test.tsx` — no timer fires while an undo offer is
visible; both Undo and Close are present as separately labeled, real 44×44
controls; Close dismisses without calling `onUndo`; Undo dismisses on success;
a synchronous or async `onUndo() => false` swaps in the fallback message
(still closeable); a plain confirmation keeps its fixed-timer auto-dismiss.

**Still open after this addendum:**
1. The on-device TalkBack/VoiceOver pass on this behavior specifically
   (does the Close button actually get announced and focused correctly;
   does the fallback message get spoken).
2. Finding 5's wider scope from the earlier pass on this branch — iOS
   live-region announcements for form-error text generally, not just the
   snackbar — is still open (Shayne's lane per the charter).
3. This branch also adds `apps/react-mobile/e2e/` (three Maestro flows,
   including one exercising the undo offer's Close/Undo controls) and a
   dedicated `.github/workflows/react-mobile.yml` CI workflow; see
   `apps/react-mobile/e2e/README.md` for what those flows do and don't prove.
