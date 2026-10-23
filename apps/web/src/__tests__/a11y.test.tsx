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
import { DEFAULT_TIME, duplicateTimes, nextTime } from '../data/medTimes';
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

  test('the header reads the time and screen with their context ("Current time: …", "Current screen: …")', () => {
    renderScreen('/app/medications', <Medications />);
    const banner = screen.getByRole('banner');
    expect(banner).toHaveTextContent(/Current time: \d{1,2}:\d{2}/);
    expect(banner).toHaveTextContent('Current screen: Medicines');
  });
});

// Screen readers ignore aria-label on a plain span, div or p with no role (axe
// aria-prohibited-attr, "needs review" in the #63 axe run), so the name is lost.
describe('no aria-label on elements that cannot take one (4.1.2)', () => {
  test.each(SCREENS)('%s', (_name, path, page, view) => {
    const { container } = renderScreen(path, page, view);
    const ignored = [...container.querySelectorAll('span[aria-label], div[aria-label], p[aria-label]')]
      .filter((el) => !el.hasAttribute('role'))
      .map((el) => `${el.tagName.toLowerCase()} "${el.getAttribute('aria-label')}"`);
    expect(ignored).toEqual([]);
  });
});

// Heading levels in document order, e.g. [1, 2, 3, 3, 2].
const headingLevels = (root: HTMLElement) =>
  [...root.querySelectorAll('h1, h2, h3, h4, h5, h6')].map((h) => Number(h.tagName[1]));

