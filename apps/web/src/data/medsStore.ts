/**
 * Shared medication store backed by localStorage.
 * Caregiver management screens write here; patient Medications screen reads from here.
 */
import { medications as defaultMeds } from './mockData';
import type { Medication } from '../types';

const LS_KEY = 'careconnect_medications_list';
const LS_PAUSED_REMINDERS_KEY = 'careconnect_paused_medication_reminders';

export function getMedications(): Medication[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Medication[]) : [...defaultMeds];
  } catch {
    return [...defaultMeds];
  }
}

export function saveMedications(meds: Medication[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(meds));
}

export function getPausedMedicationReminderIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_PAUSED_REMINDERS_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    return new Set(ids);
  } catch {
    return new Set<string>();
  }
}

export function toggleMedicationRemindersPaused(id: string): boolean {
  const pausedIds = getPausedMedicationReminderIds();

  if (pausedIds.has(id)) {
    pausedIds.delete(id);
  } else {
    pausedIds.add(id);
  }

  localStorage.setItem(
    LS_PAUSED_REMINDERS_KEY,
    JSON.stringify([...pausedIds]),
  );

  return pausedIds.has(id);
}

// Colour palette cycled for new medications
const COLOURS = [
  'bg-calm-200',
  'bg-warm-200',
  'bg-success-200',
  'bg-warning-200',
  'bg-alert-200',
  'bg-neutral-200',
];

export function pickColour(existingCount: number): string {
  return COLOURS[existingCount % COLOURS.length];
}
