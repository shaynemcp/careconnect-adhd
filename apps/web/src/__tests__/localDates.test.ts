import { localDateKey, tomorrowDateKey } from '../utils/date';
import { getCompletedScheduleIds, getNextMedicationDose, markNextMedicationDose } from '../data/scheduleStore';
import { loadTakenToday, saveTakenToday } from '../data/takenStore';

describe('local date keys (TZ pinned to America/New_York)', () => {
  afterEach(() => {
    jest.useRealTimers();
    localStorage.clear();
  });

  test('the day does not roll over at 8 PM Eastern', () => {
    expect(localDateKey(new Date('2026-10-05T00:30:00Z'))).toBe('2026-10-04');
  });

  test('tomorrow is the next calendar day across a DST change', () => {
    expect(tomorrowDateKey(new Date('2026-11-01T12:00:00Z'))).toBe('2026-11-02');
  });

  test('evening dose marked at 7:30 PM EDT is still taken at 8:30 PM EDT', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-04T23:30:00Z'));
    const marked = markNextMedicationDose();
    expect(marked).toBeDefined();
    jest.setSystemTime(new Date('2026-10-05T00:30:00Z'));
    expect(getCompletedScheduleIds().has(marked!.id)).toBe(true);
    expect(getNextMedicationDose()?.id).not.toBe(marked!.id);
  });

  test('medicines marked taken on Monday are not taken on Tuesday', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-05T14:00:00Z'));
    saveTakenToday({ m2: true });
    expect(loadTakenToday()).toEqual({ m2: true });
    jest.setSystemTime(new Date('2026-10-06T14:00:00Z'));
    expect(loadTakenToday()).toEqual({});
  });

  test('old undated taken state is ignored', () => {
    localStorage.setItem('careconnect_meds_taken', JSON.stringify({ m2: true }));
    expect(loadTakenToday()).toEqual({});
  });
});
