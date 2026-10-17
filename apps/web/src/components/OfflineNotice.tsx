// ─────────────────────────────────────────────────────────────────────────────
// OfflineNotice — tells people when the connection drops and what still works.
//
// Accessibility (WCAG 2.2 AA):
//   - The role="status" region is always in the page, empty while online, so
//     screen readers announce the text when it appears (a live region added
//     together with its text is often not read).
//   - Polite, not assertive: going offline doesn't block anything on the
//     signed-in screens, so it waits for current speech to finish (4.1.3).
//   - It sits in the page flow above everything else rather than floating over
//     the page, so it never covers the focused control (2.4.11).
//   - Text plus icon, not colour alone (1.4.1); amber-50 / amber-900 text is
//     well over 4.5:1.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

/** How long "You're back online" stays before the notice clears. */
export const BACK_ONLINE_MS = 4000;

type Status = 'online' | 'offline' | 'back-online';

export default function OfflineNotice() {
  const [status, setStatus] = useState<Status>(() =>
    typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'online',
  );

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const goOffline = () => {
      clearTimeout(timer);
      setStatus('offline');
    };
    const goOnline = () => {
      setStatus('back-online');
      clearTimeout(timer);
      timer = setTimeout(() => setStatus('online'), BACK_ONLINE_MS);
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      {status === 'offline' && (
        <div className="flex items-start gap-3 border-b-2 border-warning-300 bg-warning-50 px-4 py-3 text-warning-900">
          <WifiOff className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-base leading-relaxed">
            <strong>You&apos;re offline.</strong> Your schedule, medicines and appointments still work,
            and changes are saved on this device. The assistant, new photos and map links need a
            connection.
          </p>
        </div>
      )}
      {status === 'back-online' && (
        <div className="flex items-start gap-3 border-b-2 border-success-300 bg-success-50 px-4 py-3 text-success-900">
          <Wifi className="w-5 h-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-base leading-relaxed">
            <strong>You&apos;re back online.</strong>
          </p>
        </div>
      )}
    </div>
  );
}
