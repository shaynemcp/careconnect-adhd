// A new time starts filled in: Chromium exposes an empty <input type="time"> to
// screen readers as "-9.1%, Hours Time, stepper" (SR-3, #80). The value is
// visible and editable, and clearing it still triggers the required check.
export const DEFAULT_TIME = '08:00';

const HHMM = /^\d{2}:\d{2}$/;

/**
 * The next time to offer: four hours after the last one, kept within the day, and never a
 * time already in the list. When no later hour is free, it offers the latest free hour before
 * that (so 20:00 then 23:00 offers 22:00, not 23:00 again or a midnight dose).
 */
export function nextTime(times: string[]): string {
  const used = new Set(times.filter((t) => HHMM.test(t)));
  const last = [...times].reverse().find((t) => HHMM.test(t));
  if (!last) return DEFAULT_TIME;
  const lastHour = Number(last.slice(0, 2));
  const minutes = last.slice(3);
  const at = (h: number) => `${String(h).padStart(2, '0')}:${minutes}`;
  const preferred = Math.min(lastHour + 4, 23);
  const order = [
    ...Array.from({ length: 24 - preferred }, (_, i) => preferred + i), // preferred .. 23
    ...Array.from({ length: preferred }, (_, i) => preferred - 1 - i), // then back towards 00
  ];
  return at(order.find((h) => !used.has(at(h))) ?? lastHour);
}

/** Times that appear more than once (blank entries ignored), for the form's duplicate check. */
export function duplicateTimes(times: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const t of times.map((x) => x.trim()).filter(Boolean)) {
    if (seen.has(t)) dupes.add(t);
    seen.add(t);
  }
  return [...dupes];
}
