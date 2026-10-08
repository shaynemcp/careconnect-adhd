import { localDateKey } from '../utils/date';

const LS_MEDS_TAKEN_KEY = 'careconnect_meds_taken';

type TakenDoc = { date: string; taken: Record<string, boolean> };

/** Taken state for today only. Anything saved on an earlier day (or in the old undated format) is ignored. */
export function loadTakenToday(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(LS_MEDS_TAKEN_KEY);
    const doc = raw ? (JSON.parse(raw) as Partial<TakenDoc>) : null;
    if (doc?.date === localDateKey() && doc.taken && typeof doc.taken === 'object') {
      return doc.taken;
    }
  } catch {
    // Ignore invalid localStorage data and start with nothing taken.
  }
  return {};
}

export function saveTakenToday(taken: Record<string, boolean>): void {
  const doc: TakenDoc = { date: localDateKey(), taken };
  localStorage.setItem(LS_MEDS_TAKEN_KEY, JSON.stringify(doc));
}
