// A new time starts filled in: Chromium exposes an empty <input type="time"> to
// screen readers as "-9.1%, Hours Time, stepper" (SR-3, #80). The value is
// visible and editable, and clearing it still triggers the required check.
export const DEFAULT_TIME = '08:00';

/** The next time to offer: four hours after the last one, kept within the day. */
export function nextTime(times: string[]): string {
  const last = [...times].reverse().find((t) => /^\d{2}:\d{2}$/.test(t));
  if (!last) return DEFAULT_TIME;
  const hour = Math.min(Number(last.slice(0, 2)) + 4, 23);
  return `${String(hour).padStart(2, '0')}:${last.slice(3)}`;
}
