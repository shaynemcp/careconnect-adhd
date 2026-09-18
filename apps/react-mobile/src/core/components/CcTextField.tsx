import React, { useEffect } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { KeyboardTypeOptions, ReturnKeyTypeOptions } from 'react-native';

import { READ_ONLY_PICKER_HINT, fieldErrorAnnouncement } from '../../data/announcements';
import { useTheme } from '../theme/ThemeContext';
import { CcRadius, Space } from '../theme/spacing';
import { bodyEmphasis } from '../theme/typography';

export interface CcTextFieldProps {
  label: string;
  value: string;
  onChangeText?: (value: string) => void;
  placeholder?: string;
  errorText?: string | null;
  keyboardType?: KeyboardTypeOptions;
  returnKeyType?: ReturnKeyTypeOptions;
  autoComplete?: 'email' | 'off';
  onSubmitEditing?: () => void;
  /** Read-only field that opens a picker on tap (date & time). */
  readOnly?: boolean;
  onPress?: () => void;
  multiline?: boolean;
  testID?: string;
}

/**
 * Labelled text field: label always visible above the value, error text in
 * plain language below it, both merged into the field's accessible name.
 *
 * Errors say exactly what is wrong and how to fix it ("Enter the dose, like
 * 25 mg") rather than "Required field" alone. A new error is announced once
 * (WCAG SC 4.1.3): Android through the error text's live region, iOS through
 * `announceForAccessibility`, since iOS ignores `accessibilityLiveRegion`.
 *
 * A read-only field is a single button whose name carries the label and the
 * current value, so it is never announced as just "button" (SC 4.1.2).
 *
 * Port of lib/core/widgets/cc_text_field.dart.
 */
export function CcTextField({
  label,
  value,
  onChangeText,
  placeholder,
  errorText,
  keyboardType,
  returnKeyType,
  autoComplete,
  onSubmitEditing,
  readOnly = false,
  onPress,
  multiline = false,
  testID,
}: CcTextFieldProps) {
  const theme = useTheme();
  const borderColor = errorText ? theme.colors.error : theme.colors.border;
  const accessibleLabel = errorText ? `${label}. ${errorText}` : label;
  // With nothing chosen, an error already says what to do, and it often
  // repeats the placeholder, so the placeholder is left out of the name then.
  const shownValue = value.length > 0 ? value : errorText ? undefined : placeholder;
  const pickerLabel = [label, shownValue, errorText].filter(Boolean).join('. ');

  // Fires when an error appears or changes, never on an unrelated re-render.
  useEffect(() => {
    if (!errorText || Platform.OS !== 'ios') return;
    AccessibilityInfo.announceForAccessibilityWithOptions(fieldErrorAnnouncement(label, errorText), {
      queue: true,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errorText]);

  const opensPicker = readOnly && onPress != null;

  const field = (
    <View
      // In the picker variant the Pressable below speaks for the field, so the
      // TextInput inside isn't a second focus stop on TalkBack.
      accessibilityElementsHidden={opensPicker}
      importantForAccessibility={opensPicker ? 'no-hide-descendants' : 'auto'}
      style={[
        styles.inputWrapper,
        { borderColor, backgroundColor: theme.colors.background },
        multiline ? styles.multilineWrapper : null,
      ]}
    >
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textSecondary}
        editable={!readOnly}
        pointerEvents={readOnly ? 'none' : 'auto'}
        keyboardType={keyboardType}
        returnKeyType={returnKeyType}
        autoComplete={autoComplete === 'email' ? 'email' : 'off'}
        textContentType={autoComplete === 'email' ? 'emailAddress' : undefined}
        onSubmitEditing={onSubmitEditing}
        multiline={multiline}
        style={[theme.text.bodyMedium, styles.input]}
        accessibilityLabel={accessibleLabel}
      />
      {opensPicker ? (
        <MaterialIcons name="edit-calendar" size={20} color={theme.colors.textSecondary} />
      ) : null}
    </View>
  );

  return (
    <View>
      <Text style={bodyEmphasis(theme.colors.textPrimary)}>{label}</Text>
      <View style={styles.spacer} />
      {opensPicker ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={pickerLabel}
          accessibilityHint={READ_ONLY_PICKER_HINT}
        >
          {field}
        </Pressable>
      ) : (
        field
      )}
      {errorText ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[theme.text.bodyMedium, styles.error, { color: theme.colors.error }]}
        >
          {errorText}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  spacer: { height: Space.xs + 2 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: CcRadius.md,
    paddingHorizontal: Space.md,
    minHeight: 48,
  },
  multilineWrapper: {
    minHeight: 96,
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
  },
  error: {
    marginTop: Space.xs,
    fontWeight: '600',
  },
});
