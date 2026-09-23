import {
  appointmentCompanionLabel,
  appointmentSummaryLine,
  doseIsDue,
  doseIsOverdue,
  medicationDisplayName,
} from './domain';
import {
  appointmentFromJson,
  appointmentToJson,
  careDataFromJson,
  careDataToJson,
  doseEventFromJson,
  doseEventToJson,
  medicationFromJson,
  medicationToJson,
  sessionFromJson,
  sessionToJson,
} from './serialization';
import type { Appointment, DoseEvent, Medication } from './types';

describe('medicationDisplayName', () => {
  it('joins name and dosage', () => {
    const med: Medication = {
      id: 'm1',
      patientId: 'p1',
      name: 'Metformin',
      dosage: '500 mg',
      scheduleTimes: ['08:00'],
      active: true,
    };
    expect(medicationDisplayName(med)).toBe('Metformin, 500 mg');
  });

  it('falls back to just the name when dosage is empty', () => {
    const med: Medication = {
      id: 'm1',
      patientId: 'p1',
      name: 'Metformin',
      dosage: '',
      scheduleTimes: [],
      active: true,
    };
    expect(medicationDisplayName(med)).toBe('Metformin');
  });
});

describe('appointment helpers', () => {
  const base: Appointment = {
    id: 'a1',
    patientId: 'p1',
    title: 'Dr. Alvarez — Cardiology follow-up',
    startsAt: new Date(2026, 7, 25, 14, 30),
    locationName: 'Regional Medical',
    companionName: 'Renee',
  };

  it('labels a companion', () => {
    expect(appointmentCompanionLabel(base)).toBe('Renee is taking me');
  });

  it('labels driving alone when there is no companion', () => {
    expect(appointmentCompanionLabel({ ...base, companionName: null })).toBe('Driving myself');
    expect(appointmentCompanionLabel({ ...base, companionName: '  ' })).toBe('Driving myself');
  });

  it('builds the full summary line', () => {
    expect(appointmentSummaryLine(base)).toBe(
      'Tuesday, August 25 · 2:30 PM · Regional Medical · Renee is taking me',
    );
  });
});

describe('dose helpers', () => {
  const now = new Date(2026, 7, 25, 14, 14);

  it('isDue is true only for status due', () => {
    const dose: DoseEvent = {
      id: 'd1',
      medicationId: 'm1',
      scheduledFor: now,
      status: 'due',
    };
    expect(doseIsDue(dose)).toBe(true);
    expect(doseIsDue({ ...dose, status: 'taken' })).toBe(false);
  });

  it('isOverdue is true only when due and in the past', () => {
    const past = new Date(2026, 7, 25, 13, 0);
    const future = new Date(2026, 7, 25, 15, 0);
    const overdue: DoseEvent = { id: 'd1', medicationId: 'm1', scheduledFor: past, status: 'due' };
    const notYet: DoseEvent = { id: 'd2', medicationId: 'm1', scheduledFor: future, status: 'due' };
    const taken: DoseEvent = { id: 'd3', medicationId: 'm1', scheduledFor: past, status: 'taken' };
    expect(doseIsOverdue(overdue, now)).toBe(true);
    expect(doseIsOverdue(notYet, now)).toBe(false);
    expect(doseIsOverdue(taken, now)).toBe(false);
  });

});

describe('serialization round trips', () => {
  it('round-trips a medication', () => {
    const med: Medication = {
      id: 'm1',
      patientId: 'p1',
      name: 'Lisinopril',
      dosage: '10 mg',
      scheduleTimes: ['08:00', '18:00'],
      instructions: null,
      active: true,
    };
    expect(medicationFromJson(medicationToJson(med))).toEqual(med);
  });

  it('round-trips a dose event including its recorded timestamp', () => {
    const dose: DoseEvent = {
      id: 'd1',
      medicationId: 'm1',
      scheduledFor: new Date(2026, 7, 25, 8, 0),
      status: 'taken',
      recordedAt: new Date(2026, 7, 25, 8, 4),
    };
    expect(doseEventFromJson(doseEventToJson(dose))).toEqual(dose);
  });

  it('ignores a stray `undoableUntil` key from data written by an older build (careconnect-adhd#28)', () => {
    const legacyJson = {
      id: 'd1',
      medicationId: 'm1',
      scheduledFor: new Date(2026, 7, 25, 8, 0).toISOString(),
      status: 'taken',
      recordedAt: new Date(2026, 7, 25, 8, 4).toISOString(),
      undoableUntil: new Date(2026, 7, 25, 8, 4, 10).toISOString(),
    };
    const dose = doseEventFromJson(legacyJson);
    expect(dose).not.toHaveProperty('undoableUntil');
    expect(dose.status).toBe('taken');
  });

  it('round-trips an appointment', () => {
    const appt: Appointment = {
      id: 'a1',
      patientId: 'p1',
      title: 'Physical therapy',
      startsAt: new Date(2026, 7, 27, 10, 0),
      locationName: 'Riverside PT',
      companionName: 'Renee',
      notes: null,
    };
    expect(appointmentFromJson(appointmentToJson(appt))).toEqual(appt);
  });

  it('round-trips a session', () => {
    const session = {
      role: 'caregiver' as const,
      method: 'email' as const,
      signedInAt: new Date(2026, 7, 25, 9, 0),
      email: 'renee@example.test',
    };
    expect(sessionFromJson(sessionToJson(session))).toEqual(session);
  });

  it('discards an unknown dose status and falls back to due', () => {
    const dose = doseEventFromJson({
      id: 'd1',
      medicationId: 'm1',
      scheduledFor: new Date().toISOString(),
      status: 'not-a-real-status',
    });
    expect(dose.status).toBe('due');
  });

  it('round-trips a full CareData document', () => {
    const data = careDataFromJson(
      careDataToJson({
        patient: {
          id: 'p1',
          displayName: 'Muhammad R.',
          firstName: 'Muhammad',
          email: 'muhammad@example.test',
          primaryCaregiverId: 'c1',
        },
        caregiver: {
          id: 'c1',
          displayName: 'Renee',
          firstName: 'Renee',
          relationshipToPatient: 'your caregiver',
          phone: '555-0142',
          patientIds: ['p1'],
        },
        medications: [],
        doseEvents: [],
        appointments: [],
        activity: [],
        seededOn: new Date(2026, 7, 25),
      }),
    );
    expect(data.patient.displayName).toBe('Muhammad R.');
    expect(data.seededOn).toEqual(new Date(2026, 7, 25));
  });
});
