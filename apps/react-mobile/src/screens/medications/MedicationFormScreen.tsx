/**
 * Screens 07 — Manage Medications (3 steps): details, schedule, review.
 *
 * The draft autosaves on every change and is restored when the form
 * reopens, so leaving mid-way never costs progress.
 *
 * Port of lib/features/medications/medication_form_screen.dart.
 */
import React, { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AccessibilityInfo, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AutosaveIndicator,
  CcAppBar,
  CcTextField,
  StepIndicator,
  showConfirmationSnackbar,
} from '../../core/components';
import { useTheme } from '../../core/theme/ThemeContext';
import { Breakpoints, CcRadius, Space, TapTarget } from '../../core/theme/spacing';
import { localTimeLabel, toLocalTime } from '../../core/utils/dateFormatting';
import { MEDICATION_FORM_ERRORS } from '../../data/announcements';
import { MEDICATION_DRAFT_TOTAL_STEPS } from '../../models/types';
import type { RootStackParamList } from '../../navigation/types';
import { useCareDataStore } from '../../state/careDataStore';
import { useDraftStore } from '../../state/draftStore';
import { useMedicationById } from '../../state/selectors';

type Props = NativeStackScreenProps<RootStackParamList, 'MedicationForm'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'MedicationForm'>;

const STEP_TITLES = ['Medication details', 'Schedule', 'Review'];
const STEP_SUBTITLES = [
  'Add medication details',
  'When each dose is due',
  'Check everything before saving',
];

