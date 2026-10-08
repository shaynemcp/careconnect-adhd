import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import DesktopIntegration from '../desktop/DesktopIntegration';
import { formatDoseTime } from '../desktop/formatDoseTime';
import { getMedications, getPausedMedicationReminderIds } from '../data/medsStore';
import { getCompletedScheduleIds } from '../data/scheduleStore';

/** Stand-in for the preload bridge: records the onCommand callback so tests can send menu commands. */
function installDesktop() {
  let handler: ((name: string) => void) | undefined;
  const unsubscribe = jest.fn();
  const bridge = {
    isDesktop: true,
    platform: 'win32',
    onCommand: jest.fn((cb: (name: string) => void) => {
      handler = cb;
      return unsubscribe;
    }),
    scheduleReminder: jest.fn(),
    setMedicationSelected: jest.fn(),
  };
  window.careconnectDesktop = bridge;
  return {
    bridge,
    unsubscribe,
    send: (name: string) => act(() => handler?.(name)),
  };
}

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
}

function renderApp() {
  return render(
    <MemoryRouter initialEntries={['/app/medications']}>
      <DesktopIntegration />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

const selectMedication = (id: string) =>
  sessionStorage.setItem('careconnect_desktop_selected_medication', id);

describe('DesktopIntegration (desktop menu commands)', () => {
  test('does nothing in a normal browser', () => {
    renderApp();
    expect(screen.getByTestId('where')).toHaveTextContent('/app/medications');
  });

  test('subscribes to menu commands and unsubscribes on unmount', () => {
    const { bridge, unsubscribe } = installDesktop();
    const { unmount } = renderApp();
    expect(bridge.onCommand).toHaveBeenCalledTimes(1);
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  test('Edit Schedule opens the schedule page', () => {
    const { send } = installDesktop();
    renderApp();
    send('edit-schedule');
    expect(screen.getByTestId('where')).toHaveTextContent('/app/schedule');
  });

  test('Edit Medication opens the manage screen for the selected medication only', () => {
    const { send } = installDesktop();
    renderApp();
    send('edit-medication');
    expect(screen.getByTestId('where')).toHaveTextContent('/app/medications');
    selectMedication('m2');
    send('edit-medication');
    expect(screen.getByTestId('where')).toHaveTextContent('/app/manage-medications?edit=m2');
  });

  test('Duplicate adds a copy of the selected medication', () => {
    const { send } = installDesktop();
    renderApp();
    const before = getMedications().length;
    send('duplicate-medication');
    expect(getMedications()).toHaveLength(before);
    selectMedication('m1');
    send('duplicate-medication');
    const meds = getMedications();
    expect(meds).toHaveLength(before + 1);
    expect(meds[meds.length - 1].name).toBe(`${meds[0].name} Copy`);
    expect(screen.getByTestId('where')).toHaveTextContent('/app/manage-medications');
  });

  test('Delete asks first; Cancel keeps the medication, confirming removes it and announces it', async () => {
    const { send, bridge } = installDesktop();
    renderApp();
    selectMedication('m1');
    const name = getMedications()[0].name;

    send('delete-medication');
    expect(screen.getByRole('dialog', { name: 'Delete medication?' })).toHaveAccessibleDescription(
      `Are you sure you want to delete ${name}? This cannot be undone.`,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(getMedications().some((m) => m.id === 'm1')).toBe(true);

    send('delete-medication');
    await userEvent.click(screen.getByRole('button', { name: 'Yes, delete' }));
    expect(getMedications().some((m) => m.id === 'm1')).toBe(false);
    expect(bridge.setMedicationSelected).toHaveBeenCalledWith(false);
    expect(screen.getByRole('status')).toHaveTextContent(`${name} deleted.`);
  });

  test('Pause Reminders toggles and announces the change', () => {
    const { send } = installDesktop();
    renderApp();
    selectMedication('m1');
    const name = getMedications()[0].name;
    send('pause-reminders');
    expect(getPausedMedicationReminderIds().has('m1')).toBe(true);
    expect(screen.getByRole('status')).toHaveTextContent(`Reminders paused for ${name}.`);
    send('pause-reminders');
    expect(screen.getByRole('status')).toHaveTextContent(`Reminders resumed for ${name}.`);
  });

  test('Share with Caregiver logs the share and announces it', () => {
    const { send } = installDesktop();
    renderApp();
    selectMedication('m1');
    const name = getMedications()[0].name;
    send('share-with-caregiver');
    expect(localStorage.getItem('careconnect_activity_log')).toContain(`Shared ${name} with caregiver`);
    expect(screen.getByRole('status')).toHaveTextContent(`${name} shared with caregiver.`);
  });

  test('Mark Next Dose Taken records the dose and tells the page to refresh', () => {
    const { send } = installDesktop();
    renderApp();
    const refreshed = jest.fn();
    window.addEventListener('careconnect:schedule-updated', refreshed);
    try {
      send('mark-next-dose-taken');
      expect(getCompletedScheduleIds().has('s8')).toBe(true);
      expect(refreshed).toHaveBeenCalled();

      send('undo-dose-change');
      expect(getCompletedScheduleIds().has('s8')).toBe(false);
      expect(refreshed).toHaveBeenCalledTimes(2);
    } finally {
      window.removeEventListener('careconnect:schedule-updated', refreshed);
    }
  });

  test('Skip Next Dose asks first, then logs the skip', async () => {
    const { send } = installDesktop();
    renderApp();
    send('skip-next-dose');
    expect(screen.getByRole('dialog', { name: 'Skip Evening medications?' })).toBeInTheDocument();
    // 12-hour time like the rest of the app, not "17:30" (#49)
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('This will skip the scheduled dose at 5:30 pm.');
    await userEvent.click(screen.getByRole('button', { name: 'Skip dose' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(localStorage.getItem('careconnect_activity_log')).toContain('Skipped Evening medications');
  });

  test('Remind in 10 Minutes asks the desktop shell for a reminder about the next dose', () => {
    const { send, bridge } = installDesktop();
    renderApp();
    send('remind-in-10-minutes');
    expect(bridge.scheduleReminder).toHaveBeenCalledWith('Evening medications', 10);
  });

  test('Open Medication moves focus to the selected medication card', () => {
    const { send } = installDesktop();
    render(
      <MemoryRouter>
        <DesktopIntegration />
        <article id="medication-m1" tabIndex={0}>Amlodipine</article>
      </MemoryRouter>,
    );
    selectMedication('m1');
    send('open-medication');
    expect(screen.getByText('Amlodipine')).toHaveFocus();
  });

  test('commands that need a selection do nothing without one', () => {
    const { send } = installDesktop();
    renderApp();
    for (const name of ['open-medication', 'delete-medication', 'pause-reminders', 'share-with-caregiver', 'unknown-command']) {
      send(name);
    }
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

describe('formatDoseTime (#49)', () => {
  test.each([
    ['17:30', '5:30 pm'],
    ['08:05', '8:05 am'],
    ['00:00', '12:00 am'],
    ['12:15', '12:15 pm'],
    ['soon', 'soon'],
  ])('%s -> %s', (input, expected) => {
    expect(formatDoseTime(input)).toBe(expected);
  });
});
