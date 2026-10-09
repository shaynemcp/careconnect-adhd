/**
 * Computed properties that were instance getters on the Dart model classes
 * (lib/models/*.dart). Kept as free functions since the TS types above are
 * plain data interfaces.
 */
import { dateAndTime, clockTime } from '../core/utils/dateFormatting';
import type {
  Appointment,
  AppointmentDraft,
  CareData,
  DoseEvent,
  Medication,
  MedicationDraft,
} from './types';

// ── Medication ───────────────────────────────────────────────────────────

/** "Metformin, 500 mg" — the card title everywhere in the app. */
export function medicationDisplayName(medication: Medication): string {
  return medication.dosage.length === 0
    ? medication.name
    : `${medication.name}, ${medication.dosage}`;
}

// ── Appointment ──────────────────────────────────────────────────────────

/** "Renee is taking me" or "Driving myself". */
export function appointmentCompanionLabel(appointment: Appointment): string {
  const name = appointment.companionName?.trim();
  return name === undefined || name === null || name.length === 0
    ? 'Driving myself'
    : `${name} is taking me`;
}

/** "Tuesday, August 25 · 2:30 PM · Regional Medical · Renee is taking me" */
export function appointmentSummaryLine(appointment: Appointment): string {
  return `${dateAndTime(appointment.startsAt)} · ${appointment.locationName} · ${appointmentCompanionLabel(appointment)}`;
}

// ── DoseEvent ────────────────────────────────────────────────────────────

export function doseIsDue(dose: DoseEvent): boolean {
  return dose.status === 'due';
}

/** A due dose whose time has passed. */
export function doseIsOverdue(dose: DoseEvent, now: Date): boolean {
  return doseIsDue(dose) && dose.scheduledFor.getTime() < now.getTime();
}

// ── CareData ─────────────────────────────────────────────────────────────

export function activeMedications(data: CareData): Medication[] {
  return data.medications.filter((m) => m.active);
}

export function medicationById(data: CareData, id: string): Medication | undefined {
  return data.medications.find((m) => m.id === id);
}

export function doseById(data: CareData, id: string): DoseEvent | undefined {
  return data.doseEvents.find((d) => d.id === id);
}

export function appointmentById(data: CareData, id: string): Appointment | undefined {
  return data.appointments.find((a) => a.id === id);
}

// ── Drafts ───────────────────────────────────────────────────────────────

export function medicationDraftIsEditing(draft: MedicationDraft): boolean {
  return draft.editingId != null;
}

export function medicationDraftIsEmpty(draft: MedicationDraft): boolean {
  return (
    draft.editingId == null &&
    draft.step === 1 &&
    draft.name.length === 0 &&
    draft.dosage.length === 0 &&
    draft.scheduleTimes.length === 0 &&
    draft.instructions.length === 0
  );
}

export function appointmentDraftIsEditing(draft: AppointmentDraft): boolean {
  return draft.editingId != null;
}

export function appointmentDraftIsEmpty(draft: AppointmentDraft): boolean {
  return (
    draft.editingId == null &&
    draft.step === 1 &&
    draft.title.length === 0 &&
    draft.locationName.length === 0 &&
    draft.startsAt == null &&
    draft.companionName.length === 0
  );
}

/** Re-exported for screens that only need a clock time string ("8:04 AM"). */
export { clockTime };
