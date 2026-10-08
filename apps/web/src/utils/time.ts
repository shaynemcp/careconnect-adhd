/** Format a 24-hour "HH:mm" string as 12-hour time, e.g. "17:30" -> "5:30 pm". */
export function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
}
