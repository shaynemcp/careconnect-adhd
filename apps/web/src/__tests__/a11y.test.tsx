/**
 * Accessibility tests (A9): axe-core rules on the main screens inside the real
 * Layout, plus the keyboard and naming behaviour axe cannot see.
 *
 * jsdom has no layout or colours, so axe's color-contrast rule is off here;
 * contrast is checked by `npm run check:contrast` and by the axe scan inside
 * the Electron window (A9 report).
 */
import type { ReactElement } from 'react';
import { render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { axe, toHaveNoViolations } from 'jest-axe';
import Layout from '../components/Layout';
import { AuthProvider } from '../auth/AuthContext';
import { AppProvider } from '../context/AppContext';
import Today from '../pages/Today';
import Schedule from '../pages/Schedule';
import Appointments from '../pages/Appointments';
import Medications from '../pages/Medications';
import ManageMedications from '../pages/ManageMedications';
import ManageAppointments from '../pages/ManageAppointments';
import CaregiverDashboard from '../pages/CaregiverDashboard';
import Contacts from '../pages/Contacts';
import SignIn from '../pages/SignIn';
import SignUp from '../pages/SignUp';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

expect.extend(toHaveNoViolations);

const AXE_OPTIONS = {
  runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
  rules: { 'color-contrast': { enabled: false } },
};

function renderScreen(path: string, page: ReactElement, view: 'patient' | 'caregiver' = 'patient') {
  localStorage.setItem(
    'careconnect_session',
    JSON.stringify({ user: { id: 'a11y', name: 'Marcus Test', email: 'a11y@example.test' }, role: view }),
  );
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AppProvider>
          <Layout view={view} onSwitchRole={() => {}} onSignOut={() => {}}>
            {page}
          </Layout>
        </AppProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

const SCREENS: Array<[string, string, ReactElement, 'patient' | 'caregiver']> = [
  ['Home', '/app', <Today key="home" />, 'patient'],
  ['My Day', '/app/schedule', <Schedule key="schedule" />, 'patient'],
  ['Appointments', '/app/appointments', <Appointments key="appointments" />, 'patient'],
  ['Medicines', '/app/medications', <Medications key="medications" />, 'patient'],
  ['Contacts', '/app/contacts', <Contacts key="contacts" />, 'patient'],
  ['Manage Medications', '/app/manage-medications', <ManageMedications key="mm" />, 'caregiver'],
  ['Manage Appointments', '/app/manage-appointments', <ManageAppointments key="ma" />, 'caregiver'],
  ['Caregiver Dashboard', '/app', <CaregiverDashboard key="cd" />, 'caregiver'],
];

describe('axe: no WCAG 2.x A/AA violations on the main screens', () => {
  test.each(SCREENS)('%s', async (_name, path, page, view) => {
    const { container } = renderScreen(path, page, view);
    expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
  });

  // Structure and names only: jsdom loads no stylesheets and color-contrast is
  // off here, so High Contrast colours are tested in high-contrast.test.tsx.
  test('Medicines with the High Contrast class: no structural violations', async () => {
    document.documentElement.classList.add('cc-high-contrast');
    try {
      const { container } = renderScreen('/app/medications', <Medications />);
      expect(await axe(container, AXE_OPTIONS)).toHaveNoViolations();
    } finally {
      document.documentElement.classList.remove('cc-high-contrast');
    }
  });
});

describe('page structure and keyboard', () => {
  test('the first Tab reaches "Skip to main content", which targets the main landmark (2.4.1)', async () => {
    renderScreen('/app/medications', <Medications />);
    await userEvent.tab();
    const skip = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skip).toHaveFocus();
    expect(skip).toHaveAttribute('href', '#main-content');
    expect(document.getElementById('main-content')).toBe(screen.getByRole('main', { name: 'Main content' }));
  });

  test('the page has banner, navigation and main landmarks and one h1 (1.3.1)', () => {
    renderScreen('/app/medications', <Medications />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getAllByRole('navigation').length).toBeGreaterThan(0);
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
  });

  test('the current page is marked aria-current in the navigation', () => {
    renderScreen('/app/medications', <Medications />);
    const current = screen
      .getAllByRole('link', { current: 'page' })
      .map((link) => link.textContent);
    expect(current.some((t) => t?.includes('Medicines'))).toBe(true);
  });
});

describe('window title names the page (2.4.2, #55)', () => {
  test.each([
    ['/app/medications', <Medications key="m" />, 'Medicines - CareConnect'],
    ['/app/schedule', <Schedule key="s" />, 'My Day - CareConnect'],
    ['/app/appointments', <Appointments key="a" />, 'My Appointments - CareConnect'],
  ])('%s', (path, page, title) => {
    renderScreen(path, page);
    expect(document.title).toBe(title);
  });

  test('leaving the layout (sign out) does not leave the last screen in the title', () => {
    const { unmount } = renderScreen('/app/schedule', <Schedule />);
    expect(document.title).toBe('My Day - CareConnect');
    unmount();
    expect(document.title).toBe('CareConnect');
  });

  test('the app home (Landing) is titled just "CareConnect"', () => {
    document.title = 'My Day - CareConnect';
    renderHook(() => useDocumentTitle('CareConnect'));
    expect(document.title).toBe('CareConnect');
  });

  test.each([
    ['/signin', <SignIn key="in" />, 'Sign in - CareConnect'],
    ['/signup', <SignUp key="up" />, 'Sign up - CareConnect'],
  ])('%s outside the layout has its own title', (path, page, title) => {
    document.title = 'My Day - CareConnect';
    render(
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>{page}</AuthProvider>
      </MemoryRouter>,
    );
    expect(document.title).toBe(title);
  });
});

describe('one patient name on every screen (3.2.4, #48)', () => {
  test.each([
    ['patient header', '/app/medications', <Medications key="m" />, 'patient' as const],
    ['caregiver dashboard', '/app', <CaregiverDashboard key="cd" />, 'caregiver' as const],
    ['manage medications', '/app/manage-medications', <ManageMedications key="mm" />, 'caregiver' as const],
  ])('%s uses the care recipient name, never Dorothy', (_n, path, page, view) => {
    const { container } = renderScreen(path, page, view);
    expect(container.textContent).toContain('Margaret');
    expect(container.textContent).not.toMatch(/Dorothy/);
    if (view === 'patient') expect(screen.getByText(/Good (morning|afternoon|evening), Margaret/)).toBeInTheDocument();
  });
});
