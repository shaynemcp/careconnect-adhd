import React from 'react';
import { screen } from '@testing-library/react-native';

import { renderWithProviders } from '../../test-utils';
import { CcTextField } from './CcTextField';

describe('CcTextField', () => {
  it('exposes the label as the accessible name on an editable field', () => {
    renderWithProviders(<CcTextField label="Email" value="" onChangeText={() => {}} />);
    expect(screen.getByLabelText('Email')).toBeTruthy();
  });

  it('merges the error into the accessible name and hint', () => {
    renderWithProviders(
      <CcTextField label="Email" value="" errorText="That email is missing something." onChangeText={() => {}} />,
    );
    expect(screen.getByLabelText('Email. That email is missing something.')).toBeTruthy();
  });

  // careconnect-adhd#4 (item 4): the Pressable wrapper around a read-only
  // field is what actually gets focused by TalkBack/VoiceOver — it merges
  // the TextInput inside it — so without its own accessibilityLabel it
  // announced as a bare "button" with no name at all.
  it('gives the read-only Pressable wrapper its own accessible name, not just a bare "button" role', () => {
    renderWithProviders(
      <CcTextField label="Date & time" value="Sep 25, 2:30 PM" readOnly onPress={() => {}} />,
    );
    const button = screen.getByRole('button');
    expect(button.props.accessibilityLabel).toBe('Date & time');
  });

  it('folds the error into the read-only wrapper’s accessible name too', () => {
    renderWithProviders(
      <CcTextField
        label="Date & time"
        value=""
        errorText="Choose a date and time."
        readOnly
        onPress={() => {}}
      />,
    );
    const button = screen.getByRole('button');
    expect(button.props.accessibilityLabel).toBe('Date & time. Choose a date and time.');
  });
});
