import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import 'status_chip.dart';

/// The single dominant next-action card.
///
/// Exactly one of these is visually dominant per screen, and its button is
/// the only Focus Coral element on that screen, so the accent keeps meaning.
class DoseCard extends StatelessWidget {
  const DoseCard({
    required this.title,
    required this.status,
    required this.actionLabel,
    required this.onAction,
    this.actionSemanticLabel,
    this.instructions,
    this.dominant = true,
    super.key,
  });

  /// "Metformin, 500 mg"
  final String title;
  final StatusChip status;
  final String actionLabel;
  final VoidCallback? onAction;
  final String? actionSemanticLabel;
  final String? instructions;

  /// Dominant cards use the accent colour and the taller target.
  final bool dominant;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colors = context.ccColors;

    return Card(
      color: theme.colorScheme.surface,
      child: Padding(
        padding: const EdgeInsets.all(Space.md),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Semantics(
              header: true,
              child: Text(title, style: theme.textTheme.titleLarge),
            ),
            const SizedBox(height: Space.xs),
            status,
            if (instructions != null && instructions!.isNotEmpty) ...[
              const SizedBox(height: Space.xs),
              Text(instructions!, style: theme.textTheme.bodyMedium),
            ],
            const SizedBox(height: Space.md),
            FilledButton(
              onPressed: onAction,
              style: dominant
                  ? FilledButton.styleFrom(
                      backgroundColor: colors.accent,
                      foregroundColor: theme.colorScheme.onTertiary,
                      minimumSize: const Size.fromHeight(
                        TapTarget.dominantAction,
                      ),
                    )
                  : FilledButton.styleFrom(
                      minimumSize: const Size.fromHeight(TapTarget.minimum + 8),
                    ),
              child: Text(actionLabel, semanticsLabel: actionSemanticLabel),
            ),
          ],
        ),
      ),
    );
  }
}
