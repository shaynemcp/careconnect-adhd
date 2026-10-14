# Desktop screen reader test report (#62)

**Tester:** Shayne McPherson · **Screen reader:** VoiceOver, macOS ___ (Cmd+F5) · **Build:** `dev` at `_______` · **Date:** __/__/2026

> **Status: DRAFT.** The test cases, the expected speech and the "watch for" notes come from the code on `dev` at `0ff70f6`. The **Result** and **What VoiceOver said** columns are empty until the VoiceOver run is done. Don't submit until every row has a result.

Assignment 9, Part 1 item 3 (Screen Reader Testing). This report covers the Electron desktop app. Its companions are the keyboard-only checklist ([`desktop-keyboard-checklist.md`](desktop-keyboard-checklist.md), #61), the axe results (`axe/`, #63) and the desktop VPAT (#65).

## 1. Setup

```bash
npm ci
npm run dev:web        # terminal 1: Vite on http://localhost:5173
npm run dev:desktop    # terminal 2: the Electron app
```

- Start VoiceOver with Cmd+F5. VO means Control+Option.
- Sign in with the demo account, then pick a role on the role chooser.
- Verbosity: VoiceOver defaults, with hints on. Speech rate low enough that the video is easy to follow.
- Keys used: Tab and Shift+Tab, VO+Right and VO+Left (read the next and previous item), VO+U (rotor: headings, landmarks, links, form controls, window title), VO+Space (activate), VO+F2 twice (window title), and the app's own shortcuts (Help > Keyboard Shortcuts, or F1).

**Result values:** **Pass** (spoken correctly and the action works), **Fail** (needs a fix: link an issue), **Partial** (works but the speech is unclear or doubled: link an issue), **N/A**.

## 2. Window title, landmarks and headings

| # | Check | Expected from the code | Result | What VoiceOver said / issue |
|---|---|---|---|---|
| 2.1 | VO+F2 twice on each screen reads the window title | "*Screen* - CareConnect", for example "Medicines - CareConnect" (#55). Landing is just "CareConnect" | | |
| 2.2 | The title changes after every navigation (nav click, Ctrl+1 to Ctrl+6) | New title each time | | |
| 2.3 | Rotor > Landmarks on a signed-in screen | banner, "Main content" (main), "Main navigation" (navigation) | | |
| 2.4 | Rotor > Headings on each of the 8 main screens | One h1 per screen, no skipped levels (#50, #68) | | |
| 2.5 | The first Tab stop is "Skip to main content", and activating it moves VoiceOver into main | Skip link, then "Main content" | | |
| 2.6 | Orientation bar read with VO+Right | Date, "Current time: …", the greeting, "Current screen: *screen*". The time is not announced every minute | | |
| 2.7 | The caregiver role shows whose plan is open | "Viewing *patient*'s care plan" | | |

**Watch for:** Ctrl+1 to Ctrl+6 change the page but don't move focus or post an announcement. Note what VoiceOver says (or doesn't say) after the shortcut. If it's silent, log it as an issue (2.4.3 / 4.1.3). The window title for Appointments is "My Appointments", while the nav and the View menu say "Appointments". Note whether that's confusing when spoken.

## 3. Navigation and links

| # | Check | Expected from the code | Result | What VoiceOver said / issue |
|---|---|---|---|---|
| 3.1 | Care recipient nav items | "Home", "My Day", "Appointments", "Medicines", "Memories", "Contacts", link; the open page also says "current page" | | |
| 3.2 | Caregiver nav items | "Dashboard", "Medications", "Appointments", "Activity", "Notes", with "current page" on the open one | | |
| 3.3 | Logo link | "CareConnect — go to home, link" | | |
| 3.4 | Switch role button | "Switch to caregiver role, button" (or "…care recipient role") | | |
| 3.5 | Sign out button | "Sign out of CareConnect, button" | | |
| 3.6 | Call my caregiver (care recipient screens) | "Call my caregiver: Joyce — 07700 900 456, link" | | |
| 3.7 | No icon is read on its own ("image", "heart") and no control is read as just "button" | Decorative icons are `aria-hidden` | | |

## 4. Menu bar and command results

The macOS menu bar is native, so VoiceOver reads it directly (VO+M opens it). The commands that change data report back through a polite status region (#40). Each message should be spoken **once**.

| # | Command (shortcut) | Expected speech | Result | What VoiceOver said / issue |
|---|---|---|---|---|
| 4.1 | VO+M, then arrow through File, Edit, View, Dose, Help | Each menu and item, with its shortcut | | |
| 4.2 | View > High Contrast (Shift+Cmd+H) | The menu item reads as checked or unchecked | | |
| 4.3 | Dose > Mark Next Dose Taken (Cmd+Return) | "*Dose* marked as taken." or "No medication doses left to mark today." | | |
| 4.4 | Dose > Undo Last Dose Change (Shift+Cmd+U) | "Undid the last change to *dose*." or "There is no dose change to undo." | | |
| 4.5 | Dose > Remind Me in 10 Minutes | "Reminder set for *dose* in 10 minutes." | | |
| 4.6 | Edit > Pause Reminders / Duplicate / Share with Caregiver (medicine selected) | The matching confirmation, for example "*Medicine* shared with caregiver." | | |
| 4.7 | Edit > Find (Cmd+F) | Focus lands on the medicine search field, which is read by name | | |
| 4.8 | Edit > Find with a half-typed caregiver note | "Save or clear what you typed before searching medicines." | | |
| 4.9 | File > New Medication (Cmd+N) | The form opens and focus is in the medication name field (#70, fixed in #76) | | |
| 4.10 | File > New Appointment (Shift+Cmd+N) | The form opens and focus is in the title field (#45) | | |
| 4.11 | Edit > Open Medication (medicine selected) | Opens the medicine | | Known: #71 |
| 4.12 | Help > Keyboard Shortcuts (Cmd+/), then Escape | The window opens and is read; after Escape VoiceOver is back in the app (#73, fixed in #76) | | |

## 5. Dialogs

| # | Check | Expected from the code | Result | What VoiceOver said / issue |
|---|---|---|---|---|
| 5.1 | Dose > Skip Next Dose… (Shift+Cmd+S) | "Skip *dose*?, dialog", then the description; focus inside the dialog | | |
| 5.2 | VO+Right and Tab stay inside the open dialog | `aria-modal`; the page behind is not read | | |
| 5.3 | Close button | "Close dialog, button" | | |
| 5.4 | Escape or Cancel closes the skip dialog | Focus goes back to the control that opened it, or to "Main content" | | Known: #46 |
| 5.5 | Delete medication dialog: open, read, confirm | Dialog title and description read; "Yes, delete" named | | Known: #72 (focus after delete) |

## 6. Forms and errors

| # | Check | Expected from the code | Result | What VoiceOver said / issue |
|---|---|---|---|---|
| 6.1 | Add medication: every field is read with its label, and required fields say "required" | Label, then "(required)" | | |
| 6.2 | Dose time fields | Each time field has a label; the group says at least one time is required | | |
| 6.3 | Submit an empty medication form | Focus moves to the error summary, which is read right away (alert) | | |
| 6.4 | Each field error | Read with its field | | |
| 6.5 | Add appointment: same as 6.1 to 6.4 | Same | | |
| 6.6 | Escape and Cancel close the add forms without saving (#74, fixed in #76) | Focus returns to the page | | |
| 6.7 | Sign in with a wrong password | The error is read immediately | | |

## 7. Screen content

| # | Screen | What to check | Result | What VoiceOver said / issue |
|---|---|---|---|---|
| 7.1 | Home | Summary cards read in order; the big action tiles have names | | |
| 7.2 | My Day | Schedule items read with time and status; changes are announced once | | |
| 7.3 | Appointments | Badges are read as separate words, not run together ("Coming upAppointment") | | Known: #52 |
| 7.4 | Medicines | Each medicine and its dose times; the search result count is spoken once, after typing pauses | | |
| 7.5 | Memories | Filter buttons say which filter is on; "Read more" and "Show less" | | |
| 7.6 | Contacts | Each call link names the person | | |
| 7.7 | Caregiver Dashboard | The alert count reads as a number with context ("…, 3 total"), not as a bare number (#69) | | |
| 7.8 | Activity Log and Caregiver Notes | Entries read with time and action; a saved note is announced | | |

## 8. Findings

Fill this in from the run. Every Fail or Partial row above gets a line here with an issue number.

| ID | Screen / command | What happened | WCAG | Issue | Status |
|---|---|---|---|---|---|
| SR-1 | | | | # | |

## 9. Screen reader fixes already made for A9

These are merged on `dev` and should pass in this run.

| PR | Fix | WCAG |
|---|---|---|
| #40 | Dose commands from the menu bar announce their result in a status region | 4.1.3 |
| #58 | Dialog focus return, window titles per screen (#55), labels that match visible text (#56), one patient name (#48) | 2.4.2, 2.4.3, 2.5.3 |
| #59, #68 | Appointments heading levels fixed, and a heading-order test on every main screen | 1.3.1 |
| #69 | `aria-label` on plain spans and divs (ignored by screen readers) moved into visually hidden text: the header clock, the alert count and others | 4.1.2 |
| #76 | Focus goes into the New Medication form (#70), back to the app after Keyboard Shortcuts (#73), and Escape closes the add forms (#74) | 2.4.3, 2.1.1 |

## 10. Known limitations

Open issues that a screen reader user will still meet in this build. Each one is also in the VPAT.

| Issue | What the user hears | Workaround |
|---|---|---|
| #46 | After the skip dialog closes, focus may not land on a named control | Press Tab, or VO+Shift+Up and move back into "Main content" |
| #52 | Appointment badge text runs into the next word | The card heading and date still read correctly |
| #71 | Edit > Open Medication does nothing | Activate the medicine directly in the list |
| #72 | After deleting a medicine, focus is lost | Press Tab to reach the medicine search |

## 11. Video (3 to 5 minutes)

**File:** `________` · **Length:** __:__ · **Recorded on build:** `_______`

Run sheet (turn on VoiceOver's caption panel so viewers can read the speech):

1. 0:00 Start VoiceOver, open CareConnect, read the window title (VO+F2 twice).
2. 0:30 Rotor: headings and landmarks; use the skip link.
3. 1:00 Move through the nav with Tab and VO+Right; switch screens with Cmd+2 and Cmd+3 and read the new title.
4. 1:45 Dose > Mark Next Dose Taken, then Undo: the result is spoken once each time.
5. 2:30 Skip Next Dose dialog: open, read, Tab inside, Escape, where focus returns.
6. 3:15 File > New Medication: labels, then submit empty to hear the error summary.
7. 4:00 Switch to the caregiver role: the dashboard alert count and "Viewing … care plan".
8. 4:30 Close with one known limitation from section 10 and its issue number.
