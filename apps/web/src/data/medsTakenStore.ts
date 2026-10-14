// Which medicines are marked taken today, as set on the Medications page.
// Stored with its date so it resets each day (#41); older saves had no date
// and are ignored.
import { localDateKey } from '../utils/date';

export const LS_MEDS_TAKEN_KEY = 'careconnect_meds_taken';

export function loadTakenForToday(today: string = localDateKey()): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(LS_MEDS_TAKEN_KEY);
    const stored: { date?: string; taken?: Record<string, boolean> } | null = raw ? JSON.parse(raw) : null;
    return stored?.date === today && stored.taken ? stored.taken : {};
  } catch {
    return {};
  }
}

export function saveTakenForToday(taken: Record<string, boolean>, today: string = localDateKey()): void {
  localStorage.setItem(LS_MEDS_TAKEN_KEY, JSON.stringify({ date: today, taken }));
}
