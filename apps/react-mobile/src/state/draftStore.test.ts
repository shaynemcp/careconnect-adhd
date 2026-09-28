import AsyncStorage from '@react-native-async-storage/async-storage';

import { StoreKeys } from '../data/localStore';
import { emptyAppointmentDraft, emptyMedicationDraft } from '../models/types';
import { AUTOSAVE_DEBOUNCE_MS, useDraftStore } from './draftStore';

beforeEach(async () => {
  await AsyncStorage.clear();
  useDraftStore.setState({
    medicationDraft: emptyMedicationDraft(),
    medicationAutosave: 'idle',
    appointmentDraft: emptyAppointmentDraft(),
    appointmentAutosave: 'idle',
  });
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('medication draft autosave', () => {
  it('applies the change immediately and marks saving, then saved after the debounce', async () => {
    useDraftStore.getState().updateMedicationDraft((d) => ({ ...d, name: 'Ibuprofen' }));
    expect(useDraftStore.getState().medicationDraft.name).toBe('Ibuprofen');
    expect(useDraftStore.getState().medicationAutosave).toBe('saving');

    await jest.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);

    expect(useDraftStore.getState().medicationAutosave).toBe('saved');
    const stored = await AsyncStorage.getItem(StoreKeys.medicationDraft);
    expect(JSON.parse(stored!).name).toBe('Ibuprofen');
  });

  it('debounces rapid keystrokes into a single write', async () => {
    const setSpy = jest.spyOn(AsyncStorage, 'setItem');
    useDraftStore.getState().updateMedicationDraft((d) => ({ ...d, name: 'I' }));
    await jest.advanceTimersByTimeAsync(100);
    useDraftStore.getState().updateMedicationDraft((d) => ({ ...d, name: 'Ib' }));
    await jest.advanceTimersByTimeAsync(100);
    useDraftStore.getState().updateMedicationDraft((d) => ({ ...d, name: 'Ibu' }));
    await jest.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);

    expect(setSpy).toHaveBeenCalledTimes(1);
    expect(useDraftStore.getState().medicationDraft.name).toBe('Ibu');
  });

  it('flush writes immediately without waiting for the debounce', async () => {
    useDraftStore.getState().updateMedicationDraft((d) => ({ ...d, name: 'Aspirin' }));
    await useDraftStore.getState().flushMedicationDraft();
    const stored = await AsyncStorage.getItem(StoreKeys.medicationDraft);
    expect(JSON.parse(stored!).name).toBe('Aspirin');
  });

  it('flush is a no-op when nothing is pending', async () => {
    await expect(useDraftStore.getState().flushMedicationDraft()).resolves.toBeUndefined();
  });
});

describe('startNewMedicationDraft', () => {
  it('keeps an in-progress new-medication draft', async () => {
    useDraftStore.getState().updateMedicationDraft((d) => ({ ...d, name: 'Aspirin' }));
    await jest.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
    await useDraftStore.getState().startNewMedicationDraft();
    expect(useDraftStore.getState().medicationDraft.name).toBe('Aspirin');
  });

  it('clears an edit-in-progress draft when starting a new one', async () => {
    useDraftStore.setState({
      medicationDraft: { ...emptyMedicationDraft(), editingId: 'med-1', name: 'Metformin' },
    });
    await useDraftStore.getState().startNewMedicationDraft();
    expect(useDraftStore.getState().medicationDraft).toEqual(emptyMedicationDraft());
  });

  it('is a no-op (stays empty) when the draft is already empty', async () => {
    await useDraftStore.getState().startNewMedicationDraft();
    expect(useDraftStore.getState().medicationDraft).toEqual(emptyMedicationDraft());
  });
});

describe('startEditingMedicationDraft', () => {
  it('populates the draft from the medication and saves immediately', async () => {
    await useDraftStore.getState().startEditingMedicationDraft({
      id: 'med-1',
      patientId: 'p1',
      name: 'Metformin',
      dosage: '500 mg',
      scheduleTimes: ['08:00'],
      instructions: null,
      active: true,
    });
    const draft = useDraftStore.getState().medicationDraft;
    expect(draft.editingId).toBe('med-1');
    expect(draft.name).toBe('Metformin');
    expect(draft.instructions).toBe('');
    expect(useDraftStore.getState().medicationAutosave).toBe('saved');
    const stored = await AsyncStorage.getItem(StoreKeys.medicationDraft);
    expect(JSON.parse(stored!).editingId).toBe('med-1');
  });

  it('is a no-op when already editing the same medication', async () => {
    useDraftStore.setState({
      medicationDraft: { ...emptyMedicationDraft(), editingId: 'med-1', name: 'Changed locally' },
    });
    await useDraftStore.getState().startEditingMedicationDraft({
      id: 'med-1',
      patientId: 'p1',
      name: 'Metformin',
      dosage: '500 mg',
      scheduleTimes: ['08:00'],
      active: true,
    });
    expect(useDraftStore.getState().medicationDraft.name).toBe('Changed locally');
  });
});

describe('clearMedicationDraft', () => {
  it('resets to empty, sets autosave idle, and removes the persisted draft', async () => {
    useDraftStore.getState().updateMedicationDraft((d) => ({ ...d, name: 'Aspirin' }));
    await useDraftStore.getState().flushMedicationDraft();
    await useDraftStore.getState().clearMedicationDraft();
    expect(useDraftStore.getState().medicationDraft).toEqual(emptyMedicationDraft());
    expect(useDraftStore.getState().medicationAutosave).toBe('idle');
    expect(await AsyncStorage.getItem(StoreKeys.medicationDraft)).toBeNull();
  });
});

describe('appointment draft', () => {
  it('autosaves and can be edited', async () => {
    useDraftStore.getState().updateAppointmentDraft((d) => ({ ...d, title: 'Dentist' }));
    await jest.advanceTimersByTimeAsync(AUTOSAVE_DEBOUNCE_MS);
    expect(useDraftStore.getState().appointmentAutosave).toBe('saved');

    await useDraftStore.getState().startEditingAppointmentDraft({
      id: 'a1',
      patientId: 'p1',
      title: 'Physical therapy',
      startsAt: new Date(2026, 7, 27, 10, 0),
      locationName: 'Riverside PT',
      companionName: 'Renee',
    });
    expect(useDraftStore.getState().appointmentDraft.title).toBe('Physical therapy');
    expect(useDraftStore.getState().appointmentDraft.companionName).toBe('Renee');
  });

  it('flush writes the pending appointment draft immediately', async () => {
    useDraftStore.getState().updateAppointmentDraft((d) => ({ ...d, title: 'Eye exam' }));
    await useDraftStore.getState().flushAppointmentDraft();
    const stored = await AsyncStorage.getItem(StoreKeys.appointmentDraft);
    expect(JSON.parse(stored!).title).toBe('Eye exam');
    expect(useDraftStore.getState().appointmentAutosave).toBe('saved');
  });

  it('flush is a no-op when no appointment change is pending', async () => {
    await expect(useDraftStore.getState().flushAppointmentDraft()).resolves.toBeUndefined();
    expect(await AsyncStorage.getItem(StoreKeys.appointmentDraft)).toBeNull();
  });

  it('clears the appointment draft', async () => {
    useDraftStore.getState().updateAppointmentDraft((d) => ({ ...d, title: 'Dentist' }));
    await useDraftStore.getState().clearAppointmentDraft();
    expect(useDraftStore.getState().appointmentDraft).toEqual(emptyAppointmentDraft());
    expect(await AsyncStorage.getItem(StoreKeys.appointmentDraft)).toBeNull();
  });
});
