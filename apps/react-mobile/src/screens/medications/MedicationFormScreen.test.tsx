import React from 'react';
import { AccessibilityInfo, Platform, StyleSheet } from 'react-native';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../../test-utils';
import { FixedClock } from '../../core/utils/clock';
import { MEDICATION_FORM_ERRORS, fieldErrorAnnouncement, fieldErrorsAnnouncement } from '../../data/announcements';
import { seedCareData } from '../../data/mockData';
import { emptyMedicationDraft } from '../../models/types';
import { useCareDataStore } from '../../state/careDataStore';
import { useClockStore } from '../../state/clockStore';
import { useDraftStore } from '../../state/draftStore';
import { TapTarget } from '../../core/theme/spacing';
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

  it('removes a scheduled time via its own 44x44 target (careconnect-adhd#4, item 5)', () => {
    renderWithProviders(<MedicationFormScreen />);
    fireEvent.changeText(screen.getByTestId('medication-name'), 'Ibuprofen');
    fireEvent.changeText(screen.getByTestId('medication-dosage'), '200 mg');
    fireEvent.press(screen.getByTestId('form-continue'));

    fireEvent.press(screen.getByTestId('add-time'));
    fireEvent(
      screen.getByTestId('mock-datetimepicker'),
      'change',
      { type: 'set' },
      new Date(2000, 0, 1, 9, 0),
    );
    expect(screen.getByText('9:00 AM')).toBeTruthy();

    const removeButton = screen.getByLabelText('Remove 9:00 AM');
    const flatStyle = Object.assign({}, ...[removeButton.props.style].flat(Infinity));
    // Real layout size, not hitSlop — a fixed width/height (this button, 48x48)
    // is just as valid a way to clear the 44px floor as minWidth/minHeight.
    expect(flatStyle.width ?? flatStyle.minWidth).toBeGreaterThanOrEqual(44);
    expect(flatStyle.height ?? flatStyle.minHeight).toBeGreaterThanOrEqual(44);
    expect(removeButton.props.hitSlop).toBeUndefined();

    fireEvent.press(removeButton);
    expect(screen.queryByText('9:00 AM')).toBeNull();
    expect(screen.getByText('No times yet.')).toBeTruthy();
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

describe('MedicationFormScreen — screen reader support', () => {
  let announce: jest.SpyInstance;

  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  /**
   * The snackbar store outlives each test, so an earlier test's confirmation
   * ("Ibuprofen added") is still showing and announces when the host mounts.
   * Start counting from after the render.
   */
  function renderForm() {
    renderWithProviders(<MedicationFormScreen />);
    announce.mockClear();
  }

  function goToScheduleStep() {
    fireEvent.changeText(screen.getByTestId('medication-name'), 'Ibuprofen');
    fireEvent.changeText(screen.getByTestId('medication-dosage'), '200 mg');
    fireEvent.press(screen.getByTestId('form-continue'));
  }

  it('announces both step-1 errors on iOS as one message, so neither is dropped', () => {
    renderForm();
    fireEvent.press(screen.getByTestId('form-continue'));

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(
      fieldErrorsAnnouncement([
        fieldErrorAnnouncement('Medication name', MEDICATION_FORM_ERRORS.name),
        fieldErrorAnnouncement('Dosage', MEDICATION_FORM_ERRORS.dosage),
      ]),
      { queue: true },
    );
  });

  it('announces a single step-1 error on its own, in the usual wording', () => {
    renderForm();
    fireEvent.changeText(screen.getByTestId('medication-name'), 'Vitamin D');
    announce.mockClear();
    fireEvent.press(screen.getByTestId('form-continue'));

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(fieldErrorAnnouncement('Dosage', MEDICATION_FORM_ERRORS.dosage), {
      queue: true,
    });
  });

  it('announces the missing-times error once on iOS', () => {
    renderForm();
    goToScheduleStep();
    expect(announce).not.toHaveBeenCalled();

    fireEvent.press(screen.getByTestId('form-continue'));
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(MEDICATION_FORM_ERRORS.scheduleTimes, { queue: true });

    // Pressing Continue again with the same error doesn't repeat it.
    fireEvent.press(screen.getByTestId('form-continue'));
    expect(announce).toHaveBeenCalledTimes(1);
  });

  it('leaves the missing-times error to the live region on Android', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    renderForm();
    goToScheduleStep();
    fireEvent.press(screen.getByTestId('form-continue'));

    expect(announce).not.toHaveBeenCalled();
    expect(screen.getByText(MEDICATION_FORM_ERRORS.scheduleTimes).props.accessibilityLiveRegion).toBe('polite');
  });

  it('gives the remove-time button a real 48x48 icon-button layout, not just hitSlop', () => {
    useDraftStore.setState({
      medicationDraft: { ...emptyMedicationDraft(), step: 2, scheduleTimes: ['09:00'] },
    });
    renderForm();

    const remove = screen.getByRole('button', { name: 'Remove 9:00 AM' });
    const style = StyleSheet.flatten(remove.props.style);
    expect(style.width).toBe(TapTarget.icon);
    expect(style.height).toBe(TapTarget.icon);
    expect(remove.props.hitSlop).toBeUndefined();

    fireEvent.press(remove);
    expect(useDraftStore.getState().medicationDraft.scheduleTimes).toEqual([]);
  });
});
