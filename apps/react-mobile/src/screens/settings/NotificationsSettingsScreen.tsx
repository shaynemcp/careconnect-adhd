/**
 * Screen 09 — Notifications Settings.
 *
 * The user controls the digest and how far ahead reminders fire. Overdue
 * alerts are shown as an always-on control with the reason, rather than
 * hidden, so nothing about the app's behaviour is a surprise.
 *
 * Port of lib/features/settings/notifications_settings_screen.dart.
 */
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Text, View } from 'react-native';

import { CcAppBar, ChoiceGroup, ResponsiveBody, SectionHeading } from '../../core/components';
import { useTheme } from '../../core/theme/ThemeContext';
import { Space, TapTarget } from '../../core/theme/spacing';
import { OVERDUE_ALERTS_ALWAYS_ON, REMINDER_LEAD_TIMES, REMINDER_LEAD_TIME_VALUES } from '../../models/types';
import type { SettingsStackParamList } from '../../navigation/types';
import { useNotificationSettingsStore } from '../../state/notificationSettingsStore';
import { SettingsSwitchRow } from './SettingsSwitchRow';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'Notifications'>;

export function NotificationsSettingsScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const settings = useNotificationSettingsStore((s) => s);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <CcAppBar title="Notifications" showBack onBack={() => navigation.goBack()} />
      <ResponsiveBody
        primary={[
          <SettingsSwitchRow
            key="digest"
            testID="daily-digest"
            accessibilityLabel="Daily digest"
            accessibilityHint="One summary each morning of what is due today"
            value={settings.dailyDigest}
            onValueChange={(value) => void settings.setDailyDigest(value)}
            style={styles.switchRow}
          >
            <Text style={theme.text.titleSmall}>Daily digest</Text>
            <Text style={[theme.text.bodyMedium, { color: theme.colors.textSecondary }]}>
              One summary each morning of what is due today
            </Text>
          </SettingsSwitchRow>,
          <SettingsSwitchRow
            key="overdue"
            testID="overdue-alerts"
            accessibilityLabel="Overdue alerts, always on"
            accessibilityHint="Always escalate immediately, never held for the digest"
            value={OVERDUE_ALERTS_ALWAYS_ON}
            disabled
            style={styles.switchRow}
          >
            <Text style={theme.text.titleSmall}>Overdue alerts</Text>
            <Text style={[theme.text.bodyMedium, { color: theme.colors.textSecondary }]}>
              Always escalate immediately — never held for the digest
            </Text>
          </SettingsSwitchRow>,
        ]}
        secondary={[
          <SectionHeading key="heading">Reminder lead time</SectionHeading>,
          <View key="sp" style={{ height: Space.xs }} />,
          <ChoiceGroup
            key="lead-time"
            groupLabel="Reminder lead time"
            circular
            selected={settings.leadTime}
            onSelect={(value) => void settings.setLeadTime(value)}
            options={REMINDER_LEAD_TIME_VALUES.map((lead) => ({
              value: lead,
              label: REMINDER_LEAD_TIMES[lead].label,
              spoken: REMINDER_LEAD_TIMES[lead].spoken,
            }))}
          />,
        ]}
      />
    </View>
  );
}

const styles = {
  switchRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    minHeight: TapTarget.dominantAction,
    paddingVertical: Space.sm,
  },
};
