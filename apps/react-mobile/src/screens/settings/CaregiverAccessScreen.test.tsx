import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '../../test-utils';
import { FixedClock } from '../../core/utils/clock';
import { seedCareData } from '../../data/mockData';
import { sharingPausedSettings } from '../../data/settingsFixtures';
import { defaultAppSettings } from '../../models/serialization';
import { useCareDataStore } from '../../state/careDataStore';
import { useClockStore } from '../../state/clockStore';
import { useSettingsStore } from '../../state/settingsStore';
import { CaregiverAccessScreen } from './CaregiverAccessScreen';

const SEED_DAY = new Date(2026, 7, 25, 14, 14);

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack }),
}));

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
  useClockStore.getState().setClock(new FixedClock(SEED_DAY));
  useCareDataStore.getState().hydrate(seedCareData(SEED_DAY));
  useSettingsStore.setState({ ...defaultAppSettings(), hydrated: true });
});

describe('CaregiverAccessScreen', () => {
  it('lists what the caregiver can see and reflects sharing being on', () => {
    renderWithProviders(<CaregiverAccessScreen />);
    expect(screen.getByText('Medication names, doses, and status')).toBeTruthy();
    expect(screen.getByText('Sharing is on. Renee sees the list above.')).toBeTruthy();
  });

  it('pauses sharing', () => {
    renderWithProviders(<CaregiverAccessScreen />);
    fireEvent(getVisualSwitch(), 'valueChange', false);
    expect(useSettingsStore.getState().shareWithCaregiver).toBe(false);
  });

  it('exposes the sharing row as one switch that reports and toggles its state', () => {
    renderWithProviders(<CaregiverAccessScreen />);
    const row = screen.getByRole('switch', { name: 'Share with Renee' });
    expect(row).toBe(screen.getByTestId('share-with-caregiver'));
    expect(row.props.accessibilityHint).toBe('Sharing is on. Renee sees the list above.');
    expect(row.props.accessibilityState).toMatchObject({ checked: true });
    // The visual Switch is hidden so the row is a single focus stop.
    expect(screen.getAllByRole('switch')).toHaveLength(1);

    fireEvent.press(row);
    expect(useSettingsStore.getState().shareWithCaregiver).toBe(false);
    const updated = screen.getByRole('switch', { name: 'Share with Renee' });
    expect(updated.props.accessibilityState).toMatchObject({ checked: false });
    expect(updated.props.accessibilityHint).toBe(
      'Sharing is paused. Renee sees nothing until you turn it back on.',
    );
  });

  it('turns paused sharing back on from the row', () => {
    useSettingsStore.setState({ ...sharingPausedSettings, hydrated: true });
    renderWithProviders(<CaregiverAccessScreen />);
    const row = screen.getByRole('switch', { name: 'Share with Renee' });
    expect(row.props.accessibilityState).toMatchObject({ checked: false });

    fireEvent.press(row);
    expect(useSettingsStore.getState().shareWithCaregiver).toBe(true);
  });

  it('goes back', () => {
    renderWithProviders(<CaregiverAccessScreen />);
    fireEvent.press(screen.getByLabelText('Back'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});
