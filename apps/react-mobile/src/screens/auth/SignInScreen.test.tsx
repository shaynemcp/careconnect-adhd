import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderWithProviders } from '../../test-utils';
import { useSessionStore } from '../../state/sessionStore';
import { SignInScreen, validateEmailAddress } from './SignInScreen';

type TestInstance = ReturnType<typeof renderWithProviders>['root'];

/**
 * Depth-first pre-order index of `node` among all of `root`'s descendants
 * (root itself is index 0). This mirrors the order TalkBack/VoiceOver reads
 * a screen in when no explicit accessibility ordering prop overrides it, so
 * comparing two nodes' indices is a direct stand-in for "which one is read
 * first" (careconnect-adhd#27).
 */
function readingOrderIndex(root: TestInstance, node: TestInstance): number {
  let index = -1;
  let found = false;
  function visit(n: TestInstance) {
    if (found) return;
    index += 1;
    if (n === node) {
      found = true;
      return;
    }
    for (const child of n.children) {
      if (typeof child !== 'string' && !found) visit(child);
    }
  }
  visit(root);
  return index;
}

describe('validateEmailAddress', () => {
  it('requires a non-empty address', () => {
    expect(validateEmailAddress('')).toBe('Enter your email address, like you@email.com');
    expect(validateEmailAddress('   ')).toBe('Enter your email address, like you@email.com');
  });

  it('rejects addresses missing an @ or a domain dot', () => {
    expect(validateEmailAddress('not-an-email')).toMatch(/missing something/);
    expect(validateEmailAddress('person@nodot')).toMatch(/missing something/);
    expect(validateEmailAddress('@nohandle.com')).toMatch(/missing something/);
  });

  it('accepts a plausible address', () => {
    expect(validateEmailAddress('renee@example.test')).toBeNull();
  });
});

describe('SignInScreen', () => {
  beforeEach(() => {
    useSessionStore.setState({ session: null, hydrated: true });
  });

  it('signs in with a passkey for the default (care recipient) role', async () => {
    renderWithProviders(<SignInScreen />);
    fireEvent.press(screen.getByTestId('signin-passkey'));

    await waitFor(() => {
      expect(useSessionStore.getState().session?.role).toBe('careRecipient');
    });
    expect(useSessionStore.getState().session?.method).toBe('passkey');
  });

  it('switches role before signing in', async () => {
    renderWithProviders(<SignInScreen />);
    fireEvent.press(screen.getByText('Caregiver'));
    fireEvent.press(screen.getByTestId('signin-passkey'));

    await waitFor(() => {
      expect(useSessionStore.getState().session?.role).toBe('caregiver');
    });
  });

  it('reads the "I am a…" role choice before either Continue button (careconnect-adhd#27)', () => {
    const { root } = renderWithProviders(<SignInScreen />);
    const roleGroup = screen.getByTestId('signin-role');
    const passkeyButton = screen.getByTestId('signin-passkey');
    const emailButton = screen.getByTestId('signin-email-button');

    const roleIndex = readingOrderIndex(root, roleGroup);
    const passkeyIndex = readingOrderIndex(root, passkeyButton);
    const emailButtonIndex = readingOrderIndex(root, emailButton);

    expect(roleIndex).toBeGreaterThan(-1);
    expect(roleIndex).toBeLessThan(passkeyIndex);
    expect(roleIndex).toBeLessThan(emailButtonIndex);
  });

  it('shows a plain-language error for an invalid email and clears it once fixed', async () => {
    renderWithProviders(<SignInScreen />);
    fireEvent.press(screen.getByTestId('signin-email-button'));
    expect(await screen.findByText('Enter your email address, like you@email.com')).toBeTruthy();

    fireEvent.changeText(screen.getByTestId('signin-email'), 'renee@example.test');
    fireEvent.press(screen.getByTestId('signin-email-button'));

    await waitFor(() => {
      expect(useSessionStore.getState().session?.method).toBe('email');
    });
    expect(useSessionStore.getState().session?.email).toBe('renee@example.test');
  });
});
