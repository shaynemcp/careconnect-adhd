/**
 * Screen-reader copy for status messages (WCAG SC 4.1.3) and control hints.
 *
 * `accessibilityLiveRegion` only works on Android, so iOS needs an explicit
 * `AccessibilityInfo.announceForAccessibility` call. The strings live here so
 * the visible text and the spoken text come from one source and cannot drift.
 */

/** Validation errors on the medication form, shown and spoken verbatim. */
export const MEDICATION_FORM_ERRORS = {
  name: 'Enter the medication name, like Metformin',
  dosage: 'Enter the dose, like 25 mg',
  scheduleTimes: 'Add at least one time, like 8:00 AM',
} as const;

/** Hint for a read-only field that opens a picker (date & time) when tapped. */
export const READ_ONLY_PICKER_HINT = 'Opens a picker to change it';

/** One field's error, prefixed with its label so it makes sense out of context. */
export function fieldErrorAnnouncement(label: string, error: string): string {
  return `${label}: ${error}`;
}

/** Spoken when a snackbar appears; names its action so it can be found. */
export function snackbarAnnouncement(message: string, actionLabel?: string): string {
  return actionLabel ? `${message}. ${actionLabel} available` : message;
}
