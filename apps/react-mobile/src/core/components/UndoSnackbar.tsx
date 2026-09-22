import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { announceAfterDelay } from '../utils/announce';
import { snackbarAnnouncement } from '../../data/announcements';
import { DOSE_UNDO_WINDOW_MS } from '../../models/types';
import { CcRadius, Space, TapTarget } from '../theme/spacing';

/** Standard confirmation banner duration (Material's default snackbar timing). */
const CONFIRMATION_DURATION_MS = 4000;

interface SnackbarState {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  key: number;
  hide: () => void;
}

let dismissTimer: ReturnType<typeof setTimeout> | null = null;
let keyCounter = 0;

const useSnackbarStore = create<SnackbarState>((set) => ({
  visible: false,
  message: '',
  actionLabel: undefined,
  onAction: undefined,
  key: 0,
  hide: () => set({ visible: false }),
}));

function present(message: string, durationMs: number, actionLabel?: string, onAction?: () => void): void {
  if (dismissTimer) clearTimeout(dismissTimer);
  keyCounter += 1;
  useSnackbarStore.setState({ visible: true, message, actionLabel, onAction, key: keyCounter });
  dismissTimer = setTimeout(() => {
    useSnackbarStore.getState().hide();
  }, durationMs);
}

/**
 * Shows the reversible confirmation used for every routine action.
 *
 * Bottom-anchored, auto-dismissing after the 10-second undo window, and
 * announced to screen readers (see `SnackbarHost`). Undo is additive —
 * nothing is forfeited when the window closes (WCAG SC 2.2.1 Timing
 * Adjustable).
 *
 * Port of `showUndoSnackBar` in lib/core/widgets/undo_snackbar.dart.
 */
export function showUndoSnackbar({ message, onUndo }: { message: string; onUndo: () => void }): void {
  present(message, DOSE_UNDO_WINDOW_MS, 'Undo', () => {
    if (dismissTimer) clearTimeout(dismissTimer);
    useSnackbarStore.getState().hide();
    onUndo();
  });
}

/** A plain confirmation with no action. Port of `showConfirmationSnackBar`. */
export function showConfirmationSnackbar(message: string): void {
  present(message, CONFIRMATION_DURATION_MS);
}

/**
 * Renders the currently active snackbar. Mount exactly once, near the root
 * (see App.tsx) — the equivalent of Flutter's app-wide `ScaffoldMessenger`.
 *
 * The message and the action are separate accessible elements, so VoiceOver
 * and TalkBack can reach the Undo button on its own (WCAG SC 2.1.1). Each new
 * snackbar is announced once (SC 4.1.3): Android through the bar's live
 * region, iOS through `announceForAccessibility`, since iOS ignores
 * `accessibilityLiveRegion`.
 */
export function SnackbarHost() {
  const { visible, message, actionLabel, onAction, key } = useSnackbarStore();
  const insets = useSafeAreaInsets();
  const hasAction = actionLabel != null && onAction != null;

  // Keyed on `key`, which changes once per `present()`, so a repeat of the
  // same message is announced again but a re-render is not.
  useEffect(() => {
    if (!visible) return;
    return announceAfterDelay(snackbarAnnouncement(message, hasAction ? actionLabel : undefined));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, key]);

  if (!visible) return null;

  return (
    <View
      key={key}
      pointerEvents="box-none"
      style={[styles.container, { paddingBottom: insets.bottom + Space.md }]}
    >
      <View style={styles.bar} accessibilityLiveRegion="polite">
        <Text style={styles.message} numberOfLines={3}>
          {message}
        </Text>
        {hasAction ? (
          <Pressable
            testID="snackbar-action"
            onPress={onAction}
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            style={styles.actionButton}
          >
            <Text style={styles.action}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Space.md,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1D1F',
    borderRadius: CcRadius.md,
    paddingLeft: Space.md,
    paddingRight: Space.sm,
    paddingVertical: Space.xs,
    minHeight: TapTarget.icon,
    width: '100%',
    maxWidth: 560,
  },
  message: {
    color: '#FFFFFF',
    flex: 1,
    fontSize: 16,
  },
  // Real layout size, not hitSlop: the team floor is 44x44 (SC 2.5.8 is 24x24).
  actionButton: {
    minWidth: TapTarget.minimum,
    minHeight: TapTarget.minimum,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Space.sm,
    marginLeft: Space.sm,
  },
  action: {
    color: '#5FB8D6',
    fontWeight: '700',
  },
});
