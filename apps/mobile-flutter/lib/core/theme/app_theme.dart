import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import '../../models/user_role.dart';
import 'app_colors.dart';
import 'app_spacing.dart';
import 'app_typography.dart';

/// Builds the Material theme for a given brightness and signed-in role.
///
/// The role only changes `colorScheme.primary` (teal for care recipients,
/// violet for caregivers). Everything else — status colours, type scale,
/// target sizes, focus rings — is identical across both experiences so that
/// behaviour stays consistent (Requirements Document: cross-platform
/// consistency non-functional requirement).
abstract final class AppTheme {
  static ThemeData build({
    required Brightness brightness,
    required UserRole role,
  }) {
    final isDark = brightness == Brightness.dark;
    final cc = isDark ? CcColors.dark : CcColors.light;
    final primary = role == UserRole.caregiver
        ? cc.caregiverPrimary
        : cc.careRecipientPrimary;
    final onPrimary = isDark ? AppColors.darkBackground : AppColors.white;

    final colorScheme = ColorScheme(
      brightness: brightness,
      primary: primary,
      onPrimary: onPrimary,
      // Material derives several component fills (SegmentedButton, chips)
      // from `secondary`. It must therefore stay *in role*: Dusk Violet is
      // reserved as the caregiver cue (SC 3.2.4 Consistent Identification),
      // so a violet control on a care-recipient screen would be misleading.
      secondary: primary,
      onSecondary: onPrimary,
      tertiary: cc.accent,
      onTertiary: onPrimary,
      error: cc.error,
      onError: onPrimary,
      surface: cc.background,
      onSurface: cc.textPrimary,
      surfaceContainerHighest: cc.surface,
      surfaceContainer: cc.surface,
      onSurfaceVariant: cc.textSecondary,
      outline: cc.border,
      outlineVariant: cc.border,
    );

    final textTheme = AppTypography.textTheme(cc.textPrimary, cc.textSecondary);

    // A visible 2px focus outline in the Accent colour (SC 2.4.7 Focus
    // Visible) on every control, regardless of the surface it sits on.
    final focusBorder = BorderSide(color: cc.accent, width: 2);

    return ThemeData(
      useMaterial3: true,
      brightness: brightness,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: cc.background,
      textTheme: textTheme,
      extensions: [cc],
      // Every Material control gets at least the padded 48dp target.
      materialTapTargetSize: MaterialTapTargetSize.padded,
      visualDensity: VisualDensity.standard,
      focusColor: cc.accent.withValues(alpha: 0.24),
      dividerColor: cc.border,
      appBarTheme: AppBarTheme(
        backgroundColor: primary,
        foregroundColor: onPrimary,
        elevation: 0,
        centerTitle: false,
        titleTextStyle: textTheme.headlineMedium?.copyWith(color: onPrimary),
        toolbarHeight: 64,
      ),
      cardTheme: CardThemeData(
        color: cc.surface,
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(CcRadius.md),
          side: BorderSide(color: cc.border),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style:
            FilledButton.styleFrom(
              minimumSize: const Size(TapTarget.minimum, TapTarget.minimum + 4),
              padding: const EdgeInsets.symmetric(
                horizontal: Space.lg,
                vertical: 12,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(CcRadius.md),
              ),
              textStyle: textTheme.labelLarge,
            ).copyWith(
              side: WidgetStateProperty.resolveWith(
                (states) =>
                    states.contains(WidgetState.focused) ? focusBorder : null,
              ),
              backgroundColor: WidgetStateProperty.resolveWith((states) {
                if (states.contains(WidgetState.disabled)) {
                  return cc.disabled.withValues(alpha: 0.4);
                }
                if (states.contains(WidgetState.pressed) ||
                    states.contains(WidgetState.hovered)) {
                  return isDark
                      ? primary.withValues(alpha: 0.85)
                      : AppColors.primaryDark;
                }
                return primary;
              }),
            ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style:
            OutlinedButton.styleFrom(
              minimumSize: const Size(TapTarget.minimum, TapTarget.minimum + 4),
              padding: const EdgeInsets.symmetric(
                horizontal: Space.lg,
                vertical: 12,
              ),
              foregroundColor: primary,
              side: BorderSide(color: primary, width: 1.5),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(CcRadius.md),
              ),
              textStyle: textTheme.labelLarge,
            ).copyWith(
              side: WidgetStateProperty.resolveWith(
                (states) => states.contains(WidgetState.focused)
                    ? focusBorder
                    : BorderSide(color: primary, width: 1.5),
              ),
            ),
      ),
      textButtonTheme: TextButtonThemeData(
        style:
            TextButton.styleFrom(
              minimumSize: const Size(TapTarget.minimum, TapTarget.minimum),
              padding: const EdgeInsets.symmetric(
                horizontal: Space.md,
                vertical: 12,
              ),
              foregroundColor: primary,
              textStyle: textTheme.labelLarge,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(CcRadius.md),
              ),
            ).copyWith(
              side: WidgetStateProperty.resolveWith(
                (states) =>
                    states.contains(WidgetState.focused) ? focusBorder : null,
              ),
            ),
      ),
      iconButtonTheme: IconButtonThemeData(
        style: IconButton.styleFrom(
          minimumSize: const Size(TapTarget.icon, TapTarget.icon),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: cc.background,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: Space.md,
          vertical: 14,
        ),
        labelStyle: AppTypography.bodyEmphasis.copyWith(color: cc.textPrimary),
        floatingLabelBehavior: FloatingLabelBehavior.always,
        hintStyle: textTheme.bodyMedium?.copyWith(color: cc.textSecondary),
        errorStyle: AppTypography.bodyEmphasis.copyWith(
          color: cc.error,
          fontSize: 16,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(CcRadius.md),
          borderSide: BorderSide(color: cc.border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(CcRadius.md),
          borderSide: BorderSide(color: cc.border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(CcRadius.md),
          borderSide: focusBorder,
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(CcRadius.md),
          borderSide: BorderSide(color: cc.error, width: 1.5),
        ),
        focusedErrorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(CcRadius.md),
          borderSide: BorderSide(color: cc.error, width: 2),
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        backgroundColor: cc.background,
        indicatorColor: primary.withValues(alpha: 0.14),
        height: 76,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        // Bottom-navigation labels are the one deliberate exception to the
        // 16px floor. Four destinations on a 411dp phone give each label
        // ~100dp, and "Appointments" at 16px wraps mid-word, which reads as
        // broken. 14px keeps every label on one line and still sits well
        // above Material's own 12sp guidance for navigation labels. The tap
        // target stays 48dp+ and the label scales with the OS font setting;
        // all body copy, buttons and form labels remain 16px.
        labelTextStyle: WidgetStateProperty.resolveWith(
          (states) => textTheme.labelMedium?.copyWith(
            fontSize: 14,
            color: states.contains(WidgetState.selected)
                ? primary
                : cc.textSecondary,
          ),
        ),
        iconTheme: WidgetStateProperty.resolveWith(
          (states) => IconThemeData(
            color: states.contains(WidgetState.selected)
                ? primary
                : cc.disabled,
          ),
        ),
      ),
      snackBarTheme: SnackBarThemeData(
        backgroundColor: isDark ? AppColors.neutral100 : AppColors.neutral900,
        contentTextStyle: textTheme.bodyMedium?.copyWith(
          color: isDark ? AppColors.neutral900 : AppColors.white,
        ),
        actionTextColor: isDark ? AppColors.primary : AppColors.darkPrimary,
        closeIconColor: isDark ? AppColors.neutral900 : AppColors.white,
        behavior: SnackBarBehavior.fixed,
      ),
      switchTheme: SwitchThemeData(
        thumbColor: WidgetStateProperty.resolveWith(
          (states) => states.contains(WidgetState.selected)
              ? onPrimary
              : cc.textSecondary,
        ),
        trackColor: WidgetStateProperty.resolveWith(
          (states) =>
              states.contains(WidgetState.selected) ? primary : cc.border,
        ),
      ),
      dialogTheme: DialogThemeData(
        backgroundColor: cc.background,
        titleTextStyle: textTheme.titleLarge,
        contentTextStyle: textTheme.bodyMedium,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(CcRadius.lg),
        ),
      ),
      segmentedButtonTheme: SegmentedButtonThemeData(
        style: ButtonStyle(
          minimumSize: const WidgetStatePropertyAll(
            Size(TapTarget.minimum, TapTarget.minimum),
          ),
          textStyle: WidgetStatePropertyAll(textTheme.labelLarge),
          backgroundColor: WidgetStateProperty.resolveWith(
            (states) =>
                states.contains(WidgetState.selected) ? primary : cc.background,
          ),
          foregroundColor: WidgetStateProperty.resolveWith(
            (states) =>
                states.contains(WidgetState.selected) ? onPrimary : primary,
          ),
          side: WidgetStatePropertyAll(BorderSide(color: cc.border)),
        ),
      ),
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: primary,
        linearTrackColor: cc.border,
      ),
      listTileTheme: ListTileThemeData(
        minVerticalPadding: 12,
        titleTextStyle: AppTypography.bodyEmphasis.copyWith(
          color: cc.textPrimary,
        ),
        subtitleTextStyle: textTheme.bodyMedium?.copyWith(
          color: cc.textSecondary,
        ),
      ),
      // Motion: the design forbids unnecessary animation. Route transitions
      // use the platform default but are suppressed entirely when the OS
      // reduce-motion setting is on (see `accessiblePage` in the router).
      pageTransitionsTheme: const PageTransitionsTheme(
        builders: {
          TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
          TargetPlatform.iOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.macOS: CupertinoPageTransitionsBuilder(),
          TargetPlatform.windows: FadeForwardsPageTransitionsBuilder(),
          TargetPlatform.linux: FadeForwardsPageTransitionsBuilder(),
        },
      ),
    );
  }
}
