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
import { Switch, Text, View } from 'react-native';

import { CcAppBar, ChoiceGroup, ResponsiveBody, SectionHeading } from '../../core/components';
import { useTheme } from '../../core/theme/ThemeContext';
import { Space, TapTarget } from '../../core/theme/spacing';
import { OVERDUE_ALERTS_ALWAYS_ON, REMINDER_LEAD_TIMES, REMINDER_LEAD_TIME_VALUES } from '../../models/types';
import type { SettingsStackParamList } from '../../navigation/types';
import { useNotificationSettingsStore } from '../../state/notificationSettingsStore';

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
          /* Neither row below carries `accessible`/`accessibilityLabel`: that
             merges the row into one opaque node for TalkBack/VoiceOver, hiding
             the Switch from focus navigation entirely (careconnect-adhd#4). The
             label and state live on each Switch itself instead. */
          <View key="digest" testID="daily-digest" style={styles.switchRow}>
            <View style={{ flex: 1, marginRight: Space.md }}>
              <Text style={theme.text.titleSmall}>Daily digest</Text>
              <Text style={[theme.text.bodyMedium, { color: theme.colors.textSecondary }]}>
                One summary each morning of what is due today
              </Text>
            </View>
            <Switch
              testID="daily-digest-switch"
              value={settings.dailyDigest}
              onValueChange={(value) => void settings.setDailyDigest(value)}
              trackColor={{ true: theme.primary }}
              accessibilityRole="switch"
              accessibilityState={{ checked: settings.dailyDigest }}
              accessibilityLabel="Daily digest. One summary each morning of what is due today"
            />
          </View>,
          <View key="overdue" testID="overdue-alerts" style={styles.switchRow}>
            <View style={{ flex: 1, marginRight: Space.md }}>
              <Text style={theme.text.titleSmall}>Overdue alerts</Text>
              <Text style={[theme.text.bodyMedium, { color: theme.colors.textSecondary }]}>
                Always escalate immediately — never held for the digest
              </Text>
            </View>
            <Switch
              testID="overdue-alerts-switch"
              value={OVERDUE_ALERTS_ALWAYS_ON}
              disabled
              accessibilityRole="switch"
              accessibilityState={{ checked: OVERDUE_ALERTS_ALWAYS_ON, disabled: true }}
              accessibilityLabel="Overdue alerts. Always escalate immediately, never held for the digest. Always on"
            />
          </View>,
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
