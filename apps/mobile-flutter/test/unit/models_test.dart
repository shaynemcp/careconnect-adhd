import 'package:careconnect_mobile/data/mock_data.dart';
import 'package:careconnect_mobile/models/activity_entry.dart';
import 'package:careconnect_mobile/models/appointment.dart';
import 'package:careconnect_mobile/models/care_data.dart';
import 'package:careconnect_mobile/models/dose_event.dart';
import 'package:careconnect_mobile/models/drafts.dart';
import 'package:careconnect_mobile/models/medication.dart';
import 'package:careconnect_mobile/models/notification_settings.dart';
import 'package:careconnect_mobile/models/person.dart';
import 'package:careconnect_mobile/models/session.dart';
import 'package:careconnect_mobile/models/user_role.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  final day = DateTime(2026, 8, 25);

  group('Medication', () {
    const med = Medication(
      id: 'm1',
      patientId: 'p1',
      name: 'Metformin',
      dosage: '500 mg',
      scheduleTimes: ['08:00', '18:00'],
      instructions: 'Take with food.',
    );

    test('displayName joins name and dosage', () {
      expect(med.displayName, 'Metformin, 500 mg');
      expect(med.copyWith(dosage: '').displayName, 'Metformin');
    });

    test('round-trips through JSON', () {
      expect(Medication.fromJson(med.toJson()), equals(med));
      expect(Medication.fromJson(med.toJson()).hashCode, med.hashCode);
    });

    test('defaults active to true when absent from JSON', () {
      final json = med.toJson()..remove('active');
      expect(Medication.fromJson(json).active, isTrue);
    });

    test('copyWith can clear instructions', () {
      expect(med.copyWith(clearInstructions: true).instructions, isNull);
      expect(med.copyWith(active: false).active, isFalse);
      expect(med.toString(), contains('Metformin, 500 mg'));
    });
  });

  group('DoseEvent', () {
    final scheduled = DateTime(2026, 8, 25, 14, 34);
    final dose = DoseEvent(
      id: 'd1',
      medicationId: 'm1',
      scheduledFor: scheduled,
    );

    test('is due, and overdue only once its time has passed', () {
      expect(dose.isDue, isTrue);
      expect(dose.isOverdue(DateTime(2026, 8, 25, 14)), isFalse);
      expect(dose.isOverdue(DateTime(2026, 8, 25, 14, 35)), isTrue);
    });

    test('a logged dose is never overdue', () {
      final taken = dose.copyWith(
        status: DoseStatus.taken,
        recordedAt: scheduled,
      );
      expect(taken.isOverdue(DateTime(2026, 8, 26)), isFalse);
      expect(taken.isDue, isFalse);
    });

    test('round-trips through JSON with and without nulls', () {
      expect(DoseEvent.fromJson(dose.toJson()), equals(dose));
      final full = dose.copyWith(
        status: DoseStatus.taken,
        recordedAt: scheduled,
      );
      expect(DoseEvent.fromJson(full.toJson()), equals(full));
      expect(full.hashCode, DoseEvent.fromJson(full.toJson()).hashCode);
    });

    test('still reads data saved with the old undoableUntil key', () {
      final saved = {
        ...dose
            .copyWith(status: DoseStatus.taken, recordedAt: scheduled)
            .toJson(),
        'undoableUntil': scheduled
            .add(const Duration(seconds: 10))
            .toIso8601String(),
      };
      final restored = DoseEvent.fromJson(saved);
      expect(restored.status, DoseStatus.taken);
      expect(restored.recordedAt, scheduled);
      expect(restored.toJson().containsKey('undoableUntil'), isFalse);
    });

    test('copyWith can clear recordedAt', () {
      final full = dose.copyWith(recordedAt: scheduled);
      final cleared = full.copyWith(clearRecordedAt: true);
      expect(cleared.recordedAt, isNull);
      expect(cleared.toString(), contains('d1'));
    });

    test('unknown status strings fall back to due', () {
      expect(DoseStatus.fromStorage('nonsense'), DoseStatus.due);
      expect(DoseStatus.taken.label, 'Taken');
      expect(DoseStatus.missed.label, 'Missed');
    });
  });

  group('Appointment', () {
    final appt = Appointment(
      id: 'a1',
      patientId: 'p1',
      title: 'Dr. Alvarez — Cardiology follow-up',
      startsAt: DateTime(2026, 8, 25, 14, 30),
      locationName: 'Regional Medical',
      companionName: 'Renee',
    );

    test('summary line uses full-word dates and who is taking me', () {
      expect(
        appt.summaryLine,
        'Tuesday, August 25 · 2:30 PM · Regional Medical · Renee is taking me',
      );
      expect(
        appt.copyWith(clearCompanion: true).companionLabel,
        'Driving myself',
      );
      expect(
        appt.copyWith(companionName: '  ').companionLabel,
        'Driving myself',
      );
    });

    test('round-trips through JSON', () {
      expect(Appointment.fromJson(appt.toJson()), equals(appt));
      final withNotes = appt.copyWith(notes: 'Bring the list');
      expect(Appointment.fromJson(withNotes.toJson()), equals(withNotes));
      expect(withNotes.copyWith(clearNotes: true).notes, isNull);
      expect(withNotes.hashCode, isNot(appt.hashCode));
      expect(appt.toString(), contains('Cardiology'));
    });
  });

  group('ActivityEntry and enums', () {
    test('round-trips and falls back on unknown kinds', () {
      final entry = ActivityEntry(
        id: 'x',
        at: day,
        summary: 'Muhammad logged Metformin taken at 8:04 AM',
        kind: ActivityKind.dose,
      );
      expect(ActivityEntry.fromJson(entry.toJson()), equals(entry));
      expect(entry.hashCode, ActivityEntry.fromJson(entry.toJson()).hashCode);
      expect(ActivityKind.fromStorage('??'), ActivityKind.note);
    });

    test('UserRole labels, prefixes and homes', () {
      expect(UserRole.careRecipient.label, 'Care Recipient');
      expect(UserRole.caregiver.routePrefix, '/caregiver');
      expect(UserRole.caregiver.homeLocation, '/caregiver/dashboard');
      expect(UserRole.fromStorage('caregiver'), UserRole.caregiver);
      expect(UserRole.fromStorage(null), UserRole.careRecipient);
    });
  });

  group('NotificationSettings', () {
    test('defaults, copy and JSON', () {
      const settings = NotificationSettings();
      expect(settings.dailyDigest, isTrue);
      expect(settings.leadTime, ReminderLeadTime.oneHour);
      final changed = settings.copyWith(
        dailyDigest: false,
        leadTime: ReminderLeadTime.oneDay,
      );
      expect(NotificationSettings.fromJson(changed.toJson()), equals(changed));
      expect(changed.hashCode, isNot(settings.hashCode));
      expect(ReminderLeadTime.fromStorage('bogus'), ReminderLeadTime.oneHour);
      expect(ReminderLeadTime.fifteenMinutes.minutes, 15);
      expect(ReminderLeadTime.oneDay.spoken, '1 day before');
      expect(NotificationSettings.overdueAlertsAlwaysOn, isTrue);
    });
  });

  group('Drafts', () {
    test('MedicationDraft isEmpty, editing and JSON', () {
      const empty = MedicationDraft();
      expect(empty.isEmpty, isTrue);
      expect(empty.isEditing, isFalse);
      final draft = empty.copyWith(
        editingId: 'm1',
        step: 2,
        name: 'Metoprolol',
        dosage: '25 mg',
        scheduleTimes: ['08:00'],
        instructions: 'With water',
      );
      expect(draft.isEditing, isTrue);
      expect(draft.isEmpty, isFalse);
      expect(MedicationDraft.fromJson(draft.toJson()), equals(draft));
      expect(draft.copyWith(clearEditingId: true).editingId, isNull);
      expect(MedicationDraft.fromJson(const {}), equals(empty));
      expect(draft.hashCode, MedicationDraft.fromJson(draft.toJson()).hashCode);
    });

    test('AppointmentDraft isEmpty, editing and JSON', () {
      const empty = AppointmentDraft();
      expect(empty.isEmpty, isTrue);
      final draft = empty.copyWith(
        editingId: 'a1',
        step: 2,
        title: 'Physical therapy',
        locationName: 'Riverside PT',
        startsAt: DateTime(2026, 8, 27, 10),
        companionName: 'Renee',
      );
      expect(draft.isEditing, isTrue);
      expect(AppointmentDraft.fromJson(draft.toJson()), equals(draft));
      expect(draft.copyWith(clearEditingId: true).isEditing, isFalse);
      expect(AppointmentDraft.fromJson(const {}), equals(empty));
      expect(
        draft.hashCode,
        AppointmentDraft.fromJson(draft.toJson()).hashCode,
      );
    });
  });

  group('Session and people', () {
    test('Session round-trips', () {
      final session = Session(
        role: UserRole.caregiver,
        method: SignInMethod.email,
        signedInAt: day,
        email: 'renee@example.test',
      );
      expect(Session.fromJson(session.toJson()), equals(session));
      expect(session.hashCode, Session.fromJson(session.toJson()).hashCode);
      expect(SignInMethod.fromStorage('nope'), SignInMethod.passkey);
    });

    test('Patient and Caregiver round-trip', () {
      expect(
        Patient.fromJson(MockData.patient.toJson()),
        equals(MockData.patient),
      );
      expect(
        Caregiver.fromJson(MockData.caregiver.toJson()),
        equals(MockData.caregiver),
      );
      expect(MockData.patient.hashCode, isNot(0));
      expect(MockData.caregiver.hashCode, isNot(0));
    });
  });

  group('CareData', () {
    test('round-trips the whole seed and looks things up', () {
      final data = MockData.seed(day);
      final restored = CareData.fromJson(data.toJson());
      expect(restored.medications, equals(data.medications));
      expect(restored.doseEvents, equals(data.doseEvents));
      expect(restored.appointments, equals(data.appointments));
      expect(restored.activity, equals(data.activity));
      expect(restored.seededOn, day);
      expect(data.medicationById('med-metformin')?.name, 'Metformin');
      expect(data.medicationById('missing'), isNull);
      expect(data.doseById('dose-metformin')?.medicationId, 'med-metformin');
      expect(data.doseById('missing'), isNull);
      expect(
        data.appointmentById('appt-chen')?.locationName,
        'Community Health',
      );
      expect(data.appointmentById('missing'), isNull);
      expect(data.copyWith(medications: const []).activeMedications, isEmpty);
    });
  });
}
