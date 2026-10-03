/**
 * JSON (de)serialisation for every persisted model. Ports of the
 * `fromJson` / `toJson` pairs in lib/models/*.dart.
 *
 * Dates are stored as ISO 8601 strings and rehydrated to `Date` objects on
 * read, matching `DateTime.parse` / `toIso8601String()` in the Dart port.
 */
import {
  activityKindFromStorage,
  doseStatusFromStorage,
  reminderLeadTimeFromStorage,
  roleFromStorage,
  signInMethodFromStorage,
  type ActivityEntry,
  type AppSettings,
  type Appointment,
  type AppointmentDraft,
  type Caregiver,
  type CareData,
  type DoseEvent,
  type Medication,
  type MedicationDraft,
  type NotificationSettings,
  type Patient,
  type Session,
  type ThemeModePreference,
} from './types';

// ── Patient / Caregiver ──────────────────────────────────────────────────

export function patientFromJson(json: Record<string, unknown>): Patient {
  return {
    id: json.id as string,
    displayName: json.displayName as string,
    firstName: json.firstName as string,
    email: json.email as string,
    primaryCaregiverId: (json.primaryCaregiverId as string | null) ?? null,
  };
}

export function patientToJson(patient: Patient): Record<string, unknown> {
  return { ...patient };
}

export function caregiverFromJson(json: Record<string, unknown>): Caregiver {
  return {
    id: json.id as string,
    displayName: json.displayName as string,
    firstName: json.firstName as string,
    relationshipToPatient: json.relationshipToPatient as string,
    phone: json.phone as string,
    patientIds: [...(json.patientIds as string[])],
  };
}

export function caregiverToJson(caregiver: Caregiver): Record<string, unknown> {
  return { ...caregiver };
}

// ── Session ──────────────────────────────────────────────────────────────

export function sessionFromJson(json: Record<string, unknown>): Session {
  return {
    role: roleFromStorage(json.role as string | undefined),
    method: signInMethodFromStorage(json.method as string | undefined),
    signedInAt: new Date(json.signedInAt as string),
    email: (json.email as string | null) ?? null,
  };
}

export function sessionToJson(session: Session): Record<string, unknown> {
  return {
    role: session.role,
    method: session.method,
    signedInAt: session.signedInAt.toISOString(),
    email: session.email ?? null,
  };
}

// ── Medication ───────────────────────────────────────────────────────────

export function medicationFromJson(json: Record<string, unknown>): Medication {
  return {
    id: json.id as string,
    patientId: json.patientId as string,
    name: json.name as string,
    dosage: json.dosage as string,
    scheduleTimes: [...(json.scheduleTimes as string[])],
    instructions: (json.instructions as string | null) ?? null,
    active: (json.active as boolean | undefined) ?? true,
  };
}

export function medicationToJson(medication: Medication): Record<string, unknown> {
  return { ...medication };
}

// ── DoseEvent ────────────────────────────────────────────────────────────

export function doseEventFromJson(json: Record<string, unknown>): DoseEvent {
  return {
    id: json.id as string,
    medicationId: json.medicationId as string,
    scheduledFor: new Date(json.scheduledFor as string),
    status: doseStatusFromStorage(json.status as string | undefined),
    recordedAt: json.recordedAt ? new Date(json.recordedAt as string) : null,
    // `undoableUntil` was removed from the DoseEvent model (careconnect-adhd#28
    // — undo is no longer time-gated). Data written by an older build of the
    // app may still have that key; it's simply ignored here rather than
    // mapped onto anything, which is all "backward compatible" needs to mean
    // for an additive field like this.
  };
}

export function doseEventToJson(dose: DoseEvent): Record<string, unknown> {
  return {
    id: dose.id,
    medicationId: dose.medicationId,
    scheduledFor: dose.scheduledFor.toISOString(),
    status: dose.status,
    recordedAt: dose.recordedAt ? dose.recordedAt.toISOString() : null,
  };
}

// ── Appointment ──────────────────────────────────────────────────────────

export function appointmentFromJson(json: Record<string, unknown>): Appointment {
  return {
    id: json.id as string,
    patientId: json.patientId as string,
    title: json.title as string,
    startsAt: new Date(json.startsAt as string),
    locationName: json.locationName as string,
    companionName: (json.companionName as string | null) ?? null,
    notes: (json.notes as string | null) ?? null,
  };
}

export function appointmentToJson(appointment: Appointment): Record<string, unknown> {
  return {
    id: appointment.id,
    patientId: appointment.patientId,
    title: appointment.title,
    startsAt: appointment.startsAt.toISOString(),
    locationName: appointment.locationName,
    companionName: appointment.companionName ?? null,
    notes: appointment.notes ?? null,
  };
}

// ── ActivityEntry ────────────────────────────────────────────────────────

