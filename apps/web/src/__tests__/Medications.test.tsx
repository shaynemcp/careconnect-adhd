import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Medications from '../pages/Medications';
import { medications as defaultMeds } from '../data/mockData';

const TOGGLE = /^Mark .* as (not )?taken$/;

/** Medications reads the route (Edit > Find from #38 lands here with focusSearch), so render it inside a router. */
const renderPage = () => render(<MemoryRouter><Medications /></MemoryRouter>);

describe('Medications page', () => {
  test('lists every medication with a named taken toggle', () => {
    renderPage();
    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(defaultMeds.length);
    for (const med of defaultMeds) {
      expect(
        screen.getByRole('button', { name: new RegExp(`^Mark ${med.name} as (not )?taken$`) }),
      ).toBeInTheDocument();
    }
  });

  test('marking a medicine taken updates the toggle and the activity log', async () => {
    renderPage();
    const toggle = screen.getAllByRole('button', { name: TOGGLE })[0];
    const name = defaultMeds[0].name;
    const wasTaken = toggle.getAttribute('aria-pressed') === 'true';
    await userEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', String(!wasTaken));
    expect(localStorage.getItem('careconnect_activity_log')).toContain(
      wasTaken ? `Unmarked ${name}` : `Marked ${name} as taken`,
    );
  });

  test('the taken toggle works from the keyboard', async () => {
    renderPage();
    const toggle = screen.getAllByRole('button', { name: TOGGLE })[0];
    const before = toggle.getAttribute('aria-pressed');
    toggle.focus();
    await userEvent.keyboard('{Enter}');
    expect(toggle.getAttribute('aria-pressed')).not.toBe(before);
  });

  test('the status message counts the medicines still to take', () => {
    renderPage();
    expect(screen.getAllByRole('status')[0]).toHaveTextContent(/still to take today|All medicines taken/);
  });

  test('selecting a medication reports it to the desktop shell', async () => {
    const setMedicationSelected = jest.fn();
    window.careconnectDesktop = {
      isDesktop: true,
      platform: 'win32',
      onCommand: () => () => {},
      scheduleReminder: jest.fn(),
      setMedicationSelected,
    };
    renderPage();
    await userEvent.click(screen.getAllByRole('article')[0]);
    expect(setMedicationSelected).toHaveBeenLastCalledWith(true);
    expect(sessionStorage.getItem('careconnect_desktop_selected_medication')).toBe(defaultMeds[0].id);
  });
});
