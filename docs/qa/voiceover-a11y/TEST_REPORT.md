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

---

## 1. Verdict

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
| 1 | Switch rows unreachable | **Pass** | **Pass**¹ | n/a | **Pass**: rows ≥ 56 pt tall, full width (AA: Pass) | Not run |
| 2 | Undo unreachable | **Pass** | **Pass**¹ | n/a | n/a (see item 5) | Not run |
| 3 | No iOS announcements | n/a | n/a | **Partial**² | n/a | Not run |
| 4 | Unlabeled date/time field | **Pass** | **Pass**¹ | **Pass** (error announced on iOS) | Unchanged, field ≥ 48 pt (AA: Pass) | Not run |
| 5 | Targets below 44 pt | n/a | n/a | n/a | **Pass**: Undo ≥ 44×44, remove-time 48×48, real layout, no `hitSlop` (AA: Pass) | Not run |

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

Fix rounds used: 1 of 2. **Open bugs: none.**

### Observations (not bugs; recorded, no change requested)

| ID | Observation |
| --- | --- |
| O-1 | Pressing Continue again with the **same** unfixed errors doesn't re-announce them on iOS, because the effect keys on the error text and it hasn't changed. Android's live region behaves the same way. The errors stay visible and stay in each field's name. Worth revisiting if the manual pass shows users double-tapping Continue and hearing nothing. |
| O-2 | Undo is the last element in swipe order, since the snackbar is mounted at the root. That's expected, but it makes UN-03 (time to reach Undo) the case to watch. |

### Known risks carried forward (out of scope for #4)

| ID | Risk | Tracking |
| --- | --- | --- |
| R2 | A 10 s undo window is tight for a VoiceOver user who has to swipe to the end of the screen. | PR #18 handles undo duration, but it currently changes only Flutter files. The react-mobile side is still open. |
| R7 | Undo gives no spoken result. "Undone" was dropped from this branch because it was unconditional and would claim success if the undo failed. | Follow-up with PR #18: announce only after `undoDoseChange` resolves, with a failure message if it doesn't. |
| R8 | Android relies on `accessibilityLiveRegion` on views that have **just mounted** (error text, snackbar bar). TalkBack may not announce a live region on first attach. Jest can't show either behaviour. | Manual AN-01 / AN-04 on TalkBack. If TalkBack is silent there, drop the `Platform.OS === 'ios'` guard for those calls and remove the live region, so there's one announce path per message. |

---

## 6. Manual checks still needing a person

**None of the following has been run.** Case IDs refer to [TEST_PLAN.md](TEST_PLAN.md) §4.
iOS speech checks need a **physical iPhone** (Expo Go, with the VoiceOver Caption Panel on
while screen-recording). The Simulator has no VoiceOver. Android checks can run on an
emulator with TalkBack.

| # | Check | Cases | iOS VoiceOver (device) | Android TalkBack | Why Jest can't cover it |
| --- | --- | --- | --- | --- | --- |
| 1 | Each settings row reads as one switch with name, "switch button", and on/off. The overdue row reads "dimmed" / "disabled". | SW-01, SW-03 to SW-05 | ☐ | ☐ | Real speech and grouping |
| 2 | Double-tap toggles, and the new state is re-announced. Demo clock "on" opens the confirmation and focus moves into it. | SW-02, SW-06, SW-07 | ☐ | ☐ | Native re-announce and alert focus |
| 3 | Undo is reachable by swipe as its own "Undo, button" and works. Record swipe count and seconds (evidence for R2). | UN-01 to UN-04 | ☐ | ☐ | Native traversal and timing |
| 4 | Snackbar message + "Undo available" is spoken **once** and not cut off by focus speech. Nothing is spoken after Undo. | AN-01 to AN-03 | ☐ | ☐ (**R8**) | Audio, queueing, live-region-on-mount |
| 5 | Form errors are spoken once each, in order, without moving focus. No repeat on typing. | AN-04 to AN-08 | ☐ | ☐ (**R8**) | Audio, double-speak on Android |
| 6 | "Date & time" reads name + value (or the error, once) + button + hint. One stop. Picker opens. | DT-01 to DT-04 | ☐ | ☐ | Native picker, TalkBack traversal |
| 7 | Keyboard: Tab reaches, and Space/Enter operates, every switch, Undo, and the date field | SW-08, UN-05, DT-05 | ☐ (Full Keyboard Access) | ☐ (hardware keyboard) | Keyboard focus isn't modelled |
| 8 | Measured frames: Undo ≥ 44×44, remove-time 48×48. Focus box matches. No clipping at the largest text size. | TG-01 to TG-04 | ☐ (Accessibility Inspector, needs Xcode) | ☐ (Layout Inspector / Show layout bounds) | Jest has no layout engine |

When done, record each run with the table in [TEST_PLAN.md](TEST_PLAN.md) §8, and add a
row to the verification log in `docs/ACCESSIBILITY.md` §4. Until then, a suggested
interim log entry (for the lead, since that file isn't QA territory) is:
`2026-09-18 | react-mobile #4: switches, Undo, announcements, date field, targets |
Automated + code review | Jest 245/245, lint, tsc | PASS (automated); manual
VoiceOver/TalkBack pending | QA`.
