/**
 * App Settings — profile, appearance, the demo clock and sign-out.
 *
 * Port of lib/features/settings/app_settings_screen.dart.
 */
import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert, Pressable, Text, View } from 'react-native';

import { CcAppBar, ChoiceGroup, ResponsiveBody, SectionHeading, showConfirmationSnackbar } from '../../core/components';
import { useTheme } from '../../core/theme/ThemeContext';
import { CcRadius, Space, TapTarget } from '../../core/theme/spacing';
import { kDemoInstant } from '../../core/utils/clock';
import { dateAndTime } from '../../core/utils/dateFormatting';
import { roleLabel } from '../../models/types';
import type { ThemeModePreference } from '../../models/types';
import type { SettingsStackParamList } from '../../navigation/types';
import { useCareDataStore } from '../../state/careDataStore';
import { useCaregiver, usePatient } from '../../state/selectors';
import { useSessionStore } from '../../state/sessionStore';
import { useSettingsStore } from '../../state/settingsStore';
import { SettingsSwitchRow } from './SettingsSwitchRow';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'AppSettings'>;

export const VERSION_LABEL = 'CareConnect 0.4.0 · Assignment 4 build (React Native port)';

const THEME_OPTIONS: { value: ThemeModePreference; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function AppSettingsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const session = useSessionStore((s) => s.session);
  const signOut = useSessionStore((s) => s.signOut);
  const settings = useSettingsStore((s) => s);
  const patient = usePatient();
  const caregiver = useCaregiver();
  const resetDemoData = useCareDataStore((s) => s.resetDemoData);

  const role = session?.role ?? 'careRecipient';
  const displayName = role === 'caregiver' ? caregiver.displayName : patient.displayName;
  const email = session?.email ?? (role === 'caregiver' ? 'renee@example.test' : patient.email);

  const demoClockDescription = `Freezes time at ${dateAndTime(kDemoInstant)} so every screen matches the Week 3 design.`;

  const setDemoClock = async (enabled: boolean) => {
    if (!enabled) {
      await settings.setDemoClock(false);
      return;
    }
    Alert.alert(
      'Turn on the demo clock?',
      `The clock freezes at ${dateAndTime(kDemoInstant)} and the sample data resets to the Week 3 design state. Your own changes are discarded.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Turn on',
          onPress: () => {
            void settings.setDemoClock(true).then(() => resetDemoData()).then(() => {
              showConfirmationSnackbar('Demo clock on. Sample data reset.');
            });
          },
        },
      ],
    );
  };

  const confirmResetSampleData = () => {
    Alert.alert(
      'Reset sample data?',
      'This puts the medications, appointments and activity back to the starting sample. Your own changes are discarded.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: () => {
            void resetDemoData().then(() => showConfirmationSnackbar('Sample data reset'));
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <CcAppBar title="App Settings" showBack onBack={() => navigation.goBack()} />
      <ResponsiveBody
        primary={[
          <SectionHeading key="profile-heading" level="h4">
            Profile
          </SectionHeading>,
          <View
            key="profile-card"
            style={{
              borderWidth: 1,
              borderRadius: CcRadius.md,
              padding: Space.md,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }}
          >
            <Text style={theme.text.titleMedium}>{displayName}</Text>
            <Text style={theme.text.bodyMedium}>{email}</Text>
            <View style={{ height: Space.xs }} />
            <Text style={[theme.text.bodyMedium, { color: theme.colors.textSecondary }]}>
              {`Signed in as ${roleLabel(role).toLowerCase()}`}
            </Text>
          </View>,
          <SectionHeading key="appearance-heading" level="h4">
            Appearance
          </SectionHeading>,
          <ChoiceGroup
            key="theme-mode"
            testID="theme-mode"
            groupLabel="Appearance"
            selected={settings.themeMode}
            onSelect={(value) => void settings.setThemeMode(value)}
            options={THEME_OPTIONS}
          />,
        ]}
        secondary={[
          <SectionHeading key="sample-heading" level="h4">
            Sample data
          </SectionHeading>,
          <SettingsSwitchRow
            key="demo-clock-card"
            testID="demo-clock"
            accessibilityLabel="Demo clock"
            accessibilityHint={demoClockDescription}
            value={settings.demoClock}
            onValueChange={(value) => void setDemoClock(value)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: TapTarget.dominantAction,
              borderWidth: 1,
              borderRadius: CcRadius.md,
              padding: Space.md,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }}
          >
            <Text style={theme.text.titleSmall}>Demo clock</Text>
            <Text style={[theme.text.bodyMedium, { color: theme.colors.textSecondary }]}>
              {demoClockDescription}
            </Text>
          </SettingsSwitchRow>,
          <View key="sp1" style={{ height: Space.sm }} />,
          <Pressable
            key="reset"
            testID="reset-sample-data"
            accessibilityRole="button"
            onPress={confirmResetSampleData}
            style={({ pressed }) => [
              {
                flexDirection: 'row' as const,
                minHeight: TapTarget.minimum,
                borderWidth: 1.5,
                borderColor: theme.primary,
                borderRadius: CcRadius.md,
                alignItems: 'center' as const,
                justifyContent: 'center' as const,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <MaterialIcons name="restart-alt" size={18} color={theme.primary} />
            <Text style={[theme.text.labelLarge, { color: theme.primary, marginLeft: Space.sm }]}>
              Reset sample data
            </Text>
          </Pressable>,
          <SectionHeading key="account-heading" level="h4">
            Account
          </SectionHeading>,
          <Pressable
            key="sign-out"
            testID="sign-out"
            accessibilityRole="button"
            onPress={() => void signOut()}
            style={({ pressed }) => [
              {
                flexDirection: 'row' as const,
                minHeight: TapTarget.minimum,
                borderWidth: 1.5,
                borderColor: theme.primary,
                borderRadius: CcRadius.md,
                alignItems: 'center' as const,
                justifyContent: 'center' as const,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <MaterialIcons name="logout" size={18} color={theme.primary} />
            <Text style={[theme.text.labelLarge, { color: theme.primary, marginLeft: Space.sm }]}>Sign out</Text>
          </Pressable>,
          <View key="sp2" style={{ height: Space.lg }} />,
          <Text key="version" style={[theme.text.bodyMedium, { color: theme.colors.textSecondary }]}>
            {VERSION_LABEL}
          </Text>,
        ]}
      />
    </View>
  );
}
