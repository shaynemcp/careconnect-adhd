import { AccessibilityInfo, Platform } from 'react-native';

/**
 * How long to wait before posting a screen-reader announcement.
 *
 * Most of this app's announcements follow a double-tap (Continue, Mark as
 * Taken). On iOS, an announcement posted while VoiceOver is still speaking the
 * control that was just activated shows in the Caption Panel but isn't spoken.
 * Heard with VoiceOver on an iPhone 13 Pro Max (iOS 26.6.1): posting at once
 * was silent, and posting after this delay was spoken, queued or not.
 */
export const ANNOUNCEMENT_DELAY_MS = 750;

/**
 * Announces `message` on iOS after {@link ANNOUNCEMENT_DELAY_MS} (WCAG SC 4.1.3),
 * queued behind any speech still going. Returns a cancel function, so an effect
 * can return it and a message that has already gone away is never spoken.
 * Android uses each message's `accessibilityLiveRegion` instead.
 */
export function announceAfterDelay(message: string): () => void {
  if (Platform.OS !== 'ios') return () => {};
  const id = setTimeout(() => {
    AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
  }, ANNOUNCEMENT_DELAY_MS);
  return () => clearTimeout(id);
}
