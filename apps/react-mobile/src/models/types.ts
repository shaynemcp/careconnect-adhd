/**
 * Domain model types. Ports of lib/models/*.dart.
 *
 * Dates are kept as native `Date` objects in memory (mirroring Dart's
 * `DateTime`) and are only serialised to ISO 8601 strings at the JSON
 * boundary — see `serialization.ts`.
 */

// ── User role ────────────────────────────────────────────────────────────

/** The two experiences the app serves. Port of lib/models/user_role.dart. */
export type UserRole = 'careRecipient' | 'caregiver';

/** Label shown on the role chooser and in settings. */
export function roleLabel(role: UserRole): string {
  return role === 'caregiver' ? 'Caregiver' : 'Care Recipient';
}

/** First path segment for this role's screens (used for deep links and redirects). */
export function roleRoutePrefix(role: UserRole): string {
  return role === 'caregiver' ? '/caregiver' : '/patient';
}

/** Where the role lands after sign-in. */
export function roleHomeLocation(role: UserRole): string {
  return role === 'caregiver' ? '/caregiver/dashboard' : '/patient/today';
}

export function roleFromStorage(value: string | null | undefined): UserRole {
  return value === 'caregiver' ? 'caregiver' : 'careRecipient';
}

// ── Session ──────────────────────────────────────────────────────────────

/**
 * How the user signed in. No password ever: passkey / Face ID or a plain
 * email handoff, per WCAG 2.2 SC 3.3.8 Accessible Authentication.
 */
export type SignInMethod = 'passkey' | 'email';

export function signInMethodFromStorage(value: string | null | undefined): SignInMethod {
  return value === 'email' ? 'email' : 'passkey';
}

/** The signed-in state. Absent (null) until the sign-in screen completes. */
export interface Session {
  role: UserRole;
  method: SignInMethod;
  signedInAt: Date;
  email?: string | null;
}

// ── People ───────────────────────────────────────────────────────────────

/** The care recipient. Fields mirror `packages/mock-data` on the web side. */
export interface Patient {
  id: string;
  /** What the orientation bar and caregiver dashboard call the person. */
  displayName: string;
  /** Used in plain-language activity summaries: "Muhammad logged…". */
  firstName: string;
  /** Fictional — always on the reserved `example.test` domain. */
  email: string;
  /** Backs the persistent "Call my caregiver" action (SC 3.2.6). */
  primaryCaregiverId?: string | null;
}

/**
 * The support person. `relationshipToPatient` is shown to the care recipient
 * in plain language ("your caregiver"), never as a role label.
 */
export interface Caregiver {
  id: string;
  displayName: string;
  firstName: string;
  relationshipToPatient: string;
  /** Fictional — always in the 555-01xx range reserved for fiction. */
  phone: string;
  patientIds: string[];
}

// ── Medication & doses ───────────────────────────────────────────────────

/**
 * A medication as the care recipient recognises it.
 *
 * `dosage` is plain language ("500 mg", "1000 IU"), never a clinical sig
 * like "1 tab PO QD". `scheduleTimes` are 24-hour local times ("08:00") and
 * one DoseEvent is generated per time per day.
 */
export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  scheduleTimes: string[];
  instructions?: string | null;
  /** Soft delete keeps adherence history intact for the caregiver timeline. */
  active: boolean;
}

/**
 * Lifecycle of one scheduled dose.
 *
 * `due` is the only state a dose can be in before the user acts. "Overdue"
 * is not a stored state — it is `due` whose scheduled time has passed, so it
 * is derived from the clock (see `doseIsOverdue` in domain.ts).
 */
export type DoseStatus = 'due' | 'taken' | 'skipped' | 'missed';

/** The text half of the status chip. Colour is never the only carrier. */
export function doseStatusLabel(status: DoseStatus): string {
  switch (status) {
    case 'due':
      return 'Due';
    case 'taken':
      return 'Taken';
    case 'skipped':
      return 'Skipped';
    case 'missed':
      return 'Missed';
  }
}

export function doseStatusFromStorage(value: string | null | undefined): DoseStatus {
  return value === 'taken' || value === 'skipped' || value === 'missed' ? value : 'due';
}

/**
 * Every state change offers undo so a mis-tap never becomes something the
 * care recipient has to ask a caregiver to fix. There is deliberately no
 * time limit on the *offer* — the undo snackbar stays up until the user
 * dismisses it or takes the action (WCAG 2.2 SC 2.2.1 Timing Adjustable) —
 * so, unlike an earlier version of this type, `DoseEvent` carries no
 * `undoableUntil`/expiry field. Whether a change can still be undone is
 * tracked in memory by the store (`careDataStore.ts`'s `undoRecords`) for
 * the lifetime of that one offer, not stamped onto the persisted record.
 * Ported from the same fix on the Flutter side (careconnect-adhd#18, #28).
 */

/** One row per scheduled dose per day. */
export interface DoseEvent {
  id: string;
  medicationId: string;
  scheduledFor: Date;
  status: DoseStatus;
  /** When the user acted. Null while the dose is still `due`. */
  recordedAt?: Date | null;
}

// ── Appointments ─────────────────────────────────────────────────────────

