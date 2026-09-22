import React from 'react';
import { AccessibilityInfo, Alert, Platform } from 'react-native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../../test-utils';
import { READ_ONLY_PICKER_HINT, fieldErrorAnnouncement, fieldErrorsAnnouncement } from '../../data/announcements';
import { FixedClock } from '../../core/utils/clock';
import { dateAndTime } from '../../core/utils/dateFormatting';
import { seedCareData } from '../../data/mockData';
import { emptyAppointmentDraft } from '../../models/types';
import { useCareDataStore } from '../../state/careDataStore';
import { useClockStore } from '../../state/clockStore';
import { useDraftStore } from '../../state/draftStore';
import { AppointmentFormScreen } from './AppointmentFormScreen';

const SEED_DAY = new Date(2026, 7, 25, 14, 14);
const EMPTY_WHEN_NAME = 'Date & time. Choose the date and time';

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
  useDraftStore.setState({ appointmentDraft: emptyAppointmentDraft(), appointmentAutosave: 'idle' });
  mockParams = undefined;
}

/** Fills step 1 and moves on to the date & time step. */
function completeStepOne(title = 'Dentist — cleaning', location = 'Smile Dental') {
  fireEvent.changeText(screen.getByTestId('appointment-title'), title);
  fireEvent.changeText(screen.getByTestId('appointment-location'), location);
  fireEvent.press(screen.getByTestId('form-continue'));
}

/** Drives the mocked native picker through its date stage then its time stage. */
function pickDateAndTime(date: Date, time: Date) {
  fireEvent(screen.getByTestId('mock-datetimepicker'), 'change', { type: 'set' }, date);
  fireEvent(screen.getByTestId('mock-datetimepicker'), 'change', { type: 'set' }, time);
}

let announce: jest.SpyInstance;

