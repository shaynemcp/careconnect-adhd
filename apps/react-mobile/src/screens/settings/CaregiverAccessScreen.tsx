/**
 * Screen 05 — My Caregiver Access.
 *
 * Exactly what the caregiver can see, as a closed list. Nothing outside it
 * is ever shared, and the care recipient can pause sharing here.
 *
 * Port of lib/features/settings/caregiver_access_screen.dart.
 */
import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Switch, Text, View } from 'react-native';

import { CallContactButton, CcAppBar, ResponsiveBody, SectionHeading } from '../../core/components';
import { useTheme } from '../../core/theme/ThemeContext';
import { CcRadius, Space, TapTarget } from '../../core/theme/spacing';
import type { SettingsStackParamList } from '../../navigation/types';
import { useCaregiver } from '../../state/selectors';
import { useSettingsStore } from '../../state/settingsStore';

type Nav = NativeStackNavigationProp<SettingsStackParamList, 'CaregiverAccess'>;

const VISIBLE_TO_CAREGIVER = [
  'Medication names, doses, and status',
  'Appointment times and locations',
  'Whether a dose was taken, skipped, or missed',
  'Recent activity timeline',
];

export function CaregiverAccessScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const caregiver = useCaregiver();
  const sharing = useSettingsStore((s) => s.shareWithCaregiver);
  const setShareWithCaregiver = useSettingsStore((s) => s.setShareWithCaregiver);
  const name = caregiver.displayName;

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <CcAppBar
        title="My Caregiver Access"
        showBack
        onBack={() => navigation.goBack()}
        actions={[
          <CallContactButton
            key="call"
            contactName={name}
            relationship={caregiver.relationshipToPatient}
            phone={caregiver.phone}
          />,
        ]}
      />
      <ResponsiveBody
        primary={[
          <View
            key="card"
            style={{
              borderWidth: 1,
              borderRadius: CcRadius.md,
              padding: Space.md,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            }}
          >
            <Text style={theme.text.titleSmall}>
              {name} — {caregiver.relationshipToPatient}
            </Text>
          </View>,
          <SectionHeading key="heading" level="h4">
            {`What ${name} can see`}
          </SectionHeading>,
          ...VISIBLE_TO_CAREGIVER.map((item) => (
            <View key={item} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingVertical: Space.xs }}>
              <MaterialIcons
                name="check-circle"
                size={18}
                color={theme.colors.success}
                style={{ marginTop: 3 }}
                accessibilityLabel="Shared"
              />
              <Text style={[theme.text.bodyMedium, { flex: 1, marginLeft: Space.sm }]}>{item}</Text>
            </View>
          )),
          <View key="sp" style={{ height: Space.sm }} />,
          <Text key="closed" style={[theme.text.bodyMedium, { color: theme.colors.textSecondary }]}>
            {`Nothing outside this list is ever visible to ${name}. This is the only data caregivers can see.`}
          </Text>,
        ]}
        secondary={[
          <SectionHeading key="sharing-heading" level="h4">
            Sharing
          </SectionHeading>,
          <View
            key="sharing-card"
            testID="share-with-caregiver"
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
            {/* No `accessible`/`accessibilityLabel` on this row: that merges its
                subtree into one opaque node for TalkBack/VoiceOver, hiding the
                Switch below from focus navigation entirely (careconnect-adhd#4).
                The label and state live on the Switch itself instead, so it stays
                individually reachable. */}
            <View style={{ flex: 1, marginRight: Space.md }}>
              <Text style={theme.text.titleSmall}>{`Share with ${name}`}</Text>
              <Text style={[theme.text.bodyMedium, { color: theme.colors.textSecondary }]}>
                {sharing
                  ? `Sharing is on. ${name} sees the list above.`
                  : `Sharing is paused. ${name} sees nothing until you turn it back on.`}
              </Text>
            </View>
            <Switch
              testID="share-with-caregiver-switch"
              value={sharing}
              onValueChange={(value) => void setShareWithCaregiver(value)}
              trackColor={{ true: theme.primary }}
              accessibilityRole="switch"
              accessibilityState={{ checked: sharing }}
              accessibilityLabel={`Share with ${name}. ${
                sharing
                  ? `Sharing is on. ${name} sees the list above.`
                  : `Sharing is paused. ${name} sees nothing until you turn it back on.`
              }`}
            />
          </View>,
        ]}
      />
    </View>
  );
}
