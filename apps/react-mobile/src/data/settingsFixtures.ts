/**
 * Settings states the switch tests need, so they can check
 * `accessibilityState.checked` going each way. Built from the real defaults
 * (sharing on, daily digest on, demo clock off), setting only the field each
 * one is named for.
 */
import { defaultAppSettings, defaultNotificationSettings } from '../models/serialization';
import type { AppSettings, NotificationSettings } from '../models/types';

export const sharingPausedSettings: AppSettings = { ...defaultAppSettings(), shareWithCaregiver: false };

export const demoClockOnSettings: AppSettings = { ...defaultAppSettings(), demoClock: true };
export const demoClockOffSettings: AppSettings = { ...defaultAppSettings(), demoClock: false };

export const dailyDigestOffSettings: NotificationSettings = {
  ...defaultNotificationSettings(),
  dailyDigest: false,
};
