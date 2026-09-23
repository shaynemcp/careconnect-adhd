import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../core/utils/date_formatting.dart';
import '../core/utils/ids.dart';
import '../data/local_store.dart';
import '../data/mock_data.dart';
import '../models/activity_entry.dart';
import '../models/appointment.dart';
import '../models/care_data.dart';
import '../models/dose_event.dart';
import '../models/medication.dart';
import '../models/user_role.dart';
import 'clock_provider.dart';
import 'session_provider.dart';

/// Id source, overridable in tests for deterministic ids.
final idGeneratorProvider = Provider<IdGenerator>((ref) => IdGenerator());

/// What an undo restores: the dose as it was, plus the timeline entry the
/// change added so it can be removed again.
@immutable
class _UndoRecord {
  const _UndoRecord({required this.previous, required this.activityId});

  final DoseEvent previous;
  final String activityId;
}

/// The single source of truth for medications, doses, appointments and the
/// activity feed. Every mutation replaces [state] with a new [CareData] and
/// writes it to local storage.
class CareDataNotifier extends Notifier<CareData> {
  final Map<String, _UndoRecord> _undo = {};

  @override
  CareData build() {
    final store = ref.watch(localStoreProvider);
    final now = ref.read(currentTimeProvider);

    // Generate the day's doses whenever the calendar day changes — midnight
    // rollover, or the demo clock being switched on or off.
    ref.listen<DateTime>(currentTimeProvider, (previous, next) {
      if (previous == null || !DateFormatting.isSameDay(previous, next)) {
        unawaited(ensureDosesForDay(next));
      }
    });

    final hadStored = store.contains(StoreKeys.careData);
    final base = store.readAs(
      StoreKeys.careData,
      CareData.fromJson,
      orElse: () => MockData.seed(now),
    );
    final data = _withDosesForDay(base, now);
    if (!hadStored || !identical(data, base)) {
      unawaited(store.writeJson(StoreKeys.careData, data.toJson()));
    }
    return data;
  }

  // ── Doses ────────────────────────────────────────────────────────────────

  /// Marks a dose taken. The change can be undone with [undoDoseChange].
  Future<void> markTaken(String doseId) =>
      _transition(doseId, DoseStatus.taken);

  /// Marks a dose skipped. The change can be undone with [undoDoseChange].
  Future<void> skipDose(String doseId) =>
      _transition(doseId, DoseStatus.skipped);

  /// Reverses the last change to [doseId]. Returns whether anything was
  /// undone.
  ///
  /// There is deliberately no time limit here (SC 2.2.1 Timing Adjustable):
  /// undo stays available for as long as its confirmation is on screen, and
  /// the confirmation stays until the user closes it or acts again.
  Future<bool> undoDoseChange(String doseId) async {
    final record = _undo.remove(doseId);
    if (record == null || state.doseById(doseId) == null) return false;

    state = state.copyWith(
      doseEvents: _replaceDose(state.doseEvents, record.previous),
      activity: state.activity.where((a) => a.id != record.activityId).toList(),
    );
    await _persist();
    return true;
  }

  Future<void> _transition(String doseId, DoseStatus next) async {
    final dose = state.doseById(doseId);
    if (dose == null) return;
    final medication = state.medicationById(dose.medicationId);
    if (medication == null) return;

    final now = _now;
    final updated = dose.copyWith(status: next, recordedAt: now);
    final verb = next == DoseStatus.taken
        ? 'logged ${medication.name} taken'
        : 'skipped ${medication.name}';
    final entry = ActivityEntry(
      id: _ids.next('act'),
      at: now,
      summary: '$_actor $verb at ${DateFormatting.clockTime(now)}',
      kind: ActivityKind.dose,
    );
    _undo[doseId] = _UndoRecord(previous: dose, activityId: entry.id);

    state = state.copyWith(
      doseEvents: _replaceDose(state.doseEvents, updated),
      activity: [...state.activity, entry],
    );
    await _persist();
  }

  /// Creates a `due` dose for every active medication time on [day] that does
  /// not already have one. Safe to call repeatedly.
  Future<void> ensureDosesForDay(DateTime day) async {
    final next = _withDosesForDay(state, day);
    if (identical(next, state)) return;
    state = next;
    await _persist();
  }

  CareData _withDosesForDay(CareData data, DateTime day) {
    final additions = <DoseEvent>[];
    for (final medication in data.activeMedications) {
      for (final time in medication.scheduleTimes) {
        final scheduledFor = DateFormatting.combine(
          day,
          DateFormatting.parseLocalTime(time),
        );
        final exists = data.doseEvents.any(
          (d) =>
              d.medicationId == medication.id && d.scheduledFor == scheduledFor,
        );
        if (!exists) {
          additions.add(
            DoseEvent(
              id: _ids.next('dose'),
              medicationId: medication.id,
              scheduledFor: scheduledFor,
            ),
          );
        }
      }
    }
    if (additions.isEmpty) return data;
    return data.copyWith(doseEvents: [...data.doseEvents, ...additions]);
  }

  // ── Medications ──────────────────────────────────────────────────────────

  Future<Medication> addMedication({
    required String name,
    required String dosage,
    required List<String> scheduleTimes,
    String? instructions,
  }) async {
    final medication = Medication(
      id: _ids.next('med'),
      patientId: state.patient.id,
      name: name.trim(),
      dosage: dosage.trim(),
      scheduleTimes: List.unmodifiable(scheduleTimes),
      instructions: _nullIfBlank(instructions),
    );
    final now = _now;
    var next = state.copyWith(
      medications: [...state.medications, medication],
      activity: [
        ...state.activity,
        ActivityEntry(
          id: _ids.next('act'),
          at: now,
          summary: '$_actor added ${medication.displayName}',
          kind: ActivityKind.note,
        ),
      ],
    );
    next = _withDosesForDay(next, now);
    state = next;
    await _persist();
    return medication;
  }

