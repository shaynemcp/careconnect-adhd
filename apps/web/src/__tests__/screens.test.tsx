/** Activity Log (caregiver) and Memories (care recipient) screens. */
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import ActivityLog from '../pages/ActivityLog';
import Memories from '../pages/Memories';
import { appendActivityEvent } from '../data/caregiverStore';

const LOG_KEY = 'careconnect_activity_log';

function renderActivityLog() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <ActivityLog />
      </AppProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('Activity Log', () => {
  test('with no events it explains what will appear', () => {
    renderActivityLog();
    expect(screen.getByRole('heading', { level: 1, name: 'Activity log' })).toBeInTheDocument();
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
  });

  test('events are grouped by day, newest day first, each in a named section', () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    localStorage.setItem(
      LOG_KEY,
      JSON.stringify([
        { id: '1', kind: 'med_taken', label: 'Marked Amlodipine as taken', timestamp: now.toISOString() },
        { id: '2', kind: 'check_in', label: 'Checked in: feeling well', timestamp: yesterday.toISOString() },
      ]),
    );
    renderActivityLog();
    const today = screen.getByRole('region', { name: 'Activity for Today' });
    const prior = screen.getByRole('region', { name: 'Activity for Yesterday' });
    expect(within(today).getByText('Marked Amlodipine as taken')).toBeInTheDocument();
    expect(within(prior).getByText('Checked in: feeling well')).toBeInTheDocument();
    expect(today.compareDocumentPosition(prior) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('Refresh, and returning to the window, pick up events logged elsewhere', async () => {
    const user = userEvent.setup();
    renderActivityLog();
    appendActivityEvent({ kind: 'schedule_done', label: 'Finished: Lunch', timestamp: new Date().toISOString() });
    expect(screen.queryByText('Finished: Lunch')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Refresh activity log' }));
    expect(screen.getByText('Finished: Lunch')).toBeInTheDocument();

    appendActivityEvent({ kind: 'med_skipped', label: 'Skipped: Evening medications', timestamp: new Date().toISOString() });
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    expect(screen.getByText('Skipped: Evening medications')).toBeInTheDocument();
  });

  test('an unreadable stored log is treated as empty, not a crash', () => {
    localStorage.setItem(LOG_KEY, '{not json');
    renderActivityLog();
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
  });
});

describe('Memories', () => {
  test('pinned memories come first, in their own section', () => {
    render(<Memories />);
    const pinned = screen.getByRole('region', { name: 'Pinned memories' });
    expect(within(pinned).getByRole('heading', { name: 'Maria — Your Daughter' })).toBeInTheDocument();
    expect(within(pinned).getByRole('heading', { name: 'Buddy — Your Cat' })).toBeInTheDocument();
    const more = screen.getByRole('region', { name: 'More memories' });
    expect(within(more).getByRole('heading', { name: 'Your Garden' })).toBeInTheDocument();
  });

  test('a category filter shows only that category and reports its pressed state', async () => {
    const user = userEvent.setup();
    render(<Memories />);
    const filters = screen.getByRole('group', { name: 'Filter memories by category' });
    const pet = within(filters).getByRole('button', { name: /^Pet/ });
    await user.click(pet);
    expect(pet).toHaveAttribute('aria-pressed', 'true');
    expect(within(filters).getByRole('button', { name: /^All/ })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('heading', { name: 'Buddy — Your Cat' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Maria — Your Daughter' })).not.toBeInTheDocument();

    await user.click(within(filters).getByRole('button', { name: /^All/ }));
    expect(screen.getByRole('heading', { name: 'Maria — Your Daughter' })).toBeInTheDocument();
  });

  test('Read more expands one card at a time and reports it with aria-expanded', async () => {
    const user = userEvent.setup();
    render(<Memories />);
    const [first, second] = screen.getAllByRole('button', { name: 'Read more' });
    await user.click(first);
    expect(first).toHaveAttribute('aria-expanded', 'true');
    expect(first).toHaveTextContent('Show less');
    await user.click(second);
    expect(first).toHaveAttribute('aria-expanded', 'false');
    expect(second).toHaveAttribute('aria-expanded', 'true');
  });

  test('photos are WebP with a srcSet for each width (A11 optimization)', () => {
    render(<Memories />);
    const img = screen.getByRole('img', { name: 'Maria — Your Daughter' });
    expect(new URL(img.getAttribute('src')!).searchParams.get('fm')).toBe('webp');
    expect(img.getAttribute('srcset')).toMatch(/ 400w, .* 1200w$/);
    expect(img).toHaveAttribute('loading', 'lazy');
  });
});
