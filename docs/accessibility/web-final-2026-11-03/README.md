# Final web accessibility evaluation (November 3, 2026)

Production build of `apps/web` at `955d32a` (the code merged to `dev` as `176498d`), served locally with `vite preview`. Chrome 156.0.8078.80, axe-core 4.10.3 (WCAG 2.0, 2.1 and 2.2 A and AA rules), Lighthouse 12.6.1 (accessibility category). The results feed the [final web VPAT](../SWEN661_F26_Team5_VPAT_Web_Final_v2.0.pdf).

A script drove a throwaway local account. Everything here is automated or scripted except where it says otherwise; no person using assistive technology was involved.

## Results by screen

| Screen | Lighthouse mobile | Lighthouse desktop | axe AA at 1280 | axe AA at 320 | No sideways scroll at 320 | Tab stops | Stops with no focus ring | Targets under 24 px | Moving with reduced motion |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Landing | 100 | 100 | 0 | 0 | Yes | 11 | 0 | 0 | 0 |
| Sign in | 100 | 100 | 0 | 0 | Yes | 8 | 0 | 0 | 0 |
| Sign up | 100 | 100 | 0 | 0 | Yes | 10 | 0 | 0 | 0 |
| Choose your role | n/a | n/a | 0 | 0 | Yes | 6 | 0 | 0 | 0 |
| Home | 100 | 100 | 0 | 0 | Yes | 21 | 0 | 0 | 0 |
| My Day | 100 | 100 | 0 | 1 | Yes | 25 | 0 | 0 | 0 |
| Appointments | 100 | 100 | 0 | 0 | Yes | 28 | 0 | 0 | 0 |
| Medicines | 100 | 100 | 0 | 0 | Yes | 24 | 0 | 0 | 0 |
| Memories | 100 | 100 | 0 | 0 | Yes | 27 | 0 | 0 | 0 |
| Contacts | 100 | 100 | 0 | 0 | Yes | 20 | 0 | 0 | 0 |
| Caregiver Dashboard | 100 | 100 | 0 | 0 | Yes | 19 | 0 | 0 | 0 |
| Manage Medications | 100 | 100 | 0 | 0 | Yes | 23 | 0 | 0 | 0 |
| Manage Appointments | 100 | 100 | 0 | 0 | Yes | 31 | 0 | 0 | 0 |
| Activity Log | 100 | 100 | 0 | 0 | Yes | 15 | 0 | 0 | 0 |
| Caregiver Notes | 100 | 100 | 0 | 0 | Yes | 15 | 0 | 0 | 0 |

The one axe flag at 320 px (`target-size` on My Day) came straight after a viewport change and did not reproduce on a clean load at 320 px. Lighthouse did not run on Choose your role, which is a one-time step.

Also checked on all 15 screens: 200% zoom (a 640 px viewport) and landscape (800 by 400) with no sideways scrolling, WCAG text spacing with nothing cut off (Memories cards keep their intentional three-line preview), one `h1` and one `main` landmark on each, and a page title of its own.

## Focus and form checks

- **Delete dialog:** opens on Cancel, Tab stays inside it, and Escape returns focus to the Delete button.
- **Marking a medicine:** the count in the live region changes from "2 medicines" to "1 medicine", and focus stays on the toggle.
- **Empty appointment and medication forms:** focus moves to the error summary, which lists every missing field, and each field has `aria-invalid` and `aria-describedby`. axe finds 0 violations with the errors showing.

## Problems found

These are in the VPAT's Known Limitations. None has an issue yet except #52.

1. **Badge text runs into the next word (#52).** The page text reads "Coming upAppointment" on Home and "TodayTuesday" on Appointments. WCAG 1.3.1.
2. **Focus after a delete on the Manage screens.** After "Yes, delete" on Manage Medications or Manage Appointments, focus falls to the page body and nothing is announced. The next Tab does continue on the next item's Edit button. WCAG 2.4.3.
3. **Focus covered by the bottom navigation.** On the care recipient screens, 8 of 127 Tab stops at 1280 by 800 and 4 of 121 at 375 by 812 were completely covered when focused: 11 by the fixed bottom navigation and 1 by the header. See [`focus-under-nav.png`](focus-under-nav.png), taken with "Mark Walk in the garden done" focused behind the navigation. Measured with smooth scrolling off. WCAG 2.2, 2.4.11.
4. **VoiceOver and the error summary.** VoiceOver reads the summary's heading and "and 1 more item", then stops. Left alone for 32 seconds, it added only its usual hint. VO+Right moves into the list.

## Files

- [`results.json`](results.json): full results, including every screen's Level AAA contrast flags and targets under 44 px.
- `lighthouse-home-*.report.html` and `lighthouse-dashboard-*.report.html`: full Lighthouse reports for one screen per role, in both modes.
