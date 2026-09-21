/**
 * Screen 01 — Sign In / Role Selection.
 *
 * No password, ever (WCAG 2.2 SC 3.3.8 Accessible Authentication): a
 * passkey / Face ID path first, an email handoff second, and one question
 * — "I am a…" — that decides which experience opens.
 *
 * Port of lib/features/auth/sign_in_screen.dart.
 */
import React, { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChoiceGroup, CcTextField } from '../../core/components';
import { useTheme } from '../../core/theme/ThemeContext';
import { Breakpoints, CcRadius, Space, TapTarget } from '../../core/theme/spacing';
import { bodyEmphasis } from '../../core/theme/typography';
import type { UserRole } from '../../models/types';
import { roleLabel } from '../../models/types';
import { useSessionStore } from '../../state/sessionStore';

/** Plain-language email validation: says what is wrong and how to fix it. */
export function validateEmailAddress(value: string): string | null {
  const email = value.trim();
  if (email.length === 0) {
    return 'Enter your email address, like you@email.com';
  }
  const at = email.indexOf('@');
  if (at < 1 || at === email.length - 1 || !email.slice(at).includes('.')) {
    return 'That email is missing something. Check it looks like you@email.com';
  }
  return null;
}

const ROLE_OPTIONS: UserRole[] = ['careRecipient', 'caregiver'];

export function SignInScreen() {
  const theme = useTheme();
  const signIn = useSessionStore((s) => s.signIn);
  const [role, setRole] = useState<UserRole>('careRecipient');
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);

  const continueWithPasskey = () => {
    void signIn({ role, method: 'passkey' });
  };

  const continueWithEmail = () => {
    const error = validateEmailAddress(email);
    setEmailError(error);
    if (error != null) return;
    void signIn({ role, method: 'email', email });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.form, { maxWidth: Breakpoints.formMaxWidth }]}>
          <View style={{ height: Space.xl }} />
          <Text accessibilityRole="header" style={[theme.text.headlineLarge, { color: theme.primary }]}>
            CareConnect
          </Text>
          <View style={{ height: Space.sm }} />
          <Text style={[theme.text.bodyLarge, { color: theme.colors.textSecondary }]}>
            Medications and appointments, without the memory test.
          </Text>
          <View style={{ height: Space.xl }} />

          <Pressable
            testID="signin-passkey"
            onPress={continueWithPasskey}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.filledButton,
              { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <MaterialIcons name="fingerprint" size={20} color={theme.onPrimary} />
            <Text style={[theme.text.labelLarge, { color: theme.onPrimary, marginLeft: Space.sm }]}>
              Continue with Face ID / Passkey
            </Text>
          </Pressable>

          <View style={{ height: Space.lg }} />
          <CcTextField
            testID="signin-email"
            label="Email"
            value={email}
            placeholder="you@email.com"
            errorText={emailError}
            keyboardType="email-address"
            returnKeyType="done"
            autoComplete="email"
            onChangeText={(value) => {
              setEmail(value);
              if (emailError != null) setEmailError(null);
            }}
            onSubmitEditing={continueWithEmail}
          />
          <View style={{ height: Space.sm + 4 }} />
          <Pressable
            testID="signin-email-button"
            onPress={continueWithEmail}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.outlinedButton,
              { borderColor: theme.primary, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[theme.text.labelLarge, { color: theme.primary }]}>Continue with Email</Text>
          </Pressable>

          <View style={{ height: Space.xl }} />
          <Text style={bodyEmphasis(theme.colors.textPrimary)}>I am a…</Text>
          <View style={{ height: Space.sm }} />
          <ChoiceGroup<UserRole>
            groupLabel="I am a"
            selected={role}
            onSelect={setRole}
            options={ROLE_OPTIONS.map((value) => ({ value, label: roleLabel(value) }))}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Space.lg, alignItems: 'center' },
  form: { width: '100%' },
  filledButton: {
    flexDirection: 'row',
    minHeight: TapTarget.minimum + 4,
    borderRadius: CcRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outlinedButton: {
    minHeight: TapTarget.minimum,
    borderWidth: 1.5,
    borderRadius: CcRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
