/** The PWA install banner (A11 Part 1: PWA configured, installable). */
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InstallPrompt from '../components/InstallPrompt';

const DISMISS_KEY = 'careconnect_install_dismissed_until';

function setStandalone(standalone: boolean) {
  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: standalone && query === '(display-mode: standalone)',
    media: query,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })) as unknown as typeof window.matchMedia;
}

/** Fire Chromium's beforeinstallprompt with a controllable prompt(). */
function fireInstallPrompt(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
    prompt: jest.Mock;
    userChoice: Promise<{ outcome: string }>;
  };
  event.prompt = jest.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

beforeEach(() => {
  localStorage.clear();
  setStandalone(false);
});

test('nothing shows until the browser offers installation; then the banner is a labelled region', () => {
  render(<InstallPrompt />);
  expect(screen.queryByRole('region', { name: 'Install CareConnect' })).not.toBeInTheDocument();
  const event = fireInstallPrompt();
  expect(event.defaultPrevented).toBe(true); // Chrome's own mini-infobar is suppressed
  expect(screen.getByRole('region', { name: 'Install CareConnect' })).toBeInTheDocument();
  // It announces itself politely and does not take focus.
  expect(screen.getByRole('region', { name: 'Install CareConnect' })).toHaveAttribute('aria-live', 'polite');
  expect(document.body).toHaveFocus();
});

test('Install opens the browser prompt, then hides the banner and remembers the choice', async () => {
  const user = userEvent.setup();
  render(<InstallPrompt />);
  const event = fireInstallPrompt('accepted');
  await user.click(screen.getByRole('button', { name: 'Install' }));
  expect(event.prompt).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('region', { name: 'Install CareConnect' })).not.toBeInTheDocument();
  expect(Number(localStorage.getItem(DISMISS_KEY))).toBeGreaterThan(Date.now());
});

test.each([['Not now'], ['Dismiss install prompt']])('"%s" hides the banner for 14 days', async (name) => {
  const user = userEvent.setup();
  const { unmount } = render(<InstallPrompt />);
  fireInstallPrompt();
  await user.click(screen.getByRole('button', { name }));
  expect(screen.queryByRole('region', { name: 'Install CareConnect' })).not.toBeInTheDocument();
  const until = Number(localStorage.getItem(DISMISS_KEY));
  const days = (until - Date.now()) / (24 * 60 * 60 * 1000);
  expect(days).toBeGreaterThan(13.9);
  expect(days).toBeLessThanOrEqual(14);

  // While snoozed, a new visit ignores the browser's offer.
  unmount();
  render(<InstallPrompt />);
  fireInstallPrompt();
  expect(screen.queryByRole('region', { name: 'Install CareConnect' })).not.toBeInTheDocument();
});

test('Escape inside the banner dismisses it', async () => {
  const user = userEvent.setup();
  render(<InstallPrompt />);
  fireInstallPrompt();
  screen.getByRole('button', { name: 'Install' }).focus();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('region', { name: 'Install CareConnect' })).not.toBeInTheDocument();
});

test('the banner goes away when the app is installed by other means', () => {
  render(<InstallPrompt />);
  fireInstallPrompt();
  act(() => {
    window.dispatchEvent(new Event('appinstalled'));
  });
  expect(screen.queryByRole('region', { name: 'Install CareConnect' })).not.toBeInTheDocument();
});

test('an already-installed app (standalone display) never shows the banner', () => {
  setStandalone(true);
  render(<InstallPrompt />);
  fireInstallPrompt();
  expect(screen.queryByRole('region', { name: 'Install CareConnect' })).not.toBeInTheDocument();
});
