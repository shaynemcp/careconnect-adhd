import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../../test-utils';
import { FixedClock } from '../../core/utils/clock';
import { seedCareData } from '../../data/mockData';
import { useCareDataStore } from '../../state/careDataStore';
import { useClockStore } from '../../state/clockStore';
import { MedicationDetailScreen } from './MedicationDetailScreen';

const SEED_DAY = new Date(2026, 7, 25, 14, 14);

const mockGoBack = jest.fn();
const mockRootNavigate = jest.fn();
let mockParams: { medicationId: string } = { medicationId: 'med-lisinopril' };

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
    getParent: () => ({ getParent: () => ({ navigate: mockRootNavigate }) }),
  }),
  useRoute: () => ({ params: mockParams }),
}));

/** Grabs the button with this text from the most recent `Alert.alert` call and presses it. */
function pressAlertButton(alertSpy: jest.SpyInstance, text: string) {
  const call = alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
  const buttons = call[2] as { text: string; onPress?: () => void }[];
  buttons.find((b) => b.text === text)?.onPress?.();
}

beforeEach(() => {
  mockGoBack.mockClear();
  mockRootNavigate.mockClear();
  mockParams = { medicationId: 'med-lisinopril' };
  useClockStore.getState().setClock(new FixedClock(SEED_DAY));
  useCareDataStore.getState().hydrate(seedCareData(SEED_DAY));
});

describe('MedicationDetailScreen', () => {
  it('shows the schedule and today\'s doses', () => {
    renderWithProviders(<MedicationDetailScreen />);
    expect(screen.getByText('Every day at 8:00 AM and 6:00 PM')).toBeTruthy();
  });

  it('marks the due dose taken', async () => {
    renderWithProviders(<MedicationDetailScreen />);
    fireEvent.press(screen.getByText('Mark as taken'));

    await waitFor(() => {
      const dose = useCareDataStore
        .getState()
        .data.doseEvents.find((d) => d.id === 'dose-lisinopril-pm');
      expect(dose?.status).toBe('taken');
    });
  });

  // careconnect-adhd — finding 6 (mobile-audit.md): with more than one due
  // dose row on screen, an identical "Mark as taken"/"Skip this dose" label
  // on each leaves a screen-reader user unable to tell which is which. Each
  // button's accessible name now names its own dose time.
  it('names the dose time in each action\'s accessible label (finding 6)', () => {
    renderWithProviders(<MedicationDetailScreen />);
    expect(screen.getByLabelText('Mark the 6:00 PM dose as taken')).toBeTruthy();
    expect(screen.getByLabelText('Skip the 6:00 PM dose')).toBeTruthy();
  });

  it('skips the due dose', async () => {
    renderWithProviders(<MedicationDetailScreen />);
    fireEvent.press(screen.getByText('Skip this dose'));

    await waitFor(() => {
      const dose = useCareDataStore
        .getState()
        .data.doseEvents.find((d) => d.id === 'dose-lisinopril-pm');
      expect(dose?.status).toBe('skipped');
    });
  });

  it('opens the edit form', () => {
    renderWithProviders(<MedicationDetailScreen />);
    fireEvent.press(screen.getByTestId('edit-medication'));
    expect(mockRootNavigate).toHaveBeenCalledWith('MedicationForm', { editingId: 'med-lisinopril' });
  });

  it('confirms before deleting, then goes back', async () => {
    renderWithProviders(<MedicationDetailScreen />);
    const alertSpy = jest.spyOn(Alert, 'alert');

    fireEvent.press(screen.getByTestId('delete-medication'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Delete Lisinopril?',
      expect.any(String),
      expect.any(Array),
    );
    pressAlertButton(alertSpy, 'Delete');

    await waitFor(() => {
      const medication = useCareDataStore
        .getState()
        .data.medications.find((m) => m.id === 'med-lisinopril');
      expect(medication?.active).toBe(false);
    });
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('shows a plain message when the medication no longer exists', () => {
    mockParams = { medicationId: 'not-a-real-id' };
    renderWithProviders(<MedicationDetailScreen />);
    expect(screen.getByText('This medication is no longer in your list.')).toBeTruthy();
  });
});
