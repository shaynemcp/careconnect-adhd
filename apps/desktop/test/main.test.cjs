/**
 * Main-process tests (Assignment 8, Part 2): window creation and security,
 * IPC from the renderer, navigation guards, zoom, high contrast, printing,
 * window-state persistence and app lifecycle. Electron is replaced by
 * test/support/fakeElectron.cjs so these run under plain `node --test`.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createFakeElectron, loadWith } = require('./support/fakeElectron.cjs');

const MAIN = path.join(__dirname, '../src/main.cjs');

async function start(opts) {
  const fake = createFakeElectron(opts);
  loadWith(fake, MAIN);
  await fake.ready();
  return { fake, win: fake.windows[0], wc: fake.windows[0].webContents };
}
const flush = () => new Promise((r) => setImmediate(r));
/** Wait for an async chain that includes real file I/O. */
async function until(check, ms = 2000) {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error('timed out waiting for condition');
    await new Promise((r) => setTimeout(r, 10));
  }
}
/**
 * main.cjs reads the real process.platform when it builds the menu on ready, so
 * the menu tests pin it; otherwise macOS builds the Mac menu (Linux CI passes either way).
 */
async function onPlatform(platform, fn) {
  const orig = Object.getOwnPropertyDescriptor(process, 'platform');
  Object.defineProperty(process, 'platform', { value: platform });
  try { return await fn(); } finally { Object.defineProperty(process, 'platform', orig); }
}
function asPlatform(platform, fn) {
  const orig = Object.getOwnPropertyDescriptor(process, 'platform');
  Object.defineProperty(process, 'platform', { value: platform });
  try { return fn(); } finally { Object.defineProperty(process, 'platform', orig); }
}

test('main window is created with a locked-down renderer and loads the dev server', async () => {
  const { win } = await start({ platform: 'win32' });
  const wp = win.opts.webPreferences;
  assert.equal(wp.nodeIntegration, false);
  assert.equal(wp.contextIsolation, true);
  assert.equal(wp.sandbox, true);
  assert.match(wp.preload, /preload\.cjs$/);
  assert.equal(win.loaded, 'http://localhost:5173');
  assert.ok(win.opts.minWidth <= 1024 && win.opts.minHeight <= 700);
});

test('main window uses the CareConnect icon, and the icon files exist', async () => {
  const { win } = await start({ platform: 'win32' });
  assert.match(win.opts.icon, /assets[\\/]icon\.png$/);
  assert.ok(fs.existsSync(win.opts.icon), 'window icon');
  assert.ok(fs.existsSync(path.join(__dirname, '../assets/icon.ico')), 'installer and .exe icon');
});

test('window is shown only when ready, and restored maximized if it was', async () => {
  const fake = createFakeElectron({ platform: 'win32' });
  fs.writeFileSync(path.join(fake.userData, 'window-state.json'),
    JSON.stringify({ x: 10, y: 10, width: 1200, height: 800, isMaximized: true }));
  loadWith(fake, MAIN);
  await fake.ready();
  const win = fake.windows[0];
  assert.equal(win.shown, false);
  win.emit('ready-to-show');
  assert.equal(win.shown, true);
  assert.equal(win.maximized, true);
});

test('application menu is installed on ready', async () => {
  await onPlatform('win32', async () => {
    const { fake } = await start({ platform: 'win32' });
    assert.ok(fake.calls.menus.length >= 1);
    assert.deepEqual(fake.lastMenu().map((m) => m.label), ['&File', '&Edit', '&View', '&Dose', '&Help']);
  });
});

test('IPC cc:selection from the main window enables the medication menu items', async () => {
  const { fake, wc } = await start({ platform: 'win32' });
  assert.equal(fake.menuItem('delete-medication').enabled, false);
  fake.electron.ipcMain.emit('cc:selection', { sender: wc }, true);
  assert.equal(fake.menuItem('delete-medication').enabled, true);
  assert.equal(fake.menuItem('edit-medication').enabled, true);
  fake.electron.ipcMain.emit('cc:selection', { sender: wc }, false);
  assert.equal(fake.menuItem('delete-medication').enabled, false);
});

test('IPC cc:selection from any other sender is ignored, and repeats do not rebuild the menu', async () => {
  const { fake, wc } = await start({ platform: 'win32' });
  fake.electron.ipcMain.emit('cc:selection', { sender: {} }, true);
  assert.equal(fake.menuItem('delete-medication').enabled, false);
  fake.electron.ipcMain.emit('cc:selection', { sender: wc }, true);
  const count = fake.calls.menus.length;
  fake.electron.ipcMain.emit('cc:selection', { sender: wc }, true);
  assert.equal(fake.calls.menus.length, count);
});

