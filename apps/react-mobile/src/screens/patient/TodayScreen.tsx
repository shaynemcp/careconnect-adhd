/**
 * Screen 02 — Today (Home).
 *
 * One visually dominant next action. The orientation bar answers "what day
 * is it, what time is it, what's next" before anything else, and marking a
 * dose taken is two taps with a 10-second undo instead of a confirmation.
 *
 * Port of lib/features/patient/today_screen.dart.
 */
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

import {
  CallContactButton,
  CcAppBar,
  CcListItem,
  DoseCard,
  DoseStatusChip,
  EmptyState,
  OrientationBar,
  ResponsiveBody,
  SectionHeading,
  showUndoSnackbar,
} from '../../core/components';
import { Space } from '../../core/theme/spacing';
import { useTheme } from '../../core/theme/ThemeContext';
import { clockTime, nextSentence } from '../../core/utils/dateFormatting';
import { medicationById, medicationDisplayName } from '../../models/domain';
import type { DoseEvent, Medication } from '../../models/types';
import type { PatientTabParamList } from '../../navigation/types';
import { useCareDataStore } from '../../state/careDataStore';
import { useClockStore } from '../../state/clockStore';
import { useCaregiver, useLaterTodayDoses, useNextActionDose } from '../../state/selectors';

/** Shared by Today and the caregiver dashboard: log the dose, then offer undo. */
export async function markDoseTaken(dose: DoseEvent, medication: Medication): Promise<void> {
  const { markTaken, undoDoseChange } = useCareDataStore.getState();
  await markTaken(dose.id);
  const at = clockTime(useClockStore.getState().now);
  showUndoSnackbar({
    message: `${medication.name} logged at ${at}`,
    onUndo: () => undoDoseChange(dose.id),
  });
}

export function TodayScreen() {
  const theme = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<PatientTabParamList>>();
  const now = useClockStore((s) => s.now);
  const caregiver = useCaregiver();
  const nextDose = useNextActionDose();
  const later = useLaterTodayDoses();
  const data = useCareDataStore((s) => s.data);

  const nextMedication = nextDose == null ? undefined : medicationById(data, nextDose.medicationId);
  const nextLine =
    nextDose == null || nextMedication == null
      ? 'All of today’s doses are logged.'
      : nextSentence(nextMedication.name, nextDose.scheduledFor, now);

  const openMedication = (medicationId: string) => {
    navigation.navigate('MedicationsStack', { screen: 'MedicationDetail', params: { medicationId } });
  };

  const laterItems: React.ReactNode[] =
    later.length === 0
      ? [
          <Text key="none" style={theme.text.bodyMedium}>
            Nothing else is due later today.
          </Text>,
        ]
      : later
          .map((dose) => {
            const medication = medicationById(data, dose.medicationId);
            if (medication == null) return null;
            return (
              <CcListItem
                key={dose.id}
                title={medicationDisplayName(medication)}
                subtitle={`Due at ${clockTime(dose.scheduledFor)}`}
                semanticHint="Opens the medication"
                onPress={() => openMedication(medication.id)}
              />
            );
          })
          .filter((node): node is React.ReactElement => node != null);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <CcAppBar
        title="Today"
        actions={[
          <CallContactButton
            key="call"
            contactName={caregiver.displayName}
            relationship={caregiver.relationshipToPatient}
            phone={caregiver.phone}
          />,
        ]}
      />
      <ResponsiveBody
        primary={[
          <OrientationBar key="orientation" now={now} nextLine={nextLine} />,
          <View key="sp1" style={{ height: Space.md }} />,
          nextDose != null && nextMedication != null ? (
            <DoseCard
              key="dose-card"
              testID="today-dose-card"
              title={medicationDisplayName(nextMedication)}
              status={<DoseStatusChip dose={nextDose} now={now} />}
              instructions={nextMedication.instructions}
              actionLabel="Mark as Taken"
              onAction={() => void markDoseTaken(nextDose, nextMedication)}
            />
          ) : (
            <EmptyState
              key="empty"
              icon="check-circle"
              message="All of today’s doses are logged."
              detail="Nothing else is due today. Tomorrow’s first dose will appear here in the morning."
            />
          ),
        ]}
        secondary={[
          <SectionHeading key="heading" level="h4">
            Later today
          </SectionHeading>,
          ...laterItems,
        ]}
      />
    </View>
  );
}
