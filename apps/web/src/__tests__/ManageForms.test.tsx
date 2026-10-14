/**
 * Keyboard behaviour of the caregiver Add forms, from the A9 keyboard-only
 * checklist: New Medication puts focus in the form (#70), and Escape closes
 * either form and returns focus to its Add button (#74), also from the error
 * summary that takes focus after a failed save (SR-4 in the #62 VoiceOver run).
 */
import type { ReactElement } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { AppProvider } from '../context/AppContext';
import ManageMedications from '../pages/ManageMedications';
import ManageAppointments from '../pages/ManageAppointments';

function renderPage(path: string, page: ReactElement) {
  localStorage.setItem(
    'careconnect_session',
    JSON.stringify({ user: { id: 'kb', name: 'Keyboard Test', email: 'kb@example.test' }, role: 'caregiver' }),
  );
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AppProvider>{page}</AppProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

afterEach(() => localStorage.clear());

test('New Medication (?new=1) puts focus in the medication name field (#70)', () => {
  renderPage('/app/manage-medications?new=1', <ManageMedications />);
  expect(screen.getByLabelText(/Medication name/)).toHaveFocus();
});

test.each([
  ['medication', '/app/manage-medications?new=1', <ManageMedications key="m" />, /Medication name/, 'Add medication'],
  ['appointment', '/app/manage-appointments?new=1', <ManageAppointments key="a" />, /Appointment title/, 'Add appointment'],
])('Escape closes the Add %s form and returns focus to the Add button (#74)', async (_n, path, page, field, add) => {
  const user = userEvent.setup();
  renderPage(path, page);
  expect(screen.getByLabelText(field)).toHaveFocus();
  await user.keyboard('{Escape}');
  expect(screen.queryByLabelText(field)).not.toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('button', { name: add })).toHaveFocus());
});

test.each([
  ['medication', '/app/manage-medications?new=1', <ManageMedications key="m" />, /Medication name/, 'Add medication'],
  ['appointment', '/app/manage-appointments?new=1', <ManageAppointments key="a" />, /Appointment title/, 'Add appointment'],
])('Escape closes the Add %s form from the error summary after a failed save (SR-4)', async (_n, path, page, field, add) => {
  const user = userEvent.setup();
  renderPage(path, page);
  expect(screen.getByLabelText(field)).toHaveFocus();
  await user.keyboard('{Enter}');
  const summary = screen.getByText('Please fix the following before saving:').closest('[tabindex="-1"]');
  await waitFor(() => expect(summary).toHaveFocus());
  await user.keyboard('{Escape}');
  expect(screen.queryByLabelText(field)).not.toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('button', { name: add })).toHaveFocus());
});
