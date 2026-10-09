/**
 * The single source of truth for medications, doses, appointments and the
 * activity feed. Every mutation replaces `state.data` with a new `CareData`
 * and writes it to local storage.
 *
 * Port of lib/state/care_data_provider.dart.
 */
import { create } from 'zustand';

import { combine, isSameDay, clockTime, parseLocalTime } from '../core/utils/dateFormatting';
import { IdGenerator } from '../core/utils/ids';
import { StoreKeys, writeJson } from '../data/localStore';
import { seedCareData } from '../data/mockData';
import {
  activeMedications,
  appointmentById,
  doseById,
  medicationById,
  medicationDisplayName,
} from '../models/domain';
import { careDataToJson } from '../models/serialization';
import type {
  ActivityEntry,
  ActivityKind,
  Appointment,
  CareData,
  DoseEvent,
  DoseStatus,
  Medication,
} from '../models/types';
import { useClockStore } from './clockStore';
import { useSessionStore } from './sessionStore';

let idGenerator = new IdGenerator();

/** Test-only seam: swap in a deterministic id generator. */
export function setIdGenerator(generator: IdGenerator): void {
  idGenerator = generator;
}

function nullIfBlank(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed == null || trimmed.length === 0 ? null : trimmed;
}

function replaceDose(list: DoseEvent[], dose: DoseEvent): DoseEvent[] {
  return list.map((d) => (d.id === dose.id ? dose : d));
}

/**
 * Creates a `due` dose for every active medication time on `day` that does
 * not already have one. Pure — returns `data` unchanged (`===`) when nothing
 * is added, so callers can skip persisting.
 */
export function withDosesForDay(data: CareData, day: Date): CareData {
  const additions: DoseEvent[] = [];
  for (const medication of activeMedications(data)) {
    for (const time of medication.scheduleTimes) {
      const scheduledFor = combine(day, parseLocalTime(time));
      const exists = data.doseEvents.some(
        (d) => d.medicationId === medication.id && d.scheduledFor.getTime() === scheduledFor.getTime(),
      );
      if (!exists) {
        additions.push({
          id: idGenerator.next('dose'),
          medicationId: medication.id,
          scheduledFor,
          status: 'due',
        });
      }
    }
  }
  if (additions.length === 0) return data;
  return { ...data, doseEvents: [...data.doseEvents, ...additions] };
}

interface UndoRecord {
  previous: DoseEvent;
  activityId: string;
}

interface CareDataState {
  data: CareData;
  hydrated: boolean;
  hydrate: (data: CareData) => void;

  markTaken: (doseId: string) => Promise<void>;
  skipDose: (doseId: string) => Promise<void>;
  undoDoseChange: (doseId: string) => Promise<boolean>;
  ensureDosesForDay: (day: Date) => Promise<void>;

  addMedication: (input: {
    name: string;
    dosage: string;
    scheduleTimes: string[];
    instructions?: string | null;
  }) => Promise<Medication>;
  updateMedication: (medication: Medication) => Promise<void>;
  deleteMedication: (medicationId: string) => Promise<void>;

  addAppointment: (input: {
    title: string;
    locationName: string;
    startsAt: Date;
    companionName?: string | null;
    notes?: string | null;
  }) => Promise<Appointment>;
  updateAppointment: (appointment: Appointment) => Promise<void>;
  deleteAppointment: (appointmentId: string) => Promise<void>;

  resetDemoData: () => Promise<void>;
}

/** Seed placeholder used only until `hydrate()` runs at app start-up. */
const placeholderData: CareData = seedCareData(new Date(2026, 7, 25, 14, 14));

