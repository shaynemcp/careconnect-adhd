import 'package:careconnect_mobile/core/utils/clock.dart';
import 'package:careconnect_mobile/data/local_store.dart';
import 'package:careconnect_mobile/models/dose_event.dart';
import 'package:careconnect_mobile/models/user_role.dart';
import 'package:careconnect_mobile/state/care_data_provider.dart';
import 'package:careconnect_mobile/state/care_selectors.dart';
import 'package:careconnect_mobile/state/clock_provider.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../helpers/test_app.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  group('initial load', () {
    test('seeds and persists on first launch', () async {
      final container = await createContainer();
      final data = container.read(careDataProvider);
      expect(data.medications, hasLength(4));
      final prefs = await SharedPreferences.getInstance();
      expect(prefs.containsKey(StoreKeys.careData), isTrue);
    });

    test('reloads persisted state instead of re-seeding', () async {
      final container = await createContainer();
      await container
          .read(careDataProvider.notifier)
          .markTaken('dose-metformin');
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(StoreKeys.careData)!;

      final second = await createContainer(prefs: {StoreKeys.careData: saved});
      expect(
        second.read(careDataProvider).doseById('dose-metformin')!.status,
        DoseStatus.taken,
      );
    });

    test('generates today’s doses when the stored day is older', () async {
      final first = await createContainer();
      expect(first.read(careDataProvider).medications, isNotEmpty);
      await Future<void>.delayed(Duration.zero);
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(StoreKeys.careData)!;

      final later = await createContainer(
        prefs: {StoreKeys.careData: saved},
        clock: FixedClock(DateTime(2026, 8, 26, 9)),
      );
      final tomorrow = later.read(todayDoseEventsProvider);
      expect(tomorrow, hasLength(5));
      expect(tomorrow.every((d) => d.isDue), isTrue);
    });
  });

  group('marking doses', () {
    test('markTaken records the time and logs activity', () async {
      final container = await createContainer();
      final notifier = container.read(careDataProvider.notifier);
      final before = container.read(careDataProvider).activity.length;

      await notifier.markTaken('dose-metformin');

      final dose = container.read(careDataProvider).doseById('dose-metformin')!;
      expect(dose.status, DoseStatus.taken);
      expect(dose.recordedAt, kTestNow);
      final activity = container.read(careDataProvider).activity;
      expect(activity.length, before + 1);
      expect(
        activity.last.summary,
        'Muhammad logged Metformin taken at 2:14 PM',
      );
    });

    test('skipDose marks skipped with its own timeline entry', () async {
      final container = await createContainer();
      await container
          .read(careDataProvider.notifier)
          .skipDose('dose-metformin');
      final data = container.read(careDataProvider);
      expect(data.doseById('dose-metformin')!.status, DoseStatus.skipped);
      expect(
        data.activity.last.summary,
        'Muhammad skipped Metformin at 2:14 PM',
      );
    });

    test('a caregiver’s actions are attributed to the caregiver', () async {
      final container = await createContainer(
        prefs: sessionPrefs(UserRole.caregiver),
      );
      await container
          .read(careDataProvider.notifier)
          .markTaken('dose-metformin');
      expect(
        container.read(careDataProvider).activity.last.summary,
        startsWith('Renee logged'),
      );
    });

    test('unknown dose ids are ignored', () async {
      final container = await createContainer();
      final before = container.read(careDataProvider);
      await container.read(careDataProvider.notifier).markTaken('nope');
      expect(
        container.read(careDataProvider).doseEvents,
        equals(before.doseEvents),
      );
      expect(
        await container.read(careDataProvider.notifier).undoDoseChange('nope'),
        isFalse,
      );
    });
  });

  group('undo', () {
    test('restores the dose and removes the timeline entry', () async {
      final clock = MutableClock(kTestNow);
      final container = await createContainer(clock: clock);
      final notifier = container.read(careDataProvider.notifier);
      final original = container
          .read(careDataProvider)
          .doseById('dose-metformin')!;
      final activityBefore = container.read(careDataProvider).activity;

      await notifier.markTaken('dose-metformin');
      clock.current = kTestNow.add(const Duration(seconds: 5));
      container.read(currentTimeProvider.notifier).refresh();

      expect(await notifier.undoDoseChange('dose-metformin'), isTrue);
      final data = container.read(careDataProvider);
      expect(data.doseById('dose-metformin'), equals(original));
      expect(data.activity, equals(activityBefore));
    });

    // Regression for #10: undo used to expire after 10 seconds while its
    // confirmation stayed on screen, so a late tap silently did nothing.
    test('has no time limit (SC 2.2.1)', () async {
      final clock = MutableClock(kTestNow);
      final container = await createContainer(clock: clock);
      final notifier = container.read(careDataProvider.notifier);

      await notifier.markTaken('dose-metformin');
      clock.current = kTestNow.add(const Duration(minutes: 5));
      container.read(currentTimeProvider.notifier).refresh();

      expect(await notifier.undoDoseChange('dose-metformin'), isTrue);
      expect(
        container.read(careDataProvider).doseById('dose-metformin')!.status,
        DoseStatus.due,
      );
    });

    test('cannot be applied twice', () async {
      final container = await createContainer();
      final notifier = container.read(careDataProvider.notifier);
      await notifier.markTaken('dose-metformin');
      expect(await notifier.undoDoseChange('dose-metformin'), isTrue);
      expect(await notifier.undoDoseChange('dose-metformin'), isFalse);
    });
  });

  group('ensureDosesForDay', () {
    test('adds one due dose per schedule time and is idempotent', () async {
      final container = await createContainer();
      final notifier = container.read(careDataProvider.notifier);
      final tomorrow = DateTime(2026, 8, 26);
      final before = container.read(careDataProvider).doseEvents.length;

      await notifier.ensureDosesForDay(tomorrow);
      expect(container.read(careDataProvider).doseEvents.length, before + 5);

      await notifier.ensureDosesForDay(tomorrow);
      expect(container.read(careDataProvider).doseEvents.length, before + 5);
    });

    test('runs automatically when the clock crosses into a new day', () async {
      final clock = MutableClock(kTestNow);
      final container = await createContainer(clock: clock);
      final before = container.read(careDataProvider).doseEvents.length;

      clock.current = DateTime(2026, 8, 26, 7);
      container.read(currentTimeProvider.notifier).refresh();
      await Future<void>.delayed(Duration.zero);

      expect(container.read(careDataProvider).doseEvents.length, before + 5);
    });
  });

  group('medications', () {
    test('addMedication creates the record and today’s doses', () async {
      final container = await createContainer();
      final notifier = container.read(careDataProvider.notifier);
      final med = await notifier.addMedication(
        name: '  Metoprolol ',
        dosage: '25 mg',
        scheduleTimes: const ['15:14'],
        instructions: '  ',
      );
      final data = container.read(careDataProvider);
      expect(med.name, 'Metoprolol');
      expect(med.instructions, isNull);
      expect(data.medicationById(med.id), isNotNull);
      final doses = data.doseEvents
          .where((d) => d.medicationId == med.id)
          .toList();
      expect(doses, hasLength(1));
      expect(doses.single.scheduledFor, DateTime(2026, 8, 25, 15, 14));
      expect(data.activity.last.summary, 'Muhammad added Metoprolol, 25 mg');
    });

    test(
      'updateMedication with a new schedule regenerates only due doses',
      () async {
        final container = await createContainer();
        final notifier = container.read(careDataProvider.notifier);
        final lisinopril = container
            .read(careDataProvider)
            .medicationById('med-lisinopril')!;

        await notifier.updateMedication(
          lisinopril.copyWith(scheduleTimes: const ['09:00', '21:00']),
        );

        final data = container.read(careDataProvider);
        final today = data.doseEvents
            .where(
              (d) =>
                  d.medicationId == 'med-lisinopril' &&
                  d.scheduledFor.day == 25,
            )
            .toList();
        // The 8:04 AM taken dose survives; the 6 PM due dose is replaced by 9 AM and 9 PM.
        expect(today.map((d) => d.status), contains(DoseStatus.taken));
        expect(today.where((d) => d.isDue).map((d) => d.scheduledFor.hour), [
          9,
          21,
        ]);
        expect(data.medicationById('med-lisinopril')!.scheduleTimes, [
          '09:00',
          '21:00',
        ]);
      },
    );

    test('updateMedication ignores unknown medications', () async {
      final container = await createContainer();
      final before = container.read(careDataProvider);
      await container
          .read(careDataProvider.notifier)
          .updateMedication(before.medications.first.copyWith(id: 'ghost'));
      expect(
        container.read(careDataProvider).medications,
        equals(before.medications),
      );
    });

    test('deleteMedication soft-deletes and keeps logged history', () async {
      final container = await createContainer();
      final notifier = container.read(careDataProvider.notifier);
      await notifier.deleteMedication('med-lisinopril');
      final data = container.read(careDataProvider);
      expect(data.medicationById('med-lisinopril')!.active, isFalse);
      expect(
        data.activeMedications.map((m) => m.id),
        isNot(contains('med-lisinopril')),
      );
      final remaining = data.doseEvents.where(
        (d) => d.medicationId == 'med-lisinopril',
      );
      expect(remaining.any((d) => d.isDue), isFalse);
      expect(remaining.any((d) => d.status == DoseStatus.taken), isTrue);
      await notifier.deleteMedication('ghost');
    });
  });

  group('appointments', () {
    test('add, update and delete', () async {
      final container = await createContainer();
      final notifier = container.read(careDataProvider.notifier);
      final appt = await notifier.addAppointment(
        title: 'Dentist — cleaning',
        locationName: 'Placeholder Dental',
        startsAt: DateTime(2026, 8, 30, 9, 30),
        companionName: '',
      );
      expect(appt.companionName, isNull);
      expect(
        container.read(careDataProvider).appointmentById(appt.id),
        isNotNull,
      );

      await notifier.updateAppointment(
        appt.copyWith(startsAt: DateTime(2026, 8, 30, 11)),
      );
      expect(
        container.read(careDataProvider).appointmentById(appt.id)!.startsAt,
        DateTime(2026, 8, 30, 11),
      );
      expect(
        container.read(careDataProvider).activity.last.summary,
        'Muhammad updated the appointment time to 11:00 AM',
      );

      await notifier.deleteAppointment(appt.id);
      expect(container.read(careDataProvider).appointmentById(appt.id), isNull);
      await notifier.deleteAppointment('ghost');
      await notifier.updateAppointment(appt.copyWith(id: 'ghost'));
    });
  });

  test('resetDemoData returns to the seed and clears undo history', () async {
    final container = await createContainer();
    final notifier = container.read(careDataProvider.notifier);
    await notifier.markTaken('dose-metformin');
    await notifier.resetDemoData();
    expect(
      container.read(careDataProvider).doseById('dose-metformin')!.status,
      DoseStatus.due,
    );
    expect(await notifier.undoDoseChange('dose-metformin'), isFalse);
  });
}
