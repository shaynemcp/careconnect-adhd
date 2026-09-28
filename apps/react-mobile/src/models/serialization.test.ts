import {
  activityEntryFromJson,
  activityEntryToJson,
  appSettingsFromJson,
  appSettingsToJson,
  appointmentDraftFromJson,
  appointmentDraftToJson,
  appointmentFromJson,
  appointmentToJson,
  careDataFromJson,
  careDataToJson,
  caregiverFromJson,
  caregiverToJson,
  defaultAppSettings,
  defaultNotificationSettings,
  doseEventFromJson,
  doseEventToJson,
  medicationDraftFromJson,
  medicationDraftToJson,
  medicationFromJson,
  medicationToJson,
  notificationSettingsFromJson,
  notificationSettingsToJson,
  patientFromJson,
  patientToJson,
  sessionFromJson,
  sessionToJson,
} from './serialization';
import { seedCareData } from '../data/mockData';

const SEED_DAY = new Date(2026, 7, 25, 14, 14);
const ISO = '2026-08-25T18:14:00.000Z';

describe('patient and caregiver', () => {
  it('round-trips a patient and defaults a missing primary caregiver to null', () => {
    const patient = patientFromJson({
      id: 'p1',
      displayName: 'Muhammad R.',
      firstName: 'Muhammad',
      email: 'm@example.com',
    });
    expect(patient.primaryCaregiverId).toBeNull();
    expect(patientFromJson(patientToJson(patient))).toEqual(patient);
  });

  it('keeps an explicit primary caregiver', () => {
    const patient = patientFromJson({
      id: 'p1',
      displayName: 'A',
      firstName: 'A',
      email: 'a@example.com',
      primaryCaregiverId: 'c1',
    });
    expect(patient.primaryCaregiverId).toBe('c1');
  });

  it('copies the caregiver patient list instead of sharing it', () => {
    const source = {
      id: 'c1',
      displayName: 'Renee',
      firstName: 'Renee',
      relationshipToPatient: 'Daughter',
      phone: '555-0100',
      patientIds: ['p1'],
    };
    const caregiver = caregiverFromJson(source);
    expect(caregiver).toEqual(source);
    expect(caregiver.patientIds).not.toBe(source.patientIds);
    expect(caregiverFromJson(caregiverToJson(caregiver))).toEqual(caregiver);
  });
});

describe('session', () => {
  it('round-trips a full session', () => {
    const session = sessionFromJson({
      role: 'caregiver',
      method: 'email',
      signedInAt: ISO,
      email: 'renee@example.com',
    });
    expect(session.role).toBe('caregiver');
    expect(session.method).toBe('email');
    expect(session.signedInAt).toEqual(new Date(ISO));
    expect(sessionFromJson(sessionToJson(session))).toEqual(session);
  });

  it('falls back to a care recipient signing in with a passkey, and no email', () => {
    const session = sessionFromJson({ signedInAt: ISO });
    expect(session.role).toBe('careRecipient');
    expect(session.method).toBe('passkey');
    expect(session.email).toBeNull();
  });

  it('writes a missing email as null', () => {
    const json = sessionToJson({
      role: 'careRecipient',
      method: 'passkey',
      signedInAt: new Date(ISO),
    });
    expect(json.email).toBeNull();
    expect(json.signedInAt).toBe(ISO);
  });

  it('treats unknown role and method strings as the safe defaults', () => {
    const session = sessionFromJson({
      role: 'admin',
      method: 'sms',
      signedInAt: ISO,
    });
    expect(session.role).toBe('careRecipient');
    expect(session.method).toBe('passkey');
  });
});

describe('medication', () => {
  const base = {
    id: 'm1',
    patientId: 'p1',
    name: 'Metformin',
    dosage: '500 mg',
    scheduleTimes: ['08:00', '20:00'],
  };

  it('defaults missing instructions to null and active to true', () => {
    const med = medicationFromJson(base);
    expect(med.instructions).toBeNull();
    expect(med.active).toBe(true);
  });

  it('keeps explicit instructions and an inactive flag', () => {
    const med = medicationFromJson({
      ...base,
      instructions: 'With food',
      active: false,
    });
    expect(med.instructions).toBe('With food');
    expect(med.active).toBe(false);
    expect(medicationFromJson(medicationToJson(med))).toEqual(med);
  });

  it('copies the schedule instead of sharing the array', () => {
    const med = medicationFromJson(base);
    expect(med.scheduleTimes).toEqual(base.scheduleTimes);
    expect(med.scheduleTimes).not.toBe(base.scheduleTimes);
  });
});

