import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { create } from 'zustand';

import { announceAfterDelay } from '../utils/announce';
import { snackbarAnnouncement } from '../../data/announcements';
import { CcRadius, Space, TapTarget } from '../theme/spacing';

/** Standard confirmation banner duration (Material's default snackbar timing).
 *  Only a plain, non-actionable confirmation uses this — there's nothing to
 *  reach before it disappears, so a fixed duration doesn't create a barrier. */
const CONFIRMATION_DURATION_MS = 4000;
/** How long a just-swapped-in fallback message stays up before it clears
 *  itself (the user can still close it early). */
const FALLBACK_DURATION_MS = 4000;

interface SnackbarState {
  visible: boolean;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Shows the explicit Close (✕) button. */
  dismissible: boolean;
  key: number;
  hide: () => void;
}

let dismissTimer: ReturnType<typeof setTimeout> | null = null;
let keyCounter = 0;

/**
 * Exported so tests can reset it directly between cases (same pattern as
 * `useSessionStore`/`useSettingsStore` elsewhere) — this is otherwise
 * private module state, not part of the public API screens use.
 */
export const useSnackbarStore = create<SnackbarState>((set) => ({
  visible: false,
  message: '',
  actionLabel: undefined,
  onAction: undefined,
  dismissible: false,
  key: 0,
  hide: () => set({ visible: false }),
}));

function clearDismissTimer(): void {
  if (dismissTimer) {
    clearTimeout(dismissTimer);
    dismissTimer = null;
  }
}

function present(
  message: string,
  options: {
    durationMs?: number;
    actionLabel?: string;
    onAction?: () => void;
    dismissible?: boolean;
  } = {},
): void {
  clearDismissTimer();
  keyCounter += 1;
  useSnackbarStore.setState({
    visible: true,
    message,
    actionLabel: options.actionLabel,
    onAction: options.onAction,
    dismissible: options.dismissible ?? false,
    key: keyCounter,
  });
  if (options.durationMs != null) {
    dismissTimer = setTimeout(() => {
      useSnackbarStore.getState().hide();
    }, options.durationMs);
  }
}

/**
 * Shows the reversible confirmation used for every routine action.
 *
 * Bottom-anchored and announced to screen readers (see `SnackbarHost`). Per
 * WCAG 2.2 SC 2.2.1 (Timing Adjustable) it does **not** auto-dismiss: a
 * screen-reader or switch-control user who needs several seconds — and
 * several swipes — to reach the Undo button gets it, every time, not just
 * the sighted user who can tap it in under a second. It closes only when the
 * user taps Undo or the explicit Close button.
 *
 * `onUndo` may report failure (e.g. its underlying record was already
 * consumed — the user tapped Undo from two places, or acted again on the
 * same item before reaching this one). In that case the bar swaps to
 * `fallbackMessage` instead of just vanishing, so the result is always
 * confirmed one way or the other rather than left ambiguous.
 *
 * Port of `showUndoSnackBar` in lib/core/widgets/undo_snackbar.dart, updated
 * to match the no-time-limit fix landed there
 * (careconnect-adhd#18 / #28 — this file, plus types.ts and careDataStore.ts).
 */
export function showUndoSnackbar({
  message,
  onUndo,
  fallbackMessage = "That change can't be undone anymore.",
}: {
  message: string;
  onUndo: () => void | boolean | Promise<void | boolean>;
  fallbackMessage?: string;
}): void {
  present(message, {
    actionLabel: 'Undo',
    dismissible: true,
    onAction: () => {
      clearDismissTimer();
      void Promise.resolve(onUndo()).then((result) => {
        if (result === false) {
          present(fallbackMessage, { durationMs: FALLBACK_DURATION_MS, dismissible: true });
          return;
        }
        useSnackbarStore.getState().hide();
      });
    },
  });
}

/** A plain confirmation with no action. Port of `showConfirmationSnackBar`. */
export function showConfirmationSnackbar(message: string): void {
  present(message, { durationMs: CONFIRMATION_DURATION_MS });
}

/**
 * Renders the currently active snackbar. Mount exactly once, near the root
 * (see App.tsx) — the equivalent of Flutter's app-wide `ScaffoldMessenger`.
 *
 * The message, the action and the Close control are three separate
 * accessible elements, so VoiceOver and TalkBack can reach Undo (and Close)
 * on their own (WCAG SC 2.1.1). Each new snackbar is announced once
 * (SC 4.1.3): Android through the bar's live region, iOS through
 * `announceForAccessibility`, since iOS ignores `accessibilityLiveRegion`.
 */
export function SnackbarHost() {
  const { visible, message, actionLabel, onAction, dismissible, key } = useSnackbarStore();
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

  const close = () => {
    clearDismissTimer();
    useSnackbarStore.getState().hide();
  };

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
        <View style={styles.actions}>
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
          {dismissible ? (
            <Pressable
              testID="snackbar-close"
              onPress={close}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.closeButton}
            >
              <Text style={styles.close}>✕</Text>
            </Pressable>
          ) : null}
        </View>
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
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
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
  closeButton: {
    minWidth: TapTarget.minimum,
    minHeight: TapTarget.minimum,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Space.xs,
  },
  close: {
    color: '#B8BEC4',
    fontSize: 18,
    fontWeight: '600',
  },
});
