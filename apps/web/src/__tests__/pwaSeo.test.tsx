/**
 * A10 additions: the offline notice (PWA plan), search descriptions on the
 * public pages and noindex on signed-in ones (SEO plan), and the visible
 * "required" note on Sign in and Sign up (3.3.2, follow-up from #79's review).
 */
import type { ReactElement } from 'react';
import { act, render, renderHook, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import OfflineNotice, { BACK_ONLINE_MS } from '../components/OfflineNotice';
import { AuthProvider } from '../auth/AuthContext';
import Landing from '../pages/Landing';
import SignIn from '../pages/SignIn';
import SignUp from '../pages/SignUp';
import { useNoIndex, usePageDescription } from '../hooks/useDocumentTitle';

// Landing renders the chat assistant, which reads import.meta.env (not available
// under Jest); it plays no part in these tests.
jest.mock('../components/ChatBot', () => ({ __esModule: true, default: () => null }));

expect.extend(toHaveNoViolations);

const AXE_OPTIONS = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
  rules: { 'color-contrast': { enabled: false } },
};

function setOnLine(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => value });
}

describe('offline notice', () => {
  afterEach(() => {
    setOnLine(true);
    jest.useRealTimers();
  });

  test('the status region is in the page and empty while online', () => {
    render(<OfflineNotice />);
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  test('going offline says so and what still works, then back online clears it', () => {
    jest.useFakeTimers();
    render(<OfflineNotice />);
    const status = screen.getByRole('status');

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });
    expect(status).toHaveTextContent("You're offline.");
    expect(status).toHaveTextContent('Your schedule, medicines and appointments still work');

    act(() => {
      window.dispatchEvent(new Event('online'));
    });
    expect(status).toHaveTextContent("You're back online.");

    act(() => {
      jest.advanceTimersByTime(BACK_ONLINE_MS);
    });
    expect(status).toBeEmptyDOMElement();
  });

  test('a page loaded while offline shows the notice straight away', () => {
    setOnLine(false);
    render(<OfflineNotice />);
    expect(screen.getByRole('status')).toHaveTextContent("You're offline.");
  });

  test('the offline notice has no axe violations', async () => {
    setOnLine(false);
    const { container } = render(<OfflineNotice />);
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });
});

function renderPublic(path: string, page: ReactElement) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>{page}</AuthProvider>
    </MemoryRouter>,
  );
}

function meta(selector: string) {
  return document.head.querySelector<HTMLMetaElement>(selector);
}

describe('search descriptions and noindex', () => {
  beforeEach(() => {
    document.head.innerHTML =
      '<meta name="description" content="Default description">' +
      '<meta property="og:description" content="Default og description">';
  });

  test.each([
    ['/', <Landing key="l" />, /^CareConnect keeps your day/],
    ['/signin', <SignIn key="in" />, /^Sign in to see today's schedule/],
    ['/signup', <SignUp key="up" />, /^Set up CareConnect/],
  ])('%s sets its own description and og:description', (path, page, text) => {
    renderPublic(path, page);
    expect(meta('meta[name="description"]')?.content).toMatch(text);
    expect(meta('meta[property="og:description"]')?.content).toMatch(text);
    // Search results cut descriptions at about 155 characters.
    expect(meta('meta[name="description"]')!.content.length).toBeLessThanOrEqual(155);
  });

  test('leaving a page puts the default description back', () => {
    const { unmount } = renderHook(() => usePageDescription('Page text'));
    expect(meta('meta[name="description"]')?.content).toBe('Page text');
    unmount();
    expect(meta('meta[name="description"]')?.content).toBe('Default description');
    expect(meta('meta[property="og:description"]')?.content).toBe('Default og description');
  });

  test('signed-in screens add robots noindex and remove it on the way out', () => {
    const { unmount } = renderHook(() => useNoIndex());
    expect(meta('meta[name="robots"]')?.content).toBe('noindex');
    unmount();
    expect(meta('meta[name="robots"]')).toBeNull();
  });
});

describe('required note on the sign-in forms (3.3.2)', () => {
  test.each([
    ['/signin', <SignIn key="in" />],
    ['/signup', <SignUp key="up" />],
  ])('%s explains the asterisk', (path, page) => {
    renderPublic(path, page);
    expect(screen.getByText('Fields marked with an asterisk (*) are required.')).toBeVisible();
  });
});
