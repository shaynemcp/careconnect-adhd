import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/date_formatting.dart';
import '../../core/widgets/call_contact_button.dart';
import '../../core/widgets/cc_app_bar.dart';
import '../../core/widgets/responsive.dart';
import '../../core/widgets/section_heading.dart';
import '../../core/widgets/status_chip.dart';
import '../../core/widgets/undo_snackbar.dart';
import '../../models/dose_event.dart';
import '../../models/medication.dart';
import '../../state/care_data_provider.dart';
import '../../state/care_selectors.dart';
import '../../state/clock_provider.dart';
import 'today_screen.dart';

/// Medication detail: schedule, instructions, today's doses with Mark as
/// taken / Skip (each with undo), Edit, and Delete behind a plain-language
/// confirmation dialog.
class MedicationDetailScreen extends ConsumerWidget {
  const MedicationDetailScreen({required this.medicationId, super.key});

  final String medicationId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final medication = ref.watch(medicationByIdProvider(medicationId));
    final caregiver = ref.watch(caregiverProvider);
    final now = ref.watch(currentTimeProvider);
    final theme = Theme.of(context);
    final colors = context.ccColors;

    if (medication == null || !medication.active) {
      return Scaffold(
        appBar: const CcAppBar(title: 'Medication', showBack: true),
        body: ResponsiveBody(
          primary: [
            Text(
              'This medication is no longer in your list.',
              style: theme.textTheme.bodyLarge,
            ),
          ],
        ),
      );
    }

    final todayDoses = ref
        .watch(todayDoseEventsProvider)
        .where((d) => d.medicationId == medication.id)
        .toList();
    final scheduleText = medication.scheduleTimes
        .map(DateFormatting.localTimeLabel)
        .join(' and ');

    return Scaffold(
      appBar: CcAppBar(
        title: medication.displayName,
        showBack: true,
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
          Card(
            child: Padding(
              padding: const EdgeInsets.all(Space.md),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    scheduleText.isEmpty
                        ? 'No schedule set'
                        : 'Every day at $scheduleText',
                    style: theme.textTheme.bodyLarge,
                  ),
                  if (medication.instructions != null) ...[
                    const SizedBox(height: Space.xs),
                    Text(
                      medication.instructions!,
                      style: theme.textTheme.bodyMedium?.copyWith(
                        color: colors.textSecondary,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SectionHeading('Today', level: HeadingLevel.h4),
          if (todayDoses.isEmpty)
            Text('No doses scheduled today.', style: theme.textTheme.bodyMedium)
          else
            for (final dose in todayDoses)
              _DoseRow(dose: dose, medication: medication, now: now),
        ],
        secondary: [
          const SectionHeading('Manage', level: HeadingLevel.h4),
          OutlinedButton.icon(
            key: const Key('edit-medication'),
            icon: const Icon(Icons.edit),
            label: const Text('Edit medication'),
            onPressed: () => context.push('/medications/${medication.id}/edit'),
          ),
          const SizedBox(height: Space.sm),
          TextButton.icon(
            key: const Key('delete-medication'),
            style: TextButton.styleFrom(foregroundColor: colors.error),
            icon: const Icon(Icons.delete_outline),
            label: const Text('Delete medication'),
            onPressed: () => _confirmDelete(context, ref, medication),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmDelete(
    BuildContext context,
    WidgetRef ref,
    Medication medication,
  ) async {
    final colors = context.ccColors;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: Text('Delete ${medication.name}?'),
        content: Text(
          'This removes ${medication.displayName} from the medication list. '
          'This cannot be undone.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            style: FilledButton.styleFrom(backgroundColor: colors.error),
            onPressed: () => Navigator.of(dialogContext).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    await ref.read(careDataProvider.notifier).deleteMedication(medication.id);
    if (!context.mounted) return;
    showConfirmationSnackBar(context, '${medication.name} removed');
    context.pop();
  }
}

class _DoseRow extends ConsumerWidget {
  const _DoseRow({
    required this.dose,
    required this.medication,
    required this.now,
  });

  final DoseEvent dose;
  final Medication medication;
  final DateTime now;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final doseTime = DateFormatting.clockTime(dose.scheduledFor);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(Space.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('$doseTime dose', style: theme.textTheme.titleSmall),
            const SizedBox(height: Space.xs),
            StatusChip.dose(dose, now),
            if (dose.isDue) ...[
              const SizedBox(height: Space.sm + 4),
              Row(
                children: [
                  Expanded(
                    child: Semantics(
                      label: 'Mark as taken, $doseTime dose',
                      button: true,
                      excludeSemantics: true,
                      child: FilledButton(
                        onPressed: () =>
                            markDoseTaken(context, ref, dose, medication),
                        child: const Text('Mark as taken'),
                      ),
                    ),
                  ),
                  const SizedBox(width: Space.sm),
                  Semantics(
                    label: 'Skip this dose, $doseTime',
                    button: true,
                    excludeSemantics: true,
                    child: TextButton(
                      onPressed: () => _skip(context, ref),
                      child: const Text('Skip this dose'),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _skip(BuildContext context, WidgetRef ref) async {
    final notifier = ref.read(careDataProvider.notifier);
    await notifier.skipDose(dose.id);
    if (!context.mounted) return;
    final at = DateFormatting.clockTime(ref.read(currentTimeProvider));
    showUndoSnackBar(
      context,
      message: '${medication.name} skipped at $at',
      onUndo: () => notifier.undoDoseChange(dose.id),
    );
  }
}
