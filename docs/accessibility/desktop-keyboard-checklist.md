# Desktop keyboard-only checklist (#61)

**Tester:** Antonio Wilson · **Platform:** Windows 11 · **Build:** `dev` at `8a7a1a5` · **Date:** 10/13/2026

Unplug the mouse or don't touch it. Use only Tab, Shift+Tab, the arrow keys, Enter, Space, Escape, Alt and the shortcuts below. In the Result column, write **Pass** or **Fail**. Every Fail needs an issue number (an existing one or a new one).

Pass means: the item works from the keyboard, focus is visible at every stop, and nothing traps focus.

## 1. Every page, from the navigation and from the View menu

| # | Check | Result | Notes / issue |
|---|---|---|---|
| 1.1 | First Tab on any page is "Skip to main content"; Enter moves focus into the main content | PASS | |
| 1.2 | Tab through the side navigation; Enter on each item opens that page (Home, My Day, Appointments, Medicines, Memories, Contacts) | PASS | |
| 1.3 | Switch to the caregiver role from the keyboard; nav reaches Dashboard, Medications, Appointments, Activity, Notes | PASS | |
| 1.4 | Ctrl+1 Home · Ctrl+2 Medicines · Ctrl+3 Appointments · Ctrl+4 My Day · Ctrl+5 Caregiver Notes · Ctrl+6 Activity Log, each opening the right page (check the window title) | PASS | |
| 1.5 | Tab order on each page follows the visual order (top to bottom, left to right) | PASS | |
| 1.6 | Focus indicator is visible at every stop, on light and dark backgrounds | PASS | |

## 2. Menu bar and every command (Alt opens the menus, arrow keys move, Enter runs, Escape closes)

| # | Menu: command (shortcut) | Result | Notes / issue |
|---|---|---|---|
| 2.1 | File: New Medication (Ctrl+N), opens the add form with focus in it | FAIL | ISSUE #70: New Medication opens through File → New Medication and Ctrl+N, but focus does not move into the form. |
| 2.2 | File: New Appointment (Ctrl+Shift+N), opens the add form, focus in the title field (#45) | PASS | |
| 2.3 | File: Print (Ctrl+P) | PASS | |
| 2.4 | File: Exit | PASS | |
| 2.5 | Edit: Undo / Redo / Cut / Copy / Paste / Select All (Ctrl+Z, Ctrl+Y, Ctrl+X, Ctrl+C, Ctrl+V, Ctrl+A) in a text field | PASS | |
| 2.6 | Edit: Find (Ctrl+F), focuses the medicine search; with a half-written caregiver note it keeps the note and says why | PASS | |
| 2.7 | Edit: Open / Edit / Duplicate Medication, Pause Reminders, Share with Caregiver, Delete Medication (with a medicine selected) | FAIL | ISSUE #71: Open Medication produces no action with a keyboard-selected medication. The other medication commands tested successfully. |
| 2.8 | Dose: Mark Next Dose Taken (Ctrl+Enter), result announced; also with focus on a link it marks the dose (#51) | PASS | |
| 2.9 | Dose: Skip Next Dose (Ctrl+Shift+S), dialog opens; see section 3 | PASS | |
| 2.10 | Dose: Remind Me in 10 Minutes; Edit Schedule | PASS | |
| 2.11 | Dose: Undo Last Dose Change (Ctrl+Shift+U) | PASS | |
| 2.12 | Dose: Call My Caregiver (Ctrl+Shift+C) | PASS | |
| 2.13 | View: Zoom In / Zoom Out / Actual Size (Ctrl+= / Ctrl+- / Ctrl+0) | PASS | |
| 2.14 | View: High Contrast (Ctrl+Shift+H), on and off; focus ring still visible in High Contrast | PASS | |
| 2.15 | View: Toggle Full Screen (F11) | PASS | |
| 2.16 | Help: Keyboard Shortcuts (Ctrl+/ and F1), Escape closes, focus returns | PASS | |
| 2.17 | Help: About CareConnect, closes from the keyboard | PASS | |
| 2.18 | View menu names match the pages they open: Home, Medicines, Appointments, My Day, Caregiver Notes, Activity Log (#47, #60) | PASS | |

## 3. Dialogs

| # | Check | Result | Notes / issue |
|---|---|---|---|
| 3.1 | Skip dose dialog: opens with focus inside; Tab and Shift+Tab stay inside | PASS | |
| 3.2 | Escape closes it; focus returns to where you were (or to the main content), on something with a name (#46) | FAIL | ISSUE #46: Escape closes the Skip Dose dialog, but focus is not visibly restored to the triggering/named control. |
| 3.3 | Time in the dialog is 12-hour ("5:30 pm") (#49) | PASS | |
| 3.4 | Delete medication dialog: focus inside, Tab trapped, Escape cancels, "Yes, delete" has a visible focus ring (#53) | FAIL | ISSUE #72: Delete Medication works by keyboard and the dialog correctly traps focus. Escape also correctly restores focus to the selected medication. However, after confirming deletion, no visible focus target remains; the next Tab moves to Search Medicines. |
| 3.5 | Keyboard Shortcuts window: Escape closes | FAIL | ISSUE #73: Keyboard Shortcuts opens correctly with Ctrl+/ and F1 and closes with Escape, but visible focus is not restored afterward. |

## 4. Forms (medications and appointments)

| # | Check | Result | Notes / issue |
|---|---|---|---|
| 4.1 | Add medication: every field reachable; dropdowns open and change with the arrow keys | PASS | |
| 4.2 | Submit empty: focus moves to the error summary, which names each missing field | PASS | |
| 4.3 | Edit and save a medication from the keyboard | PASS | |
| 4.4 | Add appointment: every field reachable, including date and time | PASS | |
| 4.5 | Submit empty appointment: errors announced and focusable | PASS | |
| 4.6 | Edit and delete an appointment from the keyboard | PASS | |
| 4.7 | Cancel buttons and Escape close forms without saving | FAIL | ISSUE #74: The Cancel button closes Add Appointment without saving, but Escape does not close the form. |

## 5. Other pages

| # | Check | Result | Notes / issue |
|---|---|---|---|
| 5.1 | Medicines: mark a medicine taken and untaken with Space/Enter | PASS | |
| 5.2 | Memories: filter buttons work; "Read more" expands and "Show less" collapses | PASS | |
| 5.3 | Contacts: call and directions links reachable | PASS / N/A | Call links are keyboard accessible and activate successfully. No Directions link/action is present in the current build, so Directions could not be tested. |
| 5.4 | Caregiver Notes: add a note; Ctrl+F with text typed keeps the note | PASS | |
| 5.5 | Sign out and sign back in from the keyboard | PASS | |

## 6. Overall

| # | Check | Result | Notes / issue |
|---|---|---|---|
| 6.1 | No keyboard trap anywhere | PASS | |
| 6.2 | Every shortcut uses Ctrl, Alt or a function key (no single-letter shortcuts) | PASS | |
| 6.3 | Repeat sections 1 and 3 with High Contrast on | PASS | |

**Summary:** 38 pass, 6 fail. Failures and issues: #46, #70, #71, #72, #73, #74
