/**
 * Screen 08 — Manage Appointments (2 steps): what & where, then date/time
 * & companion.
 *
 * Port of lib/features/appointments/appointment_form_screen.dart.
 */
import React, { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  AutosaveIndicator,
  CcAppBar,
  CcTextField,
  ResponsiveBody,
  StepIndicator,
  showConfirmationSnackbar,
} from '../../core/components';
import { useTheme } from '../../core/theme/ThemeContext';
import { Breakpoints, CcRadius, Space, TapTarget } from '../../core/theme/spacing';
import { dateAndTime } from '../../core/utils/dateFormatting';
import { APPOINTMENT_DRAFT_TOTAL_STEPS } from '../../models/types';
import type { RootStackParamList } from '../../navigation/types';
import { useCareDataStore } from '../../state/careDataStore';
import { useDraftStore } from '../../state/draftStore';
import { useAppointmentById } from '../../state/selectors';

type Props = NativeStackScreenProps<RootStackParamList, 'AppointmentForm'>;
type Nav = NativeStackNavigationProp<RootStackParamList, 'AppointmentForm'>;

const STEP_TITLES = ['What & where', 'Date, time & companion'];
const STEP_SUBTITLES = [
  'What the appointment is and where it is',
  'When it is and who is coming along',
];

export function AppointmentFormScreen() {
  const theme = useTheme();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Props['route']>();
  const editingId = route.params?.editingId;

  const draft = useDraftStore((s) => s.appointmentDraft);
  const autosave = useDraftStore((s) => s.appointmentAutosave);
  const updateDraft = useDraftStore((s) => s.updateAppointmentDraft);
  const startNew = useDraftStore((s) => s.startNewAppointmentDraft);
  const startEditing = useDraftStore((s) => s.startEditingAppointmentDraft);
  const clearDraft = useDraftStore((s) => s.clearAppointmentDraft);
  const addAppointment = useCareDataStore((s) => s.addAppointment);
  const updateAppointment = useCareDataStore((s) => s.updateAppointment);
  const deleteAppointment = useCareDataStore((s) => s.deleteAppointment);
  const existingAppointment = useAppointmentById(editingId ?? '');

  const [titleError, setTitleError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [whenError, setWhenError] = useState<string | null>(null);
  const [pickerStage, setPickerStage] = useState<'date' | 'time' | null>(null);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);

  useEffect(() => {
    if (editingId == null) {
      void startNew();
    } else if (existingAppointment != null) {
      void startEditing(existingAppointment);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  if (editingId != null && existingAppointment == null) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <CcAppBar title="Appointment" showBack onBack={() => navigation.goBack()} />
        <ResponsiveBody
          primary={[
            <Text key="gone" style={theme.text.bodyLarge}>
              This appointment is no longer in your list.
            </Text>,
          ]}
        />
      </View>
    );
  }

  const step = Math.min(Math.max(draft.step, 1), APPOINTMENT_DRAFT_TOTAL_STEPS);
  const isLast = step === APPOINTMENT_DRAFT_TOTAL_STEPS;
  const isEditing = draft.editingId != null;
  const whenText = draft.startsAt == null ? '' : dateAndTime(draft.startsAt);

  const validateStep = (): boolean => {
    let nextTitleError: string | null = null;
    let nextLocationError: string | null = null;
    let nextWhenError: string | null = null;
    if (step === 1) {
      if (draft.title.trim().length === 0) {
        nextTitleError = 'Enter what the appointment is, like Dentist — cleaning';
      }
      if (draft.locationName.trim().length === 0) {
        nextLocationError = 'Enter where it is, like Regional Medical';
      }
    } else if (draft.startsAt == null) {
      nextWhenError = 'Choose the date and time';
    }
    setTitleError(nextTitleError);
    setLocationError(nextLocationError);
    setWhenError(nextWhenError);
    return nextTitleError == null && nextLocationError == null && nextWhenError == null;
  };

  const goBack = () => {
    if (draft.step > 1) {
      updateDraft((d) => ({ ...d, step: d.step - 1 }));
    } else {
      navigation.goBack();
    }
  };

  const save = async () => {
    const companion = draft.companionName.trim();
    if (existingAppointment != null) {
      await updateAppointment({
        ...existingAppointment,
        title: draft.title.trim(),
        locationName: draft.locationName.trim(),
        startsAt: draft.startsAt ?? existingAppointment.startsAt,
        companionName: companion.length === 0 ? null : companion,
      });
    } else if (draft.startsAt != null) {
      await addAppointment({
        title: draft.title,
        locationName: draft.locationName,
        startsAt: draft.startsAt,
        companionName: companion,
      });
    }
    await clearDraft();
    showConfirmationSnackbar(existingAppointment != null ? 'Appointment updated' : 'Appointment added');
    navigation.goBack();
  };

  const continueStep = () => {
    if (!validateStep()) return;
    if (draft.step < APPOINTMENT_DRAFT_TOTAL_STEPS) {
      updateDraft((d) => ({ ...d, step: d.step + 1 }));
      return;
    }
    void save();
  };

  const confirmDelete = () => {
    const id = draft.editingId;
    if (id == null) return;
    Alert.alert(
      'Delete this appointment?',
      `This removes ${draft.title.trim()} from the list. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void deleteAppointment(id)
              .then(() => clearDraft())
              .then(() => {
                showConfirmationSnackbar('Appointment removed');
                navigation.goBack();
              });
          },
        },
      ],
    );
  };

  const openDatePicker = () => {
    setPendingDate(draft.startsAt ?? new Date());
    setPickerStage('date');
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <CcAppBar title={isEditing ? 'Edit Appointment' : 'Add Appointment'} showBack onBack={goBack} />
      <ScrollView contentContainerStyle={styles.scrollWrap}>
        <View style={[styles.form, { maxWidth: Breakpoints.formMaxWidth }]}>
          <StepIndicator
            step={step}
            totalSteps={APPOINTMENT_DRAFT_TOTAL_STEPS}
            title={STEP_TITLES[step - 1]}
            subtitle={STEP_SUBTITLES[step - 1]}
          />
          <View style={{ height: Space.md }} />

          {step === 1 ? (
            <>
              <CcTextField
                testID="appointment-title"
                label="Appointment"
                value={draft.title}
                placeholder="Dr. Alvarez — Cardiology follow-up"
                errorText={titleError}
                returnKeyType="next"
                onChangeText={(value) => {
                  if (titleError != null) setTitleError(null);
                  updateDraft((d) => ({ ...d, title: value }));
                }}
              />
              <View style={{ height: Space.md }} />
              <CcTextField
                testID="appointment-location"
                label="Where"
                value={draft.locationName}
                placeholder="Regional Medical"
                errorText={locationError}
                returnKeyType="done"
                onChangeText={(value) => {
                  if (locationError != null) setLocationError(null);
                  updateDraft((d) => ({ ...d, locationName: value }));
                }}
              />
            </>
          ) : (
            <>
              <CcTextField
                testID="appointment-when"
                label="Date & time"
                value={whenText}
                placeholder="Choose the date and time"
                errorText={whenError}
                readOnly
                onPress={openDatePicker}
              />
              <View style={{ height: Space.md }} />
              <CcTextField
                testID="appointment-companion"
                label="Who is taking me"
                value={draft.companionName}
                placeholder="Renee — leave blank if going alone"
                returnKeyType="done"
                onChangeText={(value) => updateDraft((d) => ({ ...d, companionName: value }))}
              />
            </>
          )}

          {pickerStage === 'date' && pendingDate != null ? (
            <DateTimePicker
              value={pendingDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selected) => {
                if (event.type === 'dismissed' || selected == null) {
                  setPickerStage(null);
                  return;
                }
                setPendingDate(selected);
                setPickerStage('time');
              }}
            />
          ) : null}
          {pickerStage === 'time' && pendingDate != null ? (
            <DateTimePicker
              value={pendingDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selected) => {
                setPickerStage(null);
                if (event.type === 'dismissed' || selected == null) return;
                const combined = new Date(
                  pendingDate.getFullYear(),
                  pendingDate.getMonth(),
                  pendingDate.getDate(),
                  selected.getHours(),
                  selected.getMinutes(),
                );
                updateDraft((d) => ({ ...d, startsAt: combined }));
                setWhenError(null);
              }}
            />
          ) : null}

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
                {!isLast ? 'Continue' : isEditing ? 'Save changes' : 'Save appointment'}
              </Text>
            </Pressable>
          </View>

          {isEditing ? (
            <>
              <View style={{ height: Space.lg }} />
              <Pressable
                testID="delete-appointment"
                accessibilityRole="button"
                onPress={confirmDelete}
                style={({ pressed }) => [styles.textButtonRow, { opacity: pressed ? 0.7 : 1 }]}
              >
                <MaterialIcons name="delete-outline" size={18} color={theme.colors.error} />
                <Text style={[theme.text.labelLarge, { color: theme.colors.error, marginLeft: Space.sm }]}>
                  Delete appointment
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollWrap: { flexGrow: 1, alignItems: 'center', padding: Space.md },
  form: { width: '100%' },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  textButton: {
    minHeight: TapTarget.minimum,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Space.sm,
  },
  textButtonRow: {
    flexDirection: 'row',
    minHeight: TapTarget.minimum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledButtonFlex: {
    flex: 1,
    minHeight: TapTarget.minimum + 4,
    borderRadius: CcRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
