/* eslint-disable @typescript-eslint/no-require-imports */
// Environment mocks only — this file runs via `setupFiles`, BEFORE Jest's
// test framework (and the global `expect`) is installed, so nothing here
// may call `expect.extend(...)`. The extend-expect matchers live in
// jest.setup.after-env.js, wired via `setupFilesAfterEnv` instead.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// @expo/vector-icons checks `Font.isLoaded(fontName)` on every icon render
// (createIconSet.js) to decide whether to show the glyph or a blank
// placeholder. The real implementation reaches into a native font registry
// that doesn't exist under Jest, throwing `loadedNativeFonts.forEach is not
// a function`. Icons have no native font to load in tests anyway, so mock
// the module to report every font as already loaded.
jest.mock('expo-font', () => ({
  __esModule: true,
  isLoaded: jest.fn(() => true),
  loadAsync: jest.fn(() => Promise.resolve()),
  useFonts: jest.fn(() => [true, null]),
}));

// The native date/time picker renders a platform UI that has no meaningful
// behaviour under jsdom/RN test renderer; screens call it imperatively via
// `open()` helpers in tests instead of driving the native picker.
jest.mock('@react-native-community/datetimepicker', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockDateTimePicker = (props) => React.createElement(View, { testID: 'mock-datetimepicker', ...props });
  return { __esModule: true, default: MockDateTimePicker };
});

// Announcements are posted after ANNOUNCEMENT_DELAY_MS on a device (see
// src/core/utils/announce.ts). Component and screen tests assert *what* is
// announced, so here they're posted at once; the delay itself is tested in
// src/core/utils/announce.test.ts, which uses the real module.
jest.mock('./src/core/utils/announce', () => {
  const actual = jest.requireActual('./src/core/utils/announce');
  const { AccessibilityInfo, Platform } = require('react-native');
  return {
    ...actual,
    announceAfterDelay: (message) => {
      if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true });
      return () => {};
    },
  };
});
