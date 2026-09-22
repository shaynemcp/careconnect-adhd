/**
 * careconnect-adhd#18 / #28: the undo confirmation used to auto-dismiss on a
 * fixed timer tied to the (now-removed) 10-second undo window, so a
 * screen-reader or switch-control user who needed longer to reach the
 * button could watch it disappear — or tap it after it had silently stopped
 * working. These tests assert the fixed contract: the undo bar stays up
 * until explicitly closed or acted on, an explicit Close control exists,
 * and a failed undo swaps in a fallback message rather than vanishing.
 */
import React from 'react';
import { act } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../../test-utils';
import { showConfirmationSnackbar, showUndoSnackbar, useSnackbarStore } from './UndoSnackbar';

beforeEach(() => {
  jest.useFakeTimers();
  // The snackbar store is a module-level singleton (mirroring App.tsx
  // mounting `SnackbarHost` once near the root), so it outlives any one
  // render and has to be reset by hand between tests.
  useSnackbarStore.setState({
    visible: false,
    message: '',
    actionLabel: undefined,
    onAction: undefined,
    dismissible: false,
  });
});

afterEach(() => {
  jest.runOnlyPendingTimers();
  jest.useRealTimers();
});

/** `show*Snackbar` calls update the store outside any React event handler,
 *  so — unlike `fireEvent`, which wraps itself — they need an explicit
 *  `act` for the resulting re-render to be flushed before assertions run. */
function present(fn: () => void) {
  act(fn);
}

describe('showUndoSnackbar', () => {
  it('does not auto-dismiss — it has no timer at all, unlike a plain confirmation', () => {
    renderWithProviders(<></>);
    present(() => showUndoSnackbar({ message: 'Metformin logged at 8:04 AM', onUndo: () => true }));

    expect(screen.getByLabelText('Metformin logged at 8:04 AM')).toBeTruthy();
    act(() => jest.advanceTimersByTime(60_000));
    expect(screen.getByLabelText('Metformin logged at 8:04 AM')).toBeTruthy();
  });

  it('exposes both an Undo action and an explicit, separately labeled Close control', () => {
    renderWithProviders(<></>);
    present(() => showUndoSnackbar({ message: 'Metformin logged at 8:04 AM', onUndo: () => true }));

    expect(screen.getByLabelText('Undo')).toBeTruthy();
    expect(screen.getByLabelText('Close')).toBeTruthy();
  });

  it('closes without calling onUndo when the Close control is used', () => {
    renderWithProviders(<></>);
    const onUndo = jest.fn(() => true);
    present(() => showUndoSnackbar({ message: 'Metformin logged at 8:04 AM', onUndo }));

    fireEvent.press(screen.getByLabelText('Close'));

    expect(onUndo).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Metformin logged at 8:04 AM')).toBeNull();
  });

  it('calls onUndo and closes when Undo succeeds', async () => {
    renderWithProviders(<></>);
    const onUndo = jest.fn(() => true);
    present(() => showUndoSnackbar({ message: 'Metformin logged at 8:04 AM', onUndo }));

    fireEvent.press(screen.getByLabelText('Undo'));
    expect(onUndo).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByLabelText('Metformin logged at 8:04 AM')).toBeNull();
    });
  });

  it('swaps to the fallback message instead of just vanishing when onUndo reports failure', async () => {
    renderWithProviders(<></>);
    present(() =>
      showUndoSnackbar({
        message: 'Metformin logged at 8:04 AM',
        onUndo: () => false,
        fallbackMessage: "That change can't be undone anymore.",
      }),
    );

    fireEvent.press(screen.getByLabelText('Undo'));

    await waitFor(() => {
      expect(screen.getByLabelText("That change can't be undone anymore.")).toBeTruthy();
    });
    // The failure notice is still explicitly closeable, and is announced
    // through the same live region as the original offer.
    expect(screen.getByLabelText('Close')).toBeTruthy();
  });

  it('awaits an async onUndo before deciding whether to close or fall back', async () => {
    renderWithProviders(<></>);
    present(() =>
      showUndoSnackbar({
        message: 'Metformin logged at 8:04 AM',
        onUndo: () => Promise.resolve(false),
      }),
    );

    fireEvent.press(screen.getByLabelText('Undo'));

    await waitFor(() => {
      expect(screen.getByLabelText("That change can't be undone anymore.")).toBeTruthy();
    });
  });

  it('is announced through a polite live region so TalkBack/VoiceOver pick up the change without moving focus', () => {
    renderWithProviders(<></>);
    present(() => showUndoSnackbar({ message: 'Metformin logged at 8:04 AM', onUndo: () => true }));

    const bar = screen.getByLabelText('Metformin logged at 8:04 AM');
    expect(bar.props.accessibilityLiveRegion).toBe('polite');
  });
});

describe('showConfirmationSnackbar', () => {
  it('has no action and auto-dismisses on a fixed timer — there is nothing to reach before it clears', () => {
    renderWithProviders(<></>);
    present(() => showConfirmationSnackbar('Sample data reset'));

    expect(screen.getByLabelText('Sample data reset')).toBeTruthy();
    expect(screen.queryByLabelText('Undo')).toBeNull();
    expect(screen.queryByLabelText('Close')).toBeNull();

    act(() => jest.advanceTimersByTime(4000));
    expect(screen.queryByLabelText('Sample data reset')).toBeNull();
  });
});
