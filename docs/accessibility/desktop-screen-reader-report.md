# Desktop screen reader test report (#62)

**Screen reader:** VoiceOver, macOS 26.6.2 · **App:** CareConnect desktop, Electron 39.8.10 dev build · **Build:** `dev` at `0ff70f6` · **Date:** 10/13/2026 · **Run by:** Shayne McPherson, with the key presses scripted by Claude Code on Shayne's Mac

Assignment 9, Part 1 item 3 (Screen Reader Testing). This report covers the Electron desktop app. Its companions are the keyboard-only checklist ([`desktop-keyboard-checklist.md`](desktop-keyboard-checklist.md), #61), the axe results (#63) and the desktop VPAT ([`SWEN661_F26_Team5_VPAT_Desktop_A9_v1.2.docx`](SWEN661_F26_Team5_VPAT_Desktop_A9_v1.2.docx), #65).

**Result: 26 pass, 5 partial, 1 fail, 14 not run.** Every Fail and Partial row has a finding in section 8.

## How the run was done

VoiceOver was driven with scripted key presses: VO keys (Control+Option), Tab, Return, Escape and the app's own shortcuts. What VoiceOver said was read from its caption panel after each key. The caption panel screenshots are in [`screen-reader/`](screen-reader/), and the quotes below are copied from them. The app ran with a fresh, empty profile, so the demo data matches a clean install (care recipient "Margaret").

The 3 to 5 minute video (section 11) is a separate scripted take of the same steps, recorded with VoiceOver's speech as the audio track.

## 1. Setup

```bash
npm ci
npm run dev:web        # terminal 1: Vite on http://localhost:5173
npm run dev:desktop    # terminal 2: the Electron app
```

- Start VoiceOver with Cmd+F5. VO means Control+Option.
- Sign up with any name and email (the mock sign-in keeps the account on this machine and ignores the password), then choose "I am the Care Recipient".
- Keys used: Tab and Shift+Tab, VO+Right and VO+Left (next and previous item), VO+Shift+Down (interact), VO+U (rotor), VO+Command+H (next heading), VO+F2 (window title), VO+M (menu bar), and the app's shortcuts (Help > Keyboard Shortcuts).
- In a dev build the app menu is named "Electron". The packaged app names it "CareConnect".
- If Dictation's "Press Control key twice" shortcut is on, quick VO key presses can open a Dictation prompt that takes VoiceOver's focus. Space the presses out, and check what is focused before pressing Return.

**Result values:** **Pass** (spoken correctly and the action works), **Partial** (works, but the speech is wrong, doubled or unclear), **Fail** (the speech or the action is broken), **Not run**.

## 2. Window title, landmarks and headings

| # | Check | Expected from the code | Result | What VoiceOver said / issue |
|---|---|---|---|---|
| 2.1 | VO+F2 reads the window title | "*Screen* - CareConnect" (#55) | Pass | "Home - CareConnect, window"; "Medicines - CareConnect, window"; "My Appointments - CareConnect, window"; "My Day - CareConnect, window" |
| 2.2 | The title changes after every navigation | New title each time | Pass | Changed on ⌘1 to ⌘4, and on the Manage pages ("Manage Appointments - CareConnect, window"). The caregiver Dashboard is still titled "Home": SR-7 |
| 2.3 | Rotor > Landmarks | banner, "Main content" (main), "Main navigation" (navigation) | Pass | "banner", "Main content main", "Main navigation navigation", "content information". Every schedule card is also a region: SR-6 |
| 2.4 | Rotor > Headings | One h1, no skipped levels (#50, #68) | Pass | Home: "1: Here's your day, Margaret", "2: Later today", four "3:" items, "2: Quick actions". Dashboard: h1 "Dashboard", h2 "Margaret's status today", h2 "Alerts" (garbled, SR-1) |
| 2.5 | The first Tab stop is "Skip to main content", and it moves VoiceOver into main | Skip link, then "Main content" | Pass | "link, Skip to main content" (Shift+Tab past it wraps to the last link); Return: "Main content, main" |
| 2.6 | Orientation bar read with VO+Right | Date, time, greeting, current screen; the time is not re-announced | Pass | "Tuesday 13 October", "9:54 PM", "Good evening, Margaret". The clock was not re-announced while idle |
| 2.7 | The caregiver role shows whose plan is open | "Viewing *patient*'s care plan" | Not run | The role switch worked ("heading level 1, Dashboard"), but a VoiceOver hint replaced the caption before this line could be confirmed |

Page switching (⌘1 to ⌘6): VoiceOver speaks the menu item ("Medicines", "Appointments") and the window title updates. Focus stays where it was, so the next Tab continues from the old position. Not logged as a finding.

## 3. Navigation and links

| # | Check | Expected from the code | Result | What VoiceOver said / issue |
|---|---|---|---|---|
| 3.1 | Care recipient nav items | Each item, link; the open page says "current page" | Pass | "link, Home, list 6 items", "link, My Day", "link, Appointments", "current page, link, Medicines" |
| 3.2 | Caregiver nav items | "Dashboard", "Medications", "Appointments", "Activity", "Notes" | Not run | |
| 3.3 | Logo link | "CareConnect — go to home, link" | Pass | "link, CareConnect — go to home" |
| 3.4 | Switch role button | "Switch to caregiver role, button" | Pass | "Switch to caregiver role, button". The visible text "Switch role" is not part of that name: SR-10 |
| 3.5 | Sign out button | "Sign out of CareConnect, button" | Pass | "Sign out of CareConnect, button" |
| 3.6 | Call my caregiver | "Call my caregiver: Joyce — 07700 900 456, link" | Pass | "link, Call my caregiver: Joyce — 07700 900 456" |
| 3.7 | No icon read on its own, no control read as just "button" | Decorative icons are `aria-hidden` | Pass | None heard in this run |

## 4. Menu bar and command results

| # | Command (shortcut) | Expected speech | Result | What VoiceOver said / issue |
|---|---|---|---|---|
| 4.1 | VO+M, then arrow through the menus | Each menu and item, with its shortcut | Pass | "menu bar Apple", "Electron", "File", then "View, menu, 11 items Home ⌘1", "Medicines ⌘2", "High Contrast ⌘⇧H", "Enter Full Screen fnF"; Escape: "Closing menu" |
| 4.2 | View > High Contrast (Shift+Cmd+H) | The item reads as checked or unchecked | Not run | Read as "High Contrast ⌘⇧H". The checked state with High Contrast on was not checked, and toggling by shortcut is silent |
| 4.3 | Dose > Mark Next Dose Taken (Cmd+Return) | "*Dose* marked as taken." | Pass | "Evening medications marked as taken." (once) |
| 4.4 | Dose > Undo Last Dose Change (Shift+Cmd+U) | "Undid the last change to *dose*." | Pass | "Undo Last Dose Change", then "Undid the last change to Evening medications." |
| 4.5 | Dose > Remind Me in 10 Minutes | "Reminder set for *dose* in 10 minutes." | Not run | Skipped on purpose: it schedules a real notification 10 minutes later |
| 4.6 | Edit > Pause Reminders / Duplicate / Share with Caregiver | The matching confirmation | Not run | |
| 4.7 | Edit > Find (Cmd+F) | Focus on the medicine search, read by name | Pass | "Search medicines Name, dose or instructions, search text field, search" |
| 4.8 | Edit > Find with a half-typed caregiver note | "Save or clear what you typed before searching medicines." | Not run | |
| 4.9 | File > New Medication (Cmd+N) | Focus in the medication name field (#70) | Pass | "Medication name (required) (required) e.g. Amlodipine, required, edit text, Add new medication, region". "required" three times: SR-2 |
| 4.10 | File > New Appointment (Shift+Cmd+N) | Focus in the title field (#45) | Pass | "Appointment title (required) (required) Use plain language Margaret will recognise., required, edit text, Add new appointment, region" |
| 4.11 | Edit > Open Medication | Opens the medicine | Not run | Known: #71 |
| 4.12 | Help > Keyboard Shortcuts (Cmd+/), then Escape | The window is read; Escape returns to the app (#73) | Pass | Opens as "Keyboard Shortcuts — CareConnect, window … empty, group". After VO+Shift+Down twice: "heading level 1, Keyboard shortcuts" (SR-9). Escape: "Add appointment, button, Main content, main, Manage Appointments - CareConnect, window" |

## 5. Dialogs

| # | Check | Expected from the code | Result | What VoiceOver said / issue |
|---|---|---|---|---|
| 5.1 | Dose > Skip Next Dose… (Shift+Cmd+S) | "Skip *dose*?, dialog"; focus inside | Pass | "dialog, with 6 items, Close dialog, button". The question only comes on the next item, "heading level 2, Skip Evening medications?": SR-8 |
| 5.2 | Tab stays inside the open dialog | `aria-modal`; the page behind is not reached | Pass | "Cancel, button", "Skip dose, button", "Close dialog, button", then round again |
| 5.3 | Close button | "Close dialog, button" | Pass | "Close dialog, button" |
| 5.4 | Escape closes the skip dialog | Focus goes back to the control that had it | Pass | Back on "Mark Atorvastatin as taken, toggle button", the control focused before the shortcut. #46 stays open for the visible-focus case in the keyboard checklist |
| 5.5 | Delete medication dialog | Title and description read | Not run | Known: #72 |

## 6. Forms and errors

| # | Check | Expected from the code | Result | What VoiceOver said / issue |
|---|---|---|---|---|
| 6.1 | Add medication: each field read with its label; required fields say "required" | Label, then "(required)" | Partial | Every label is read, but "required" is said three times: SR-2 |
| 6.2 | Dose time fields | Each time field labelled; the group says one time is required | Partial | "Schedule times (required) — at least one time is required, group", but an empty time reads "-9.1%, Hours Time, stepper", "0%, Minutes Time, stepper", "-100%, AM/PM Time, stepper": SR-3 |
| 6.3 | Submit an empty medication form | Focus moves to the error summary, read right away | Pass | "Please fix the following before saving:, and 1 more item, alert"; VO+Right: "list 3 items" |
| 6.4 | Each field error | Read with its field | Not run | |
| 6.5 | Add appointment: same as 6.1 to 6.4 | Same | Partial | Same triple "required" on the title field (SR-2). Errors not run |
| 6.6 | Escape closes the add forms (#74) | Focus returns to the page | Partial | From a field it closes and lands on "Add appointment, button". After a failed save Escape does nothing, because the focused error summary is outside the form: SR-4 |
| 6.7 | Sign in with an unknown email | The error is read immediately | Not run | |

## 7. Screen content

| # | Screen | What to check | Result | What VoiceOver said / issue |
|---|---|---|---|---|
| 7.1 | Home | Cards read in order; action tiles have names | Pass | "heading level 1 Here's your day, Margaret, 2 items", "3 of 10 things done today", "Next thing to do, region", "Video call with Maria"; tiles such as "Medications — View and mark today's medicines" |
| 7.2 | My Day | Items read with time and status | Not run | Opened only (title in 2.1) |
| 7.3 | Badges read as separate words (#52) | Not "Coming upAppointment" | Pass | On Home, VO+Right reads "Coming up", then "Appointment". #52 stays open: NVDA reads them as one word |
| 7.4 | Medicines | Each medicine and its state; the search count spoken once | Partial | "Amlodipine 5 mg — 1 tablet — taken, article"; search: "No medicines match "met"." once. The toggles say "Mark Amlodipine as not taken, selected, toggle button": SR-5 |
| 7.5 | Memories | Filters and "Read more" | Not run | |
| 7.6 | Contacts | Call links name the person | Not run | |
| 7.7 | Caregiver Dashboard | The alert count reads with context (#69) | Fail | "heading level 2 Alerts, level 1 , , level 1 5 , level 1 total, level 1, 4 items": SR-1. The alerts themselves read well ("Atorvastatin — overdue, 1 of 5") |
| 7.8 | Activity Log and Caregiver Notes | Entries read with time and action | Not run | |

## 8. Findings

SR-1, SR-2, SR-4 and SR-10 are fixed in #79 and were re-checked with VoiceOver on that branch ([`screen-reader/11-fixes-retest-pr-79.png`](screen-reader/11-fixes-retest-pr-79.png)). The other six still need issues.

| ID | Where | What happened | WCAG | Suggested fix | Issue |
|---|---|---|---|---|---|
| SR-1 | Caregiver Dashboard, Alerts heading (`CaregiverDashboard.tsx:373`) | The heading is read in pieces: "Alerts, level 1 , , level 1 5 , level 1 total". The hidden text `, {count} total` renders as three text nodes | 1.3.1 | Give screen readers one piece of text, "Alerts, 5 total", and hide the visible word and badge. Now read as "heading level 2, Alerts, 5 total" | Fixed in #79 |
| SR-2 | All required fields (`Field.tsx:121`, labels in `ManageMedications.tsx` and `ManageAppointments.tsx`) | "required" is read three times: the label text, the hidden "(required)" and the `required` attribute | 3.3.2 (met, but noisy) | Drop the hidden "(required)" from `Field` and `SelectField`. Now "Medication name (required) e.g. Amlodipine, required, edit text" | Fixed in #79 |
| SR-3 | Medication time field | An empty time reads "-9.1%, Hours Time, stepper" and "-100%, AM/PM Time, stepper". This is how Chromium exposes an empty `<input type="time">` | 4.1.2 | Start the field with a default time, or use labelled hour and minute selects | to file |
| SR-4 | Add medication and Add appointment forms (`ManageMedications.tsx:166` vs `:187`, `ManageAppointments.tsx:264` vs `:285`) | After a failed save, focus is on the error summary, which is outside the `<form>` that handles Escape, so Escape stops closing the form | 2.1.1 (Cancel still works) | Move the Escape handler to the section that wraps the summary and the form. Follow-up to #74 | Fixed in #79 |
| SR-5 | Medicine and schedule toggles (`Medications.tsx:298`, `Schedule.tsx:148`) | The label changes with the state and the button also reports pressed: "Mark Amlodipine as not taken, selected, toggle button" | 4.1.2 | Keep one label ("Amlodipine taken") with `aria-pressed`, or change the label and drop `aria-pressed` | to file |
| SR-6 | Schedule cards (`Card.tsx:47`) | Every card is a region landmark (Walk in the garden, Lunch, Rest time and more), which crowds the landmark list | 1.3.1 (best practice) | Drop `aria-label` from the card `section`, or use an element that is not a landmark | to file |
| SR-7 | Caregiver Dashboard window title (`Layout.tsx:52`) | The title is "Home - CareConnect" while the page and the nav say "Dashboard" | 2.4.2 | Title the caregiver index "Dashboard" | to file |
| SR-8 | Skip dose dialog (`ConfirmDialog.tsx`) | Opens on "Close dialog, button"; the question is only read on the next item | 4.1.2 (minor) | Put initial focus on Cancel and check the dialog name is read on open | to file |
| SR-9 | Keyboard Shortcuts window (`shortcutsWindow.cjs`) | VoiceOver lands on an "empty group" and needs VO+Shift+Down twice to reach the content | 2.4.3 (minor) | Focus the window's `main` or h1 when it loads | to file |
| SR-10 | Header "Switch role" button (`Layout.tsx:214`) | The visible text "Switch role" is not part of the name "Switch to caregiver role" | 2.5.3 | Name it "Switch role to caregiver" (and "… to care recipient") | Fixed in #79 |

## 9. Screen reader fixes already made for A9

These are merged on `dev`. The last column is what this run showed.

| PR | Fix | WCAG | This run |
|---|---|---|---|
| #40 | Dose commands from the menu bar announce their result in a status region | 4.1.3 | Confirmed (4.3, 4.4) |
| #58 | Dialog focus return, window titles per screen (#55), labels that match visible text (#56), one patient name (#48) | 2.4.2, 2.4.3, 2.5.3 | Confirmed (2.1, 5.4, "Margaret" everywhere) |
| #59, #68 | Appointments heading levels fixed, and a heading-order test on every main screen | 1.3.1 | Confirmed on Home and Dashboard (2.4) |
| #69 | `aria-label` on plain spans and divs moved into visually hidden text | 4.1.2 | Partly: the Alerts count is read, but in pieces (SR-1, fixed in #79) |
| #76 | Focus into the New Medication form (#70), back to the app after Keyboard Shortcuts (#73), Escape closes the add forms (#74) | 2.4.3, 2.1.1 | Confirmed (4.9, 4.12, 6.6), with the gap in SR-4 |

## 10. Known limitations

Open issues that a VoiceOver user will still meet in this build. Each one is also in the VPAT.

| Issue | What the user hears | Workaround |
|---|---|---|
| #46 | After the skip dialog closes, keyboard focus may not be visible (VoiceOver focus did return in this run) | Press Tab, or VO+Shift+Up and move back into "Main content" |
| #52 | Badge text runs into the next word in NVDA | VoiceOver reads them as separate items with VO+Right |
| #71 | Edit > Open Medication does nothing | Activate the medicine directly in the list |
| #72 | After deleting a medicine, focus is lost | Press Tab to reach the medicine search |
| SR-1, SR-2, SR-4, SR-10 | See section 8 | Fixed in #79, until it merges |
| SR-3, SR-5 to SR-9 | See section 8 | Not filed yet |

## 11. Video (3 to 5 minutes)

**File:** `Team5_A9_Desktop_VoiceOver_Screen_Reader_Test.mp4` (submitted with A9, not committed) · **Length:** 3:51 · **Recorded:** 10/13/2026 on `dev` at `0ff70f6`

The audio is VoiceOver's own speech. Only the CareConnect and VoiceOver windows were captured, with a label under the app naming each step and its keys:

1. Window title (VO+F2)
2. Skip link (Tab, then Return)
3. Read the page (VO+Right)
4. Rotor: headings, form controls, landmarks (VO+U)
5. Switch pages (⌘2, then VO+F2)
6. Edit > Find (⌘F), then Tab through the medicines
7. Dose > Mark Next Dose Taken (⌘Return)
8. Dose > Undo Last Dose Change (⌘⇧U)
9. Skip Next Dose dialog (⌘⇧S, Tab, Escape)
10. File > New Medication (⌘N): labels, errors, then Escape (shows SR-2, SR-3 and SR-4)
11. Help > Keyboard Shortcuts (⌘/), then Escape
12. Menu bar (VO+M, arrow keys, Escape)
13. Appointments (⌘3, then VO+⌘H for headings)
