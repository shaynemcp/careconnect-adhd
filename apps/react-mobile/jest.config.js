/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  // The manual mocks (AsyncStorage, DateTimePicker) are themselves jest.fn()s
  // whose call history otherwise survives across tests in the same file —
  // without this, `jest.spyOn` on an already-mocked method (e.g.
  // AsyncStorage.setItem in draftStore.test.ts) returns that same mock with
  // calls from a PRIOR test still in `.mock.calls`, making later assertions
  // like `toHaveBeenCalledTimes(1)` count leftover calls, not just this
  // test's. Equivalent to calling `jest.clearAllMocks()` before every test.
  clearMocks: true,
  // NOTE: the Jest option that runs *after* the test framework (and its
  // global `expect`) is installed is `setupFilesAfterEnv` — not
  // `setupFilesAfterEach` (that was a typo here, and Jest silently ignored
  // it as an unknown option). `@testing-library/react-native/extend-expect`
  // calls `expect.extend(...)` at import time, so it must be loaded via
  // setupFilesAfterEnv; `setupFiles` runs too early (before `expect`
  // exists) and is reserved for environment mocks that don't touch `expect`.
  setupFiles: ['./jest.setup.js'],
  setupFilesAfterEnv: ['./jest.setup.after-env.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|zustand))',
  ],
  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/screens/**/index.ts',
  ],
  coverageReporters: ['text', 'html', 'lcov', 'json-summary'],
  // Raised from 60 after the Week 6 test work (measured: statements 95.9,
  // branches 88.6, functions 95.0, lines 97.0). Set a little below the measured
  // values so an ordinary change does not trip the gate, but a real drop in
  // coverage does.
  coverageThreshold: {
    global: {
      statements: 90,
      branches: 80,
      functions: 90,
      lines: 90,
    },
  },
  testPathIgnorePatterns: ['/node_modules/', '/.expo/'],
  // The FIRST render in a test file pays a one-time, synchronous cost for
  // Jest/Babel to transform that file's whole import graph (screens pull in
  // navigation, theme, icon fonts, etc.) — observed as high as ~13s on a
  // slower machine. That cost blocks the event loop, so Jest's timeout timer
  // can't preempt a synchronous test either way, but an *async* first test
  // (one that awaits inside `waitFor`) can still exceed the 5s default once
  // it yields. Raise the per-test timeout so a slow cold compile doesn't
  // register as a failing test.
  testTimeout: 20000,
};
