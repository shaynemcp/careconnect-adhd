import { AccessibilityInfo, Platform } from 'react-native';

import { ANNOUNCEMENT_DELAY_MS, announceAfterDelay } from './announce';

// jest.setup.js posts announcements at once for screen tests; this file checks
// the real delay.
jest.unmock('./announce');

let announce: jest.SpyInstance;

beforeEach(() => {
  jest.useFakeTimers();
  jest.replaceProperty(Platform, 'OS', 'ios');
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibilityWithOptions').mockImplementation(() => {});
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('announceAfterDelay', () => {
  it('waits so VoiceOver can finish speaking the control that was just activated, then queues', () => {
    announceAfterDelay('Where: Enter where it is');

    jest.advanceTimersByTime(ANNOUNCEMENT_DELAY_MS - 1);
    expect(announce).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1);
    expect(announce).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledWith('Where: Enter where it is', { queue: true });
  });

  it('says nothing if cancelled before the delay, e.g. the message already went away', () => {
    const cancel = announceAfterDelay('Metformin logged at 2:14 PM. Undo available');
    cancel();
    jest.advanceTimersByTime(ANNOUNCEMENT_DELAY_MS);

    expect(announce).not.toHaveBeenCalled();
  });

  it('stays silent on Android, where live regions speak the message', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    announceAfterDelay('Where: Enter where it is');
    jest.advanceTimersByTime(ANNOUNCEMENT_DELAY_MS);

    expect(announce).not.toHaveBeenCalled();
  });
});
