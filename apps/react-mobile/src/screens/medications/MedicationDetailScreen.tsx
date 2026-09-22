/**
 * Medication detail: schedule, instructions, today's doses with Mark as
 * taken / Skip (each with undo), Edit, and Delete behind a plain-language
 * confirmation dialog.
 *
 * Port of lib/features/patient/medication_detail_screen.dart. Shared by the
 * care-recipient Medications stack and the caregiver Manage stack, exactly
 * as the Dart `MedicationDetailScreen` is reused by both route trees.
 */
import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { markDoseTaken } from '../patient/TodayScreen';
import {
  CallContactButton,
  CcAppBar,
  DoseStatusChip,
  ResponsiveBody,
  SectionHeading,
  showConfirmationSnackbar,
  showUndoSnackbar,
} from '../../core/components';
import { useTheme } from '../../core/theme/ThemeContext';
import { CcRadius, Space, TapTarget } from '../../core/theme/spacing';
import { clockTime, localTimeLabel } from '../../core/utils/dateFormatting';
import { doseIsDue, medicationDisplayName } from '../../models/domain';
import type { DoseEvent, Medication } from '../../models/types';
import type { MedicationsStackParamList, ManageStackParamList } from '../../navigation/types';
import { useCareDataStore } from '../../state/careDataStore';
import { useClockStore } from '../../state/clockStore';
import { useCaregiver, useMedicationById, useTodayDoseEvents } from '../../state/selectors';

type ParamList = MedicationsStackParamList & ManageStackParamList;
type Nav = NativeStackNavigationProp<ParamList, 'MedicationDetail'>;
type Route = RouteProp<ParamList, 'MedicationDetail'>;

export function MedicationDetailScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { medicationId } = route.params;

  const medication = useMedicationById(medicationId);
  const caregiver = useCaregiver();
  const now = useClockStore((s) => s.now);
  const todayDoses = useTodayDoseEvents().filter((d) => d.medicationId === medicationId);
  const deleteMedication = useCareDataStore((s) => s.deleteMedication);

  if (medication == null || !medication.active) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <CcAppBar title="Medication" showBack onBack={() => navigation.goBack()} />
        <ResponsiveBody
          primary={[
            <Text key="gone" style={theme.text.bodyLarge}>
              This medication is no longer in your list.
            </Text>,
          ]}
        />
      </View>
    );
  }

  const scheduleText = medication.scheduleTimes.map(localTimeLabel).join(' and ');

  const confirmDelete = () => {
    Alert.alert(
      `Delete ${medication.name}?`,
      `This removes ${medication.name}, ${medication.dosage} from the medication list. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteMedication(medication.id).then(() => {
              showConfirmationSnackbar(`${medication.name} removed`);
              navigation.goBack();
            });
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <CcAppBar
        title={medicationDisplayName(medication)}
        showBack
        onBack={() => navigation.goBack()}
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
          <View
            key="schedule"
            style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <Text style={theme.text.bodyLarge}>
              {scheduleText.length === 0 ? 'No schedule set' : `Every day at ${scheduleText}`}
            </Text>
            {medication.instructions != null ? (
              <>
                <View style={{ height: Space.xs }} />
                <Text style={[theme.text.bodyMedium, { color: theme.colors.textSecondary }]}>
                  {medication.instructions}
                </Text>
              </>
            ) : null}
          </View>,
          <SectionHeading key="today-heading" level="h4">
            Today
          </SectionHeading>,
          ...(todayDoses.length === 0
            ? [
                <Text key="none" style={theme.text.bodyMedium}>
                  No doses scheduled today.
                </Text>,
              ]
            : todayDoses.map((dose) => (
                <DoseRow key={dose.id} dose={dose} medication={medication} now={now} />
              ))),
        ]}
        secondary={[
          <SectionHeading key="manage-heading" level="h4">
            Manage
          </SectionHeading>,
          <Pressable
            key="edit"
            testID="edit-medication"
            accessibilityRole="button"
            onPress={() =>
              navigation.getParent()?.getParent()?.navigate('MedicationForm', { editingId: medication.id })
            }
            style={({ pressed }) => [
              styles.outlinedButton,
              { borderColor: theme.primary, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <MaterialIcons name="edit" size={18} color={theme.primary} />
            <Text style={[theme.text.labelLarge, { color: theme.primary, marginLeft: Space.sm }]}>
              Edit medication
            </Text>
          </Pressable>,
          <View key="sp" style={{ height: Space.sm }} />,
          <Pressable
            key="delete"
            testID="delete-medication"
            accessibilityRole="button"
            onPress={confirmDelete}
            style={({ pressed }) => [styles.textButton, { opacity: pressed ? 0.7 : 1 }]}
          >
            <MaterialIcons name="delete-outline" size={18} color={theme.colors.error} />
            <Text style={[theme.text.labelLarge, { color: theme.colors.error, marginLeft: Space.sm }]}>
              Delete medication
            </Text>
          </Pressable>,
        ]}
      />
    </View>
  );
}

function DoseRow({ dose, medication, now }: { dose: DoseEvent; medication: Medication; now: Date }) {
  const theme = useTheme();
  const skipDose = useCareDataStore((s) => s.skipDose);
  const undoDoseChange = useCareDataStore((s) => s.undoDoseChange);

  const skip = () => {
    void skipDose(dose.id).then(() => {
      const at = clockTime(useClockStore.getState().now);
      showUndoSnackbar({
        message: `${medication.name} skipped at ${at}`,
        onUndo: () => undoDoseChange(dose.id),
      });
    });
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={theme.text.titleSmall}>{clockTime(dose.scheduledFor)} dose</Text>
      <View style={{ height: Space.xs }} />
      <DoseStatusChip dose={dose} now={now} />
      {doseIsDue(dose) ? (
        <View style={styles.actionRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void markDoseTaken(dose, medication)}
            style={({ pressed }) => [
              styles.filledButtonFlex,
              { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Text style={[theme.text.labelLarge, { color: theme.onPrimary }]}>Mark as taken</Text>
          </Pressable>
          <View style={{ width: Space.sm }} />
          <Pressable accessibilityRole="button" onPress={skip} style={styles.textButtonInline}>
            <Text style={[theme.text.labelLarge, { color: theme.primary }]}>Skip this dose</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: CcRadius.md,
    padding: Space.md,
  },
  outlinedButton: {
    flexDirection: 'row',
    minHeight: TapTarget.minimum,
    borderWidth: 1.5,
    borderRadius: CcRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textButton: {
    flexDirection: 'row',
    minHeight: TapTarget.minimum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textButtonInline: {
    minHeight: TapTarget.minimum,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Space.sm,
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: Space.sm + 4,
    alignItems: 'center',
  },
  filledButtonFlex: {
    flex: 1,
    minHeight: TapTarget.minimum,
    borderRadius: CcRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