export const useCareDataStore = create<CareDataState>((set, get) => {
  const undoRecords = new Map<string, UndoRecord>();

  function now(): Date {
    return useClockStore.getState().now;
  }

  function actor(data: CareData): string {
    const role = useSessionStore.getState().session?.role ?? 'careRecipient';
    return role === 'caregiver' ? data.caregiver.firstName : data.patient.firstName;
  }

  async function persist(data: CareData): Promise<void> {
    await writeJson(StoreKeys.careData, careDataToJson(data));
  }

  async function transition(doseId: string, next: DoseStatus): Promise<void> {
    const data = get().data;
    const dose = doseById(data, doseId);
    if (dose == null) return;
    const medication = medicationById(data, dose.medicationId);
    if (medication == null) return;

    const at = now();
    const updated: DoseEvent = {
      ...dose,
      status: next,
      recordedAt: at,
    };
    const verb = next === 'taken' ? `logged ${medication.name} taken` : `skipped ${medication.name}`;
    const entry: ActivityEntry = {
      id: idGenerator.next('act'),
      at,
      summary: `${actor(data)} ${verb} at ${clockTime(at)}`,
      kind: 'dose' as ActivityKind,
    };
    undoRecords.set(doseId, { previous: dose, activityId: entry.id });

    const nextData: CareData = {
      ...data,
      doseEvents: replaceDose(data.doseEvents, updated),
      activity: [...data.activity, entry],
    };
    set({ data: nextData });
    await persist(nextData);
  }

  return {
    data: placeholderData,
    hydrated: false,
    hydrate: (data) => set({ data, hydrated: true }),

    markTaken: (doseId) => transition(doseId, 'taken'),
    skipDose: (doseId) => transition(doseId, 'skipped'),

    // No time-based expiry here (careconnect-adhd#18, #28): the only gate is
    // whether an undo record for this dose still exists. It's set by
    // `transition()` above and consumed (deleted) the moment it's used, so
    // undo stays valid for as long as the snackbar that offers it is still
    // on screen — which, per UndoSnackbar.tsx, is until the user dismisses
    // it or a screen-reader user finally reaches the button, not a fixed
    // 10 seconds. A second change to the same dose overwrites the record,
    // so only the most recent change is ever undoable, same as before.
    undoDoseChange: async (doseId) => {
      const record = undoRecords.get(doseId);
      undoRecords.delete(doseId);
      const data = get().data;
      const current = doseById(data, doseId);
      if (record == null || current == null) return false;

      const restored: DoseEvent = { ...record.previous };
      const nextData: CareData = {
        ...data,
        doseEvents: replaceDose(data.doseEvents, restored),
        activity: data.activity.filter((a) => a.id !== record.activityId),
      };
      set({ data: nextData });
      await persist(nextData);
      return true;
    },

    ensureDosesForDay: async (day) => {
      const data = get().data;
      const next = withDosesForDay(data, day);
      if (next === data) return;
      set({ data: next });
      await persist(next);
    },

    addMedication: async ({ name, dosage, scheduleTimes, instructions }) => {
      const data = get().data;
      const medication: Medication = {
        id: idGenerator.next('med'),
        patientId: data.patient.id,
        name: name.trim(),
        dosage: dosage.trim(),
        scheduleTimes: [...scheduleTimes],
        instructions: nullIfBlank(instructions),
        active: true,
      };
      const at = now();
      let next: CareData = {
        ...data,
        medications: [...data.medications, medication],
        activity: [
          ...data.activity,
          {
            id: idGenerator.next('act'),
            at,
            summary: `${actor(data)} added ${medicationDisplayName(medication)}`,
            kind: 'note',
          },
        ],
      };
      next = withDosesForDay(next, at);
      set({ data: next });
      await persist(next);
      return medication;
    },

    updateMedication: async (medication) => {
      const data = get().data;
      const existing = medicationById(data, medication.id);
      if (existing == null) return;
      const at = now();
      const scheduleChanged =
        existing.scheduleTimes.length !== medication.scheduleTimes.length ||
        existing.scheduleTimes.some((t, i) => t !== medication.scheduleTimes[i]);

      let doses = data.doseEvents;
      if (scheduleChanged) {
        // Drop today's not-yet-logged doses so the new schedule regenerates
        // them; anything already taken or skipped is history and stays.
        doses = doses.filter(
          (d) =>
            !(d.medicationId === medication.id && d.status === 'due' && isSameDay(d.scheduledFor, at)),
        );
      }
      let next: CareData = {
        ...data,
        medications: data.medications.map((m) => (m.id === medication.id ? medication : m)),
        doseEvents: doses,
        activity: [
          ...data.activity,
          {
            id: idGenerator.next('act'),
            at,
            summary: `${actor(data)} updated ${medicationDisplayName(medication)}`,
            kind: 'note',
          },
        ],
      };
      next = withDosesForDay(next, at);
      set({ data: next });
      await persist(next);
    },

    deleteMedication: async (medicationId) => {
      const data = get().data;
      const medication = medicationById(data, medicationId);
      if (medication == null) return;
      const at = now();
      const next: CareData = {
        ...data,
        medications: data.medications.map((m) =>
          m.id === medicationId ? { ...m, active: false } : m,
        ),
        doseEvents: data.doseEvents.filter(
          (d) => !(d.medicationId === medicationId && d.status === 'due'),
        ),
        activity: [
          ...data.activity,
          {
            id: idGenerator.next('act'),
            at,
            summary: `${actor(data)} removed ${medicationDisplayName(medication)}`,
            kind: 'note',
          },
        ],
      };
      set({ data: next });
      await persist(next);
    },

    addAppointment: async ({ title, locationName, startsAt, companionName, notes }) => {
      const data = get().data;
      const appointment: Appointment = {
        id: idGenerator.next('appt'),
        patientId: data.patient.id,
        title: title.trim(),
        startsAt,
        locationName: locationName.trim(),
        companionName: nullIfBlank(companionName),
        notes: nullIfBlank(notes),
      };
      const next: CareData = {
        ...data,
        appointments: [...data.appointments, appointment],
        activity: [
          ...data.activity,
          {
            id: idGenerator.next('act'),
            at: now(),
            summary: `${actor(data)} added the ${clockTime(startsAt)} ${appointment.title}`,
            kind: 'appointment',
          },
        ],
      };
      set({ data: next });
      await persist(next);
      return appointment;
    },

    updateAppointment: async (appointment) => {
      const data = get().data;
      if (appointmentById(data, appointment.id) == null) return;
      const next: CareData = {
        ...data,
        appointments: data.appointments.map((a) => (a.id === appointment.id ? appointment : a)),
        activity: [
          ...data.activity,
          {
            id: idGenerator.next('act'),
            at: now(),
            summary: `${actor(data)} updated the appointment time to ${clockTime(appointment.startsAt)}`,
            kind: 'appointment',
          },
        ],
      };
      set({ data: next });
      await persist(next);
    },

    deleteAppointment: async (appointmentId) => {
      const data = get().data;
      const appointment = appointmentById(data, appointmentId);
      if (appointment == null) return;
      const next: CareData = {
        ...data,
        appointments: data.appointments.filter((a) => a.id !== appointmentId),
        activity: [
          ...data.activity,
          {
            id: idGenerator.next('act'),
            at: now(),
            summary: `${actor(data)} removed the ${appointment.title} appointment`,
            kind: 'appointment',
          },
        ],
      };
      set({ data: next });
      await persist(next);
    },

    resetDemoData: async () => {
      undoRecords.clear();
      const at = now();
      const next = withDosesForDay(seedCareData(at), at);
      set({ data: next });
      await persist(next);
    },
  };
});

// Regenerates the day's doses whenever the calendar day changes — midnight
// rollover, or the demo clock being switched on or off — mirroring the
// `ref.listen(currentTimeProvider, ...)` guard inside the Dart notifier's
// `build()`.
useClockStore.subscribe((state, prevState) => {
  if (!isSameDay(state.now, prevState.now)) {
    void useCareDataStore.getState().ensureDosesForDay(state.now);
  }
});