  Future<void> updateMedication(Medication medication) async {
    final existing = state.medicationById(medication.id);
    if (existing == null) return;
    final now = _now;
    final scheduleChanged = !listEquals(
      existing.scheduleTimes,
      medication.scheduleTimes,
    );

    var doses = state.doseEvents;
    if (scheduleChanged) {
      // Drop today's not-yet-logged doses so the new schedule regenerates
      // them; anything already taken or skipped is history and stays.
      doses = doses
          .where(
            (d) =>
                !(d.medicationId == medication.id &&
                    d.isDue &&
                    DateFormatting.isSameDay(d.scheduledFor, now)),
          )
          .toList();
    }
    var next = state.copyWith(
      medications: state.medications
          .map((m) => m.id == medication.id ? medication : m)
          .toList(),
      doseEvents: doses,
      activity: [
        ...state.activity,
        ActivityEntry(
          id: _ids.next('act'),
          at: now,
          summary: '$_actor updated ${medication.displayName}',
          kind: ActivityKind.note,
        ),
      ],
    );
    next = _withDosesForDay(next, now);
    state = next;
    await _persist();
  }

  /// Soft delete: the medication disappears from lists, but its logged doses
  /// stay in history for the caregiver timeline.
  Future<void> deleteMedication(String medicationId) async {
    final medication = state.medicationById(medicationId);
    if (medication == null) return;
    final now = _now;
    state = state.copyWith(
      medications: state.medications
          .map((m) => m.id == medicationId ? m.copyWith(active: false) : m)
          .toList(),
      doseEvents: state.doseEvents
          .where((d) => !(d.medicationId == medicationId && d.isDue))
          .toList(),
      activity: [
        ...state.activity,
        ActivityEntry(
          id: _ids.next('act'),
          at: now,
          summary: '$_actor removed ${medication.displayName}',
          kind: ActivityKind.note,
        ),
      ],
    );
    await _persist();
  }

  // ── Appointments ─────────────────────────────────────────────────────────

  Future<Appointment> addAppointment({
    required String title,
    required String locationName,
    required DateTime startsAt,
    String? companionName,
    String? notes,
  }) async {
    final appointment = Appointment(
      id: _ids.next('appt'),
      patientId: state.patient.id,
      title: title.trim(),
      startsAt: startsAt,
      locationName: locationName.trim(),
      companionName: _nullIfBlank(companionName),
      notes: _nullIfBlank(notes),
    );
    state = state.copyWith(
      appointments: [...state.appointments, appointment],
      activity: [
        ...state.activity,
        ActivityEntry(
          id: _ids.next('act'),
          at: _now,
          summary:
              '$_actor added the ${DateFormatting.clockTime(startsAt)} ${appointment.title}',
          kind: ActivityKind.appointment,
        ),
      ],
    );
    await _persist();
    return appointment;
  }

  Future<void> updateAppointment(Appointment appointment) async {
    if (state.appointmentById(appointment.id) == null) return;
    state = state.copyWith(
      appointments: state.appointments
          .map((a) => a.id == appointment.id ? appointment : a)
          .toList(),
      activity: [
        ...state.activity,
        ActivityEntry(
          id: _ids.next('act'),
          at: _now,
          summary:
              '$_actor updated the appointment time to ${DateFormatting.clockTime(appointment.startsAt)}',
          kind: ActivityKind.appointment,
        ),
      ],
    );
    await _persist();
  }

  Future<void> deleteAppointment(String appointmentId) async {
    final appointment = state.appointmentById(appointmentId);
    if (appointment == null) return;
    state = state.copyWith(
      appointments: state.appointments
          .where((a) => a.id != appointmentId)
          .toList(),
      activity: [
        ...state.activity,
        ActivityEntry(
          id: _ids.next('act'),
          at: _now,
          summary: '$_actor removed the ${appointment.title} appointment',
          kind: ActivityKind.appointment,
        ),
      ],
    );
    await _persist();
  }

  // ── Demo data ────────────────────────────────────────────────────────────

  /// Discards everything and re-seeds relative to the current clock.
  Future<void> resetDemoData() async {
    _undo.clear();
    state = _withDosesForDay(MockData.seed(_now), _now);
    await _persist();
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  DateTime get _now => ref.read(currentTimeProvider);

  IdGenerator get _ids => ref.read(idGeneratorProvider);

  /// Who performed the action, for plain-language timeline entries.
  String get _actor {
    final role = ref.read(sessionProvider)?.role ?? UserRole.careRecipient;
    return role == UserRole.caregiver
        ? state.caregiver.firstName
        : state.patient.firstName;
  }

  Future<void> _persist() => ref
      .read(localStoreProvider)
      .writeJson(StoreKeys.careData, state.toJson());

  static List<DoseEvent> _replaceDose(List<DoseEvent> list, DoseEvent dose) =>
      list.map((d) => d.id == dose.id ? dose : d).toList();

  static String? _nullIfBlank(String? value) {
    final trimmed = value?.trim();
    return trimmed == null || trimmed.isEmpty ? null : trimmed;
  }
}

final careDataProvider = NotifierProvider<CareDataNotifier, CareData>(
  CareDataNotifier.new,
);
