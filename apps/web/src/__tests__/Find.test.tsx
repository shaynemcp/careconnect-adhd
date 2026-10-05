// Edit > Find (Ctrl+F): the medicine search and the desktop focus-search command (#38).
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Medications from '../pages/Medications';
import Caregiver from '../pages/Caregiver';
import DesktopIntegration from '../desktop/DesktopIntegration';

const SELECTED_KEY = 'careconnect_desktop_selected_medication';

function installDesktop() {
  let handler: ((name: string) => void) | undefined;
  const bridge = {
    isDesktop: true,
    platform: 'win32',
    onCommand: (cb: (name: string) => void) => {
      handler = cb;
      return () => {};
    },
    scheduleReminder: jest.fn(),
    setMedicationSelected: jest.fn(),
  };
  window.careconnectDesktop = bridge as never;
  return { bridge, send: (name: string) => act(() => handler?.(name)) };
}

afterEach(() => {
  delete (window as { careconnectDesktop?: unknown }).careconnectDesktop;
  sessionStorage.clear();
});

test('a search that hides the selected medicine clears the selection', async () => {
  const { bridge } = installDesktop();
  render(<MemoryRouter><Medications /></MemoryRouter>);
  await userEvent.click(screen.getByText('Amlodipine'));
  expect(sessionStorage.getItem(SELECTED_KEY)).not.toBeNull();
  expect(bridge.setMedicationSelected).toHaveBeenLastCalledWith(true);

  await userEvent.type(screen.getByRole('searchbox'), 'vit');
  expect(screen.queryByText('Amlodipine')).not.toBeInTheDocument();
  expect(sessionStorage.getItem(SELECTED_KEY)).toBeNull();
  expect(bridge.setMedicationSelected).toHaveBeenLastCalledWith(false);
});

test('Escape clears a search without reaching other listeners; on an empty search it passes through', async () => {
  render(<MemoryRouter><Medications /></MemoryRouter>);
  const other = jest.fn();
  document.addEventListener('keydown', other);
  try {
    const box = screen.getByRole('searchbox');
    await userEvent.type(box, 'aml');
    await userEvent.keyboard('{Escape}');
    expect(box).toHaveValue('');
    expect(other).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }));
    await userEvent.keyboard('{Escape}');
    expect(other).toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }));
  } finally {
    document.removeEventListener('keydown', other);
  }
});

test('the match count is announced once typing pauses, not on every keystroke', async () => {
  render(<MemoryRouter><Medications /></MemoryRouter>);
  await userEvent.type(screen.getByRole('searchbox'), 'aml');
  const count = document.getElementById('medication-search-count')!;
  expect(count).toHaveTextContent('');
  expect(await screen.findByText(/Showing 1 of \d+ medicines\./, {}, { timeout: 1500 })).toBe(count);
});

test('Ctrl+F keeps a half-written caregiver note and says why; with nothing typed it opens Medications', async () => {
  const { send } = installDesktop();
  render(
    <MemoryRouter initialEntries={['/app/caregiver']}>
      <DesktopIntegration />
      <main>
        <Routes>
          <Route path="/app/caregiver" element={<Caregiver />} />
          <Route path="/app/medications" element={<p>Medications page</p>} />
        </Routes>
      </main>
    </MemoryRouter>,
  );
  await userEvent.click(screen.getByRole('button', { name: 'Add note' }));
  const note = screen.getByRole('textbox', { name: 'Note' });
  await userEvent.type(note, 'Picked up the new inhaler');

  send('focus-search');
  expect(screen.getByText('Save or clear what you typed before searching medicines.')).toBeInTheDocument();
  expect(note).toHaveValue('Picked up the new inhaler');
  expect(screen.queryByText('Medications page')).not.toBeInTheDocument();

  await userEvent.clear(note);
  send('focus-search');
  expect(screen.getByText('Medications page')).toBeInTheDocument();
});