beforeEach(() => {
  mockGoBack.mockClear();
  resetStores();
  jest.replaceProperty(Platform, 'OS', 'ios');
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('AppointmentFormScreen — step 1', () => {
  it('explains what is missing before leaving step 1, and clears each error as it is fixed', () => {
    renderWithProviders(<AppointmentFormScreen />);
    expect(screen.getByText('Add Appointment')).toBeTruthy();

    fireEvent.press(screen.getByTestId('form-continue'));
    expect(screen.getByText('Enter what the appointment is, like Dentist — cleaning')).toBeTruthy();
    expect(screen.getByText('Enter where it is, like Regional Medical')).toBeTruthy();
    expect(screen.getByText('Step 1 of 2 — What & where')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('appointment-title'), 'Dentist');
    expect(screen.queryByText('Enter what the appointment is, like Dentist — cleaning')).toBeNull();
    fireEvent.changeText(screen.getByTestId('appointment-location'), 'Smile Dental');
    expect(screen.queryByText('Enter where it is, like Regional Medical')).toBeNull();
  });

  it('announces both step-1 errors on iOS as one message, so neither is dropped', () => {
    // iOS keeps only the last of several announcements posted at once; two
    // separate calls spoke only the "Where" error on a device.
    renderWithProviders(<AppointmentFormScreen />);
    announce.mockClear();
    fireEvent.press(screen.getByTestId('form-continue'));

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(
      fieldErrorsAnnouncement([
        fieldErrorAnnouncement('Appointment', 'Enter what the appointment is, like Dentist — cleaning'),
        fieldErrorAnnouncement('Where', 'Enter where it is, like Regional Medical'),
      ]),
      { queue: true },
    );
  });

  it('announces a single step-1 error on its own, in the usual wording', () => {
    renderWithProviders(<AppointmentFormScreen />);
    fireEvent.changeText(screen.getByTestId('appointment-title'), 'Dentist — cleaning');
    announce.mockClear();
    fireEvent.press(screen.getByTestId('form-continue'));

    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(
      fieldErrorAnnouncement('Where', 'Enter where it is, like Regional Medical'),
      { queue: true },
    );
  });

  it('does not repeat an unchanged error after the other field is fixed', () => {
    renderWithProviders(<AppointmentFormScreen />);
    fireEvent.press(screen.getByTestId('form-continue'));
    announce.mockClear();

    fireEvent.changeText(screen.getByTestId('appointment-title'), 'Dentist — cleaning');
    fireEvent.press(screen.getByTestId('form-continue'));

    expect(announce).not.toHaveBeenCalled();
    expect(screen.getByText('Enter where it is, like Regional Medical')).toBeTruthy();
  });

  it('leaves the form when Back is pressed on step 1', () => {
    renderWithProviders(<AppointmentFormScreen />);
    fireEvent.press(screen.getByTestId('form-back'));
    expect(mockGoBack).toHaveBeenCalled();
  });
});

describe('AppointmentFormScreen — date & time field', () => {
  it('is one button named by its label and placeholder, with a hint, until a date is chosen', () => {
    renderWithProviders(<AppointmentFormScreen />);
    completeStepOne();

    const when = screen.getByRole('button', { name: EMPTY_WHEN_NAME });
    expect(when.props.accessibilityHint).toBe(READ_ONLY_PICKER_HINT);
    // The inner read-only text box is hidden so it isn't a second focus stop.
    expect(screen.queryByTestId('appointment-when')).toBeNull();
  });

  it('requires a date and time, naming the error in the field and announcing it on iOS', () => {
    renderWithProviders(<AppointmentFormScreen />);
    completeStepOne();
    announce.mockClear();

    fireEvent.press(screen.getByTestId('form-continue'));
    expect(screen.getByText('Choose the date and time', { exact: true })).toBeTruthy();
    // The error and the placeholder are the same sentence; it is spoken once.
    const when = screen.getByRole('button', { name: /^Date & time\./ });
    expect(when.props.accessibilityLabel).toBe('Date & time. Choose the date and time');
    expect(announce).toHaveBeenCalledWith(
      fieldErrorAnnouncement('Date & time', 'Choose the date and time'),
      { queue: true },
    );
  });

  it('opens the date picker, then the time picker, and names the field with the result', () => {
    renderWithProviders(<AppointmentFormScreen />);
    completeStepOne();
    fireEvent.press(screen.getByTestId('form-continue')); // raise the error first

    fireEvent.press(screen.getByRole('button', { name: /^Date & time\./ }));
    expect(screen.getByTestId('mock-datetimepicker').props.mode).toBe('date');
    expect(screen.getByTestId('mock-datetimepicker').props.display).toBe('spinner');

    fireEvent(screen.getByTestId('mock-datetimepicker'), 'change', { type: 'set' }, new Date(2026, 8, 3));
    expect(screen.getByTestId('mock-datetimepicker').props.mode).toBe('time');

    fireEvent(screen.getByTestId('mock-datetimepicker'), 'change', { type: 'set' }, new Date(2000, 0, 1, 9, 45));
    expect(screen.queryByTestId('mock-datetimepicker')).toBeNull();

    const chosen = new Date(2026, 8, 3, 9, 45);
    expect(useDraftStore.getState().appointmentDraft.startsAt).toEqual(chosen);
    // Picking a time clears the error, and the button now speaks the value.
    expect(screen.getByRole('button', { name: `Date & time. ${dateAndTime(chosen)}` })).toBeTruthy();
  });

  it('uses the platform default picker on Android', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    renderWithProviders(<AppointmentFormScreen />);
    completeStepOne();
    fireEvent.press(screen.getByRole('button', { name: EMPTY_WHEN_NAME }));
    expect(screen.getByTestId('mock-datetimepicker').props.display).toBe('default');
    fireEvent(screen.getByTestId('mock-datetimepicker'), 'change', { type: 'set' }, new Date(2026, 8, 3));
    expect(screen.getByTestId('mock-datetimepicker').props.display).toBe('default');
  });

  it('keeps the date unset when the date picker is dismissed', () => {
    renderWithProviders(<AppointmentFormScreen />);
    completeStepOne();
    fireEvent.press(screen.getByRole('button', { name: EMPTY_WHEN_NAME }));

    fireEvent(screen.getByTestId('mock-datetimepicker'), 'change', { type: 'dismissed' }, undefined);
    expect(screen.queryByTestId('mock-datetimepicker')).toBeNull();
    expect(useDraftStore.getState().appointmentDraft.startsAt).toBeUndefined();
  });

  it('keeps the date unset when the time picker is dismissed', () => {
    renderWithProviders(<AppointmentFormScreen />);
    completeStepOne();
    fireEvent.press(screen.getByRole('button', { name: EMPTY_WHEN_NAME }));

    fireEvent(screen.getByTestId('mock-datetimepicker'), 'change', { type: 'set' }, new Date(2026, 8, 3));
    fireEvent(screen.getByTestId('mock-datetimepicker'), 'change', { type: 'dismissed' }, undefined);
    expect(screen.queryByTestId('mock-datetimepicker')).toBeNull();
    expect(useDraftStore.getState().appointmentDraft.startsAt).toBeUndefined();
  });
});

describe('AppointmentFormScreen — add flow', () => {
  it('walks what & where -> date, time & companion -> save, creating the appointment', async () => {
    renderWithProviders(<AppointmentFormScreen />);
    completeStepOne();
    expect(screen.getByText('Step 2 of 2 — Date, time & companion')).toBeTruthy();
    expect(screen.getByText('Save appointment')).toBeTruthy();

    fireEvent.press(screen.getByRole('button', { name: EMPTY_WHEN_NAME }));
    pickDateAndTime(new Date(2026, 8, 3), new Date(2000, 0, 1, 9, 45));
    fireEvent.changeText(screen.getByTestId('appointment-companion'), '  Renee  ');
    fireEvent.press(screen.getByTestId('form-continue'));

    await waitFor(() => {
      const appt = useCareDataStore
        .getState()
        .data.appointments.find((a) => a.title === 'Dentist — cleaning');
      expect(appt).toBeDefined();
      expect(appt?.locationName).toBe('Smile Dental');
      expect(appt?.startsAt).toEqual(new Date(2026, 8, 3, 9, 45));
      expect(appt?.companionName).toBe('Renee');
    });
    expect(await screen.findByText('Appointment added')).toBeTruthy();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('goes back a step instead of leaving the form when on step 2', () => {
    renderWithProviders(<AppointmentFormScreen />);
    completeStepOne();
    fireEvent.press(screen.getByTestId('form-back'));
    expect(screen.getByText('Step 1 of 2 — What & where')).toBeTruthy();
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('offers no delete button for a new appointment', () => {
    renderWithProviders(<AppointmentFormScreen />);
    expect(screen.queryByTestId('delete-appointment')).toBeNull();
  });
});

describe('AppointmentFormScreen — edit flow', () => {
  beforeEach(() => {
    mockParams = { editingId: 'appt-alvarez' };
  });

  it('shows a missing state when the appointment being edited no longer exists', () => {
    mockParams = { editingId: 'deleted-appointment' };

    renderWithProviders(<AppointmentFormScreen />);

    expect(screen.getByText('This appointment is no longer in your list.')).toBeTruthy();
    expect(screen.queryByTestId('form-continue')).toBeNull();
  });

  it('pre-fills the draft, speaks the existing date, and saves trimmed changes', async () => {
    renderWithProviders(<AppointmentFormScreen />);
    expect(screen.getByText('Edit Appointment')).toBeTruthy();
    expect(await screen.findByDisplayValue('Dr. Alvarez — Cardiology follow-up')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('appointment-title'), '  Dr. Alvarez — Cardiology  ');
    fireEvent.press(screen.getByTestId('form-continue'));

    const startsAt = new Date(2026, 7, 25, 14, 30);
    expect(screen.getByRole('button', { name: `Date & time. ${dateAndTime(startsAt)}` })).toBeTruthy();
    expect(screen.getByText('Save changes')).toBeTruthy();

    // Clearing the companion saves "going alone" (null), not an empty name.
    fireEvent.changeText(screen.getByTestId('appointment-companion'), '   ');
    fireEvent.press(screen.getByTestId('form-continue'));

    await waitFor(() => {
      const appt = useCareDataStore.getState().data.appointments.find((a) => a.id === 'appt-alvarez');
      expect(appt?.title).toBe('Dr. Alvarez — Cardiology');
      expect(appt?.startsAt).toEqual(startsAt);
      expect(appt?.companionName).toBeNull();
    });
    expect(await screen.findByText('Appointment updated')).toBeTruthy();
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('opens the picker at the existing date', async () => {
    renderWithProviders(<AppointmentFormScreen />);
    await screen.findByDisplayValue('Dr. Alvarez — Cardiology follow-up');
    fireEvent.press(screen.getByTestId('form-continue'));

    fireEvent.press(screen.getByRole('button', { name: /^Date & time\./ }));
    expect(screen.getByTestId('mock-datetimepicker').props.value).toEqual(new Date(2026, 7, 25, 14, 30));
  });

  it('asks before deleting, and does nothing on Cancel', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    renderWithProviders(<AppointmentFormScreen />);
    await screen.findByDisplayValue('Dr. Alvarez — Cardiology follow-up');

    fireEvent.press(screen.getByTestId('delete-appointment'));
    expect(alertSpy).toHaveBeenCalledWith(
      'Delete this appointment?',
      'This removes Dr. Alvarez — Cardiology follow-up from the list. This cannot be undone.',
      expect.any(Array),
    );
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    expect(buttons.find((b) => b.text === 'Cancel')?.onPress).toBeUndefined();
    expect(useCareDataStore.getState().data.appointments.some((a) => a.id === 'appt-alvarez')).toBe(true);
  });

  it('deletes the appointment once confirmed and leaves the form', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert');
    renderWithProviders(<AppointmentFormScreen />);
    await screen.findByDisplayValue('Dr. Alvarez — Cardiology follow-up');

    fireEvent.press(screen.getByTestId('delete-appointment'));
    const buttons = alertSpy.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    await act(async () => {
      buttons.find((b) => b.text === 'Delete')?.onPress?.();
    });

    await waitFor(() =>
      expect(useCareDataStore.getState().data.appointments.some((a) => a.id === 'appt-alvarez')).toBe(false),
    );
    expect(await screen.findByText('Appointment removed')).toBeTruthy();
    expect(mockGoBack).toHaveBeenCalled();
  });
});
