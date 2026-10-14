// "Today" must be the local calendar day, and taken state must reset each day (#41).
// jest.config.cjs runs these in America/New_York, where UTC is 4 hours ahead in October.
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Medications from '../pages/Medications';
import { localDateKey, localDateKeyFromNow, localDateTimeAttr } from '../utils/date';
import { loadTakenForToday, saveTakenForToday, LS_MEDS_TAKEN_KEY } from '../data/medsTakenStore';
import { markNextMedicationDose, getNextMedicationDose, getCompletedScheduleIds } from '../data/scheduleStore';

const MON_8_30_PM_EDT = new Date('2026-10-06T00:30:00Z'); // Monday 10/5, 8:30 PM in New York

afterEach(() => {
  jest.useRealTimers();
  localStorage.clear();
});

test('tests run in a US time zone, so evening UTC rollover is visible', () => {
  expect(new Date('2026-10-06T00:30:00Z').getTimezoneOffset()).toBe(240);
});

test('localDateKey is the local day, not the UTC day', () => {
  expect(MON_8_30_PM_EDT.toISOString().slice(0, 10)).toBe('2026-10-06'); // what the old code used
  expect(localDateKey(MON_8_30_PM_EDT)).toBe('2026-10-05');
  expect(localDateTimeAttr(MON_8_30_PM_EDT)).toBe('2026-10-05T20:30');
});

test('localDateKeyFromNow counts calendar days across the end of DST', () => {
  const sat = new Date(2026, 9, 31, 23, 30); // Sat 10/31 11:30 PM; DST ends Sun 11/1
  expect(localDateKeyFromNow(1, sat)).toBe('2026-11-01');
  expect(localDateKeyFromNow(2, sat)).toBe('2026-11-02');
  expect(localDateKeyFromNow(-1, new Date(2026, 10, 1, 0, 30))).toBe('2026-10-31');
});

test('an evening dose marked at 7:30 PM is still taken at 8:30 PM the same evening', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-10-05T23:30:00Z')); // 7:30 PM EDT
  expect(markNextMedicationDose()?.id).toBe('s8');
  jest.setSystemTime(MON_8_30_PM_EDT);
  expect(getCompletedScheduleIds().has('s8')).toBe(true);
  expect(getNextMedicationDose()).toBeUndefined();
});

test('taken state is kept for the same day and ignored the next day', () => {
  saveTakenForToday({ m2: true }, '2026-10-05');
  expect(loadTakenForToday('2026-10-05')).toEqual({ m2: true });
  expect(loadTakenForToday('2026-10-06')).toEqual({});
  localStorage.setItem(LS_MEDS_TAKEN_KEY, JSON.stringify({ m2: true })); // pre-#41 format, no date
  expect(loadTakenForToday('2026-10-05')).toEqual({});
  localStorage.setItem(LS_MEDS_TAKEN_KEY, '{bad');
  expect(loadTakenForToday('2026-10-05')).toEqual({});
});

test('a medicine marked taken on Monday is not taken on Tuesday', () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date(2026, 9, 5, 10, 0)); // Monday 10 AM
  saveTakenForToday({ m2: true });
  const monday = render(<MemoryRouter><Medications /></MemoryRouter>);
  expect(screen.getByRole('button', { name: 'Mark Atorvastatin as not taken' })).toBeInTheDocument();
  monday.unmount();

  jest.setSystemTime(new Date(2026, 9, 6, 10, 0)); // Tuesday 10 AM, Monday's storage still there
  render(<MemoryRouter><Medications /></MemoryRouter>);
  expect(screen.getByRole('button', { name: 'Mark Atorvastatin as taken' })).toBeInTheDocument();
});
