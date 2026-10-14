import {
  getMedications,
  saveMedications,
  getPausedMedicationReminderIds,
  toggleMedicationRemindersPaused,
  pickColour,
} from '../data/medsStore';
import { medications as defaultMeds } from '../data/mockData';

describe('medsStore', () => {
  test('returns the default medications when nothing is stored', () => {
    expect(getMedications()).toEqual(defaultMeds);
  });

  test('returns a copy, so callers cannot change the defaults', () => {
    getMedications().pop();
    expect(getMedications()).toHaveLength(defaultMeds.length);
  });

  test('saveMedications persists the list for the next read', () => {
    const one = [defaultMeds[0]];
    saveMedications(one);
    expect(getMedications()).toEqual(one);
  });

  test('falls back to the defaults when storage holds invalid JSON', () => {
    localStorage.setItem('careconnect_medications_list', '{not json');
    expect(getMedications()).toEqual(defaultMeds);
  });

  test('toggleMedicationRemindersPaused pauses, then resumes, and reports the new state', () => {
    expect(toggleMedicationRemindersPaused('m1')).toBe(true);
    expect(getPausedMedicationReminderIds()).toEqual(new Set(['m1']));
    expect(toggleMedicationRemindersPaused('m1')).toBe(false);
    expect(getPausedMedicationReminderIds().size).toBe(0);
  });

  test('paused reminders survive invalid storage by starting empty', () => {
    localStorage.setItem('careconnect_paused_medication_reminders', 'oops');
    expect(getPausedMedicationReminderIds().size).toBe(0);
  });

  test('pickColour cycles through the palette', () => {
    expect(pickColour(0)).toBe(pickColour(6));
    expect(pickColour(1)).not.toBe(pickColour(0));
  });
});
