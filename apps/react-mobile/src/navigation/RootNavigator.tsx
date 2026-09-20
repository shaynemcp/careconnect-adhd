import React from 'react';
import type { LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AppointmentFormScreen } from '../screens/appointments/AppointmentFormScreen';
import { SignInScreen } from '../screens/auth/SignInScreen';
import { MedicationFormScreen } from '../screens/medications/MedicationFormScreen';
import { useSessionStore } from '../state/sessionStore';
import { CaregiverTabNavigator } from './CaregiverTabNavigator';
import { PatientTabNavigator } from './PatientTabNavigator';
import { Routes } from './routes';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Deep-link map, kept in step with `Routes` (routes.ts) and the Dart port's
 * `careconnect://app<path>` scheme. This is documentation/tests territory
 * rather than the live redirect guard — see redirects.ts — but a real
 * `Linking.openURL('careconnect://app/patient/medications')` does resolve
 * through this table.
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['careconnect://app'],
  config: {
    screens: {
      SignIn: Routes.signIn,
      PatientTabs: {
        screens: {
          Today: Routes.today,
          MedicationsStack: {
            screens: {
              Medications: Routes.medications,
              MedicationDetail: `${Routes.medications}/:medicationId`,
            },
          },
          Appointments: Routes.appointments,
          SettingsStack: {
            screens: {
              Settings: Routes.settings,
              Notifications: `${Routes.settings}/notifications`,
              CaregiverAccess: `${Routes.settings}/caregiver-access`,
              AppSettings: `${Routes.settings}/app`,
            },
          },
        },
      },
      CaregiverTabs: {
        screens: {
          Dashboard: Routes.dashboard,
          ManageStack: {
            screens: {
              Manage: Routes.manage,
              MedicationDetail: `${Routes.manage}/medications/:medicationId`,
            },
          },
          Activity: Routes.activity,
          SettingsStack: {
            screens: {
              Settings: Routes.caregiverSettings,
              Notifications: `${Routes.caregiverSettings}/notifications`,
              AppSettings: `${Routes.caregiverSettings}/app`,
            },
          },
        },
      },
      MedicationForm: Routes.newMedication,
      AppointmentForm: Routes.newAppointment,
    },
  },
};

/**
 * Root stack: swaps its whole tree on `session` rather than running a
 * URL-based redirect guard, which is how `resolveRedirect` (redirects.ts)
 * ends up documenting the policy instead of enforcing it directly — there
 * is no "current location" to redirect away from when signed out, because
 * the signed-out tree renders only `SignIn`.
 *
 * Port of lib/router/app_router.dart.
 */
export function RootNavigator() {
  const session = useSessionStore((s) => s.session);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {session == null ? (
        <Stack.Screen name="SignIn" component={SignInScreen} />
      ) : (
        <>
          {session.role === 'caregiver' ? (
            <Stack.Screen name="CaregiverTabs" component={CaregiverTabNavigator} />
          ) : (
            <Stack.Screen name="PatientTabs" component={PatientTabNavigator} />
          )}

          <Stack.Group screenOptions={{ presentation: 'modal', animation: 'slide_from_bottom' }}>
            <Stack.Screen name="MedicationForm" component={MedicationFormScreen} />
            <Stack.Screen name="AppointmentForm" component={AppointmentFormScreen} />
          </Stack.Group>
        </>
      )}
    </Stack.Navigator>
  );
}
