import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '../../test-utils';
import { dailyDigestOffSettings } from '../../data/settingsFixtures';
import { defaultNotificationSettings } from '../../models/serialization';
import { useNotificationSettingsStore } from '../../state/notificationSettingsStore';
import { NotificationsSettingsScreen } from './NotificationsSettingsScreen';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

/** The on-screen Switches a sighted user taps; hidden from screen readers in favour of their rows. */
function getVisualSwitches() {
  return screen
    .getAllByRole('switch', { includeHiddenElements: true })
    .filter((el) => el.props.accessibilityElementsHidden === true);
}

beforeEach(() => {
  mockGoBack.mockClear();
  useNotificationSettingsStore.setState({ ...defaultNotificationSettings(), hydrated: true });
});

describe('NotificationsSettingsScreen', () => {
  it('toggles the daily digest', () => {
    renderWithProviders(<NotificationsSettingsScreen />);
    expect(useNotificationSettingsStore.getState().dailyDigest).toBe(true);

    fireEvent(getVisualSwitches()[0], 'valueChange', false);
    expect(useNotificationSettingsStore.getState().dailyDigest).toBe(false);
  });

  it('exposes the daily digest row as one switch that toggles both ways', () => {
    renderWithProviders(<NotificationsSettingsScreen />);
    const row = screen.getByRole('switch', { name: 'Daily digest' });
    expect(row).toBe(screen.getByTestId('daily-digest'));
    expect(row.props.accessibilityHint).toBe('One summary each morning of what is due today');
    expect(row.props.accessibilityState).toMatchObject({ checked: true });

    fireEvent.press(row);
    expect(useNotificationSettingsStore.getState().dailyDigest).toBe(false);
    expect(screen.getByTestId('daily-digest').props.accessibilityState).toMatchObject({ checked: false });
  });

  it('turns the daily digest back on from the row', () => {
    useNotificationSettingsStore.setState({ ...dailyDigestOffSettings, hydrated: true });
    renderWithProviders(<NotificationsSettingsScreen />);
    fireEvent.press(screen.getByTestId('daily-digest'));
    expect(useNotificationSettingsStore.getState().dailyDigest).toBe(true);
  });

  it('always shows overdue alerts as on and disabled', () => {
    renderWithProviders(<NotificationsSettingsScreen />);
    const overdueSwitch = getVisualSwitches()[1];
    expect(overdueSwitch.props.value).toBe(true);
    expect(overdueSwitch.props.disabled).toBe(true);

    const row = screen.getByRole('switch', { name: 'Overdue alerts, always on' });
    expect(row).toBe(screen.getByTestId('overdue-alerts'));
    expect(row.props.accessibilityState).toMatchObject({ checked: true });
    expect(row.props.accessibilityState).toMatchObject({ disabled: true });

    // It can't be switched off, from the row or the Switch.
    fireEvent.press(row);
    expect(screen.getByTestId('overdue-alerts').props.accessibilityState).toMatchObject({ checked: true });
  });

  it('leaves the visual Switch as decoration: no press handler and no pointer events', () => {
    // TalkBack stopped a second time, silently, on a row's toggle while the
    // Switch was still pressable (Android pass, 2026-09-22). The row owns the
    // role, the state and the press handler.
    renderWithProviders(<NotificationsSettingsScreen />);

    for (const visual of getVisualSwitches()) {
      expect(visual.props.onValueChange).toBeUndefined();
      expect(visual.props.focusable).toBe(false);
      // The wrapper sits a few levels up, past the Switch's own internals.
      let ancestor = visual.parent;
      while (ancestor != null && ancestor.props?.pointerEvents == null) ancestor = ancestor.parent;
      expect(ancestor?.props.pointerEvents).toBe('none');
    }
  });

  it('exposes exactly one switch per row to screen readers', () => {
    renderWithProviders(<NotificationsSettingsScreen />);
    expect(screen.getAllByRole('switch').map((el) => el.props.testID)).toEqual([
      'daily-digest',
      'overdue-alerts',
    ]);
  });

  it('changes the reminder lead time', () => {
    renderWithProviders(<NotificationsSettingsScreen />);
    fireEvent.press(screen.getByLabelText('1 day before'));
    expect(useNotificationSettingsStore.getState().leadTime).toBe('oneDay');
  });

  it('goes back', () => {
    renderWithProviders(<NotificationsSettingsScreen />);
    fireEvent.press(screen.getByLabelText('Back'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
