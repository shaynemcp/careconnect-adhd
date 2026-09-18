import React from 'react';
import { AccessibilityInfo, Platform } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { renderWithProviders } from '../../test-utils';
import { READ_ONLY_PICKER_HINT, fieldErrorAnnouncement } from '../../data/announcements';
import { ThemeProvider } from '../theme/ThemeContext';
import { CcTextField } from './CcTextField';

/** `rerender` keeps a `wrapper`, unlike `renderWithProviders`, so the theme survives it. */
function renderField(ui: React.ReactElement) {
  return render(ui, { wrapper: ThemeProvider });
}

function setPlatform(os: 'ios' | 'android') {
  jest.replaceProperty(Platform, 'OS', os);
}

let announce: jest.SpyInstance;

beforeEach(() => {
  setPlatform('ios');
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('CcTextField — read-only picker field', () => {
  it('names the button with the field label and its current value, plus a hint', () => {
    const onPress = jest.fn();
    renderWithProviders(
      <CcTextField label="Date & time" value="Tue, Sep 22 at 10:30 AM" readOnly onPress={onPress} />,
    );

    const field = screen.getByRole('button', { name: 'Date & time. Tue, Sep 22 at 10:30 AM' });
    expect(field.props.accessibilityHint).toBe(READ_ONLY_PICKER_HINT);

    fireEvent.press(field);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('falls back to the placeholder when nothing is chosen yet', () => {
    renderWithProviders(
      <CcTextField
        label="Date & time"
        value=""
        placeholder="Choose the date and time"
        readOnly
        onPress={() => {}}
      />,
    );
    expect(screen.getByRole('button', { name: 'Date & time. Choose the date and time' })).toBeTruthy();
  });

  it('speaks the error instead of the placeholder when nothing is chosen, so neither repeats', () => {
    renderWithProviders(
      <CcTextField
        label="Date & time"
        value=""
        placeholder="Choose the date and time"
        errorText="Choose the date and time"
        readOnly
        onPress={() => {}}
      />,
    );
    const field = screen.getByRole('button', { name: 'Date & time. Choose the date and time' });
    expect(field.props.accessibilityLabel.split('Choose the date and time')).toHaveLength(2);
  });

  it('keeps the chosen value alongside an error', () => {
    renderWithProviders(
      <CcTextField label="Date & time" value="Tue, Sep 22" errorText="Pick a later date" readOnly onPress={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Date & time. Tue, Sep 22. Pick a later date' })).toBeTruthy();
  });

  it('includes the error in the button name', () => {
    renderWithProviders(
      <CcTextField label="Date & time" value="" errorText="Choose a date" readOnly onPress={() => {}} />,
    );
    expect(screen.getByRole('button', { name: 'Date & time. Choose a date' })).toBeTruthy();
  });

  it('hides the inner text box so the picker button is the only focus stop', () => {
    renderWithProviders(
      <CcTextField label="Date & time" value="" readOnly onPress={() => {}} testID="when" />,
    );
    expect(screen.queryByTestId('when')).toBeNull();
    expect(screen.getByTestId('when', { includeHiddenElements: true })).toBeTruthy();
  });

  it('keeps an editable field focusable and speaks its error once, in the name only', () => {
    renderWithProviders(<CcTextField label="Dosage" value="" errorText="Enter the dose" testID="dose" />);
    const input = screen.getByTestId('dose');
    expect(input.props.accessibilityLabel).toBe('Dosage. Enter the dose');
    expect(input.props.accessibilityHint).toBeUndefined();
  });

  it('keeps the visible label visible to screen readers', () => {
    renderWithProviders(<CcTextField label="Date & time" value="" readOnly onPress={() => {}} />);
    // Hidden elements are excluded by default, so finding it proves it isn't hidden.
    expect(screen.getByText('Date & time')).toBeTruthy();
  });
});

describe('CcTextField — error announcements', () => {
  it('announces a new error once on iOS, queued behind current speech', () => {
    const { rerender } = renderField(<CcTextField label="Dosage" value="" errorText={null} />);
    expect(announce).not.toHaveBeenCalled();

    rerender(<CcTextField label="Dosage" value="" errorText="Enter the dose, like 25 mg" />);
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith(
      fieldErrorAnnouncement('Dosage', 'Enter the dose, like 25 mg'),
      { queue: true },
    );

    // Unrelated re-renders (typing) don't repeat it.
    rerender(<CcTextField label="Dosage" value="2" errorText="Enter the dose, like 25 mg" />);
    expect(announce).toHaveBeenCalledTimes(1);
  });

  it('announces again when the error text changes', () => {
    const { rerender } = renderField(<CcTextField label="Dosage" value="" errorText="First" />);
    rerender(<CcTextField label="Dosage" value="" errorText="Second" />);
    expect(announce).toHaveBeenCalledTimes(2);
    expect(announce).toHaveBeenLastCalledWith(fieldErrorAnnouncement('Dosage', 'Second'), { queue: true });
  });

  it('stays silent on Android, where the live region already speaks the error', () => {
    setPlatform('android');
    renderField(<CcTextField label="Dosage" value="" errorText="Enter the dose, like 25 mg" />);
    expect(announce).not.toHaveBeenCalled();
    expect(screen.getByText('Enter the dose, like 25 mg').props.accessibilityLiveRegion).toBe('polite');
  });
});
