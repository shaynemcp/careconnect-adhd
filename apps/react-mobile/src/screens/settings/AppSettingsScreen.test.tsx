import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../../test-utils';
import { FixedClock } from '../../core/utils/clock';
import { seedCareData } from '../../data/mockData';
import { demoClockOffSettings, demoClockOnSettings } from '../../data/settingsFixtures';
import { defaultAppSettings } from '../../models/serialization';
import { useCareDataStore } from '../../state/careDataStore';
import { useClockStore } from '../../state/clockStore';
import { useSessionStore } from '../../state/sessionStore';
import { useSettingsStore } from '../../state/settingsStore';
import { AppSettingsScreen } from './AppSettingsScreen';

const SEED_DAY = new Date(2026, 7, 25, 14, 14);

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

function resetStores() {
  useClockStore.getState().setClock(new FixedClock(SEED_DAY));
  useCareDataStore.getState().hydrate(seedCareData(SEED_DAY));
  useSettingsStore.setState({ ...defaultAppSettings(), hydrated: true });
  useSessionStore.setState({
    session: { role: 'careRecipient', method: 'passkey', signedInAt: SEED_DAY, email: null },
    hydrated: true,
  });
}

/** Grabs the button with this text from the most recent `Alert.alert` call and presses it. */
function pressAlertButton(alertSpy: jest.SpyInstance, text: string) {
  const call = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
  const buttons = call[2] as { text: string; onPress?: () => void }[];
  buttons.find((b) => b.text === text)?.onPress?.();
}

/** The on-screen Switch a sighted user taps; hidden from screen readers in favour of its row. */
function getVisualSwitch() {
  const visual = screen
    .getAllByRole('switch', { includeHiddenElements: true })
    .filter((el) => el.props.accessibilityElementsHidden === true);
  expect(visual).toHaveLength(1);
  return visual[0];
}

beforeEach(() => {
  mockGoBack.mockClear();
  resetStores();
});

describe('AppSettingsScreen', () => {
  it('shows the signed-in profile and goes back', () => {
    renderWithProviders(<AppSettingsScreen />);
    expect(screen.getByText('Muhammad R.')).toBeTruthy();
    expect(screen.getByText('Signed in as care recipient')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Back'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('switches the theme mode', () => {
    renderWithProviders(<AppSettingsScreen />);
    fireEvent.press(screen.getByLabelText('Dark'));
    expect(useSettingsStore.getState().themeMode).toBe('dark');
  });

  it('turns the demo clock off directly, with no confirmation', async () => {
    useSettingsStore.setState({ demoClock: true });
    renderWithProviders(<AppSettingsScreen />);
    const alertSpy = jest.spyOn(Alert, 'alert');

    fireEvent(getVisualSwitch(), 'valueChange', false);

    expect(alertSpy).not.toHaveBeenCalled();
    await waitFor(() => expect(useSettingsStore.getState().demoClock).toBe(false));
  });

  it('confirms before turning the demo clock on, then resets the sample data', async () => {
    renderWithProviders(<AppSettingsScreen />);
    const alertSpy = jest.spyOn(Alert, 'alert');

    fireEvent(getVisualSwitch(), 'valueChange', true);
    expect(alertSpy).toHaveBeenCalledWith(
      'Turn on the demo clock?',
      expect.any(String),
      expect.any(Array),
    );

    pressAlertButton(alertSpy, 'Turn on');
    await waitFor(() => expect(useSettingsStore.getState().demoClock).toBe(true));
  });

  it('exposes the demo clock row as one switch that reports its state', () => {
    useSettingsStore.setState({ ...demoClockOnSettings, hydrated: true });
    renderWithProviders(<AppSettingsScreen />);
    const row = screen.getByRole('switch', { name: 'Demo clock' });
    expect(row).toBe(screen.getByTestId('demo-clock'));
    // The name is just the visible title; the long description is the hint.
    expect(row.props.accessibilityHint).toMatch(/^Freezes time at .+ so every screen matches the Week 3 design\.$/);
    expect(row.props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getAllByRole('switch')).toHaveLength(1);
  });

  it('turns the demo clock off from the row', async () => {
    useSettingsStore.setState({ ...demoClockOnSettings, hydrated: true });
    renderWithProviders(<AppSettingsScreen />);
    fireEvent.press(screen.getByRole('switch', { name: 'Demo clock' }));
    await waitFor(() => expect(useSettingsStore.getState().demoClock).toBe(false));
    const updated = screen.getByRole('switch', { name: 'Demo clock' });
    expect(updated.props.accessibilityState).toMatchObject({ checked: false });
  });

  it('asks before turning the demo clock on from the row', () => {
    useSettingsStore.setState({ ...demoClockOffSettings, hydrated: true });
    renderWithProviders(<AppSettingsScreen />);
    const alertSpy = jest.spyOn(Alert, 'alert');

    fireEvent.press(screen.getByRole('switch', { name: 'Demo clock' }));
    expect(alertSpy).toHaveBeenCalledWith('Turn on the demo clock?', expect.any(String), expect.any(Array));
    expect(useSettingsStore.getState().demoClock).toBe(false);
  });

  it('confirms before resetting sample data', async () => {
    renderWithProviders(<AppSettingsScreen />);
    const alertSpy = jest.spyOn(Alert, 'alert');
    const before = useCareDataStore.getState().data.doseEvents.length;

    fireEvent.press(screen.getByTestId('reset-sample-data'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Reset sample data?',
      expect.any(String),
      expect.any(Array),
    );
    pressAlertButton(alertSpy, 'Reset');

    await waitFor(() => expect(useCareDataStore.getState().data.doseEvents.length).toBe(before));
  });

  it('signs out', () => {
    renderWithProviders(<AppSettingsScreen />);
    fireEvent.press(screen.getByTestId('sign-out'));
    expect(useSessionStore.getState().session).toBeNull();
  });
});
