import { AccessibilityInfo, Platform } from 'react-native';

/**
 * careconnect-adhd — mobile-audit.md finding 5: Android's
 * `accessibilityLiveRegion="polite"` already causes TalkBack to speak a
 * region's content whenever it changes, but iOS has no live-region
 * equivalent — VoiceOver says nothing unless something explicitly calls
 * `AccessibilityInfo.announceForAccessibility*`. Calling that unconditionally
 * on both platforms would double-announce on Android, so this is the single
 * call site every "tell screen readers this just happened" spot in the app
 * should go through, rather than each one re-deriving the platform check.
 *
 * The "AfterDelay" in the name isn't a timer: it's that this is meant to be
 * called from a mount/update *effect* (after the view has committed and
 * paints), never from inside a render. Firing the announcement before the
 * node exists in the native accessibility tree is a common way for VoiceOver
 * to silently drop it — the fix is ordering, not a `setTimeout`. Callers that
 * want it in an effect can `return announceAfterDelay(...)` directly, since
 * it never schedules anything, there's nothing for a cleanup to cancel.
 *
 * `{ queue: true }` on iOS queues behind any announcement VoiceOver is
 * already speaking rather than cutting it off — appropriate here since a
 * snackbar's text is informational, not urgent enough to interrupt.
 */
export function announceAfterDelay(message: string): void {
  if (Platform.OS !== 'ios') {
    // Android: the live region on the snackbar's container already speaks
    // this. An explicit announceForAccessibility call here would talk over
    // it with a duplicate utterance.
    return;
  }
  AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
}
