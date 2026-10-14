import { scheduleItems } from './mockData';
import type { ScheduleItem } from '../types';
import { localDateKey } from '../utils/date';

const LS_DONE_KEY = 'careconnect_schedule_done';
const LS_SKIPPED_KEY = 'careconnect_schedule_skipped';
const LS_LAST_DOSE_ACTION_KEY = 'careconnect_last_dose_action';

type LastDoseAction = {
  type: 'taken' | 'skipped';
  scheduleItemId: string;
};

function saveLastDoseAction(action: LastDoseAction): void {
  localStorage.setItem(LS_LAST_DOSE_ACTION_KEY, JSON.stringify(action));
}

function todayDate(): string {
  return localDateKey();
}

export function getCompletedScheduleIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_DONE_KEY);

    const stored: { date: string; ids: string[] } | null =
      raw ? JSON.parse(raw) : null;

    if (stored?.date === todayDate()) {
      return new Set(stored.ids);
    }
  } catch {
    // Ignore invalid localStorage data and start with no local completions.
  }

  return new Set<string>();
}

export function saveCompletedScheduleIds(ids: Set<string>): void {
  localStorage.setItem(
    LS_DONE_KEY,
    JSON.stringify({
      date: todayDate(),
      ids: [...ids],
    }),
  );
}

export function getSkippedScheduleIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_SKIPPED_KEY);

    const stored: { date: string; ids: string[] } | null =
      raw ? JSON.parse(raw) : null;

    if (stored?.date === todayDate()) {
      return new Set(stored.ids);
    }
  } catch {
    // Ignore invalid localStorage data and start with no skipped doses.
  }

  return new Set<string>();
}

export function saveSkippedScheduleIds(ids: Set<string>): void {
  localStorage.setItem(
    LS_SKIPPED_KEY,
    JSON.stringify({
      date: todayDate(),
      ids: [...ids],
    }),
  );
}

export function getScheduleForToday(): ScheduleItem[] {
  const completed = getCompletedScheduleIds();

  return scheduleItems.map((item) => ({
    ...item,
    done: item.done || completed.has(item.id),
  }));
}

export function getNextMedicationDose(): ScheduleItem | undefined {
  const skipped = getSkippedScheduleIds();

  return getScheduleForToday().find(
    (item) =>
      item.category === 'medication' &&
      !item.done &&
      !skipped.has(item.id),
  );
}

export function markNextMedicationDose(): ScheduleItem | undefined {
  const nextDose = getNextMedicationDose();

  if (!nextDose) {
    return undefined;
  }

  const completed = getCompletedScheduleIds();
  completed.add(nextDose.id);
  saveCompletedScheduleIds(completed);

  saveLastDoseAction({
    type: 'taken',
    scheduleItemId: nextDose.id,
  });

  return nextDose;
}

export function skipNextMedicationDose(): ScheduleItem | undefined {
  const nextDose = getNextMedicationDose();

  if (!nextDose) {
    return undefined;
  }

  const skipped = getSkippedScheduleIds();
  skipped.add(nextDose.id);
  saveSkippedScheduleIds(skipped);

  saveLastDoseAction({
    type: 'skipped',
    scheduleItemId: nextDose.id,
  });

  return nextDose;
}

export function undoLastDoseChange(): ScheduleItem | undefined {
  try {
    const raw = localStorage.getItem(LS_LAST_DOSE_ACTION_KEY);
    if (!raw) return undefined;

    const action: LastDoseAction = JSON.parse(raw);
    const item = scheduleItems.find(
      scheduleItem => scheduleItem.id === action.scheduleItemId,
    );

    if (!item) return undefined;

    if (action.type === 'taken') {
      const completed = getCompletedScheduleIds();
      completed.delete(action.scheduleItemId);
      saveCompletedScheduleIds(completed);
    } else {
      const skipped = getSkippedScheduleIds();
      skipped.delete(action.scheduleItemId);
      saveSkippedScheduleIds(skipped);
    }

    localStorage.removeItem(LS_LAST_DOSE_ACTION_KEY);
    return item;
  } catch {
    return undefined;
  }
}