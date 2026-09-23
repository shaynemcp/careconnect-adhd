import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_spacing.dart';
import '../../core/utils/date_formatting.dart';
import '../../core/widgets/call_contact_button.dart';
import '../../core/widgets/cc_app_bar.dart';
import '../../core/widgets/cc_list_item.dart';
import '../../core/widgets/dose_card.dart';
import '../../core/widgets/empty_state.dart';
import '../../core/widgets/orientation_bar.dart';
import '../../core/widgets/responsive.dart';
import '../../core/widgets/section_heading.dart';
import '../../core/widgets/status_chip.dart';
import '../../core/widgets/undo_snackbar.dart';
import '../../models/dose_event.dart';
import '../../models/medication.dart';
import '../../state/care_data_provider.dart';
import '../../state/care_selectors.dart';
import '../../state/clock_provider.dart';

/// Screen 02 — Today (Home).
///
/// One visually dominant next action. The orientation bar answers "what day
/// is it, what time is it, what's next" before anything else, and marking a
/// dose taken is two taps with an undo instead of a confirmation.
class TodayScreen extends ConsumerWidget {
  const TodayScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final now = ref.watch(currentTimeProvider);
    final caregiver = ref.watch(caregiverProvider);
    final nextDose = ref.watch(nextActionDoseProvider);
    final later = ref.watch(laterTodayDosesProvider);
    final data = ref.watch(careDataProvider);

    final nextMedication = nextDose == null
        ? null
        : data.medicationById(nextDose.medicationId);

    final nextLine = nextDose == null || nextMedication == null
        ? 'All of today’s doses are logged.'
        : DateFormatting.nextSentence(
            nextMedication.name,
            nextDose.scheduledFor,
            now,
          );

    return Scaffold(
      appBar: CcAppBar(
        title: 'Today',
        actions: [
          CallContactButton(
            contactName: caregiver.displayName,
            relationship: caregiver.relationshipToPatient,
            phone: caregiver.phone,
          ),
        ],
      ),
      body: ResponsiveBody(
        primary: [
          OrientationBar(now: now, nextLine: nextLine),
          const SizedBox(height: Space.md),
          if (nextDose != null && nextMedication != null)
            KeyedSubtree(
              key: ValueKey(nextDose.id),
              child: DoseCard(
                key: const Key('today-dose-card'),
                title: nextMedication.displayName,
                status: StatusChip.dose(nextDose, now),
                instructions: nextMedication.instructions,
                actionLabel: 'Mark as Taken',
                actionSemanticLabel:
                    'Mark as Taken, ${nextMedication.displayName}',
                onAction: () =>
                    markDoseTaken(context, ref, nextDose, nextMedication),
              ),
            )
          else
            const EmptyState(
              icon: Icons.check_circle,
              message: 'All of today’s doses are logged.',
              detail:
                  'Nothing else is due today. Tomorrow’s first dose will '
                  'appear here in the morning.',
            ),
        ],
        secondary: [
          const SectionHeading('Later today', level: HeadingLevel.h4),
          if (later.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: Space.sm),
              child: Text(
                'Nothing else is due later today.',
                style: Theme.of(context).textTheme.bodyMedium,
              ),
            )
          else
            for (final dose in later)
              _LaterDoseItem(
                dose: dose,
                medication: data.medicationById(dose.medicationId),
              ),
        ],
      ),
    );
  }
}

/// Shared by Today and the caregiver dashboard: log the dose, then offer undo.
Future<void> markDoseTaken(
  BuildContext context,
  WidgetRef ref,
  DoseEvent dose,
  Medication medication,
) async {
  final notifier = ref.read(careDataProvider.notifier);
  await notifier.markTaken(dose.id);
  if (!context.mounted) return;
  final at = DateFormatting.clockTime(ref.read(currentTimeProvider));
  showUndoSnackBar(
    context,
    message: '${medication.name} logged at $at',
    onUndo: () => notifier.undoDoseChange(dose.id),
  );
}

class _LaterDoseItem extends StatelessWidget {
  const _LaterDoseItem({required this.dose, required this.medication});

  final DoseEvent dose;
  final Medication? medication;

  @override
  Widget build(BuildContext context) {
    final med = medication;
    if (med == null) return const SizedBox.shrink();
    return CcListItem(
      title: med.displayName,
      subtitle: 'Due at ${DateFormatting.clockTime(dose.scheduledFor)}',
      semanticHint: 'Opens the medication',
      onTap: () => context.go('/patient/medications/${med.id}'),
    );
  }
}
