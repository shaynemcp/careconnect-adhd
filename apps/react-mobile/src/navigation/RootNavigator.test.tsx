import React from 'react';
import { createNavigationContainerRef, NavigationContainer } from '@react-navigation/native';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../test-utils';
import { FixedClock } from '../core/utils/clock';
import { seedCareData } from '../data/mockData';
import { useCareDataStore } from '../state/careDataStore';
import { useClockStore } from '../state/clockStore';
import { useDraftStore } from '../state/draftStore';
import { useSessionStore } from '../state/sessionStore';
import { linking, RootNavigator } from './RootNavigator';
import { Routes } from './routes';
import type { RootStackParamList } from './types';

const SEED_DAY = new Date(2026, 7, 25, 14, 14);
const navRef = createNavigationContainerRef<RootStackParamList>();

function signInAs(role: 'careRecipient' | 'caregiver') {
  useSessionStore.getState().hydrate({
    role,
    method: 'passkey',
    signedInAt: SEED_DAY,
    email: null,
  });
}

function renderRoot() {
  return renderWithProviders(
    <NavigationContainer ref={navRef}>
      <RootNavigator />
    </NavigationContainer>,
  );
}

/** Presses a bottom-tab label; the screen header can repeat the same word, and the tab bar renders last. */
function pressTab(label: string) {
  const matches = screen.getAllByText(label);
  fireEvent.press(matches[matches.length - 1]);
}

/** Lets the async draft load/save that screens start on mount finish inside act(). */
function settle() {
  return act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

beforeEach(() => {
  useClockStore.getState().setClock(new FixedClock(SEED_DAY));
  useCareDataStore.getState().hydrate(seedCareData(SEED_DAY));
  useSessionStore.getState().hydrate(null);
});

afterEach(async () => {
  jest.restoreAllMocks();
  await useDraftStore.getState().clearAppointmentDraft();
  await useDraftStore.getState().clearMedicationDraft();
});

describe('RootNavigator — signed out', () => {
  it('shows only the sign-in screen', () => {
    renderRoot();

    expect(screen.getByText('Continue with Email')).toBeTruthy();
    expect(navRef.getCurrentRoute()?.name).toBe('SignIn');
    expect(screen.queryByText('Today')).toBeNull();
  });

  it('does not let the medication or appointment forms be reached while signed out', () => {
    // React Navigation reports an unhandled action to the console in dev.
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    renderRoot();

    act(() => {
      navRef.navigate('AppointmentForm', {});
    });
    act(() => {
      navRef.navigate('MedicationForm', {});
    });

    expect(navRef.getCurrentRoute()?.name).toBe('SignIn');
    expect(screen.queryByText('Add Appointment')).toBeNull();
    expect(screen.queryByText('Add Medication')).toBeNull();
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe('RootNavigator — care recipient', () => {
  it('opens on the patient tabs with a label under every tab', async () => {
    signInAs('careRecipient');
    renderRoot();
    await settle();

    expect(navRef.getCurrentRoute()?.name).toBe('Today');
    expect(screen.getAllByText('Today').length).toBeGreaterThan(0);
    expect(screen.getByText('Medications')).toBeTruthy();
    expect(screen.getByText('Appointments')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.queryByText('Dashboard')).toBeNull();
  });

  it('opens the add-appointment and add-medication forms as modals', async () => {
    signInAs('careRecipient');
    renderRoot();
    await settle();

    act(() => {
      navRef.navigate('AppointmentForm', {});
    });
    await settle();
    expect(navRef.getCurrentRoute()?.name).toBe('AppointmentForm');
    expect(screen.getByText('Add Appointment')).toBeTruthy();

    act(() => {
      navRef.navigate('MedicationForm', {});
    });
    await settle();
    expect(navRef.getCurrentRoute()?.name).toBe('MedicationForm');
    expect(screen.getByText('Add Medication')).toBeTruthy();
  });

  it('returns to a tab first screen when its tab is pressed again', async () => {
    signInAs('careRecipient');
    renderRoot();
    await settle();

    pressTab('Medications');
    await settle();
    expect(navRef.getCurrentRoute()?.name).toBe('Medications');

    pressTab('Settings');
    await settle();
    expect(navRef.getCurrentRoute()?.name).toBe('Settings');

    // Re-tapping the focused tab keeps the user on its first screen.
    pressTab('Settings');
    await settle();
    expect(navRef.getCurrentRoute()?.name).toBe('Settings');

    pressTab('Medications');
    await settle();
    pressTab('Medications');
    await settle();
    expect(navRef.getCurrentRoute()?.name).toBe('Medications');
  });

  it('goes back to sign-in when the session ends', async () => {
    signInAs('careRecipient');
    renderRoot();
    await settle();
    expect(navRef.getCurrentRoute()?.name).toBe('Today');

    await act(async () => {
      useSessionStore.getState().hydrate(null);
    });

    await waitFor(() => expect(navRef.getCurrentRoute()?.name).toBe('SignIn'));
    expect(screen.getByText('Continue with Email')).toBeTruthy();
  });
});

describe('RootNavigator — caregiver', () => {
  it('opens on the caregiver tabs, not the care recipient tabs', async () => {
    signInAs('caregiver');
    renderRoot();
    await settle();

    expect(navRef.getCurrentRoute()?.name).toBe('Dashboard');
    expect(screen.getByText('Manage')).toBeTruthy();
    expect(screen.getByText('Activity')).toBeTruthy();
    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.queryByText('Appointments')).toBeNull();
  });

  it('returns to Manage and Settings first screens on a repeat tab press', async () => {
    signInAs('caregiver');
    renderRoot();
    await settle();

    pressTab('Manage');
    await settle();
    pressTab('Manage');
    await settle();
    expect(navRef.getCurrentRoute()?.name).toBe('Manage');

    pressTab('Settings');
    await settle();
    pressTab('Settings');
    await settle();
    expect(navRef.getCurrentRoute()?.name).toBe('Settings');

    pressTab('Activity');
    await settle();
    expect(navRef.getCurrentRoute()?.name).toBe('Activity');
  });
});

describe('deep-link map', () => {
  it('uses the careconnect scheme and maps the form routes', () => {
    expect(linking.prefixes).toEqual(['careconnect://app']);
    const screens = linking.config?.screens as Record<string, unknown>;
    expect(screens.SignIn).toBe(Routes.signIn);
    expect(screens.MedicationForm).toBe(Routes.newMedication);
    expect(screens.AppointmentForm).toBe(Routes.newAppointment);
    expect(Object.keys(screens)).toEqual(expect.arrayContaining(['PatientTabs', 'CaregiverTabs']));
  });
});