test('menu navigation and commands are sent to the renderer over IPC', async () => {
  const { fake, wc } = await start({ platform: 'win32' });
  fake.menuItem('go-today').click();
  fake.menuItem('mark-next-taken').click();
  assert.deepEqual(wc.sentMessages.filter(([c]) => c !== 'cc:high-contrast'),
    [['cc:navigate', '/app'], ['cc:command', 'mark-next-dose-taken']]);
});

test('Ctrl+Enter is consumed and sends mark-next-dose-taken', async () => {
  await onPlatform('win32', async () => {
    const { wc } = await start({ platform: 'win32' });
    let prevented = false;

    wc.emit(
      'before-input-event',
      { preventDefault: () => { prevented = true; } },
      {
        type: 'keyDown',
        key: 'Enter',
        control: true,
        meta: false,
        shift: false,
        alt: false,
      },
    );

    assert.equal(prevented, true);
    assert.ok(
      wc.sentMessages.some(
        ([channel, payload]) =>
          channel === 'cc:command' && payload === 'mark-next-dose-taken',
      ),
    );
  });
});

test('new windows are denied; only web, mail and phone links reach the OS', async () => {
  const { fake, wc } = await start({ platform: 'win32' });
  assert.deepEqual(wc.windowOpenHandler({ url: 'https://example.com/' }), { action: 'deny' });
  wc.windowOpenHandler({ url: 'file:///C:/Windows/System32/calc.exe' });
  wc.windowOpenHandler({ url: 'mailto:help@example.com' });
  assert.deepEqual(fake.calls.opened, ['https://example.com/', 'mailto:help@example.com']);
});

test('navigating away from the app is blocked; same-origin navigation is allowed', async () => {
  const { fake, wc } = await start({ platform: 'win32' });
  let prevented = false;
  wc.emit('will-navigate', { preventDefault: () => { prevented = true; } }, 'https://evil.example/');
  assert.equal(prevented, true);
  assert.deepEqual(fake.calls.opened, ['https://evil.example/']);
  prevented = false;
  wc.emit('will-navigate', { preventDefault: () => { prevented = true; } }, 'http://localhost:5173/app');
  assert.equal(prevented, false);
});

test('zoom goes up to 200% and down to 80%, and Actual Size resets it', async () => {
  const { fake, wc } = await start({ platform: 'win32' });
  for (let i = 0; i < 20; i++) fake.menuItem('zoom-in').click();
  assert.equal(wc.zoom, 4);
  for (let i = 0; i < 20; i++) fake.menuItem('zoom-out').click();
  assert.equal(wc.zoom, -1);
  fake.menuItem('zoom-reset').click();
  assert.equal(wc.zoom, 0);
});

test('High Contrast toggles the renderer class and the menu checkbox', async () => {
  const { fake, wc } = await start({ platform: 'win32' });
  fake.menuItem('high-contrast').click();
  assert.deepEqual(wc.sentMessages.at(-1), ['cc:high-contrast', true]);
  assert.equal(fake.menuItem('high-contrast').checked, true);
});

test('an OS high-contrast change overrides the menu choice; a dark-mode change does not', async () => {
  const { fake, wc } = await start({ platform: 'win32' });
  fake.menuItem('high-contrast').click();
  const before = wc.sentMessages.length;
  fake.electron.nativeTheme.emit('updated'); // dark mode flipped, contrast unchanged
  assert.equal(wc.sentMessages.length, before);
  fake.electron.nativeTheme.shouldUseHighContrastColors = true;
  fake.electron.nativeTheme.emit('updated');
  assert.deepEqual(wc.sentMessages.at(-1), ['cc:high-contrast', true]);
});

test('contrast state is re-sent after every page load', async () => {
  const { wc } = await start({ platform: 'win32', highContrast: true });
  wc.emit('did-finish-load');
  assert.deepEqual(wc.sentMessages.at(-1), ['cc:high-contrast', true]);
});

test('a failed print explains why and saves a PDF when the user chooses it', async () => {
  const { fake, wc } = await start({ platform: 'win32' });
  const out = path.join(fake.userData, 'out.pdf');
  wc.printResult = { ok: false, reason: 'No printers available' };
  fake.dialogAnswers.messageBox = { response: 0 };
  fake.dialogAnswers.saveDialog = { canceled: false, filePath: out };
  fake.menuItem('print-today').click();
  await until(() => fs.existsSync(out) && fs.statSync(out).size > 0);
  assert.match(fake.calls.dialogs[0].detail, /No printers available/);
  assert.equal(fs.readFileSync(out, 'utf8'), '%PDF-fake');
});

test('a cancelled print shows nothing', async () => {
  const { fake, wc } = await start({ platform: 'win32' });
  wc.printResult = { ok: false, reason: 'cancelled' };
  fake.menuItem('print-today').click();
  await flush();
  assert.equal(fake.calls.dialogs.length, 0);
});

