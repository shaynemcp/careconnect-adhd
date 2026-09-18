import React from 'react';
import { Pressable, Switch, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '../../core/theme/ThemeContext';
import { Space } from '../../core/theme/spacing';

export interface SettingsSwitchRowProps {
  /**
   * Spoken name of the setting: the visible title, so it starts with what
   * Voice Control users see (SC 2.5.3). The on/off state is spoken separately.
   */
  accessibilityLabel: string;
  /** The row's longer description, spoken after the name and state. */
  accessibilityHint?: string;
  value: boolean;
  /** Omit for an always-on control that is shown but can't be changed. */
  onValueChange?: (value: boolean) => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** The row's visible title and description. */
  children: React.ReactNode;
}

/**
 * A settings row that screen readers treat as one switch.
 *
 * The whole row is the accessible element: it carries the `switch` role, its
 * checked state and a press handler that toggles, so VoiceOver and TalkBack
 * read "Daily digest, switch, on" and a double-tap flips it. The visual
 * `Switch` is hidden from assistive tech so the row isn't two focus stops.
 * Sighted users can still tap either the switch or anywhere on the row.
 * (WCAG SC 4.1.2 Name, Role, Value and SC 2.1.1 Keyboard.)
 */
export function SettingsSwitchRow({
  accessibilityLabel,
  accessibilityHint,
  value,
  onValueChange,
  disabled = false,
  style,
  testID,
  children,
}: SettingsSwitchRowProps) {
  const theme = useTheme();
  const locked = disabled || onValueChange == null;

  return (
    <Pressable
      testID={testID}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ checked: value, disabled: locked }}
      disabled={locked}
      onPress={() => onValueChange?.(!value)}
      style={style}
    >
      <View style={{ flex: 1, marginRight: Space.md }}>{children}</View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={locked}
        trackColor={{ true: theme.primary }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
    </Pressable>
  );
}
