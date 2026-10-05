/**
 * Jest + React Testing Library for the web app (Assignment 8, Part 2: unit tests).
 * The Electron main process and IPC are tested with node:test in apps/desktop.
 *
 * Run: npm test -- --coverage   (HTML report in coverage/lcov-report/)
 */
module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        // Type-checking is `npm run typecheck`; here we only transpile.
        tsconfig: {
          isolatedModules: true,
          jsx: 'react-jsx',
          module: 'CommonJS',
          esModuleInterop: true,
          allowImportingTsExtensions: false,
          verbatimModuleSyntax: false,
        },
      },
    ],
  },
  moduleNameMapper: {
    // The repo root has React 18 (for other packages); the web app and
    // react-dom use React 19, so always resolve react to the web app's copy.
    '^react$': '<rootDir>/node_modules/react',
    '^react/(.*)$': '<rootDir>/node_modules/react/$1',
    '\\.(css|svg|png|jpg)$': '<rootDir>/jest.fileStub.cjs',
  },
  collectCoverageFrom: [
    'src/data/medsStore.ts',
    'src/data/scheduleStore.ts',
    'src/components/ConfirmDialog.tsx',
    'src/desktop/DesktopIntegration.tsx',
    'src/pages/Medications.tsx',
  ],
  // CI runs plain `npm test`, so collect coverage on every run to make the threshold a real gate.
  collectCoverage: true,
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: { global: { lines: 60, branches: 60, functions: 60, statements: 60 } },
};