test('a PDF that cannot be written is reported, not swallowed', async () => {
  const { fake, wc } = await start({ platform: 'win32' });
  wc.printResult = { ok: false, reason: '' };
  fake.dialogAnswers.messageBox = { response: 0 };
  fake.dialogAnswers.saveDialog = { canceled: false, filePath: path.join(fake.userData, 'missing-dir', 'x.pdf') };
  fake.menuItem('print-today').click();
  await until(() => fake.calls.errors.length === 1);
  assert.match(fake.calls.dialogs[0].detail, /did not respond/);
  assert.match(fake.calls.errors[0][1], /could not be saved/);
});

test('Keyboard Shortcuts opens one help window, and Esc closes it', async () => {
  const { fake } = await start({ platform: 'win32' });
  fake.menuItem('shortcuts').click();
  fake.menuItem('shortcuts').click();
  const help = fake.windows[1];
  assert.equal(fake.windows.length, 2, 'a second press focuses the existing window');
  assert.equal(help.focused, true);
  assert.match(help.loaded, /^data:text\/html/);
  let prevented = false;
  help.webContents.emit('before-input-event', { preventDefault: () => { prevented = true; } }, { type: 'keyDown', key: 'Escape' });
  assert.equal(prevented, true);
  assert.equal(help.isDestroyed(), true);
});

test('About shows the app version', async () => {
  await onPlatform('win32', async () => {
    const { fake } = await start({ platform: 'win32' });
    fake.menuItem('about').click();
    assert.match(fake.calls.dialogs[0].detail, /Version 0\.1\.0/);
  });
});

test('cc:schedule-reminder shows a notification after the requested minutes', async (t) => {
  const { fake, wc } = await start({ platform: 'win32' });
  t.mock.timers.enable({ apis: ['setTimeout'] });
  fake.electron.ipcMain.emit('cc:schedule-reminder', { sender: wc }, { label: '  Metformin 500mg ', minutes: 10 });
  t.mock.timers.tick(10 * 60 * 1000 - 1);
  assert.equal(fake.calls.notifications.length, 0);
  t.mock.timers.tick(1);
  assert.deepEqual(fake.calls.notifications, [{ title: 'CareConnect Reminder', body: 'Metformin 500mg is due now.' }]);
});

test('cc:schedule-reminder ignores other senders and bad labels or minutes', async (t) => {
  const { fake, wc } = await start({ platform: 'win32' });
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const send = (sender, payload) => fake.electron.ipcMain.emit('cc:schedule-reminder', { sender }, payload);
  send({}, { label: 'Metformin', minutes: 10 });
  send(wc, { label: '   ', minutes: 10 });
  send(wc, { label: 42, minutes: 10 });
  send(wc, { label: 'Metformin', minutes: 0 });
  send(wc, { label: 'Metformin', minutes: -5 });
  send(wc, { label: 'Metformin', minutes: 'soon' });
  send(wc, undefined);
  t.mock.timers.tick(24 * 60 * 60 * 1000);
  assert.equal(fake.calls.notifications.length, 0);
});

test('cc:schedule-reminder shows nothing where notifications are not supported', async (t) => {
  const { fake, wc } = await start({ platform: 'win32' });
  t.mock.timers.enable({ apis: ['setTimeout'] });
  fake.notificationSupport.supported = false;
  fake.electron.ipcMain.emit('cc:schedule-reminder', { sender: wc }, { label: 'Metformin', minutes: 1 });
  t.mock.timers.tick(60 * 1000);
  assert.equal(fake.calls.notifications.length, 0);
});

test('closing the window saves its position for next launch', async () => {
  const { fake, win } = await start({ platform: 'win32' });
  win.close();
  const saved = JSON.parse(fs.readFileSync(path.join(fake.userData, 'window-state.json'), 'utf8'));
  assert.equal(saved.width, win.opts.width);
});

test('closing the last window quits on Windows, and activate reopens a window', async () => {
  const { fake, win } = await start({ platform: 'win32' });
  win.close();
  asPlatform('win32', () => fake.electron.app.emit('window-all-closed'));
  assert.equal(fake.calls.quit, 1);
  fake.electron.app.emit('activate');
  assert.equal(fake.windows.length, 2);
});

test('an installer run quits without opening a window', async () => {
  const fake = createFakeElectron({ platform: 'win32', isPackaged: true });
  const argv = process.argv;
  process.argv = [...argv, '--squirrel-obsolete'];
  try {
    loadWith(fake, MAIN);
  } finally {
    process.argv = argv;
  }
  await fake.ready();
  assert.equal(fake.calls.quit, 1);
  assert.equal(fake.windows.length, 0);
});

test('closing the last window keeps the app running on macOS', async () => {
  const { fake } = await start({ platform: 'darwin' });
  asPlatform('darwin', () => fake.electron.app.emit('window-all-closed'));
  assert.equal(fake.calls.quit, 0);
});
