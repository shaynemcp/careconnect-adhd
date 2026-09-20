import AsyncStorage from '@react-native-async-storage/async-storage';

import { StoreKeys } from '../data/localStore';
import { seedCareData } from '../data/mockData';
import {
  appSettingsToJson,
  careDataToJson,
  defaultAppSettings,
  sessionToJson,
} from '../models/serialization';
import { useCareDataStore } from './careDataStore';
import { useClockStore, stopClockTicking } from './clockStore';
import { hydrateStores } from './hydrate';
import { useDraftStore } from './draftStore';
import { useNotificationSettingsStore } from './notificationSettingsStore';
import { useSessionStore } from './sessionStore';
import { useSettingsStore } from './settingsStore';

afterEach(() => {
  // `hydrateStores` starts the real 30s wall-clock ticker — stop it so no
  // test in this file leaves a dangling `setInterval` behind.
  stopClockTicking();
});

beforeEach(async () => {
  await AsyncStorage.clear();
  useSessionStore.setState({ session: null, hydrated: false });
  useSettingsStore.setState({ ...defaultAppSettings(), hydrated: false });
  useNotificationSettingsStore.setState({ hydrated: false });
  useCareDataStore.setState({ hydrated: false });
});

describe('hydrateStores', () => {
  it('seeds fresh demo data and defaults when nothing is persisted', async () => {
    await hydrateStores();

    expect(useSessionStore.getState().session).toBeNull();
    expect(useSessionStore.getState().hydrated).toBe(true);
    expect(useSettingsStore.getState().demoClock).toBe(false);
    expect(useSettingsStore.getState().hydrated).toBe(true);
    expect(useNotificationSettingsStore.getState().hydrated).toBe(true);
    expect(useCareDataStore.getState().hydrated).toBe(true);
    expect(useCareDataStore.getState().data.patient.id).toBe('patient-0001');
    expect(useDraftStore.getState().medicationDraft.name).toBe('');

    // A fresh seed is written back so the next launch finds it.
    expect(await AsyncStorage.getItem(StoreKeys.careData)).not.toBeNull();
  });

  it('restores a previously-signed-in session and persisted care data as-is', async () => {
    const signedInAt = new Date(2026, 7, 24, 9, 0);
    await AsyncStorage.setItem(
      StoreKeys.session,
      JSON.stringify(sessionToJson({ role: 'caregiver', method: 'passkey', signedInAt, email: null })),
    );
    const seeded = seedCareData(new Date(2026, 7, 25, 14, 14));
    await AsyncStorage.setItem(StoreKeys.careData, JSON.stringify(careDataToJson(seeded)));

    await hydrateStores();

    expect(useSessionStore.getState().session?.role).toBe('caregiver');
    expect(useCareDataStore.getState().data.medications.length).toBe(seeded.medications.length);
  });

  it('falls back to seed data when persisted care data contains an invalid medication time', async () => {
    const seeded = seedCareData(new Date(2026, 7, 25, 14, 14));
    const corrupted = careDataToJson(seeded);

    const medications = corrupted.medications as Record<string, unknown>[];
    medications[0] = {
      ...medications[0],
      scheduleTimes: ['8am'],
    };

    await AsyncStorage.setItem(StoreKeys.careData, JSON.stringify(corrupted));

    await expect(hydrateStores()).resolves.toBeUndefined();

    expect(useCareDataStore.getState().hydrated).toBe(true);
    expect(useCareDataStore.getState().data.patient.id).toBe('patient-0001');

    const restoredRaw = await AsyncStorage.getItem(StoreKeys.careData);
    expect(restoredRaw).not.toBeNull();
    expect(restoredRaw).not.toContain('"8am"');
  });

  it('freezes "now" at the demo instant when the demo clock setting was left on', async () => {
    await AsyncStorage.setItem(
      StoreKeys.settings,
      JSON.stringify(appSettingsToJson({ themeMode: 'system', demoClock: true, shareWithCaregiver: true })),
    );

    await hydrateStores();

    expect(useSettingsStore.getState().demoClock).toBe(true);
    // kDemoInstant is Tuesday, August 25 2026, 2:14 PM — see core/utils/clock.ts.
    expect(useClockStore.getState().now).toEqual(new Date(2026, 7, 25, 14, 14));
  });
});
