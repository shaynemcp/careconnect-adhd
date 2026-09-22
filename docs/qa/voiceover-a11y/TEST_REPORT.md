# VoiceOver / TalkBack Test Report: Issue #4 (react-mobile)

| | |
| --- | --- |
| **Issue** | [#4](https://github.com/shaynemcp/careconnect-adhd/issues/4): VoiceOver can't reach switches or Undo; no iOS announcements |
| **App under test** | `apps/react-mobile` (Expo ~57 / React Native ~0.86) |
| **Branch** | `shayne/voiceover-a11y-4`, uncommitted working tree on top of `0783f82` |
| **Plan** | [TEST_PLAN.md](TEST_PLAN.md) |
| **Standard** | WCAG 2.2 Level AA, plus the team's 44×44 pt touch-target floor |
| **Date** | 2026-09-18 |
| **Method this run** | Code review of the diff, plus Jest / ESLint / `tsc`. **No screen reader was run.** |
| **Simulator run** | 2026-09-21: iOS Simulator + the Accessibility Inspector bridge on `af44aab` (after `dev` was merged in). No speech. See [§7](#7-simulator-run-2026-09-21). |
| **Device runs** | 2026-09-22: iPhone 13 Pro Max, iOS 26.6.1, VoiceOver + Caption Panel, Expo Go. Screen recordings checked frame by frame (captions) and against the audio track. See [§8](#8-device-runs-voiceover-2026-09-22). |

---

## 1. Verdict

> **Update 2026-09-22: iOS verified with VoiceOver on a device (§8).** The Simulator run (§7) passed the
> non-speech checks. The device runs found two iOS speech bugs, both fixed in this branch and re-verified
> by ear and against the recording's audio: **QA-03**, when both step-1 fields failed only the second
> error was spoken; and **QA-04**, announcements posted right after a double-tap were shown in the
> Caption Panel but not spoken (snackbars and errors). **Android (TalkBack) and keyboard checks are still open**,
> so #4 stays open for those.

**Ready to merge on automated and code-review evidence. Not yet verified with a
screen reader.**

All five items in issue #4 are fixed in code and covered by contract tests that would
have failed on the original bug. Branch coverage clears the 75 % target (81.34 %). Both
bugs found in review are fixed and re-verified. None are open.

What this report **can't** claim: that VoiceOver or TalkBack actually speaks these
controls correctly. No simulator, emulator or device session was run for this report.
The iOS Simulator has no VoiceOver, this machine has no full Xcode (so no Accessibility
Inspector), and no physical device session happened. Until the manual checklist in §6
is done, keep issue #4 open or close it with that checklist attached. In the
`docs/ACCESSIBILITY.md` §4 log, these criteria stay *Implemented*, not *Verified*.

---

## 2. Scorecard

**Scale.** **Pass**: fixed in code, reviewed, and a Jest contract test that would
catch a regression is green. **Partial**: fixed in code, but part of the criterion
can't be shown by automation or has a known gap. **Fail**: the defect is still present.
**n/a**: the criterion doesn't apply to that item. The manual AT column is separate,
because none of it has been run.

| # | Issue item | 4.1.2 Name, Role, Value | 2.1.1 Keyboard | 4.1.3 Status Messages | Team 44 pt floor (AA 2.5.8 24 pt) | Manual AT |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Switch rows unreachable | **Pass** | **Pass**¹ | n/a | **Pass**: rows ≥ 56 pt tall, full width (AA: Pass) | iOS ✅ (device); TalkBack not run |
| 2 | Undo unreachable | **Pass** | **Pass**¹ | n/a | n/a (see item 5) | iOS ✅ (device); TalkBack not run |
| 3 | No iOS announcements | n/a | n/a | **Pass on iOS** (device, after QA-03/QA-04 fixes); Android **Partial**² | n/a | iOS ✅ (device); TalkBack not run |
| 4 | Unlabeled date/time field | **Pass** | **Pass**¹ | **Pass** (error announced on iOS) | Unchanged, field ≥ 48 pt (AA: Pass) | iOS ✅ (device); TalkBack not run |
| 5 | Targets below 44 pt | n/a | n/a | n/a | **Pass**: Undo ≥ 44×44, remove-time 48×48, real layout, no `hitSlop` (AA: Pass) | Measured on the Simulator (§7) |

¹ Screen-reader reachability (swipe + double-tap) is proven structurally in Jest: no
`accessible` ancestor swallows the control, it has a role, and pressing it works.
**Hardware-keyboard operation** (iOS Full Keyboard Access, Android Tab/Enter) isn't
modelled by Jest and is manual only (SW-08, UN-05, DT-05).

² iOS: `announceForAccessibilityWithOptions(…, { queue: true })` fires once per new
error or snackbar and not on re-render, and that's tested. **Android:** the branch
deliberately relies on the `accessibilityLiveRegion` values that already existed,
without an extra announce call, so nothing double-speaks. Whether TalkBack actually speaks a live region on a
view that has **just mounted** (every error `Text` and every snackbar is newly mounted)
can't be shown in Jest. See Risk R8. That half of 4.1.3 stays Partial until AN-01 and
AN-04 are heard on TalkBack.

### Coverage criterion (react-mobile branch coverage ≥ 75 %)

| | Statements | **Branches** | Functions | Lines |
| --- | --- | --- | --- | --- |
| Before (`HEAD` 0783f82) | 81.45 % (997 / 1224) | **69.36 % (532 / 767)** | 81.00 % (388 / 479) | 83.04 % (901 / 1085) |
| After (final tree) | 92.34 % (1158 / 1254) | **81.34 % (641 / 788)** | 90.74 % (441 / 486) | 93.07 % (1035 / 1112) |

**Result: Pass** (+11.98 points on branches, 6.34 over target).

**How it was measured.** The "before" run used a `git archive HEAD` copy of the app
outside the repo. Both runs used `npx jest --coverage --coverageDirectory <scratch>`.
The committed `apps/react-mobile/coverage/` was **not** regenerated, and `git status`
shows no changes under it.

| File | Branches before | Branches after |
| --- | --- | --- |
| `screens/appointments/AppointmentFormScreen.tsx` (unmodified; new test) | 0 / 77 | 70 / 77 |
| `core/components/CcTextField.tsx` | 20 / 26 | 31 / 32 |
| `core/components/UndoSnackbar.tsx` | 8 / 10 | 15 / 16 |
| `screens/medications/MedicationFormScreen.tsx` | 54 / 71 | 58 / 75 |
| `screens/settings/SettingsSwitchRow.tsx` (new) | n/a | 3 / 3 |
| `data/announcements.ts` (new) | n/a | 2 / 2 |

---

## 3. Automated results

Run from `apps/react-mobile/` on the final tree, which frontend_dev and backend_dev
had both confirmed frozen. Two test files changed after that (the QA-01 duplicate-text
assertion in `CcTextField.test.tsx` and the QA-02 `act` wrap in
`AppointmentFormScreen.test.tsx`). Jest, lint and typecheck were re-run after those
edits with the same results. No production files changed, so coverage stands.

| Check | Command | Result |
| --- | --- | --- |
| Unit / component | `npx jest` | **32 / 32 suites, 245 / 245 tests passed** (baseline 27 / 190) |
| Lint | `npm run lint` | **Clean** (exit 0) |
| Types | `npm run typecheck` | **Clean** (exit 0) |
| Coverage | `npx jest --coverage --coverageDirectory <scratch>` | 81.34 % branches (see §2) |
| Committed coverage dir | `git status --short apps/react-mobile/coverage` | No changes |
| No "Undone" announcement | `grep -rn "Undone\|UNDO_DONE" apps/react-mobile/src` | No matches |

**New suites (+43 tests):** `UndoSnackbar.test.tsx` (7), `CcTextField.test.tsx` (11),
`AppointmentFormScreen.test.tsx` (16), `data/announcements.test.ts` (5),
`data/settingsFixtures.test.ts` (4).
**Extended suites (+12 tests):** `AppSettingsScreen` 6→9, `CaregiverAccessScreen` 3→5,
`NotificationsSettingsScreen` 4→7, `MedicationFormScreen` 4→8.

**Console noise.** The "not wrapped in act(...)" warnings are identical to baseline:
AppSettingsScreen ×1, MedicationDetailScreen ×2, MedicationFormScreen ×1. So is the
Jest worker force-exit notice. The one new warning found in review (QA-02) was fixed.

### Manual case → Jest stand-in

The file is `apps/react-mobile/src/…`. Test names are quoted exactly.

| Manual case | Jest test(s) | Still manual |
| --- | --- | --- |
| SW-01, SW-04, SW-06 (role + state) | `CaregiverAccessScreen.test.tsx` "exposes the sharing row as one switch that reports and toggles its state". `NotificationsSettingsScreen.test.tsx` "exposes the daily digest row as one switch that toggles both ways". `AppSettingsScreen.test.tsx` "exposes the demo clock row as one switch that reports its state" | Spoken wording and order |
| SW-02, SW-07 (toggle, no stale state) | Same three tests (they re-query `accessibilityState.checked` after each press), plus "turns paused sharing back on from the row", "turns the daily digest back on from the row", "turns the demo clock off from the row" | Re-announcement of the new state |
| SW-03 (one focus stop) | `NotificationsSettingsScreen.test.tsx` "exposes exactly one switch per row to screen readers". The per-screen tests assert exactly one AT-visible `switch`, with the visual `Switch` only reachable through `includeHiddenElements`. | Native traversal order |
| SW-05 (always on, disabled) | `NotificationsSettingsScreen.test.tsx` "always shows overdue alerts as on and disabled" | "dimmed" / "disabled" wording |
| SW-06 (confirm on the "on" path) | `AppSettingsScreen.test.tsx` "asks before turning the demo clock on from the row" | Where VoiceOver focus goes in the alert |
| UN-01, UN-02, UN-04 | `UndoSnackbar.test.tsx` "exposes the message and the Undo button as separate elements" (walks up the parent chain: no `accessible` ancestor) | Swipe count and time to Undo (UN-03) |
| UN-06 | `UndoSnackbar.test.tsx` "shows no button for a plain confirmation" | none |
| AN-01, AN-02 | `UndoSnackbar.test.tsx` "announces each new snackbar once on iOS, naming the Undo action", "announces a plain confirmation without an action", "stays silent on Android, where the live region already speaks it" | Audible and not cut off (iOS). TalkBack speaks it exactly once (R8). |
| AN-03 (nothing after Undo) | `UndoSnackbar.test.tsx` "says nothing extra when Undo is pressed, so it never claims an undo that failed" | Where focus lands after the bar closes |
| AN-04, AN-05 | `MedicationFormScreen.test.tsx` "queues both step-1 errors on iOS so neither cuts the other off", "announces the missing-times error once on iOS", "leaves the missing-times error to the live region on Android" | Both errors heard in full. No Android repeat. |
| AN-06 (no re-announce on render) | `CcTextField.test.tsx` "announces a new error once on iOS, queued behind current speech" (re-renders with typing) and "announces again when the error text changes" | none |
| AN-07 (error in field name) | `CcTextField.test.tsx` "keeps an editable field focusable and speaks its error once, in the name only" | none |
| AN-08 | `AppointmentFormScreen.test.tsx` "announces both step-1 errors on iOS, queued so neither is cut off" | As AN-04 |
| DT-01, DT-02 | `CcTextField.test.tsx` "names the button with the field label and its current value, plus a hint", "falls back to the placeholder when nothing is chosen yet". `AppointmentFormScreen.test.tsx` "is one button named by its label and placeholder, with a hint, until a date is chosen", "opens the date picker, then the time picker, and names the field with the result", "pre-fills the draft, speaks the existing date, and saves trimmed changes" | Native picker accessibility |
| DT-03 | `CcTextField.test.tsx` "hides the inner text box so the picker button is the only focus stop", "keeps the visible label visible to screen readers" | TalkBack traversal |
| DT-04 | `CcTextField.test.tsx` "speaks the error instead of the placeholder when nothing is chosen, so neither repeats". `AppointmentFormScreen.test.tsx` "requires a date and time, naming the error in the field and announcing it on iOS" | none |
| TG-01 | `MedicationFormScreen.test.tsx` "gives the remove-time button a real 48x48 icon-button layout, not just hitSlop" | **Real laid-out size** (TG-03, TG-04) |
| TG-02 | `UndoSnackbar.test.tsx` "gives the Undo button a real 44x44 layout, not just hitSlop" | **Real laid-out size** |
| SW-08, UN-05, DT-05 | none | All (keyboard) |

---

## 4. Code review notes

Reviewed with `git diff`, `git status` (including untracked files) and each changed
file in full. Every change is inside its owner's territory:
`AppointmentFormScreen.tsx`, `TodayScreen.tsx`, `MedicationDetailScreen.tsx`,
`models/*` and `state/*` are unmodified. Specific checks from the plan:

| Check | Finding |
| --- | --- |
| Duplicate focus stops | None found. Each settings row is one `Pressable` with `role="switch"`, and the visual `Switch` has `accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"`. The read-only picker hides its inner field wrapper the same way. The snackbar bar is no longer `accessible`, so the message `Text` and Undo are two separate, intended stops. |
| Announcements firing on every render | None. Effects are keyed on `errorText`, `timesError`, and `[visible, key]` for the snackbar (`key` changes once per `present()`). All are tested with re-renders. |
| Double-firing on Android | Not in code. Every `announceForAccessibilityWithOptions` call is guarded by `Platform.OS === 'ios'`, and Android keeps only its live regions. The post-Undo "Undone" announcement, which would have fired on both platforms, was removed. |
| Stale `accessibilityState` | None. `checked` is computed from store props on each render, and the tests re-query after each toggle in both directions. |
| 44 pt from real layout, not `hitSlop` | Met. Undo: `minWidth`/`minHeight` 44, `hitSlop` removed, bar `minHeight` 48. Remove-time: 48×48 with −8 pt margins, so it fills the row padding and stays inside the row's box. Switch rows: `minHeight` 56 (`TapTarget.dominantAction`), full width. |
| Label in name (SC 2.5.3) | The switch rows' accessible names now start with the visible title ("Daily digest", "Share with Renee", "Demo clock", "Overdue alerts, always on"). The descriptions moved to `accessibilityHint`, so they're still available to screen-reader users. |

---

## 5. Bugs and observations

### Bugs found in review

| ID | Severity | Owner | Summary | Repro | Suggested fix | Status |
| --- | --- | --- | --- | --- | --- | --- |
| **QA-01** | Low | frontend_dev | The read-only picker's accessible name repeated the error when it matched the placeholder. It read "Date & time. Choose the date and time. Choose the date and time", and the screen test asserted the duplicate. | Add Appointment → complete step 1 → Continue → leave the date empty → Save. Read the field's name. | Leave out the placeholder from the name when an error is shown and no value is chosen. Add a test using the real strings. | **Fixed, re-verified** (`CcTextField.tsx:62`, two new tests, screen test corrected) |
| **QA-02** | Low | frontend_dev | New "not wrapped in act(...)" warning from the delete-confirm test | `npx jest src/screens/appointments` → warning at `AppointmentFormScreen.test.tsx:282` | Wrap the Alert "Delete" `onPress` in `await act(async () => …)` | **Fixed, re-verified** (the warning is gone and the rest of the set matches baseline) |

| **QA-03** | High | Shayne | *(Device, 2026-09-22)* When both step-1 fields failed (Add Appointment, Add Medication), VoiceOver spoke only the **second** error. Each field posted its own announcement in the same render, and iOS kept only the last. The Jest tests passed because they checked that two announcements were *requested*, not spoken. | Add Appointment → leave both fields empty → Continue. The Caption Panel showed only "Where: Enter where it is…" (0.1 s frame scan). | Announce a step's errors as **one** message ("2 errors. Appointment: … Where: …"): new `useFieldErrorAnnouncements` hook; those fields pass `announceError={false}` to `CcTextField`. | **Fixed, re-verified on device** (heard; speech present in the audio track) |
| **QA-04** | High | Shayne | *(Device, 2026-09-22)* Announcements posted **right after a double-tap** (Undo snackbar, form errors) appeared in the Caption Panel but were **not spoken**: the recording's audio is silent while the caption shows. | Today → Mark as Taken: caption "… Undo available" at 8.8 s, audio silent 9.0–12.0 s. | Post every announcement after `ANNOUNCEMENT_DELAY_MS` (750 ms), queued: new `announceAfterDelay()` in `src/core/utils/announce.ts`, used by `CcTextField`, the forms and `SnackbarHost`. Tested: a 750 ms delay was spoken both queued and unqueued. | **Fixed, re-verified on device** (snackbar and both combined errors heard; speech present in the audio track) |

Fix rounds used: 2 (QA-03 and QA-04 came from the device runs). **Open bugs: none.**

### Observations (not bugs; recorded, no change requested)

| ID | Observation |
| --- | --- |
| O-1 | Pressing Continue again with the **same** unfixed errors doesn't re-announce them on iOS, because the effect keys on the error text and it hasn't changed. Android's live region behaves the same way. The errors stay visible and stay in each field's name. Worth revisiting if the manual pass shows users double-tapping Continue and hearing nothing. |
| O-2 | Undo is the last element in swipe order, since the snackbar is mounted at the root. That's expected, but it makes UN-03 (time to reach Undo) the case to watch. |
| O-3 | *(2026-09-21, Simulator)* Decorative `MaterialIcons` aren't hidden from assistive tech. Buttons made of an icon plus a `Text` with no `accessibilityLabel` get a leading empty piece in their name (", Add a time", ", Sign out", ", Continue with Face ID / Passkey"), and a standalone icon (the clock beside each schedule time) is an empty focus stop. Outside #4's scope; tracked in #26. |
| O-4 | *(2026-09-21, Simulator)* The native date/time picker wheels come through the Mac accessibility bridge with no labels and raw row values. **Resolved on the device:** VoiceOver reads them normally ("22, selected, Picker Item, adjustable, 22 of 30", "Minutes, 24 minutes, adjustable"), so it's a bridge limit, not the app. |
| O-5 | *(2026-09-21, Simulator)* The inline date picker opens **below** the "Who is taking me" field, so VoiceOver users swipe past that field to reach it. Watch focus order on the device (§6 row 6). |
| O-6 | The Undo snackbar lasts only a few seconds. On the device, reaching Undo took 3 swipes and about 5 s after the announcement, which is close to the limit. That's R2, confirmed on a device. |
| O-7 | The caption alone isn't proof of speech: in QA-04 the Caption Panel showed announcements that were never spoken. Check speech by ear, or against the recording's audio track. |

### Known risks carried forward (out of scope for #4)

| ID | Risk | Tracking |
| --- | --- | --- |
| R2 | A 10 s undo window is tight for a VoiceOver user who has to swipe to the end of the screen. | PR #18 handles undo duration, but it currently changes only Flutter files. The react-mobile side is still open. |
| R7 | Undo gives no spoken result. "Undone" was dropped from this branch because it was unconditional and would claim success if the undo failed. | Follow-up with PR #18: announce only after `undoDoseChange` resolves, with a failure message if it doesn't. |
| R8 | Android relies on `accessibilityLiveRegion` on views that have **just mounted** (error text, snackbar bar). TalkBack may not announce a live region on first attach. Jest can't show either behaviour. | Manual AN-01 / AN-04 on TalkBack. If TalkBack is silent there, drop the `Platform.OS === 'ios'` guard for those calls and remove the live region, so there's one announce path per message. |

---

## 6. Manual checks still needing a person

**Update 2026-09-22:** the iOS VoiceOver column is done on a device for rows 1–6 (§8), and row 8 was measured on the Simulator (§7). **Still open:** the whole TalkBack column and row 7 (keyboard). Case IDs refer to [TEST_PLAN.md](TEST_PLAN.md) §4.
iOS speech checks need a **physical iPhone** (Expo Go, with the VoiceOver Caption Panel on
while screen-recording). The Simulator has no VoiceOver. Android checks can run on an
emulator with TalkBack.

| # | Check | Cases | iOS VoiceOver (device) | Android TalkBack | Why Jest can't cover it |
| --- | --- | --- | --- | --- | --- |
| 1 | Each settings row reads as one switch with name, "switch button", and on/off. The overdue row reads "dimmed" / "disabled". | SW-01, SW-03 to SW-05 | ☑ device (§8) | ☐ | Real speech and grouping |
| 2 | Double-tap toggles, and the new state is re-announced. Demo clock "on" opens the confirmation and focus moves into it. | SW-02, SW-06, SW-07 | ☑ device (§8) | ☐ | Native re-announce and alert focus |
| 3 | Undo is reachable by swipe as its own "Undo, button" and works. Record swipe count and seconds (evidence for R2). | UN-01 to UN-04 | ☑ device: 3 swipes, ~5 s (§8) | ☐ | Native traversal and timing |
| 4 | Snackbar message + "Undo available" is spoken **once** and not cut off by focus speech. Nothing is spoken after Undo. | AN-01 to AN-03 | ☑ device, after QA-04 fix (§8) | ☐ (**R8**) | Audio, queueing, live-region-on-mount |
| 5 | Form errors are spoken once each, in order, without moving focus. No repeat on typing. | AN-04 to AN-08 | ☑ device, after QA-03/QA-04 fixes (§8) | ☐ (**R8**) | Audio, double-speak on Android |
| 6 | "Date & time" reads name + value (or the error, once) + button + hint. One stop. Picker opens. | DT-01 to DT-04 | ☑ device (§8) | ☐ | Native picker, TalkBack traversal |
| 7 | Keyboard: Tab reaches, and Space/Enter operates, every switch, Undo, and the date field | SW-08, UN-05, DT-05 | ☐ (Full Keyboard Access) | ☐ (hardware keyboard) | Keyboard focus isn't modelled |
| 8 | Measured frames: Undo ≥ 44×44, remove-time 48×48. Focus box matches. No clipping at the largest text size. | TG-01 to TG-04 | ☑ Simulator: Undo 52.7 × 44.0 pt, remove-time 48.0 × 48.0 pt (largest text size ☐) | ☐ (Layout Inspector / Show layout bounds) | Jest has no layout engine |

When done, record each run with the table in [TEST_PLAN.md](TEST_PLAN.md) §8, and add a
row to the verification log in `docs/ACCESSIBILITY.md` §4. Until then, a suggested
interim log entry (for the lead, since that file isn't QA territory) is:
`2026-09-18 | react-mobile #4: switches, Undo, announcements, date field, targets |
Automated + code review | Jest 245/245, lint, tsc | PASS (automated); manual
VoiceOver/TalkBack pending | QA`.

---

## 7. Simulator run (2026-09-21)

| | |
| --- | --- |
| **Build** | `af44aab` (`shayne/voiceover-a11y-4` with `dev` merged in), Expo Go, SDK 57 |
| **Device** | iPhone 18 Pro Simulator, iOS 27.0, Xcode 27 (DeviceHub) |
| **Method** | The macOS accessibility bridge Accessibility Inspector uses. Elements were read (label, value, hint, enabled, frame) and pressed with `AXPress`, the action VoiceOver's double-tap sends. Sizes are converted with the device screen as the scale (286 units = 402 pt). **No speech**: the Simulator has no VoiceOver audio. |

| Case | What was checked | Result |
| --- | --- | --- |
| SW-01, SW-03, SW-04 | Daily digest, Overdue alerts, Share with Renee and Demo clock are each **one** full-width element with the `switch` role, the visible title as the name, the description as the hint, and on/off as the value. The inner `Switch` isn't a separate element. | Pass |
| SW-05 | "Overdue alerts, always on" is exposed as disabled, and pressing it doesn't change it. | Pass |
| SW-02, SW-07 | Pressing Daily digest and Share with Renee flips the value both ways. Share with Renee's hint changes to "Sharing is paused…". | Pass |
| SW-06 | Pressing Demo clock opens "Turn on the demo clock?" (Cancel / Turn on), and the screen behind leaves the accessibility tree while the alert is up. Cancel leaves it off. | Pass |
| UN-01, UN-02, UN-04 | "Undo" is its own button, separate from the "… logged at …" message. Pressing it reverts the dose. | Pass |
| TG-02 | Undo measures **52.7 × 44.0 pt** (at the team floor; the code sets `minHeight: TapTarget.minimum`). | Pass |
| DT-01 | New appointment: "Date & time. Choose the date and time", button, hint "Opens a picker to change it", one element. | Pass |
| DT-02 | Existing appointment: "Date & time. Monday, September 21 · 2:30 PM". Pressing it opens the picker. | Pass |
| DT-04 | Saving without a date shows "Choose the date and time" below the field, and the name isn't duplicated (see QA-01). | Pass |
| TG-01 | "Remove 9:00 AM" measures **48.0 × 48.0 pt**. Pressing it removes the time. | Pass |
| AN-05 (visual only) | Continue with no times shows "Add at least one time, like 8:00 AM", which clears once a time is added. Whether it's **spoken** is still open. | Visual pass |

New observations from this run: O-3 to O-6 in §5.

---

## 8. Device runs: VoiceOver (2026-09-22)

| | |
| --- | --- |
| **Device** | iPhone 13 Pro Max, iOS 26.6.1, VoiceOver with the Caption Panel on |
| **Build** | `shayne/voiceover-a11y-4` served by Metro to Expo Go (run 1 at `af44aab`; runs 2–4 with the QA-03/QA-04 fixes in progress, then final) |
| **Tester** | Shayne McPherson |
| **Evidence** | Four screen recordings. Captions were read by OCR from frames every 0.1–0.5 s. For runs 2–4, speech was checked against the recording's audio track (run 1 had no audio track). |

**Run 1: all cases, before the fixes**

| Case | What VoiceOver said (Caption Panel) | Result |
| --- | --- | --- |
| SW-01, SW-03, SW-04 | "Daily digest, Switch button, on, One summary each morning of what is due today, Double tap to toggle setting" | Pass |
| SW-05 | "Overdue alerts, always on, dimmed, Switch button, on, Always escalate immediately, never held for the digest" | Pass |
| SW-02, SW-07 | "off", then "on" after each double-tap on Daily digest | Pass |
| SW-06 | Focus moved into "Turn on the demo clock?" | Pass |
| UN-01 to UN-04 | "Metformin logged at 2:14 PM. Undo available", then "Undo, Button" after 3 swipes (~5 s). Undo reverted the dose, and nothing extra was said. | Pass for reach and function. The announcement's **audio** couldn't be checked (no audio track); see run 3. |
| AN-04, AN-08 | Both errors on screen, but only "Where: Enter where it is, like Regional Medical" was spoken | **Fail → QA-03** |
| AN-05 | "Add at least one time, like 8:00 AM" | Pass (reported by the tester) |
| DT-01, DT-04 | "Date & time. Choose the date and time" | Pass |
| DT (picker) | "22, selected, Picker Item, adjustable, 22 of 30", "Minutes, 24 minutes, adjustable", "12 o'clock, Picker Item, adjustable" | Pass (O-4 resolved) |

**Run 2: combined message (QA-03 fix), no delay.** Caption "2 errors. Appointment: … Where: …" at 22.5 s,
but the audio was **silent** until 35.5 s, and the tester heard nothing. The same happened on the medication form → **QA-04**.

**Run 3: delay experiment.** Snackbar with no delay: caption at 8.8 s, **audio silent**. Combined errors with a
750 ms delay: **spoken**, both unqueued (audio 45.0–49.0 s) and queued (audio 84.5–89.0 s).

**Run 4: final build.** All heard by the tester and present in the audio:

| Case | Caption | Audio |
| --- | --- | --- |
| AN-01 | "… logged at …. Undo available" at 10.5 s | Speech ✅ |
| AN-08 | "2 errors. Appointment: … Where: …" at 43.0 s | Speech ✅ |
| AN-04 | "2 errors. Medication name: … Dosage: Enter the dose, like 25 mg" at ~1:11 | Speech ✅ |
| AN-05 | Not in this recording (reported heard by the tester); same code path as AN-04 | — |

Not covered on the device: the existing-appointment name with a value (DT-02, passed on the Simulator),
Share with Renee (SW-01, passed on the Simulator), and keyboard (row 7 of §6).
