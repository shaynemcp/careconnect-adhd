import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../../test-utils';
import { FixedClock } from '../../core/utils/clock';
import { seedCareData } from '../../data/mockData';
import { emptyMedicationDraft } from '../../models/types';
import { useCareDataStore } from '../../state/careDataStore';
import { useClockStore } from '../../state/clockStore';
import { useDraftStore } from '../../state/draftStore';
import { MedicationFormScreen } from './MedicationFormScreen';

const SEED_DAY = new Date(2026, 7, 25, 14, 14);

const mockGoBack = jest.fn();
let mockParams: { editingId?: string } | undefined;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: mockGoBack, getParent: () => undefined }),
  useRoute: () => ({ params: mockParams }),
}));

function resetStores() {
  useClockStore.getState().setClock(new FixedClock(SEED_DAY));
  useCareDataStore.getState().hydrate(seedCareData(SEED_DAY));
  useDraftStore.setState({ medicationDraft: emptyMedicationDraft(), medicationAutosave: 'idle' });
  mockParams = undefined;
}

beforeEach(() => {
  mockGoBack.mockClear();
  resetStores();
});

describe('MedicationFormScreen — add flow', () => {
  it('requires a name and dosage before leaving step 1', () => {
    renderWithProviders(<MedicationFormScreen />);
    fireEvent.press(screen.getByTestId('form-continue'));
    expect(screen.getByText('Enter the medication name, like Metformin')).toBeTruthy();
    expect(screen.getByText('Enter the dose, like 25 mg')).toBeTruthy();
  });

  it('walks details -> schedule -> review -> save, creating the medication', async () => {
    renderWithProviders(<MedicationFormScreen />);

    fireEvent.changeText(screen.getByTestId('medication-name'), 'Ibuprofen');
    fireEvent.changeText(screen.getByTestId('medication-dosage'), '200 mg');
    fireEvent.press(screen.getByTestId('form-continue'));

    // Step 2: requires at least one time.
    fireEvent.press(screen.getByTestId('form-continue'));
    expect(screen.getByText('Add at least one time, like 8:00 AM')).toBeTruthy();

    fireEvent.press(screen.getByTestId('add-time'));
    fireEvent(
      screen.getByTestId('mock-datetimepicker'),
      'change',
      { type: 'set' },
      new Date(2000, 0, 1, 9, 0),
    );
    expect(screen.getByText('9:00 AM')).toBeTruthy();

    fireEvent.press(screen.getByTestId('form-continue'));

    // Step 3: review, then save.
    expect(screen.getByText('Ibuprofen')).toBeTruthy();
    fireEvent.press(screen.getByTestId('form-continue'));

    await waitFor(() => {
      const med = useCareDataStore
        .getState()
        .data.medications.find((m) => m.name === 'Ibuprofen');
      expect(med).toBeDefined();
      expect(med?.dosage).toBe('200 mg');
      expect(med?.scheduleTimes).toEqual(['09:00']);
    });
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('goes back a step instead of leaving the form when not on step 1', () => {
    renderWithProviders(<MedicationFormScreen />);
    fireEvent.changeText(screen.getByTestId('medication-name'), 'Ibuprofen');
    fireEvent.changeText(screen.getByTestId('medication-dosage'), '200 mg');
    fireEvent.press(screen.getByTestId('form-continue'));
    expect(screen.getByText('Step 2 of 3 — Schedule')).toBeTruthy();

    fireEvent.press(screen.getByTestId('form-back'));
    expect(screen.getByText('Step 1 of 3 — Medication details')).toBeTruthy();
    expect(mockGoBack).not.toHaveBeenCalled();
  });
});

describe('MedicationFormScreen — edit flow', () => {
  it('pre-fills the draft from the existing medication', () => {
    mockParams = { editingId: 'med-lisinopril' };
    renderWithProviders(<MedicationFormScreen />);
    expect(screen.getByText('Edit Medication')).toBeTruthy();
    expect(screen.getByDisplayValue('Lisinopril')).toBeTruthy();
  });

  it('shows a missing state when the medication being edited no longer exists', () => {
    mockParams = { editingId: 'deleted-medication' };

    renderWithProviders(<MedicationFormScreen />);

    expect(screen.getByText('This medication is no longer in your list.')).toBeTruthy();
    expect(screen.queryByTestId('form-continue')).toBeNull();
  });
});
