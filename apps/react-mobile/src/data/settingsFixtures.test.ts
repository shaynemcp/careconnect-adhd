import { defaultAppSettings, defaultNotificationSettings } from '../models/serialization';
import {
  dailyDigestOffSettings,
  demoClockOffSettings,
  demoClockOnSettings,
  sharingPausedSettings,
} from './settingsFixtures';

describe('settings fixtures', () => {
  it('pause caregiver sharing, which is on by default', () => {
    expect(defaultAppSettings().shareWithCaregiver).toBe(true);
    expect(sharingPausedSettings.shareWithCaregiver).toBe(false);
  });

  it('cover both states of the demo clock toggle', () => {
    expect(demoClockOnSettings.demoClock).toBe(true);
    expect(demoClockOffSettings.demoClock).toBe(false);
  });

  it('turn off the daily digest, which is on by default', () => {
    expect(defaultNotificationSettings().dailyDigest).toBe(true);
    expect(dailyDigestOffSettings.dailyDigest).toBe(false);
  });

  it('leave every other field at its default', () => {
    expect({ ...sharingPausedSettings, shareWithCaregiver: true }).toEqual(defaultAppSettings());
    expect({ ...demoClockOnSettings, demoClock: false }).toEqual(defaultAppSettings());
    expect({ ...dailyDigestOffSettings, dailyDigest: true }).toEqual(defaultNotificationSettings());
  });
});