export function MedicationFormScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Props['route']>();
  const editingId = route.params?.editingId;

  const draft = useDraftStore((s) => s.medicationDraft);
  const autosave = useDraftStore((s) => s.medicationAutosave);
  const updateDraft = useDraftStore((s) => s.updateMedicationDraft);
  const startNew = useDraftStore((s) => s.startNewMedicationDraft);
  const startEditing = useDraftStore((s) => s.startEditingMedicationDraft);
  const clearDraft = useDraftStore((s) => s.clearMedicationDraft);
  const addMedication = useCareDataStore((s) => s.addMedication);
  const updateMedication = useCareDataStore((s) => s.updateMedication);
  const existingMedication = useMedicationById(editingId ?? '');

  const [nameError, setNameError] = useState<string | null>(null);
  const [dosageError, setDosageError] = useState<string | null>(null);
  const [timesError, setTimesError] = useState<string | null>(null);
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (editingId == null) {
      void startNew();
    } else if (existingMedication != null) {
      void startEditing(existingMedication);
    }
    // Only re-run if the target medication identity actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  // The times error isn't a CcTextField, so it announces itself on iOS the
  // same way (Android reads it through its live region). SC 4.1.3.
  useEffect(() => {
    if (timesError == null || Platform.OS !== 'ios') return;
    AccessibilityInfo.announceForAccessibilityWithOptions(timesError, { queue: true });
  }, [timesError]);

  const step = Math.min(Math.max(draft.step, 1), MEDICATION_DRAFT_TOTAL_STEPS);
  const isLast = step === MEDICATION_DRAFT_TOTAL_STEPS;
  const isEditing = draft.editingId != null;

  const validateStep = (): boolean => {
    let nextNameError: string | null = null;
    let nextDosageError: string | null = null;
    let nextTimesError: string | null = null;
    if (step === 1) {
      if (draft.name.trim().length === 0) {
        nextNameError = MEDICATION_FORM_ERRORS.name;
      }
      if (draft.dosage.trim().length === 0) {
        nextDosageError = MEDICATION_FORM_ERRORS.dosage;
      }
    } else if (step === 2 && draft.scheduleTimes.length === 0) {
      nextTimesError = MEDICATION_FORM_ERRORS.scheduleTimes;
    }
    setNameError(nextNameError);
    setDosageError(nextDosageError);
    setTimesError(nextTimesError);
    return nextNameError == null && nextDosageError == null && nextTimesError == null;
  };

  const goBack = () => {
    if (draft.step > 1) {
      updateDraft((d) => ({ ...d, step: d.step - 1 }));
    } else {
      navigation.goBack();
    }
  };

  const save = async () => {
    const trimmedInstructions = draft.instructions.trim();
    if (existingMedication != null) {
      await updateMedication({
        ...existingMedication,
        name: draft.name.trim(),
        dosage: draft.dosage.trim(),
        scheduleTimes: draft.scheduleTimes,
        instructions: trimmedInstructions.length === 0 ? null : trimmedInstructions,
      });
    } else {
      await addMedication({
        name: draft.name,
        dosage: draft.dosage,
        scheduleTimes: draft.scheduleTimes,
        instructions: draft.instructions,
      });
    }
    await clearDraft();
    showConfirmationSnackbar(
      existingMedication != null ? `${draft.name.trim()} updated` : `${draft.name.trim()} added`,
    );
    navigation.goBack();
  };

  const continueStep = () => {
    if (!validateStep()) return;
    if (draft.step < MEDICATION_DRAFT_TOTAL_STEPS) {
      updateDraft((d) => ({ ...d, step: d.step + 1 }));
      return;
    }
    void save();
  };

  const addTime = (hour: number, minute: number) => {
    const value = toLocalTime({ hour, minute });
    updateDraft((d) =>
      d.scheduleTimes.includes(value)
        ? d
        : { ...d, scheduleTimes: [...d.scheduleTimes, value].sort() },
    );
    setTimesError(null);
  };

  const removeTime = (time: string) => {
    updateDraft((d) => ({ ...d, scheduleTimes: d.scheduleTimes.filter((t) => t !== time) }));
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <CcAppBar title={isEditing ? 'Edit Medication' : 'Add Medication'} showBack onBack={goBack} />
      <ScrollView contentContainerStyle={styles.scrollWrap}>
        <View style={[styles.form, { maxWidth: Breakpoints.formMaxWidth }]}>
          <StepIndicator
            step={step}
            totalSteps={MEDICATION_DRAFT_TOTAL_STEPS}
            title={STEP_TITLES[step - 1]}
            subtitle={STEP_SUBTITLES[step - 1]}
          />
          <View style={{ height: Space.md }} />

          {step === 1 ? (
            <>
              <CcTextField
                testID="medication-name"
                label="Medication name"
                value={draft.name}
                placeholder="Metformin"
                errorText={nameError}
                returnKeyType="next"
                onChangeText={(value) => {
                  if (nameError != null) setNameError(null);
                  updateDraft((d) => ({ ...d, name: value }));
                }}
              />
              <View style={{ height: Space.md }} />
              <CcTextField
                testID="medication-dosage"
                label="Dosage"
                value={draft.dosage}
                placeholder="25 mg"
                errorText={dosageError}
                returnKeyType="done"
                onChangeText={(value) => {
                  if (dosageError != null) setDosageError(null);
                  updateDraft((d) => ({ ...d, dosage: value }));
                }}
              />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <Text style={theme.text.titleSmall}>Times each day</Text>
              <View style={{ height: Space.sm }} />
              {draft.scheduleTimes.length === 0 ? (
                <Text style={[theme.text.bodyMedium, { color: theme.colors.textSecondary }]}>
                  No times yet.
                </Text>
              ) : null}
              {draft.scheduleTimes.map((time) => (
                <View
                  key={time}
                  testID={`time-${time}`}
                  style={[
                    styles.timeRow,
                    { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
                  ]}
                >
                  <MaterialIcons name="schedule" size={20} color={theme.colors.textSecondary} />
                  <Text style={[theme.text.bodyLarge, styles.timeLabel]}>{localTimeLabel(time)}</Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${localTimeLabel(time)}`}
                    onPress={() => removeTime(time)}
                    style={styles.iconButton}
                  >
                    <MaterialIcons name="close" size={20} color={theme.colors.textSecondary} />
                  </Pressable>
                </View>
              ))}
              {timesError != null ? (
                <Text
                  accessibilityLiveRegion="polite"
                  style={[theme.text.bodyMedium, { color: theme.colors.error, marginTop: Space.sm, fontWeight: '600' }]}
                >
                  {timesError}
                </Text>
              ) : null}
              <View style={{ height: Space.sm }} />
              <Pressable
                testID="add-time"
                accessibilityRole="button"
                onPress={() => setShowTimePicker(true)}
                style={({ pressed }) => [
                  styles.outlinedButton,
                  { borderColor: theme.primary, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <MaterialIcons name="add-alarm" size={18} color={theme.primary} />
                <Text style={[theme.text.labelLarge, { color: theme.primary, marginLeft: Space.sm }]}>
                  Add a time
                </Text>
              </Pressable>
              {showTimePicker ? (
                <DateTimePicker
                  value={new Date(2000, 0, 1, 8, 0)}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, selected) => {
                    if (Platform.OS === 'android') setShowTimePicker(false);
                    if (event.type === 'dismissed' || selected == null) return;
                    addTime(selected.getHours(), selected.getMinutes());
                  }}
                />
              ) : null}
              <View style={{ height: Space.md }} />
              <CcTextField
                testID="medication-instructions"
                label="Instructions (optional)"
                value={draft.instructions}
                placeholder="Take with food"
                onChangeText={(value) => updateDraft((d) => ({ ...d, instructions: value }))}
              />
            </>
          ) : null}

          {step === 3 ? <ReviewCard draft={draft} /> : null}

          <View style={{ height: Space.sm }} />
          <AutosaveIndicator status={autosave} />
          <View style={{ height: Space.lg }} />
          <View style={styles.footerRow}>
            <Pressable testID="form-back" accessibilityRole="button" onPress={goBack} style={styles.textButton}>
              <Text style={[theme.text.labelLarge, { color: theme.primary }]}>Back</Text>
            </Pressable>
            <View style={{ width: Space.md }} />
            <Pressable
              testID="form-continue"
              accessibilityRole="button"
              onPress={continueStep}
              style={({ pressed }) => [
                styles.filledButtonFlex,
                { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={[theme.text.labelLarge, { color: theme.onPrimary }]}>
                {!isLast ? 'Continue' : isEditing ? 'Save changes' : 'Save medication'}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function ReviewCard({
  draft,
}: {
  draft: { name: string; dosage: string; scheduleTimes: string[]; instructions: string };
}) {
  const theme = useTheme();
  const times = draft.scheduleTimes.map(localTimeLabel).join(', ');
  const row = (label: string, value: string) => (
    <View key={label} style={styles.reviewRow}>
      <Text style={[theme.text.titleSmall, styles.reviewLabel]}>{label}</Text>
      <Text style={[theme.text.bodyMedium, { flex: 1 }]}>{value}</Text>
    </View>
  );
  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      {row('Name', draft.name.trim())}
      {row('Dosage', draft.dosage.trim())}
      {row('Times', times.length === 0 ? '—' : times)}
      {row('Instructions', draft.instructions.trim().length === 0 ? 'None' : draft.instructions.trim())}
    </View>
  );
}

const styles = StyleSheet.create({
  scrollWrap: { flex: 1, alignItems: 'center', padding: Space.md },
  form: { width: '100%' },
  card: {
    borderWidth: 1,
    borderRadius: CcRadius.md,
    padding: Space.md,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: CcRadius.md,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    marginBottom: Space.sm,
  },
  timeLabel: { flex: 1, marginLeft: Space.sm },
  // Real layout size, not hitSlop: icon buttons are 48x48, above the team's
  // 44 floor (SC 2.5.8 is 24x24). The negative margins let the target fill
  // the row's padding instead of making every time row taller.
  iconButton: {
    width: TapTarget.icon,
    height: TapTarget.icon,
    marginVertical: -Space.sm,
    marginRight: -Space.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlinedButton: {
    flexDirection: 'row',
    minHeight: TapTarget.minimum,
    borderWidth: 1.5,
    borderRadius: CcRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  textButton: {
    minHeight: TapTarget.minimum,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Space.sm,
  },
  filledButtonFlex: {
    flex: 1,
    minHeight: TapTarget.minimum + 4,
    borderRadius: CcRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewRow: { flexDirection: 'row', paddingVertical: Space.xs, alignItems: 'flex-start' },
  reviewLabel: { width: 110 },
});
