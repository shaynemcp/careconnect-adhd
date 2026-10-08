/** Local calendar date as YYYY-MM-DD (not UTC, so it rolls over at local midnight). */
export function localDateKey(d: Date = new Date()): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

/** Local date key for the day after `d`. Uses setDate so DST days aren't assumed to be 24h. */
export function tomorrowDateKey(d: Date = new Date()): string {
  const next = new Date(d);
  next.setDate(d.getDate() + 1);
  return localDateKey(next);
}
