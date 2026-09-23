# TalkBack Live Pass — Step-by-Step

**Assignment:** 6 — Mobile Accessibility & UI Testing (Week 6)
**Owner:** Quinton Coleman
**Status:** ⚠️ **Not yet run.** This is the walkthrough script + results template for
the one thing `docs/accessibility/mobile-audit.md` couldn't do: an actual TalkBack
session on a device or emulator. That doc explains why (no Android tooling in the
environment that wrote the code-level fixes). This file is what turns that gap into
something you can actually execute and turn in.

Run every section below, fill in the **Observed** and **Pass/Fail** cells as you go,
then follow "After the pass" to close the loop in `docs/ACCESSIBILITY.md`.
Budget **20–30 minutes** once the app is built and TalkBack is on.

---

## 0. Setup (~5 min)

1. **Device or emulator.** A physical Android phone is faster and more realistic than
   an emulator, but either works. If using an emulator, boot one from Android Studio
   (any recent API level ≥ 26 is fine — the app doesn't use anything newer).
2. **Build and install the app:**
   ```
   cd apps/react-mobile
   npm install          # only if you haven't already
   npx expo run:android
   ```
   This builds a debug APK and installs it on whatever device/emulator is connected
   (`adb devices` to confirm one is attached first).
3. **Turn on Demo clock before you turn on TalkBack** — Settings → App settings →
   Demo clock. This freezes the in-app clock so dose statuses (Now/Overdue/Done)
   don't shift under you mid-pass. It's a toggle inside the app itself, so it's much
   easier to reach with normal touch than to hunt for later with TalkBack on.
4. **Turn on TalkBack:**
   - Android Settings → Accessibility → TalkBack → toggle on, **or**
   - Volume-up + volume-down held together for 3 seconds (works from anywhere,
     including the lock screen, on stock Android — handy if you need to toggle it
     off and on between steps).
5. **Gesture cheat sheet** (stock TalkBack, "explore by touch" style — if your device
   uses gesture navigation some of these are one-finger swipes instead of edge
   swipes; TalkBack announces which style it's using when it turns on):
   | Gesture | Action |
   |---|---|
   | Swipe right | Move focus to next element |
   | Swipe left | Move focus to previous element |
   | Double-tap anywhere | Activate the currently focused element |
   | Swipe up then right (one motion) | Open the TalkBack global menu |
   | Two-finger swipe | Scroll |
   | Swipe down then right | Read from the top of the screen continuously |

If a step below says "confirm X is announced," that means: swipe to the element,
and TalkBack speaks it out loud — write down what it actually said, not just
pass/fail, if it differs at all from what's expected. That's usually the most
useful part of a real pass over a code review.

---

## 1. Sign-in reading order — issue #27

**Screen:** Sign-in (first screen on a fresh/logged-out launch).

1. With TalkBack on, swipe right from the very top of the screen, once per swipe,
   noting the order things are announced in.
2. Confirm the **"I am a…" role question** (Patient / Caregiver) is announced
   **before** both **"Continue with Face ID / Passkey"** and **"Continue with
   Email."**

| Check | Expected | Observed | Pass/Fail |
|---|---|---|---|
| Role question comes before both Continue buttons | Yes | | |
| Role question's two choices are individually reachable and announce which is selected | Yes | | |

---

## 2. Undo snackbar — issue #28 (timing) and #4 (Close control)

**Screen:** Today (patient view). Mark any dose as taken to trigger the snackbar.

1. Mark a dose "Taken." The undo snackbar should appear.
2. Swipe right until you reach it — confirm TalkBack announces the message
   (e.g. "Marked as taken. Undo?") as soon as it appears, without you having to
   hunt for it (this is the live-region announcement finding 2 fixed).
3. **Wait at least 15 seconds without touching the screen.** Then swipe to where
   the snackbar was. Confirm it's **still there** — this is the regression test for
   the old 10-second auto-dismiss bug (#28). It should never disappear on a timer.
4. Confirm the **Undo** button and the **Close** (X) button are two *separate*,
   individually reachable elements — not one merged blob.
5. Double-tap **Undo**. Confirm it announces a result (success, or the "can't be
   undone anymore" fallback if you waited long enough that something else changed
   the dose first).
6. With TalkBack off, just eyeball/tap both buttons a few times normally — they
   should feel comfortably large and easy to hit, not fiddly (finding 6 gave both
   a 44×44pt minimum).

| Check | Expected | Observed | Pass/Fail |
|---|---|---|---|
| Snackbar message announced automatically on appearance | Yes | | |
| Still present after 15s of inactivity | Yes | | |
| Undo and Close are separately reachable | Yes | | |
| Undo announces a result when activated | Yes | | |
| Both buttons easy to hit by touch | Yes | | |

---

## 3. Settings switches — issue #4 (items 1–3)

**Screens:** Settings → App settings; Settings → Caregiver access; Settings →
Notifications settings.

For **each** of these four switches — Demo clock, Share with `<caregiver name>`,
Daily digest, Overdue alerts — swipe to it individually and confirm:

1. It's reachable as its **own** element (not swallowed into one big row
   announcement with the label read separately from the switch).
2. TalkBack announces it as a **switch**, states its **label**, and states whether
   it's **on or off**.
3. Double-tap toggles it, and the state announcement updates accordingly.
4. (Overdue alerts only) it's disabled/grayed out in the states where the app
   disables it — TalkBack should announce "dimmed" or "disabled," not just skip it
   silently.

| Switch | Reachable on its own | Role+label+state announced | Toggle updates state | Pass/Fail |
|---|---|---|---|---|
| Demo clock | | | | |
| Share with caregiver | | | | |
| Daily digest | | | | |
| Overdue alerts | | | n/a if disabled | |

---

## 4. Read-only fields — issue #4 (item 4)

**Screen:** any form with a date/time picker field, e.g. Appointments → New
appointment → the date/time row.

1. Swipe to the field.
2. Confirm TalkBack announces a **meaningful label** (e.g. "Date and time, [current
   value], button") — not just a bare "button" with no context.

| Check | Expected | Observed | Pass/Fail |
|---|---|---|---|
| Read-only date/time field announces a real label, not bare "button" | Yes | | |

---

## 5. Remove-time touch target — issue #4 (item 5)

**Screen:** Medications → Add medication → Schedule step → add a time, then remove
it.

1. Add a scheduled time.
2. With TalkBack on, swipe to the remove ("×") control next to it — confirm it
   announces something like "Remove 9:00 AM, button."
3. Double-tap to activate it and confirm the time is removed.
4. With TalkBack off, tap it a few times by touch normally — it should be easy to
   hit without grazing the row around it.

| Check | Expected | Observed | Pass/Fail |
|---|---|---|---|
| Remove control has a specific, meaningful label | Yes | | |
| Double-tap removes the time | Yes | | |
| Comfortable to hit by touch | Yes | | |

---

## 6. Finding 5 — iOS-only, not applicable here

`docs/accessibility/mobile-audit.md` finding 5 (VoiceOver live-region gap) is
iOS-specific and out of scope for a TalkBack/Android pass — nothing to test here.
Leave it to whoever runs the VoiceOver side (Shayne's lane per the charter).

---

## 7. Dose action buttons — finding 6 (added 2026-09-23, code-complete, not yet run)

**Screen:** Medications → any medication with a due dose → its detail screen.

1. Swipe to the "Mark as taken" button for a due dose.
2. Confirm TalkBack announces **the specific dose time**, e.g. "Mark the 6:00 PM
   dose as taken, button" — not just a bare "Mark as taken."
3. Swipe to the "Skip this dose" button next to it and confirm it likewise
   announces "Skip the 6:00 PM dose, button."
4. If the medication has more than one due dose showing at once, confirm each
   pair of buttons names its own dose time distinctly — this is the actual
   point of the fix (previously every row's buttons were indistinguishable by
   ear).

| Check | Expected | Observed | Pass/Fail |
|---|---|---|---|
| "Mark as taken" names its own dose time | Yes | | |
| "Skip this dose" names its own dose time | Yes | | |
| Multiple due-dose rows are distinguishable by ear | Yes | | |

---

## 8. iOS date/time picker — issue #1 (VoiceOver, not this pass)

The picker fix (explicit Next/Done/Cancel controls on iOS, see
`docs/accessibility/mobile-audit.md` Addendum 2) only changes iOS's `spinner`
picker; Android's default picker dialog is untouched. So this needs a
VoiceOver re-run of E2E-4 (adding an appointment), not a TalkBack one — leave
it to whoever runs the VoiceOver side, same as finding 5 above. Nothing to
add to this file's own checklist.

---

## After the pass

1. **Fill in every Observed/Pass/Fail cell above** — that filled-in version of this
   file *is* the Assignment 6 TalkBack deliverable. A screen recording or a few
   screenshots of TalkBack's focus/announcement overlay alongside it makes it
   stronger evidence, but isn't required.
2. **Copy a summary row into `docs/ACCESSIBILITY.md` §4 (Verification log)** — a
   ready-to-fill template (matching its existing 2026-09-18 entry's format) is
   right there in that file, just above this note. Fill in the date, the
   device/emulator, the pass/fail counts and notes, and paste it in.
3. **§2's status column needs a look, not just a flip.** As of 2026-09-23, §2's
   rows 13 (Buttons) and 23 (Screen Readers) actually read `Not started`, not
   `Implemented` as this file originally assumed — those rows are scoped to
   the *whole product* (web included), not just react-mobile, so a mobile-only
   TalkBack pass can't move them straight to `Verified` without overclaiming
   the web app's state too. Check §2 fresh when you get here: if react-mobile
   coverage alone should move a row to `Implemented` (not `Verified` — that
   still needs the web side too), do that; leave `Verified` for whichever pass
   actually closes out the *whole* row.
4. If anything comes back **Fail**, don't fix it silently — note it here, and either
   reopen the relevant GitHub issue (#27/#28/#4) or file a new one, same as any
   other bug found in review.
5. Push this file (and your ACCESSIBILITY.md edit) as a commit on top of
   `quinton/talkback-a11y-maestro-w6`, or as its own follow-up branch/PR — your call
   depending on how your team wants the history to look.