/** An appointment, with "who is taking me" answered on the card itself. */
export interface Appointment {
  id: string;
  patientId: string;
  /** Plain-language title: "Dr. Alvarez — Cardiology follow-up". */
  title: string;
  startsAt: Date;
  locationName: string;
  /** Who is accompanying the care recipient. Null means they are going alone. */
  companionName?: string | null;
  notes?: string | null;
}

// ── Activity feed ────────────────────────────────────────────────────────

/**
 * What kind of event a timeline row records. Drives the Activity Timeline
 * filter ("All medications & appointments").
 */
export type ActivityKind = 'dose' | 'appointment' | 'reminder' | 'note' | 'task';

export function activityKindFromStorage(value: string | null | undefined): ActivityKind {
  const known: ActivityKind[] = ['dose', 'appointment', 'reminder', 'note', 'task'];
  return (known as string[]).includes(value ?? '') ? (value as ActivityKind) : 'note';
}

/**
 * Append-only feed behind the caregiver's Activity Timeline.
 *
 * `summary` is pre-written plain language ("Muhammad logged Metformin taken
 * at 8:04 AM") so the timeline needs no interpretation.
 */
export interface ActivityEntry {
  id: string;
  at: Date;
  summary: string;
  kind: ActivityKind;
}

// ── Aggregate ────────────────────────────────────────────────────────────

/**
 * Everything the app knows about one care relationship, persisted as a
 * single JSON document. One aggregate keeps undo, autosave and reset simple:
 * every mutation produces a new CareData and writes it in one go.
 */
export interface CareData {
  patient: Patient;
  caregiver: Caregiver;
  medications: Medication[];
  doseEvents: DoseEvent[];
  appointments: Appointment[];
  activity: ActivityEntry[];
  /** The calendar day the fixtures were generated for. */
  seededOn: Date;
}

// ── Notification settings ────────────────────────────────────────────────

/**
 * How far ahead a reminder fires. The three choices from the Notifications
 * screen — the user, not the app, decides how they want to be interrupted.
 */
export type ReminderLeadTime = 'fifteenMinutes' | 'oneHour' | 'oneDay';

export interface ReminderLeadTimeInfo {
  minutes: number;
  /** Chip text. */
  label: string;
  /** Screen-reader phrasing. */
  spoken: string;
}

export const REMINDER_LEAD_TIMES: Record<ReminderLeadTime, ReminderLeadTimeInfo> = {
  fifteenMinutes: { minutes: 15, label: '15 min', spoken: '15 minutes before' },
  oneHour: { minutes: 60, label: '1 hour', spoken: '1 hour before' },
  oneDay: { minutes: 1440, label: '1 day', spoken: '1 day before' },
};

export const REMINDER_LEAD_TIME_VALUES: ReminderLeadTime[] = [
  'fifteenMinutes',
  'oneHour',
  'oneDay',
];

export function reminderLeadTimeFromStorage(
  value: string | null | undefined,
): ReminderLeadTime {
  return value === 'fifteenMinutes' || value === 'oneDay' ? value : 'oneHour';
}

/**
 * User-controlled reminder preferences (Must-Have 5: users control
 * reminders, frequency and snooze).
 */
export interface NotificationSettings {
  /** One summary a day instead of a stream of pings. */
  dailyDigest: boolean;
  leadTime: ReminderLeadTime;
}

/**
 * Overdue alerts always escalate immediately and are never held for the
 * digest (US-16). This is not a preference, so it is a constant, and the
 * Notifications screen shows it as a disabled, always-on control with an
 * explanation rather than hiding it.
 */
export const OVERDUE_ALERTS_ALWAYS_ON = true;

// ── App settings ─────────────────────────────────────────────────────────

export type ThemeModePreference = 'system' | 'light' | 'dark';

/** General app preferences (App Settings screen). */
export interface AppSettings {
  themeMode: ThemeModePreference;
  /**
   * Freezes the clock at the Week 3 design instant (Tuesday, August 25,
   * 2:14 PM) so every screen matches the Figma frames.
   */
  demoClock: boolean;
  /** Whether the caregiver can see the care recipient's data. */
  shareWithCaregiver: boolean;
}

// ── Drafts ───────────────────────────────────────────────────────────────

/**
 * In-progress state of the Add / Edit Medication form.
 *
 * Autosaved on every keystroke and restored when the form reopens, so an
 * interruption mid-form never costs lost progress (WCAG 2.2 SC 3.3.7
 * Redundant Entry).
 */
export interface MedicationDraft {
  /** Undefined when adding; the medication id when editing. */
  editingId?: string;
  step: number;
  name: string;
  dosage: string;
  scheduleTimes: string[];
  instructions: string;
}

export const MEDICATION_DRAFT_TOTAL_STEPS = 3;

export function emptyMedicationDraft(): MedicationDraft {
  return { step: 1, name: '', dosage: '', scheduleTimes: [], instructions: '' };
}

/** In-progress state of the Add / Edit Appointment form (two steps). */
export interface AppointmentDraft {
  editingId?: string;
  step: number;
  title: string;
  locationName: string;
  startsAt?: Date;
  companionName: string;
}

export const APPOINTMENT_DRAFT_TOTAL_STEPS = 2;

export function emptyAppointmentDraft(): AppointmentDraft {
  return { step: 1, title: '', locationName: '', companionName: '' };
}
