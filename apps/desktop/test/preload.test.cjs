/**
 * Renderer-side bridge tests (Assignment 8, Part 2): the API exposed to the web
 * app, and how IPC messages from the main process reach the page.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createFakeElectron, loadWith } = require('./support/fakeElectron.cjs');

const PRELOAD = path.join(__dirname, '../src/preload.cjs');

function withDom(fn) {
  const events = [];
  const classes = new Set();
  const history = [];
  const saved = { window: global.window, document: global.document, CustomEvent: global.CustomEvent, PopStateEvent: global.PopStateEvent };
  global.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
  global.PopStateEvent = class { constructor(type) { this.type = type; } };
  global.window = {
    history: { pushState: (_s, _t, url) => history.push(url) },
    dispatchEvent: (e) => events.push(e),
  };
  global.document = { documentElement: { classList: { toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)) } } };
  try {
    return fn({ events, classes, history });
  } finally {
    Object.assign(global, saved);
  }
}

test('exposes only the small desktop API to the web app', () => {
  const fake = createFakeElectron({ platform: 'win32' });
  loadWith(fake, PRELOAD);
  const api = fake.calls.exposed.careconnectDesktop;
  assert.deepEqual(Object.keys(api).sort(), ['isDesktop', 'platform', 'setMedicationSelected']);
  assert.equal(api.isDesktop, true);
});

test('setMedicationSelected sends a boolean cc:selection message to the main process', () => {
  const fake = createFakeElectron({ platform: 'win32' });
  loadWith(fake, PRELOAD);
  fake.calls.exposed.careconnectDesktop.setMedicationSelected('yes');
  fake.calls.exposed.careconnectDesktop.setMedicationSelected(0);
  assert.deepEqual(fake.calls.sent, [['cc:selection', true], ['cc:selection', false]]);
});

test('cc:navigate pushes app routes and ignores anything that is not a path', () => {
  const fake = createFakeElectron({ platform: 'win32' });
  loadWith(fake, PRELOAD);
  withDom(({ events, history }) => {
    fake.electron.ipcRenderer.emit('cc:navigate', {}, '/app/medications');
    fake.electron.ipcRenderer.emit('cc:navigate', {}, 'https://evil.example/');
    fake.electron.ipcRenderer.emit('cc:navigate', {}, 42);
    assert.deepEqual(history, ['/app/medications']);
    assert.equal(events.length, 1);
    assert.equal(events[0].type, 'popstate');
  });
});

test('cc:command becomes a careconnect:command DOM event', () => {
  const fake = createFakeElectron({ platform: 'win32' });
  loadWith(fake, PRELOAD);
  withDom(({ events }) => {
    fake.electron.ipcRenderer.emit('cc:command', {}, 'mark-next-dose-taken');
    assert.equal(events[0].type, 'careconnect:command');
    assert.equal(events[0].detail, 'mark-next-dose-taken');
  });
});

test('cc:high-contrast toggles the cc-high-contrast class on <html>', () => {
  const fake = createFakeElectron({ platform: 'win32' });
  loadWith(fake, PRELOAD);
  withDom(({ classes }) => {
    fake.electron.ipcRenderer.emit('cc:high-contrast', {}, true);
    assert.ok(classes.has('cc-high-contrast'));
    fake.electron.ipcRenderer.emit('cc:high-contrast', {}, false);
    assert.ok(!classes.has('cc-high-contrast'));
  });
});