export function activityEntryFromJson(json: Record<string, unknown>): ActivityEntry {
  return {
    id: json.id as string,
    at: new Date(json.at as string),
    summary: json.summary as string,
    kind: activityKindFromStorage(json.kind as string | undefined),
  };
}

export function activityEntryToJson(entry: ActivityEntry): Record<string, unknown> {
  return {
    id: entry.id,
    at: entry.at.toISOString(),
    summary: entry.summary,
    kind: entry.kind,
  };
}

// ── CareData ─────────────────────────────────────────────────────────────

export function careDataFromJson(json: Record<string, unknown>): CareData {
  return {
    patient: patientFromJson(json.patient as Record<string, unknown>),
    caregiver: caregiverFromJson(json.caregiver as Record<string, unknown>),
    medications: (json.medications as Record<string, unknown>[]).map(medicationFromJson),
    doseEvents: (json.doseEvents as Record<string, unknown>[]).map(doseEventFromJson),
    appointments: (json.appointments as Record<string, unknown>[]).map(appointmentFromJson),
    activity: (json.activity as Record<string, unknown>[]).map(activityEntryFromJson),
    seededOn: new Date(json.seededOn as string),
  };
}

export function careDataToJson(data: CareData): Record<string, unknown> {
  return {
    patient: patientToJson(data.patient),
    caregiver: caregiverToJson(data.caregiver),
    medications: data.medications.map(medicationToJson),
    doseEvents: data.doseEvents.map(doseEventToJson),
    appointments: data.appointments.map(appointmentToJson),
    activity: data.activity.map(activityEntryToJson),
    seededOn: data.seededOn.toISOString(),
  };
}

// ── NotificationSettings ─────────────────────────────────────────────────

export function notificationSettingsFromJson(
  json: Record<string, unknown>,
): NotificationSettings {
  return {
    dailyDigest: (json.dailyDigest as boolean | undefined) ?? true,
    leadTime: reminderLeadTimeFromStorage(json.leadTime as string | undefined),
  };
}

export function notificationSettingsToJson(
  settings: NotificationSettings,
): Record<string, unknown> {
  return { dailyDigest: settings.dailyDigest, leadTime: settings.leadTime };
}

export function defaultNotificationSettings(): NotificationSettings {
  return { dailyDigest: true, leadTime: 'oneHour' };
}

// ── AppSettings ──────────────────────────────────────────────────────────

function themeModeFromStorage(value: string | null | undefined): ThemeModePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function appSettingsFromJson(json: Record<string, unknown>): AppSettings {
  return {
    themeMode: themeModeFromStorage(json.themeMode as string | undefined),
    demoClock: (json.demoClock as boolean | undefined) ?? false,
    shareWithCaregiver: (json.shareWithCaregiver as boolean | undefined) ?? true,
  };
}

export function appSettingsToJson(settings: AppSettings): Record<string, unknown> {
  return { ...settings };
}

export function defaultAppSettings(): AppSettings {
  return { themeMode: 'system', demoClock: false, shareWithCaregiver: true };
}

// ── Drafts ───────────────────────────────────────────────────────────────

export function medicationDraftFromJson(json: Record<string, unknown>): MedicationDraft {
  return {
    editingId: (json.editingId as string | null) ?? undefined,
    step: (json.step as number | undefined) ?? 1,
    name: (json.name as string | undefined) ?? '',
    dosage: (json.dosage as string | undefined) ?? '',
    scheduleTimes: [...((json.scheduleTimes as string[] | undefined) ?? [])],
    instructions: (json.instructions as string | undefined) ?? '',
  };
}

export function medicationDraftToJson(draft: MedicationDraft): Record<string, unknown> {
  return {
    editingId: draft.editingId ?? null,
    step: draft.step,
    name: draft.name,
    dosage: draft.dosage,
    scheduleTimes: draft.scheduleTimes,
    instructions: draft.instructions,
  };
}

export function appointmentDraftFromJson(json: Record<string, unknown>): AppointmentDraft {
  return {
    editingId: (json.editingId as string | null) ?? undefined,
    step: (json.step as number | undefined) ?? 1,
    title: (json.title as string | undefined) ?? '',
    locationName: (json.locationName as string | undefined) ?? '',
    startsAt: json.startsAt ? new Date(json.startsAt as string) : undefined,
    companionName: (json.companionName as string | undefined) ?? '',
  };
}

export function appointmentDraftToJson(draft: AppointmentDraft): Record<string, unknown> {
  return {
    editingId: draft.editingId ?? null,
    step: draft.step,
    title: draft.title,
    locationName: draft.locationName,
    startsAt: draft.startsAt ? draft.startsAt.toISOString() : null,
    companionName: draft.companionName,
  };
}
