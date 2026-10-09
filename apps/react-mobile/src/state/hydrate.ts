/**
 * Loads every persisted store from AsyncStorage before the app renders its
 * first frame — the React Native equivalent of the Dart port's `main()`
 * awaiting `SharedPreferences.getInstance()` before `runApp()`, so the
 * orientation bar and next dose are visible immediately with no loading
 * spinner.
 */
import { kDemoInstant } from '../core/utils/clock';
import { parseLocalTime } from '../core/utils/dateFormatting';
import { contains, readAs, StoreKeys, writeJson } from '../data/localStore';
import { seedCareData } from '../data/mockData';
import {
  appSettingsFromJson,
  appointmentDraftFromJson,
  careDataFromJson,
  careDataToJson,
  defaultAppSettings,
  defaultNotificationSettings,
  medicationDraftFromJson,
  notificationSettingsFromJson,
  sessionFromJson,
} from '../models/serialization';
import { emptyAppointmentDraft, emptyMedicationDraft } from '../models/types';
import { useCareDataStore, withDosesForDay } from './careDataStore';
import { useDraftStore } from './draftStore';
import { useNotificationSettingsStore } from './notificationSettingsStore';
import { useSessionStore } from './sessionStore';
import { useSettingsStore } from './settingsStore';
import { startClockTicking, useClockStore } from './clockStore';

function validateCareData(data: ReturnType<typeof careDataFromJson>) {
  if (Number.isNaN(data.seededOn.getTime())) {
    throw new Error('Invalid seededOn date');
  }

  for (const medication of data.medications) {
    for (const time of medication.scheduleTimes) {
      parseLocalTime(time);
    }
  }

  for (const dose of data.doseEvents) {
    if (Number.isNaN(dose.scheduledFor.getTime())) {
      throw new Error('Invalid dose scheduledFor date');
    }
    if (dose.recordedAt != null && Number.isNaN(dose.recordedAt.getTime())) {
      throw new Error('Invalid dose recordedAt date');
    }
  }

  for (const appointment of data.appointments) {
    if (Number.isNaN(appointment.startsAt.getTime())) {
      throw new Error('Invalid appointment startsAt date');
    }
  }

  for (const entry of data.activity) {
    if (Number.isNaN(entry.at.getTime())) {
      throw new Error('Invalid activity date');
    }
  }

  return data;
}

export async function hydrateStores(): Promise<void> {
  const [session, settings, notifications, medicationDraft, appointmentDraft, hadCareData] =
    await Promise.all([
      readAs(StoreKeys.session, sessionFromJson, () => null),
      readAs(StoreKeys.settings, appSettingsFromJson, defaultAppSettings),
      readAs(StoreKeys.notifications, notificationSettingsFromJson, defaultNotificationSettings),
      readAs(StoreKeys.medicationDraft, medicationDraftFromJson, emptyMedicationDraft),
      readAs(StoreKeys.appointmentDraft, appointmentDraftFromJson, emptyAppointmentDraft),
      contains(StoreKeys.careData),
    ]);

  useSettingsStore.getState().hydrate(settings);
  // The demo-clock subscription in clockStore.ts only fires on a *change*,
  // so force a refresh here in case the persisted value equals the default.
  useClockStore.getState().refresh();
  const now = settings.demoClock ? kDemoInstant : useClockStore.getState().now;

  let recoveredCareData = false;

  const baseCareData = hadCareData
    ? await readAs(
       StoreKeys.careData,
       (json) => validateCareData(careDataFromJson(json)),
       () => {
         recoveredCareData = true;
         return seedCareData(now);
       },
     )
   : seedCareData(now);

  const careData = withDosesForDay(baseCareData, now);
  if (!hadCareData || recoveredCareData || careData !== baseCareData) {
    await writeJson(StoreKeys.careData, careDataToJson(careData));
  }

  useSessionStore.getState().hydrate(session);
  useNotificationSettingsStore.getState().hydrate(notifications);
  useCareDataStore.getState().hydrate(careData);
  useDraftStore.getState().hydrateMedicationDraft(medicationDraft);
  useDraftStore.getState().hydrateAppointmentDraft(appointmentDraft);

  startClockTicking();
}
