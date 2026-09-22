import { FixedClock } from '../core/utils/clock';
import { IdGenerator } from '../core/utils/ids';
import { seedCareData } from '../data/mockData';
import { doseById, medicationById } from '../models/domain';
import { useCareDataStore, setIdGenerator } from './careDataStore';
import { useClockStore } from './clockStore';
import { useSessionStore } from './sessionStore';

const SEED_DAY = new Date(2026, 7, 25, 14, 14);

function resetStores(now = SEED_DAY) {
  setIdGenerator(new IdGenerator(() => 1_000));
  useClockStore.getState().setClock(new FixedClock(now));
  useSessionStore.setState({ session: null, hydrated: true });
  useCareDataStore.getState().hydrate(seedCareData(now));
}

beforeEach(() => {
  resetStores();
});

describe('markTaken / undoDoseChange', () => {
  it('marks a due dose taken and records an activity entry', async () => {
    await useCareDataStore.getState().markTaken('dose-metformin');
    const data = useCareDataStore.getState().data;
    const dose = doseById(data, 'dose-metformin')!;
    expect(dose.status).toBe('taken');
    expect(dose.recordedAt).toEqual(SEED_DAY);
    expect(data.activity.some((a) => a.summary.includes('logged Metformin taken'))).toBe(true);
  });

  it('undoes a mark-taken change', async () => {
    await useCareDataStore.getState().markTaken('dose-metformin');
    const undone = await useCareDataStore.getState().undoDoseChange('dose-metformin');
    expect(undone).toBe(true);
    const dose = doseById(useCareDataStore.getState().data, 'dose-metformin')!;
    expect(dose.status).toBe('due');
  });

  // careconnect-adhd#18 / #28: undo used to expire on a 10-second clock,
  // which raced against how long a screen-reader user actually needs to
  // reach the button. It no longer does — the only thing that invalidates
  // an undo offer is using (or reusing) it.
  it('undo remains available well past the old 10-second window (careconnect-adhd#28)', async () => {
    await useCareDataStore.getState().markTaken('dose-metformin');
    useClockStore.getState().setClock(new FixedClock(new Date(SEED_DAY.getTime() + 35_000)));
    const undone = await useCareDataStore.getState().undoDoseChange('dose-metformin');
    expect(undone).toBe(true);
    const dose = doseById(useCareDataStore.getState().data, 'dose-metformin')!;
    expect(dose.status).toBe('due');
  });

  it('returns false on a second undo of the same change — nothing left to reverse', async () => {
    await useCareDataStore.getState().markTaken('dose-metformin');
    const first = await useCareDataStore.getState().undoDoseChange('dose-metformin');
    const second = await useCareDataStore.getState().undoDoseChange('dose-metformin');
    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it('returns false for a dose with no pending change to undo', async () => {
    const undone = await useCareDataStore.getState().undoDoseChange('dose-metformin');
    expect(undone).toBe(false);
  });

  it('removes the activity entry added by the undone change', async () => {
    await useCareDataStore.getState().markTaken('dose-metformin');
    const beforeCount = useCareDataStore.getState().data.activity.length;
    await useCareDataStore.getState().undoDoseChange('dose-metformin');
    expect(useCareDataStore.getState().data.activity.length).toBe(beforeCount - 1);
  });

  it('is a no-op for an unknown dose id', async () => {
    const before = useCareDataStore.getState().data;
    await useCareDataStore.getState().markTaken('not-a-real-dose');
    expect(useCareDataStore.getState().data).toBe(before);
  });
});

describe('skipDose', () => {
  it('marks a dose skipped with the caregiver as actor when signed in as caregiver', async () => {
    useSessionStore.setState({
      session: { role: 'caregiver', method: 'passkey', signedInAt: SEED_DAY, email: null },
      hydrated: true,
    });
    await useCareDataStore.getState().skipDose('dose-atorvastatin');
    const data = useCareDataStore.getState().data;
    expect(doseById(data, 'dose-atorvastatin')!.status).toBe('skipped');
    expect(data.activity.some((a) => a.summary.startsWith('Renee skipped Atorvastatin'))).toBe(
      true,
    );
  });
});

describe('addMedication', () => {
  it('adds a medication and generates today doses for its schedule', async () => {
    const med = await useCareDataStore.getState().addMedication({
      name: ' Ibuprofen ',
      dosage: ' 200 mg ',
      scheduleTimes: ['09:00'],
      instructions: '  ',
    });
    expect(med.name).toBe('Ibuprofen');
    expect(med.dosage).toBe('200 mg');
    expect(med.instructions).toBeNull();

    const data = useCareDataStore.getState().data;
    expect(medicationById(data, med.id)).toBeDefined();
    const newDose = data.doseEvents.find((d) => d.medicationId === med.id);
    expect(newDose).toBeDefined();
    expect(newDose!.scheduledFor).toEqual(new Date(2026, 7, 25, 9, 0));
  });
});

describe('updateMedication', () => {
  it('regenerates today doses when the schedule changes, keeping logged history', async () => {
    // Lisinopril has an 8:00 dose already taken and an 18:00 dose still due.
    const existing = medicationById(useCareDataStore.getState().data, 'med-lisinopril')!;
    await useCareDataStore.getState().updateMedication({
      ...existing,
      scheduleTimes: ['09:30'],
    });
    const data = useCareDataStore.getState().data;
    const lisinoprilDoses = data.doseEvents.filter((d) => d.medicationId === 'med-lisinopril');

    // The old 18:00 due dose is gone... (scoped to status 'due': yesterday's
    // 18:00 dose is also hour 18, but it's already 'taken' history and must
    // stay, so a bare `.getHours() === 18` check would pass even if today's
    // due dose were never removed.)
    expect(
      lisinoprilDoses.some((d) => d.status === 'due' && d.scheduledFor.getHours() === 18),
    ).toBe(false);
    // ...but the already-taken 8:00 dose is history and stays.
    expect(lisinoprilDoses.some((d) => d.status === 'taken' && d.scheduledFor.getHours() === 8)).toBe(
      true,
    );
    // ...and a new due dose at 9:30 appears.
    expect(
      lisinoprilDoses.some((d) => d.status === 'due' && d.scheduledFor.getHours() === 9 && d.scheduledFor.getMinutes() === 30),
    ).toBe(true);
  });

  it('does not touch doses when the schedule is unchanged', async () => {
    const existing = medicationById(useCareDataStore.getState().data, 'med-lisinopril')!;
    const before = useCareDataStore.getState().data.doseEvents.filter(
      (d) => d.medicationId === 'med-lisinopril',
    );
    await useCareDataStore.getState().updateMedication({ ...existing, name: 'Lisinopril HCTZ' });
    const after = useCareDataStore.getState().data.doseEvents.filter(
      (d) => d.medicationId === 'med-lisinopril',
    );
    expect(after).toEqual(before);
  });
});

describe('deleteMedication', () => {
  it('soft-deletes: inactive, removed from active list, due doses cleared, history kept', async () => {
    await useCareDataStore.getState().deleteMedication('med-atorvastatin');
    const data = useCareDataStore.getState().data;
    const med = medicationById(data, 'med-atorvastatin')!;
    expect(med.active).toBe(false);
    // Today's due Atorvastatin dose is removed...
    expect(
      data.doseEvents.some((d) => d.medicationId === 'med-atorvastatin' && d.status === 'due'),
    ).toBe(false);
    // ...but yesterday's taken dose remains for history.
    expect(
      data.doseEvents.some((d) => d.medicationId === 'med-atorvastatin' && d.status === 'taken'),
    ).toBe(true);
  });
});

describe('appointments', () => {
  it('adds, updates and deletes an appointment', async () => {
    const appt = await useCareDataStore.getState().addAppointment({
      title: 'Dentist',
      locationName: 'Main St Dental',
      startsAt: new Date(2026, 7, 30, 10, 0),
      companionName: '',
    });
    expect(appt.companionName).toBeNull();

    await useCareDataStore.getState().updateAppointment({ ...appt, locationName: 'Downtown Dental' });
    expect(
      useCareDataStore.getState().data.appointments.find((a) => a.id === appt.id)?.locationName,
    ).toBe('Downtown Dental');

    await useCareDataStore.getState().deleteAppointment(appt.id);
    expect(useCareDataStore.getState().data.appointments.some((a) => a.id === appt.id)).toBe(false);
  });
});

describe('resetDemoData', () => {
  it('restores the seed relative to the current clock', async () => {
    await useCareDataStore.getState().markTaken('dose-metformin');
    await useCareDataStore.getState().resetDemoData();
    const dose = doseById(useCareDataStore.getState().data, 'dose-metformin');
    expect(dose?.status).toBe('due');
  });
});

describe('ensureDosesForDay', () => {
  it('is a no-op when every schedule time already has a dose', async () => {
    const before = useCareDataStore.getState().data;
    await useCareDataStore.getState().ensureDosesForDay(SEED_DAY);
    expect(useCareDataStore.getState().data).toBe(before);
  });

  it('creates doses for the next calendar day', async () => {
    const tomorrow = new Date(2026, 7, 26, 0, 0);
    await useCareDataStore.getState().ensureDosesForDay(tomorrow);
    const data = useCareDataStore.getState().data;
    const tomorrowMetformin = data.doseEvents.find(
      (d) => d.medicationId === 'med-metformin' && d.scheduledFor.getDate() === 26,
    );
    expect(tomorrowMetformin).toBeDefined();
  });
});
