import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { KeyboardTypeOptions, ReturnKeyTypeOptions } from 'react-native';

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
 * 25 mg") rather than "Required field" alone.
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

  const field = (
    <View
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
        accessibilityHint={errorText ?? undefined}
      />
      {readOnly && onPress ? (
        <MaterialIcons name="edit-calendar" size={20} color={theme.colors.textSecondary} />
      ) : null}
    </View>
  );

  return (
    <View>
      <Text style={bodyEmphasis(theme.colors.textPrimary)}>{label}</Text>
      <View style={styles.spacer} />
      {readOnly && onPress ? (
        // Needs its own accessibilityLabel, not just a role: this Pressable
        // is what TalkBack/VoiceOver actually focuses (it merges the
        // read-only TextInput inside it, per RN's usual `accessible`
        // container behavior), so without one it announces as a bare,
        // unlabeled "button" (careconnect-adhd#4, item 4) instead of e.g.
        // "Date & time, button".
        <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibleLabel}>
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