describe('dose event', () => {
  const base = { id: 'd1', medicationId: 'm1', scheduledFor: ISO };

  it('defaults to a due dose with no recorded or undo times', () => {
    const dose = doseEventFromJson(base);
    expect(dose.status).toBe('due');
    expect(dose.recordedAt).toBeNull();
    expect(dose.undoableUntil).toBeNull();
    const json = doseEventToJson(dose);
    expect(json.recordedAt).toBeNull();
    expect(json.undoableUntil).toBeNull();
  });

  it.each(['taken', 'skipped', 'missed', 'due'] as const)('keeps the %s status', (status) => {
    expect(doseEventFromJson({ ...base, status }).status).toBe(status);
  });

  it('falls back to due for an unknown status', () => {
    expect(doseEventFromJson({ ...base, status: 'paused' }).status).toBe('due');
  });

  it('round-trips recorded and undoable times', () => {
    const dose = doseEventFromJson({
      ...base,
      status: 'taken',
      recordedAt: ISO,
      undoableUntil: '2026-08-25T18:14:10.000Z',
    });
    expect(dose.recordedAt).toEqual(new Date(ISO));
    expect(dose.undoableUntil).toEqual(new Date('2026-08-25T18:14:10.000Z'));
    expect(doseEventFromJson(doseEventToJson(dose))).toEqual(dose);
  });
});

describe('appointment', () => {
  const base = {
    id: 'a1',
    patientId: 'p1',
    title: 'Physical therapy',
    startsAt: ISO,
    locationName: 'Riverside PT',
  };

  it('defaults a missing companion and notes to null', () => {
    const appt = appointmentFromJson(base);
    expect(appt.companionName).toBeNull();
    expect(appt.notes).toBeNull();
    const json = appointmentToJson(appt);
    expect(json.companionName).toBeNull();
    expect(json.notes).toBeNull();
    expect(json.startsAt).toBe(ISO);
  });

  it('round-trips a companion and notes', () => {
    const appt = appointmentFromJson({
      ...base,
      companionName: 'Renee',
      notes: 'Bring shoes',
    });
    expect(appointmentFromJson(appointmentToJson(appt))).toEqual(appt);
  });

  it('writes an undefined companion and notes as null', () => {
    const json = appointmentToJson({
      id: 'a1',
      patientId: 'p1',
      title: 'Visit',
      startsAt: new Date(ISO),
      locationName: 'Clinic',
    });
    expect(json.companionName).toBeNull();
    expect(json.notes).toBeNull();
  });
});

describe('activity entry', () => {
  it.each(['dose', 'appointment', 'reminder', 'note', 'task'] as const)(
    'keeps the %s kind',
    (kind) => {
      const entry = activityEntryFromJson({
        id: 'e1',
        at: ISO,
        summary: 'Did a thing',
        kind,
      });
      expect(entry.kind).toBe(kind);
      expect(activityEntryFromJson(activityEntryToJson(entry))).toEqual(entry);
    },
  );

  it('falls back to a note for an unknown or missing kind', () => {
    expect(activityEntryFromJson({ id: 'e1', at: ISO, summary: 's', kind: 'sync' }).kind).toBe(
      'note',
    );
    expect(activityEntryFromJson({ id: 'e1', at: ISO, summary: 's' }).kind).toBe('note');
  });
});

describe('care data', () => {
  it('round-trips the full seed data', () => {
    const seeded = seedCareData(SEED_DAY);
    const stored = JSON.parse(JSON.stringify(careDataToJson(seeded)));
    const restored = careDataFromJson(stored);

    // Optional fields that were absent (like a medication's instructions) come
    // back as null, so the first read normalizes and every read after it is
    // stable.
    expect(careDataFromJson(JSON.parse(JSON.stringify(careDataToJson(restored))))).toEqual(
      restored,
    );
    expect(restored.medications).toHaveLength(seeded.medications.length);
    expect(restored.doseEvents).toHaveLength(seeded.doseEvents.length);
    expect(restored.appointments).toHaveLength(seeded.appointments.length);
    expect(restored.seededOn).toEqual(seeded.seededOn);
  });
});

