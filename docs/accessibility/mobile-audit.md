# Mobile accessibility audit — React Native app (Assignment 6)

**Scope:** `apps/react-mobile`. **Standard:** WCAG 2.2 AA plus Android and iOS
platform guidance (48 dp targets, screen-reader semantics).

**Status: partial.** Part 1 is a static review of the source code and is done.
Part 2 is the TalkBack and VoiceOver walkthrough. It has to be run on an
Android emulator or device (and an iPhone or simulator for VoiceOver), so the
result columns are blank until a team member fills them in. Nothing in Part 1
has been confirmed with a screen reader yet, so items marked *verify* are
predictions from reading the code.

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

What already looks right in the code: tab labels are always shown; screen and
section titles use `accessibilityRole="header"`; form errors are announced
(`accessibilityLiveRegion="polite"` and appended to the field label); radio
groups use `radiogroup` / `radio` with selected state; the step indicator is a
`progressbar` with a value; the call button and back button have labels.

## Part 2 — TalkBack / VoiceOver walkthrough (to be run on a device)

Setup: Android emulator (API 34) with Google Play, Settings → Accessibility →
TalkBack on. Also test at font size 200 % and with animations off. For iOS,
VoiceOver on an iPhone or the Simulator's Accessibility Inspector. Use the demo
clock (App Settings) so the screens match the design.

For every row: swipe right through the whole screen once and record whether the
order is logical, every control has a spoken name and role, and every action
works with double-tap. Then run the specific checks.

| Screen | Specific check | TalkBack | VoiceOver | Notes |
|--------|----------------|----------|-----------|-------|
| Sign in | Heading read first; passkey and email buttons named; role radios say selected/not selected; email error announced when Continue is pressed empty | | | |
| Today | Orientation bar read as one sentence; dose card "Mark as Taken" works; after logging, snackbar text is announced and **Undo is reachable** (finding 2) | | | |
| Today | "Later today" items say "Opens the medication" | | | |
| Medications list and detail | Cards named "Medication, dose"; status chip read; Mark as taken / Skip work; which dose is which (finding 6) | | | |
| Add medication (3 steps) | Step change announced ("Step 2 of 3, Schedule"); errors announced; Add a time opens the picker; Remove time is reachable and large enough (finding 5) | | | |
| Appointments and form | Date & time field announces its value and opens the picker (finding 4); date then time dialogs work | | | |
| Appointment edit and delete | Delete button reachable; confirm dialog read; focus returns sensibly afterward | | | |
| Settings → Notifications | Daily digest switch announces name and on/off and toggles with double-tap (finding 1); Overdue alerts announced as always on | | | |
| Settings → App Settings | Demo clock switch (finding 1); theme radios; Reset sample data confirm dialog; Sign out | | | |
| Settings → Caregiver access | Each "can see" item read once (icon says "Shared"); share switch (finding 1) | | | |
| Caregiver Dashboard | Overdue alert card read as "Alert: …", hint "Opens the medication to log it"; Log now works | | | |
| Caregiver Manage and Activity | Filter radios announce selected state; day headings are headings | | | |
| Every screen | Focus order matches visual order; no unlabeled controls; nothing focusable that is off-screen; targets at least 48 dp | | | |
| Every screen | 200 % font size: nothing clipped, no horizontal scroll; landscape works | | | |

Log any failure as a GitHub issue with the `accessibility` template
(`.github/ISSUE_TEMPLATE/accessibility_issue.yml`), and link it in the Notes column.
