// Local calendar dates. `toISOString()` gives the UTC date, which in US time zones
// rolls over in the evening (8 PM Eastern in summer), so a dose taken at 5:30 PM
// would show as due again after 8 PM (#41).

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** The local calendar date as YYYY-MM-DD. */
export function localDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** The local date `days` days from `d`, as YYYY-MM-DD. Uses setDate, so DST days are fine. */
export function localDateKeyFromNow(days: number, d: Date = new Date()): string {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return localDateKey(copy);
}

/** Local date and time as YYYY-MM-DDTHH:mm, for a <time dateTime> attribute. */
export function localDateTimeAttr(d: Date = new Date()): string {
  return `${localDateKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