describe('notification settings', () => {
  it('uses the defaults when nothing was stored', () => {
    expect(notificationSettingsFromJson({})).toEqual(defaultNotificationSettings());
    expect(defaultNotificationSettings()).toEqual({
      dailyDigest: true,
      leadTime: 'oneHour',
    });
  });

  it.each(['fifteenMinutes', 'oneHour', 'oneDay'] as const)(
    'keeps the %s lead time',
    (leadTime) => {
      const settings = notificationSettingsFromJson({
        dailyDigest: false,
        leadTime,
      });
      expect(settings).toEqual({ dailyDigest: false, leadTime });
      expect(notificationSettingsFromJson(notificationSettingsToJson(settings))).toEqual(settings);
    },
  );

  it('falls back to one hour for an unknown lead time', () => {
    expect(notificationSettingsFromJson({ leadTime: 'oneWeek' }).leadTime).toBe('oneHour');
  });
});

describe('app settings', () => {
  it('uses the defaults when nothing was stored', () => {
    expect(appSettingsFromJson({})).toEqual(defaultAppSettings());
    expect(defaultAppSettings()).toEqual({
      themeMode: 'system',
      demoClock: false,
      shareWithCaregiver: true,
    });
  });

  it.each(['light', 'dark', 'system'] as const)('keeps the %s theme', (themeMode) => {
    const settings = appSettingsFromJson({
      themeMode,
      demoClock: true,
      shareWithCaregiver: false,
    });
    expect(settings).toEqual({
      themeMode,
      demoClock: true,
      shareWithCaregiver: false,
    });
    expect(appSettingsFromJson(appSettingsToJson(settings))).toEqual(settings);
  });

  it('treats an unknown theme as system', () => {
    expect(appSettingsFromJson({ themeMode: 'sepia' }).themeMode).toBe('system');
  });
});

describe('medication draft', () => {
  it('fills every missing field with a safe default', () => {
    expect(medicationDraftFromJson({})).toEqual({
      editingId: undefined,
      step: 1,
      name: '',
      dosage: '',
      scheduleTimes: [],
      instructions: '',
    });
  });

  it('round-trips an in-progress edit', () => {
    const draft = medicationDraftFromJson({
      editingId: 'm1',
      step: 2,
      name: 'Ibuprofen',
      dosage: '200 mg',
      scheduleTimes: ['09:00'],
      instructions: 'With water',
    });
    expect(medicationDraftFromJson(medicationDraftToJson(draft))).toEqual(draft);
  });

  it('writes a missing editing id as null and reads null back as undefined', () => {
    const json = medicationDraftToJson({
      step: 1,
      name: '',
      dosage: '',
      scheduleTimes: [],
      instructions: '',
    });
    expect(json.editingId).toBeNull();
    expect(medicationDraftFromJson(json).editingId).toBeUndefined();
  });
});

describe('appointment draft', () => {
  it('fills every missing field with a safe default', () => {
    expect(appointmentDraftFromJson({})).toEqual({
      editingId: undefined,
      step: 1,
      title: '',
      locationName: '',
      startsAt: undefined,
      companionName: '',
    });
  });

  it('round-trips an in-progress edit including its date', () => {
    const draft = appointmentDraftFromJson({
      editingId: 'a1',
      step: 2,
      title: 'Dentist',
      locationName: 'Bright Smiles',
      startsAt: ISO,
      companionName: 'Renee',
    });
    expect(draft.startsAt).toEqual(new Date(ISO));
    expect(appointmentDraftFromJson(appointmentDraftToJson(draft))).toEqual(draft);
  });

  it('writes a missing date and editing id as null', () => {
    const json = appointmentDraftToJson({
      step: 1,
      title: '',
      locationName: '',
      companionName: '',
    });
    expect(json.startsAt).toBeNull();
    expect(json.editingId).toBeNull();
    expect(appointmentDraftFromJson(json).startsAt).toBeUndefined();
  });
});
