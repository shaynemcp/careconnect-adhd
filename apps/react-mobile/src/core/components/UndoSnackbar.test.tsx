import React from 'react';
import { AccessibilityInfo, Platform, StyleSheet } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { snackbarAnnouncement } from '../../data/announcements';
import { TapTarget } from '../theme/spacing';
import { SnackbarHost, showConfirmationSnackbar, showUndoSnackbar, useSnackbarStore } from './UndoSnackbar';

const TEST_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

function Providers({ children }: { children: React.ReactNode }) {
  return <SafeAreaProvider initialMetrics={TEST_METRICS}>{children}</SafeAreaProvider>;
}

/** `rerender` keeps a `wrapper`, so the host can be re-rendered without a new snackbar. */
function renderHost() {
  return render(<SnackbarHost />, { wrapper: Providers });
}

type ReactTestInstance = ReturnType<typeof screen.getByText>;

function setPlatform(os: 'ios' | 'android') {
  jest.replaceProperty(Platform, 'OS', os);
}

/** True if some ancestor is a single accessible element that would swallow this one. */
function hasAccessibleAncestor(element: ReactTestInstance): boolean {
  for (let node = element.parent; node != null; node = node.parent) {
    if (typeof node.type === 'string' && node.props.accessible === true) return true;
  }
  return false;
}

function liveRegionOf(element: ReactTestInstance): string | undefined {
  for (let node: ReactTestInstance | null = element; node != null; node = node.parent) {
    if (node.props.accessibilityLiveRegion != null) return node.props.accessibilityLiveRegion;
  }
  return undefined;
}

let announce: jest.SpyInstance;

beforeEach(() => {
  jest.useFakeTimers();
  setPlatform('ios');
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions').mockImplementation(() => {});
  // The store is module-level (see the export's own comment), so without this
  // a snackbar left visible by one test — or a `hide()` a prior test's
  // Undo press queued as a microtask that hadn't resolved yet when that test
  // ended — bleeds into the next test's initial render. Same pattern as
  // `useSessionStore`/`useSettingsStore` in sessionAndSettings.test.ts.
  useSnackbarStore.setState({
    visible: false,
    message: '',
    actionLabel: undefined,
    onAction: undefined,
    dismissible: false,
    key: 0,
  });
});

