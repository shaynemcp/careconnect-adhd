import {
  getScheduleForToday,
  getNextMedicationDose,
  markNextMedicationDose,
  skipNextMedicationDose,
  undoLastDoseChange,
  getCompletedScheduleIds,
  getSkippedScheduleIds,
} from '../data/scheduleStore';

// In the mock schedule, s3 (morning medications) is already done,
// so the next medication dose is s8 (evening medications).
describe('scheduleStore', () => {
  test('the next medication dose is the first one not done or skipped', () => {
    expect(getNextMedicationDose()?.id).toBe('s8');
  });

  test('marking the next dose taken records it for today and undo reverses it', () => {
    expect(markNextMedicationDose()?.id).toBe('s8');
    expect(getCompletedScheduleIds().has('s8')).toBe(true);
    expect(getScheduleForToday().find((i) => i.id === 's8')?.done).toBe(true);
    expect(getNextMedicationDose()).toBeUndefined();

    expect(undoLastDoseChange()?.id).toBe('s8');
    expect(getCompletedScheduleIds().has('s8')).toBe(false);
    expect(getNextMedicationDose()?.id).toBe('s8');
  });

  test('skipping the next dose records it and undo reverses it', () => {
    expect(skipNextMedicationDose()?.id).toBe('s8');
    expect(getSkippedScheduleIds().has('s8')).toBe(true);
    expect(getNextMedicationDose()).toBeUndefined();

    expect(undoLastDoseChange()?.id).toBe('s8');
    expect(getSkippedScheduleIds().has('s8')).toBe(false);
  });

  test('mark and skip do nothing when no dose is left', () => {
    markNextMedicationDose();
    expect(markNextMedicationDose()).toBeUndefined();
    expect(skipNextMedicationDose()).toBeUndefined();
  });

  test('undo with nothing to undo, or with corrupt data, returns undefined', () => {
    expect(undoLastDoseChange()).toBeUndefined();
    localStorage.setItem('careconnect_last_dose_action', '{bad');
    expect(undoLastDoseChange()).toBeUndefined();
    localStorage.setItem('careconnect_last_dose_action', JSON.stringify({ type: 'taken', scheduleItemId: 'nope' }));
    expect(undoLastDoseChange()).toBeUndefined();
  });

  test("yesterday's completions and skips do not carry over to today", () => {
    const stale = JSON.stringify({ date: '2000-01-01', ids: ['s8'] });
    localStorage.setItem('careconnect_schedule_done', stale);
    localStorage.setItem('careconnect_schedule_skipped', stale);
    expect(getCompletedScheduleIds().size).toBe(0);
    expect(getSkippedScheduleIds().size).toBe(0);
  });

  test('invalid stored completions and skips are ignored', () => {
    localStorage.setItem('careconnect_schedule_done', 'x');
    localStorage.setItem('careconnect_schedule_skipped', 'x');
    expect(getCompletedScheduleIds().size).toBe(0);
    expect(getSkippedScheduleIds().size).toBe(0);
  });
});
