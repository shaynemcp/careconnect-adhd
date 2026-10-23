/**
 * Add, edit and delete on the caregiver Manage Medications and Manage Appointments screens,
 * end to end through the form and the shared localStorage stores. ManageForms.test.tsx covers
 * keyboard focus and Escape; these cover what the caregiver saves and what the list shows,
 * including the optional fields, the telephone/in-person address rule, the empty states and
 * the Today badge (A11 asks for at least 75% coverage, and these screens had the most
 * untested branches).
 */
import type { ReactElement } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../auth/AuthContext';
import { AppProvider } from '../context/AppContext';
import ManageMedications from '../pages/ManageMedications';
import ManageAppointments from '../pages/ManageAppointments';
import { getMedications, saveMedications } from '../data/medsStore';
import { getAppointments, saveAppointments } from '../data/apptStore';
import type { Appointment } from '../data/appointmentsData';
import { localDateKey, localDateKeyFromNow } from '../utils/date';

function renderPage(path: string, page: ReactElement) {
  localStorage.setItem(
    'careconnect_session',
    JSON.stringify({ user: { id: 'cg', name: 'Joyce Adeyemi', email: 'joyce@example.test' }, role: 'caregiver' }),
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

describe('Manage medications', () => {
  test('adds a medication with two times, removes one, and saves it with its instructions', async () => {
    const user = userEvent.setup();
    renderPage('/app/manage-medications?new=1', <ManageMedications />);

    await user.type(screen.getByLabelText(/Medication name/), '  Metformin  ');
    await user.type(screen.getByLabelText(/^Dose/), '500 mg — 1 tablet');
    fireEvent.change(document.getElementById('time-0')!, { target: { value: '08:00' } });
    await user.click(screen.getByRole('button', { name: /Add another time/ }));
    fireEvent.change(document.getElementById('time-1')!, { target: { value: '20:00' } });
    await user.click(screen.getByRole('button', { name: /Add another time/ }));
    // The third time is removed again before saving.
    await user.click(screen.getByRole('button', { name: 'Remove time 3' }));
    expect(document.getElementById('time-2')).toBeNull();
    await user.type(screen.getByLabelText('Instructions / notes'), 'Take with breakfast and dinner.');
    await user.click(screen.getAllByRole('button', { name: 'Add medication' }).at(-1)!);

    expect(screen.queryByText('Add new medication')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Metformin' })).toBeInTheDocument();
    const saved = getMedications().find((m) => m.name === 'Metformin')!;
    expect(saved).toMatchObject({ dosage: '500 mg — 1 tablet', times: ['08:00', '20:00'], instructions: 'Take with breakfast and dinner.' });
    expect(saved.id).toMatch(/^med-/);
    expect(saved.taken).toEqual({});
  });

  test('a new medication with blank instructions is saved without instructions', async () => {
    const user = userEvent.setup();
    renderPage('/app/manage-medications?new=1', <ManageMedications />);
    await user.type(screen.getByLabelText(/Medication name/), 'Folic acid');
    await user.type(screen.getByLabelText(/^Dose/), '400 mcg');
    fireEvent.change(document.getElementById('time-0')!, { target: { value: '09:00' } });
    await user.click(screen.getAllByRole('button', { name: 'Add medication' }).at(-1)!);
    expect(getMedications().find((m) => m.name === 'Folic acid')!.instructions).toBeUndefined();
  });

  test('?edit= opens the medication pre-filled; Save changes keeps its id, colour and taken history', async () => {
    const user = userEvent.setup();
    const before = getMedications().find((m) => m.id === 'm1')!;
    renderPage('/app/manage-medications?edit=m1', <ManageMedications />);

    expect(screen.getByRole('heading', { name: 'Edit medication' })).toBeInTheDocument();
    const dose = screen.getByLabelText(/^Dose/);
    expect(screen.getByLabelText(/Medication name/)).toHaveValue(before.name);
    await user.clear(dose);
    await user.type(dose, '10 mg — 1 tablet');
    await user.clear(screen.getByLabelText('Instructions / notes'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    const after = getMedications().find((m) => m.id === 'm1')!;
    expect(after).toMatchObject({ name: before.name, dosage: '10 mg — 1 tablet', colour: before.colour, taken: before.taken });
    expect(after.instructions).toBeUndefined();
    expect(screen.getByText('10 mg — 1 tablet')).toBeInTheDocument();
  });

  test('editing a medication with no times starts the form with the 8:00 am default', () => {
    saveMedications([{ ...getMedications()[0], id: 'none', name: 'No-time med', times: [] }]);
    renderPage('/app/manage-medications?edit=none', <ManageMedications />);
    expect(document.getElementById('time-0')).toHaveValue('08:00');
    expect(document.getElementById('time-1')).toBeNull();
  });

  test('the Edit button opens the form for that medication, and Cancel closes it without saving', async () => {
    const user = userEvent.setup();
    const before = getMedications();
    renderPage('/app/manage-medications', <ManageMedications />);
    await user.click(screen.getByRole('button', { name: `Edit ${before[1].name}` }));
    expect(screen.getByLabelText(/Medication name/)).toHaveValue(before[1].name);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('heading', { name: 'Edit medication' })).not.toBeInTheDocument();
    expect(getMedications()).toEqual(before);
  });

  test('Delete asks first, and Yes, delete removes the medication from the list and the store', async () => {
    const user = userEvent.setup();
    const name = getMedications()[0].name;
    renderPage('/app/manage-medications', <ManageMedications />);
    await user.click(screen.getByRole('button', { name: `Delete ${name}` }));
    const dialog = screen.getByRole('dialog', { name: 'Delete medication' });
    await user.click(within(dialog).getByRole('button', { name: 'Yes, delete' }));
    expect(screen.queryByRole('heading', { name })).not.toBeInTheDocument();
    expect(getMedications().some((m) => m.name === name)).toBe(false);
  });

  test('shows the empty state when there are no medications', () => {
    saveMedications([]);
    renderPage('/app/manage-medications', <ManageMedications />);
    expect(screen.getByText('No medications added yet')).toBeInTheDocument();
  });
});

describe('Manage appointments', () => {
  const tomorrow = localDateKeyFromNow(1);

  async function fillRequired(user: ReturnType<typeof userEvent.setup>, title: string, type: string) {
    await user.type(screen.getByLabelText(/Appointment title/), title);
    fireEvent.change(screen.getByLabelText(/^Date/), { target: { value: tomorrow } });
    fireEvent.change(screen.getByLabelText(/^Time/), { target: { value: '10:30' } });
    await user.selectOptions(screen.getByLabelText(/Location type/), type);
    await user.type(screen.getByLabelText(/Location name/), 'Greenfield Surgery');
  }

  test('an in-person visit shows the Address field and saves address, caregiver and notes', async () => {
    const user = userEvent.setup();
    renderPage('/app/manage-appointments?new=1', <ManageAppointments />);
    expect(screen.queryByLabelText('Address')).not.toBeInTheDocument();
    await fillRequired(user, 'Diabetes review', 'clinic');
    await user.type(screen.getByLabelText('Address'), '12 Greenfield Road');
    await user.type(screen.getByLabelText('Assigned caregiver'), 'Joyce Adeyemi');
    await user.type(screen.getByLabelText('Patient notes'), 'Bring the glucose diary.');
    await user.click(screen.getAllByRole('button', { name: 'Add appointment' }).at(-1)!);

    expect(screen.getByRole('heading', { name: 'Diabetes review' })).toBeInTheDocument();
    expect(screen.getByText('Bring the glucose diary.')).toBeInTheDocument();
    const saved = getAppointments().find((a) => a.title === 'Diabetes review')!;
    expect(saved).toMatchObject({
      date: tomorrow, time: '10:30', caregiver: 'Joyce Adeyemi', notes: 'Bring the glucose diary.', isInMyDay: false,
      location: { name: 'Greenfield Surgery', address: '12 Greenfield Road', type: 'clinic' },
    });
  });

  test('a telephone appointment hides the Address field and saves no address, caregiver or notes', async () => {
    const user = userEvent.setup();
    renderPage('/app/manage-appointments?new=1', <ManageAppointments />);
    await fillRequired(user, 'Phone check-in', 'telephone');
    expect(screen.queryByLabelText('Address')).not.toBeInTheDocument();
    await user.click(screen.getAllByRole('button', { name: 'Add appointment' }).at(-1)!);
    const saved = getAppointments().find((a) => a.title === 'Phone check-in')!;
    expect(saved.location).toEqual({ name: 'Greenfield Surgery', address: undefined, type: 'telephone' });
    expect(saved.caregiver).toBeUndefined();
    expect(saved.notes).toBeUndefined();
  });

  test('saving an empty form lists every required field', async () => {
    const user = userEvent.setup();
    renderPage('/app/manage-appointments?new=1', <ManageAppointments />);
    await user.click(screen.getAllByRole('button', { name: 'Add appointment' }).at(-1)!);
    for (const msg of ['Appointment title is required.', 'Date is required.', 'Time is required.', 'Location name is required.', 'Location type is required.']) {
      expect(screen.getAllByText(msg).length).toBeGreaterThan(0);
    }
    expect(getAppointments().some((a) => a.title === '')).toBe(false);
  });

  test('?edit= opens the appointment pre-filled, and Save changes keeps its id and My Day setting', async () => {
    const user = userEvent.setup();
    const before = getAppointments().find((a) => a.id === 'a1')!;
    renderPage('/app/manage-appointments?edit=a1', <ManageAppointments />);
    expect(screen.getByRole('heading', { name: 'Edit appointment' })).toBeInTheDocument();
    const title = screen.getByLabelText(/Appointment title/);
    expect(title).toHaveValue(before.title);
    await user.clear(title);
    await user.type(title, 'Blood pressure check — moved');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    const after = getAppointments().find((a) => a.id === 'a1')!;
    expect(after.title).toBe('Blood pressure check — moved');
    expect(after.isInMyDay).toBe(before.isInMyDay);
    expect(screen.getByRole('heading', { name: 'Blood pressure check — moved' })).toBeInTheDocument();
  });

  test('the Edit button opens the form for that appointment, and Cancel closes it', async () => {
    const user = userEvent.setup();
    const first = getAppointments()[0];
    renderPage('/app/manage-appointments', <ManageAppointments />);
    await user.click(screen.getByRole('button', { name: `Edit: ${first.title}` }));
    expect(screen.getByLabelText(/Appointment title/)).toHaveValue(first.title);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('heading', { name: 'Edit appointment' })).not.toBeInTheDocument();
  });

  test('Delete asks first, and Yes, delete removes the appointment', async () => {
    const user = userEvent.setup();
    const first = getAppointments()[0];
    renderPage('/app/manage-appointments', <ManageAppointments />);
    await user.click(screen.getByRole('button', { name: `Delete: ${first.title}` }));
    await user.click(within(screen.getByRole('dialog', { name: 'Delete appointment' })).getByRole('button', { name: 'Yes, delete' }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: first.title })).not.toBeInTheDocument());
    expect(getAppointments().some((a) => a.id === first.id)).toBe(false);
  });

  test('lists appointments by date then time, marks today\'s, and shows the empty state', () => {
    const base: Omit<Appointment, 'id' | 'title' | 'date' | 'time'> = {
      location: { name: 'Clinic', type: 'clinic' }, isInMyDay: false,
    };
    saveAppointments([
      { ...base, id: 'x3', title: 'Later tomorrow', date: tomorrow, time: '15:00' },
      { ...base, id: 'x2', title: 'Earlier tomorrow', date: tomorrow, time: '09:00' },
      { ...base, id: 'x1', title: 'This afternoon', date: localDateKey(), time: '14:00', location: { name: 'Home', type: 'home', address: '1 Elm St' } },
    ]);
    const { unmount } = renderPage('/app/manage-appointments', <ManageAppointments />);
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    expect(titles).toEqual(['This afternoon', 'Earlier tomorrow', 'Later tomorrow']);
    const todayCard = screen.getByRole('heading', { name: 'This afternoon' }).closest('li')!;
    expect(within(todayCard).getByText('Today')).toBeInTheDocument();
    expect(within(todayCard).getByText(/1 Elm St/)).toBeInTheDocument();
    unmount();

    saveAppointments([]);
    renderPage('/app/manage-appointments', <ManageAppointments />);
    expect(screen.getByText('No appointments yet')).toBeInTheDocument();
  });
});
