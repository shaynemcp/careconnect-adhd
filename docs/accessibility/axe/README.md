# axe-core results for the desktop app (#63)

- **Build:** `dev` at `0ff70f6`, Electron 39.8.10 dev build (the web app served by Vite)
- **Tool:** axe-core 4.14.0, run inside the Electron window with the WCAG 2.0, 2.1 and 2.2 A and AA tags (wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa)
- **Date:** 10/13/2026
- **Result:** **0 violations in all 36 scans** (18 screens, each in normal and High Contrast mode)

## How it was run

Playwright launched the Electron app with a fresh profile and opened each screen. axe-core was injected into the window and run, then a results panel was drawn on the page and the window was captured. The panel is added after the scan, so it is not part of what axe checked. High Contrast mode was switched on with View > High Contrast, the same menu item a user would use. The full results for each scan are in `json/`, and `summary.json` lists them all.

## Results

| Screen | Violations (normal) | Violations (High Contrast) | Rules passed | Needs review | Screenshots |
|---|---|---|---|---|---|
| Landing | 0 | 0 | 25 | 1 | `01-landing-normal.png`, `101-landing-high-contrast.png` |
| Sign in | 0 | 0 | 26 | 0 | `02-sign-in-normal.png`, `102-sign-in-high-contrast.png` |
| Sign up | 0 | 0 | 26 | 0 | `03-sign-up-normal.png`, `103-sign-up-high-contrast.png` |
| Home | 0 | 0 | 24 | 1 | `04-home-normal.png`, `104-home-high-contrast.png` |
| My Day | 0 | 0 | 24 | 1 | `05-my-day-normal.png`, `105-my-day-high-contrast.png` |
| Appointments | 0 | 0 | 24 | 1 | `06-appointments-normal.png`, `106-appointments-high-contrast.png` |
| Medicines | 0 | 0 | 26 | 1 | `07-medicines-normal.png`, `107-medicines-high-contrast.png` |
| Memories | 0 | 0 | 25 | 1 | `08-memories-normal.png`, `108-memories-high-contrast.png` |
| Contacts | 0 | 0 | 23 | 1 | `09-contacts-normal.png`, `109-contacts-high-contrast.png` |
| Caregiver Notes | 0 | 0 | 23 | 1 | `10-caregiver-notes-normal.png`, `110-caregiver-notes-high-contrast.png` |
| Activity Log | 0 | 0 | 24 | 1 | `11-activity-log-normal.png`, `111-activity-log-high-contrast.png` |
| Manage Medications | 0 | 0 | 24 | 1 | `12-manage-medications-normal.png`, `112-manage-medications-high-contrast.png` |
| Manage Appointments | 0 | 0 | 24 | 1 | `13-manage-appointments-normal.png`, `113-manage-appointments-high-contrast.png` |
| Add Medication form with errors | 0 | 0 | 28 | 1 | `14-add-medication-form-with-errors-normal.png`, `114-add-medication-form-with-errors-high-contrast.png` |
| Add Appointment form | 0 | 0 | 27 | 1 | `15-add-appointment-form-normal.png`, `115-add-appointment-form-high-contrast.png` |
| Skip dose dialog | 0 | 0 | 27 | 1 | `16-skip-dose-dialog-normal.png`, `116-skip-dose-dialog-high-contrast.png` |
| Caregiver Dashboard | 0 | 0 | 25 | 1 | `17-caregiver-dashboard-normal.png`, `117-caregiver-dashboard-high-contrast.png` |
| Keyboard Shortcuts window | 0 | 0 | 13 | 1 | `18-keyboard-shortcuts-window-normal.png`, `118-keyboard-shortcuts-window-high-contrast.png` |

## Needs review

axe flags these as "needs review" because it cannot decide them automatically. None is a violation:

- **The "·" separator in the header** (`.text-neutral-300`, aria-hidden): decorative, not text. axe reports "content is too short to determine if it is actual text".
- **Landing hero text on the blue gradient:** axe cannot work out a background color from a gradient. These were checked by hand at 6.55:1 to 8.74:1 (VPAT evidence).
- **Skip dialog title and description:** the dialog sits over a dimmed backdrop, so axe cannot pick the background. The panel is opaque white with the neutral-800 and neutral-600 text tokens, which `npm run check:contrast` covers.
- **Key caps in the Keyboard Shortcuts window** (`kbd` with only symbols such as ⌘ and ⇧): no text characters to measure.

## Observation

The Keyboard Shortcuts help window does not switch to High Contrast. It is a separate window that does not get the `cc-high-contrast` class, so its "High Contrast" scan is the same as the normal one (0 violations either way).