describe('heading order (1.3.1, 2.4.6, #50)', () => {
  test.each(SCREENS)('%s: one h1 first, and no heading skips a level', (_name, path, page, view) => {
    const { container } = renderScreen(path, page, view);
    const levels = headingLevels(container);
    expect(levels[0]).toBe(1);
    expect(levels.filter((l) => l === 1)).toHaveLength(1);
    levels.forEach((level, i) => {
      if (i > 0) expect(level).toBeLessThanOrEqual(levels[i - 1] + 1);
    });
  });

  test('Appointments: each group is an h2 under the h1, and every appointment is an h3 under a group', () => {
    const { container } = renderScreen('/app/appointments', <Appointments />);
    const groups = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent?.trim());
    expect(groups).toEqual(expect.arrayContaining(['Today', 'Later this week', 'Coming up']));
    const levels = headingLevels(container);
    expect(levels.slice(0, 2)).toEqual([1, 2]);
    expect(levels.filter((l) => l === 3).length).toBeGreaterThan(0);
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

  test('the caregiver index is titled Dashboard, like its nav link (SR-7)', () => {
    renderScreen('/app', <CaregiverDashboard />, 'caregiver');
    expect(document.title).toBe('Dashboard - CareConnect');
  });

  test('the care recipient index is still titled Home', () => {
    renderScreen('/app', <Today />, 'patient');
    expect(document.title).toBe('Home - CareConnect');
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

// Names VoiceOver read wrongly in the A9 desktop run (#62, docs/accessibility/desktop-screen-reader-report.md).
// jsdom joins text nodes when it computes a name, so SR-1 checks the DOM shape VoiceOver tripped on.
describe('screen reader names from the VoiceOver run (#62)', () => {
  test('SR-1: the Dashboard Alerts heading gives screen readers one piece of text', () => {
    renderScreen('/app', <CaregiverDashboard />, 'caregiver');
    const heading = screen.getByRole('heading', { level: 2, name: /^Alerts, \d+ total$/ });
    // Everything else in the heading is hidden, so the only exposed text node is this one.
    const exposed = [...heading.querySelectorAll('*')].filter(
      (el) => !el.closest('[aria-hidden="true"]') && [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE),
    );
    expect(exposed).toHaveLength(1);
    expect(exposed[0].childNodes).toHaveLength(1);
    expect([...heading.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE)).toHaveLength(0);
  });

  test.each([
    ['Medication name (required)', '/app/manage-medications?new=1', <ManageMedications key="mm" />],
    ['Dose (required)', '/app/manage-medications?new=1', <ManageMedications key="mm" />],
    ['Appointment title (required)', '/app/manage-appointments?new=1', <ManageAppointments key="ma" />],
  ])('SR-2: "%s" says required once in its name; the field is still required', (name, path, page) => {
    renderScreen(path, page, 'caregiver');
    expect(screen.getByRole('textbox', { name })).toBeRequired();
  });

  test('SR-2: a select says required once too (Location type)', () => {
    renderScreen('/app/manage-appointments?new=1', <ManageAppointments />, 'caregiver');
    expect(screen.getByRole('combobox', { name: 'Location type (required)' })).toBeRequired();
  });

  test('SR-2: a field whose label has no "(required)" text relies on the required state alone', () => {
    render(
      <MemoryRouter initialEntries={['/signup']}>
        <AuthProvider>
          <SignUp />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole('textbox', { name: 'Your name' })).toBeRequired();
  });

  test.each([
    ['patient' as const, 'Switch role to caregiver'],
    ['caregiver' as const, 'Switch role to care recipient'],
  ])('SR-10: in the %s view the Switch role button name starts with its visible text (2.5.3)', (view, name) => {
    renderScreen('/app/medications', <Medications />, view);
    const button = screen.getByRole('button', { name });
    expect(name.startsWith(button.textContent!.trim())).toBe(true);
  });
});

// The remaining VoiceOver findings from the A9 desktop run (#62): SR-3 (#80), SR-5 (#81), SR-6 (#82).
describe('remaining screen reader findings (#80, #81, #82)', () => {
  test('SR-5: a schedule toggle keeps one action name and reports done with aria-pressed', async () => {
    renderScreen('/app/schedule', <Schedule />);
    const toggle = screen.getAllByRole('button', { name: /^Mark .+ done$/, pressed: false })[0];
    const name = toggle.getAttribute('aria-label');
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    // The name never changes; "selected" comes from aria-pressed alone.
    expect(toggle).toHaveAttribute('aria-label', name);
  });

  test('SR-5: a medicine toggle is named as the action ("Mark X taken") and keeps that name', async () => {
    renderScreen('/app/medications', <Medications />);
    const toggle = screen.getAllByRole('button', { name: /^Mark .+ taken$/, pressed: false })[0];
    const name = toggle.getAttribute('aria-label');
    // Not "X taken", which out of context sounds like the dose is already done (#88 review).
    expect(name).not.toMatch(/^(?!Mark ).+ taken$/);
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(toggle).toHaveAttribute('aria-label', name);
  });

  test('SR-6: cards on Home are not region landmarks; only the page sections are', () => {
    renderScreen('/app', <Today />);
    // Before the fix every "Later today" card was a region too (Walk in the garden, Lunch, ...).
    expect(screen.getAllByRole('region')).toHaveLength(3);
    expect(screen.getByRole('region', { name: 'Next thing to do' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Later today' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Quick actions' })).toBeInTheDocument();
    // The three page landmarks are still there.
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main', { name: 'Main content' })).toBeInTheDocument();
  });

  test('SR-3: a new medication starts with a filled-in time, and Add time offers the next one', async () => {
    renderScreen('/app/manage-medications?new=1', <ManageMedications />, 'caregiver');
    expect(screen.getByLabelText('Time')).toHaveValue(DEFAULT_TIME);
    await userEvent.click(screen.getByRole('button', { name: /add (another )?time/i }));
    expect(screen.getByLabelText('Time 2')).toHaveValue('12:00');
  });

  test.each([
    [[] as string[], '08:00'],
    [['08:00'], '12:00'],
    [['08:00', '21:30'], '23:30'],
    [['', 'bad'], '08:00'],
    // Never a time already in the list (#88 review: 20:00 then 23:00 offered 23:00 again).
    [['20:00', '23:00'], '22:00'],
    [['20:00', '23:00', '22:00'], '21:00'],
    [['23:00'], '22:00'],
  ])('SR-3: nextTime(%j) is %s', (times, expected) => {
    expect(nextTime(times)).toBe(expected);
  });

  test('SR-3: pressing Add another time near midnight never repeats a time', async () => {
    renderScreen('/app/manage-medications?new=1', <ManageMedications />, 'caregiver');
    const add = () => userEvent.click(screen.getByRole('button', { name: /add (another )?time/i }));
    await userEvent.clear(screen.getByLabelText('Time'));
    await userEvent.type(screen.getByLabelText('Time'), '20:00');
    await add();
    await add();
    const values = ['Time 1', 'Time 2', 'Time 3'].map(
      (l) => (screen.getByLabelText(l) as HTMLInputElement).value,
    );
    expect(values).toEqual(['20:00', '23:00', '22:00']);
    expect(duplicateTimes(values)).toEqual([]);
  });

  test('SR-3: saving the same time twice is refused with a message that says which', async () => {
    renderScreen('/app/manage-medications?new=1', <ManageMedications />, 'caregiver');
    await userEvent.type(screen.getByLabelText(/Medication name/), 'Metformin');
    await userEvent.type(screen.getByLabelText(/^Dose/), '500 mg');
    await userEvent.click(screen.getByRole('button', { name: /add (another )?time/i }));
    await userEvent.clear(screen.getByLabelText('Time 2'));
    await userEvent.type(screen.getByLabelText('Time 2'), '08:00');
    await userEvent.click(screen.getByRole('button', { name: 'Add medication' }));
    expect(
      screen.getAllByText('Each time must be different: 8:00 am is listed more than once.').length,
    ).toBeGreaterThan(0);
  });

  test('SR-3: after saving, a confirmation names the medicine and the times it was saved with', async () => {
    renderScreen('/app/manage-medications?new=1', <ManageMedications />, 'caregiver');
    await userEvent.type(screen.getByLabelText(/Medication name/), 'Metformin');
    await userEvent.type(screen.getByLabelText(/^Dose/), '500 mg');
    // The time field is left as pre-filled (08:00): the confirmation must show it.
    await userEvent.click(screen.getByRole('button', { name: 'Add medication' }));
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Metformin saved');
    expect(status).toHaveTextContent('Scheduled at 8:00 am.');
    expect(status).toHaveTextContent('If a time is wrong, edit Metformin below.');
  });
});
