import { useEffect, useRef } from 'react';
import { fieldErrorAnnouncement, fieldErrorsAnnouncement } from '../../data/announcements';
import { announceAfterDelay } from './announce';

export interface AnnouncedFieldError {
  label: string;
  error: string | null;
}

/**
 * Announces several fields' errors as one message on iOS (WCAG SC 4.1.3).
 *
 * iOS keeps only the last of several announcements posted at once: with one
 * announcement per field, a step with two empty fields spoke only the second
 * error (seen with VoiceOver on a device). So a form step announces its fields
 * here, and those fields pass `announceError={false}` to `CcTextField`.
 *
 * Like `CcTextField`, an error is spoken when it appears or changes, never on
 * an unrelated re-render, and pressing Continue again with the same errors
 * says nothing new. Android keeps using each error text's live region.
 */
export function useFieldErrorAnnouncements(fields: AnnouncedFieldError[]) {
  const spoken = useRef<Record<string, string | null>>({});
  const signature = fields.map((f) => `${f.label}=${f.error ?? ''}`).join('|');

  useEffect(() => {
    const fresh = fields.filter((f) => f.error != null && f.error !== spoken.current[f.label]);
    spoken.current = Object.fromEntries(fields.map((f) => [f.label, f.error]));
    if (fresh.length === 0) return;
    return announceAfterDelay(
      fieldErrorsAnnouncement(fresh.map((f) => fieldErrorAnnouncement(f.label, f.error as string))),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
}
