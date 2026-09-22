import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/theme/app_spacing.dart';
import '../../core/utils/date_formatting.dart';
import '../../core/widgets/alert_card.dart';
import '../../core/widgets/call_contact_button.dart';
import '../../core/widgets/cc_app_bar.dart';
import '../../core/widgets/dose_card.dart';
import '../../core/widgets/empty_state.dart';
import '../../core/widgets/responsive.dart';
import '../../core/widgets/section_heading.dart';
import '../../core/widgets/status_chip.dart';
import '../../state/care_data_provider.dart';
import '../../state/care_selectors.dart';
import '../../state/clock_provider.dart';
import '../patient/today_screen.dart';

/// Screen 06 — Caregiver Dashboard.
///
/// Defaults to only what needs action today — overdue doses as alerts and
/// the next due dose with "Log now" — rather than a full history that has
/// to be filtered by hand. History is opt-in through "View full history".
class CaregiverDashboardScreen extends ConsumerWidget {
  const CaregiverDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final now = ref.watch(currentTimeProvider);
    final patient = ref.watch(patientProvider);
    final data = ref.watch(careDataProvider);
    final overdue = ref.watch(overdueDosesProvider);
    final nextDose = ref.watch(nextActionDoseProvider);
    final nextMedication = nextDose == null
        ? null
        : data.medicationById(nextDose.medicationId);
    final showNextCard =
        nextDose != null && nextMedication != null && !nextDose.isOverdue(now);

    return Scaffold(
      appBar: CcAppBar(
        title: 'Caregiver Dashboard',
        subtitle: '${patient.displayName}’s care',
        actions: [
          CallContactButton(
            contactName: patient.displayName,
            relationship: 'your care recipient',
            phone: '555-0199',
          ),
        ],
      ),
      body: ResponsiveBody(
        primary: [
          const SectionHeading(
            'Needs attention today',
            padding: EdgeInsets.only(bottom: Space.sm),
          ),
          if (overdue.isEmpty && !showNextCard)
            const EmptyState(
              icon: Icons.check_circle,
              message: 'Nothing needs attention right now.',
              detail: 'Every dose so far today has been logged.',
            ),
          for (final dose in overdue)
            Padding(
              padding: const EdgeInsets.only(bottom: Space.sm),
              child: AlertCard(
                text:
                    'Overdue — ${DateFormatting.clockTime(dose.scheduledFor)} '
                    '${data.medicationById(dose.medicationId)?.name ?? 'dose'} '
                    'not yet confirmed',
                actionHint: 'Opens the medication to log it',
                onTap: () => context.go(
                  '/caregiver/manage/medications/${dose.medicationId}',
                ),
              ),
            ),
        ],
        secondary: [
          if (showNextCard)
            KeyedSubtree(
              key: ValueKey(nextDose.id),
              child: DoseCard(
                key: const Key('dashboard-dose-card'),
                title: nextMedication.displayName,
                status: StatusChip.dose(nextDose, now),
                actionLabel: 'Log now',
                actionSemanticLabel: 'Log now, ${nextMedication.displayName}',
                onAction: () =>
                    markDoseTaken(context, ref, nextDose, nextMedication),
              ),
            ),
          const SizedBox(height: Space.sm),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              key: const Key('view-full-history'),
              onPressed: () => context.go('/caregiver/activity'),
              child: const Text('View full history'),
            ),
          ),
        ],
      ),
    );
  }
}
