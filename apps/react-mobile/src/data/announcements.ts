/**
 * Builds the text spoken for a snackbar event (see
 * `core/utils/announce.ts` and `core/components/UndoSnackbar.tsx`).
 *
 * Centralized rather than inlined at each call site so the message a test
 * asserts against and the message the component actually announces can
 * never drift apart — both go through this one function.
 */
export function snackbarAnnouncement(message: string, actionLabel?: string): string {
  return actionLabel ? `${message}. ${actionLabel} available.` : message;
}