afterEach(() => {
  // Let any pending timer (a plain confirmation's, or a fallback message's)
  // run so the next test starts clean.
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('SnackbarHost — Undo reachability', () => {
  it('exposes the message and the Undo button as separate elements', async () => {
    const onUndo = jest.fn();
    renderHost();
    act(() => showUndoSnackbar({ message: 'Metformin logged at 8:02 AM', onUndo }));

    expect(screen.getByText('Metformin logged at 8:02 AM')).toBeTruthy();
    const undo = screen.getByRole('button', { name: 'Undo' });
    expect(hasAccessibleAncestor(undo)).toBe(false);

    fireEvent.press(undo);
    expect(onUndo).toHaveBeenCalledTimes(1);
    // onUndo's result decides Undo vs. fallback (see the timing/Close
    // describe block below), so closing happens after that result — even a
    // synchronous, undefined-returning onUndo like this one — resolves as a
    // promise rather than immediately.
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    });
  });

  it('gives the Undo button a real 44x44 layout, not just hitSlop', () => {
    renderHost();
    act(() => showUndoSnackbar({ message: 'Metformin logged', onUndo: () => {} }));

    const undo = screen.getByRole('button', { name: 'Undo' });
    const style = StyleSheet.flatten(undo.props.style);
    expect(style.minWidth).toBeGreaterThanOrEqual(TapTarget.minimum);
    expect(style.minHeight).toBeGreaterThanOrEqual(TapTarget.minimum);
    expect(undo.props.hitSlop).toBeUndefined();
  });

  it('shows no button for a plain confirmation', () => {
    renderHost();
    act(() => showConfirmationSnackbar('Sample data reset'));
    expect(screen.getByText('Sample data reset')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

/**
 * careconnect-adhd#18 / #28: the undo confirmation used to auto-dismiss on a
 * fixed timer, so a screen-reader or switch-control user who needed longer to
 * reach the button could watch it disappear — or tap it after it had
 * silently stopped working. These tests assert the fixed contract: the undo
 * bar stays up until explicitly closed or acted on, an explicit Close
 * control exists alongside Undo, and a failed undo swaps in a fallback
 * message rather than vanishing.
 */
describe('SnackbarHost — Undo timing and Close (#18 / #28)', () => {
  it('does not auto-dismiss — an undo offer has no timer, unlike a plain confirmation', () => {
    renderHost();
    act(() => showUndoSnackbar({ message: 'Metformin logged at 8:04 AM', onUndo: () => true }));

    expect(screen.getByText('Metformin logged at 8:04 AM')).toBeTruthy();
    act(() => jest.advanceTimersByTime(60_000));
    expect(screen.getByText('Metformin logged at 8:04 AM')).toBeTruthy();
  });

  it('exposes both an Undo action and an explicit, separately labeled Close control', () => {
    renderHost();
    act(() => showUndoSnackbar({ message: 'Metformin logged at 8:04 AM', onUndo: () => true }));

    expect(screen.getByRole('button', { name: 'Undo' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });

  it('closes without calling onUndo when the Close control is used', () => {
    const onUndo = jest.fn(() => true);
    renderHost();
    act(() => showUndoSnackbar({ message: 'Metformin logged at 8:04 AM', onUndo }));

    fireEvent.press(screen.getByRole('button', { name: 'Close' }));

    expect(onUndo).not.toHaveBeenCalled();
    expect(screen.queryByText('Metformin logged at 8:04 AM')).toBeNull();
  });

  it('calls onUndo and closes when Undo succeeds', async () => {
    const onUndo = jest.fn(() => true);
    renderHost();
    act(() => showUndoSnackbar({ message: 'Metformin logged at 8:04 AM', onUndo }));

    fireEvent.press(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByText('Metformin logged at 8:04 AM')).toBeNull();
    });
  });

  it('swaps to the fallback message instead of just vanishing when onUndo reports failure', async () => {
    renderHost();
    act(() =>
      showUndoSnackbar({
        message: 'Metformin logged at 8:04 AM',
        onUndo: () => false,
        fallbackMessage: "That change can't be undone anymore.",
      }),
    );

    fireEvent.press(screen.getByRole('button', { name: 'Undo' }));

    await waitFor(() => {
      expect(screen.getByText("That change can't be undone anymore.")).toBeTruthy();
    });
    // The failure notice is still explicitly closeable, and is announced
    // through the same live region as the original offer.
    expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
  });

  it('awaits an async onUndo before deciding whether to close or fall back', async () => {
    renderHost();
    act(() =>
      showUndoSnackbar({
        message: 'Metformin logged at 8:04 AM',
        onUndo: () => Promise.resolve(false),
      }),
    );

    fireEvent.press(screen.getByRole('button', { name: 'Undo' }));

    await waitFor(() => {
      expect(screen.getByText("That change can't be undone anymore.")).toBeTruthy();
    });
  });

  it('a plain confirmation has no Close control and still auto-dismisses on its fixed timer', () => {
    renderHost();
    act(() => showConfirmationSnackbar('Sample data reset'));

    expect(screen.getByText('Sample data reset')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();

    act(() => jest.advanceTimersByTime(4000));
    expect(screen.queryByText('Sample data reset')).toBeNull();
  });
});

describe('SnackbarHost — announcements', () => {
  it('announces each new snackbar once on iOS, naming the Undo action', () => {
    const { rerender } = renderHost();
    act(() => showUndoSnackbar({ message: 'Metformin logged', onUndo: () => {} }));

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(snackbarAnnouncement('Metformin logged', 'Undo'), { queue: true });

    rerender(<SnackbarHost />);
    expect(announce).toHaveBeenCalledTimes(1);

    // The same message shown again is a new event and is spoken again.
    act(() => showUndoSnackbar({ message: 'Metformin logged', onUndo: () => {} }));
    expect(announce).toHaveBeenCalledTimes(2);
  });

  it('announces a plain confirmation without an action', () => {
    renderHost();
    act(() => showConfirmationSnackbar('Sample data reset'));
    expect(announce).toHaveBeenCalledWith(snackbarAnnouncement('Sample data reset'), { queue: true });
  });

  it('stays silent on Android, where the live region already speaks it', () => {
    setPlatform('android');
    renderHost();
    act(() => showUndoSnackbar({ message: 'Metformin logged', onUndo: () => {} }));

    expect(announce).not.toHaveBeenCalled();
    expect(liveRegionOf(screen.getByText('Metformin logged'))).toBe('polite');
  });

  it('says nothing extra when Undo is pressed, so it never claims an undo that failed', () => {
    const announceNow = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
    renderHost();
    act(() => showUndoSnackbar({ message: 'Metformin logged', onUndo: () => {} }));
    fireEvent.press(screen.getByRole('button', { name: 'Undo' }));

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announceNow).not.toHaveBeenCalled();
  });
});
