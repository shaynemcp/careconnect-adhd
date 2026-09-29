/**
 * Windows installer launches (Assignment 8, Part 4): install/update/uninstall
 * runs only manage shortcuts and quit; normal launches are untouched.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { squirrelAction } = require('../src/squirrelEvents.cjs');

const EXE = path.join('C:', 'Users', 'u', 'AppData', 'Local', 'CareConnect', 'app-0.1.0', 'CareConnect.exe');
const UPDATE = path.join('C:', 'Users', 'u', 'AppData', 'Local', 'CareConnect', 'Update.exe');

test('a normal launch is not an installer run', () => {
  assert.equal(squirrelAction(['CareConnect.exe'], 'win32', EXE), null);
  assert.equal(squirrelAction(['CareConnect.exe', '--squirrel-firstrun'], 'win32', EXE), null,
    'the first launch after installing opens the app');
  assert.equal(squirrelAction(['CareConnect.exe', '--squirrel-install'], 'darwin', EXE), null, 'Windows only');
});

test('install and update create shortcuts, then quit', () => {
  for (const flag of ['--squirrel-install', '--squirrel-updated']) {
    assert.deepEqual(squirrelAction(['x', flag, '0.1.0'], 'win32', EXE),
      { quit: true, run: [UPDATE, ['--createShortcut', 'CareConnect.exe']] });
  }
});

test('uninstall removes shortcuts, then quits', () => {
  assert.deepEqual(squirrelAction(['x', '--squirrel-uninstall'], 'win32', EXE),
    { quit: true, run: [UPDATE, ['--removeShortcut', 'CareConnect.exe']] });
});

test('other installer flags just quit', () => {
  assert.deepEqual(squirrelAction(['x', '--squirrel-obsolete'], 'win32', EXE), { quit: true });
});
