import React from 'react';
import { AccessibilityInfo, Platform, StyleSheet } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { snackbarAnnouncement } from '../../data/announcements';
import { TapTarget } from '../theme/spacing';
import { SnackbarHost, showConfirmationSnackbar, showUndoSnackbar } from './UndoSnackbar';

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
});

afterEach(() => {
  // Let the auto-dismiss timer hide the snackbar so the next test starts clean.
  act(() => {
    jest.runOnlyPendingTimers();
  });
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('SnackbarHost — Undo reachability', () => {
  it('exposes the message and the Undo button as separate elements', () => {
    const onUndo = jest.fn();
    renderHost();
    act(() => showUndoSnackbar({ message: 'Metformin logged at 8:02 AM', onUndo }));

    expect(screen.getByText('Metformin logged at 8:02 AM')).toBeTruthy();
    const undo = screen.getByRole('button', { name: 'Undo' });
    expect(hasAccessibleAncestor(undo)).toBe(false);

    fireEvent.press(undo);
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
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
