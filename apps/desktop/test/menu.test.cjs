/**
 * Unit tests for the desktop menu and shortcut map (run: npm test --workspace @careconnect/desktop).
 * No Electron needed: menu.cjs, shortcuts.cjs, links.cjs and windowState.cjs are plain CommonJS.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { COMMANDS, MENU_ORDER, commandsFor, resolveAccelerator, displayAccelerator } = require('../src/shortcuts.cjs');
const { buildMenuTemplate } = require('../src/menu.cjs');
const { shortcutsHtml } = require('../src/shortcutsWindow.cjs');
const { isSafeExternalUrl, isAppUrl } = require('../src/links.cjs');
const { restoreBounds } = require('../src/windowState.cjs');

const noop = () => {};
const deps = (over = {}) => ({ platform: 'win32', navigate: noop, command: noop, shell: noop, ...over });
const flatten = (template) => template.flatMap((m) => m.submenu || []).filter((i) => i.type !== 'separator');
const PLATFORMS = ['win32', 'darwin', 'linux'];

test('every shortcut is unique (no two commands share a key)', () => {
  for (const platform of PLATFORMS) {
    const keys = commandsFor(platform).map((c) => resolveAccelerator(c.accelerator, platform)).filter(Boolean);
    assert.equal(new Set(keys).size, keys.length, `${platform}: duplicate accelerator in ${keys.join(', ')}`);
  }
});

test('every command id is unique and belongs to a known menu', () => {
  const ids = COMMANDS.map((c) => c.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const c of COMMANDS) assert.ok(MENU_ORDER.includes(c.menu), `${c.id} → ${c.menu}`);
});

test('Windows menu bar has File, Edit, View, Dose, Help with Alt access keys', () => {
  const t = buildMenuTemplate(deps());
  assert.deepEqual(t.map((m) => m.label), ['&File', '&Edit', '&View', '&Dose', '&Help']);
});

test('macOS gets an app menu first and no Quit under File', () => {
  const t = buildMenuTemplate(deps({ platform: 'darwin' }));
  assert.equal(t[0].label, 'CareConnect');
  assert.ok(t[0].submenu.some((i) => i.role === 'quit'));
  const file = t.find((m) => m.label === 'File');
  assert.ok(!file.submenu.some((i) => i.id === 'quit' || i.role === 'quit'));
});

test('View shortcuts route to the right screens', () => {
  const routes = [];
  const items = flatten(buildMenuTemplate(deps({ navigate: (p) => routes.push(p) })));
  for (const id of ['go-today', 'go-medications', 'go-appointments', 'go-caregiver']) items.find((i) => i.id === id).click();
  assert.deepEqual(routes, ['/app', '/app/medications', '/app/appointments', '/app/caregiver']);
});

test('Ctrl+Enter sends the mark-next-dose-taken command', () => {
  const sent = [];
  const item = flatten(buildMenuTemplate(deps({ command: (c) => sent.push(c) }))).find((i) => i.accelerator === 'CmdOrCtrl+Enter');
  item.click();
  assert.deepEqual(sent, ['mark-next-dose-taken']);
});

test('High Contrast is a checkbox that reflects current state', () => {
  const on = flatten(buildMenuTemplate(deps({ isHighContrast: () => true }))).find((i) => i.id === 'high-contrast');
  assert.equal(on.type, 'checkbox');
  assert.equal(on.checked, true);
});

test('Edit items use native roles so text fields get real undo/copy/paste/select all', () => {
  const items = flatten(buildMenuTemplate(deps()));
  for (const r of ['undo', 'redo', 'cut', 'copy', 'paste']) assert.equal(items.find((i) => i.id === r).role, r);
  assert.equal(items.find((i) => i.id === 'select-all').role, 'selectAll');
});

test('shortcut labels read correctly per platform, in Apple modifier order on macOS', () => {
  assert.equal(displayAccelerator('CmdOrCtrl+Shift+N', 'win32'), 'Ctrl+Shift+N');
  assert.equal(displayAccelerator('CmdOrCtrl+Shift+N', 'darwin'), '⇧⌘N');
  assert.equal(displayAccelerator('CmdOrCtrl+Enter', 'darwin'), '⌘↩');
  assert.equal(displayAccelerator('F1', 'win32'), 'F1');
});

test('Keyboard Shortcuts window lists every shortcut in named, accessible tables', () => {
  for (const platform of ['win32', 'darwin']) {
    const html = shortcutsHtml(platform);
    assert.match(html, /<html lang="en">/);
    assert.match(html, /<th scope="col">Shortcut<\/th>/);
    assert.match(html, /<table aria-labelledby="h-File">/);
    for (const c of commandsFor(platform).filter((x) => x.accelerator)) {
      assert.ok(html.includes(displayAccelerator(c.accelerator, platform)), `${platform}: missing ${c.id}`);
    }
  }
});

test('macOS uses native Redo (⇧⌘Z) and Full Screen (⌃⌘F), and never F11', () => {
  const mac = flatten(buildMenuTemplate(deps({ platform: 'darwin' })));
  assert.equal(mac.find((i) => i.id === 'redo').accelerator, 'Shift+Cmd+Z');
  assert.equal(mac.find((i) => i.id === 'full-screen').accelerator, 'Ctrl+Cmd+F');
  assert.ok(!mac.some((i) => i.accelerator === 'F11'), 'F11 is Show Desktop on macOS');
  assert.equal(displayAccelerator(COMMANDS.find((c) => c.id === 'redo').accelerator, 'darwin'), '⇧⌘Z');
  assert.equal(displayAccelerator(COMMANDS.find((c) => c.id === 'full-screen').accelerator, 'darwin'), '⌃⌘F');
  const win = flatten(buildMenuTemplate(deps()));
  assert.equal(win.find((i) => i.id === 'redo').accelerator, 'Ctrl+Y');
  assert.equal(win.find((i) => i.id === 'full-screen').accelerator, 'F11');
});

test('every context-menu action in Figure 9 is also in the menu bar', () => {
  // Dose-row menu, then medication menu, as drawn in Figure 9.
  const figure9 = [
    'mark-next-taken', 'skip-next', 'remind-later', 'open-medication', 'edit-schedule', 'copy', 'print-today',
    'open-medication', 'edit-medication', 'duplicate-medication', 'pause-reminders', 'share-medication', 'delete-medication',
  ];
  for (const platform of PLATFORMS) {
    const ids = new Set(flatten(buildMenuTemplate(deps({ platform }))).map((i) => i.id));
    for (const id of figure9) assert.ok(ids.has(id), `${platform}: ${id} is right-click-only`);
  }
  // And every command marked as a context-menu item is in the menu bar.
  for (const c of COMMANDS.filter((x) => x.contextMenu)) assert.ok(figure9.includes(c.id), `${c.id} not in Figure 9 list`);
});

test('medication items wait for a selection, and Delete never steals the key from text fields', () => {
  const off = flatten(buildMenuTemplate(deps()));
  for (const id of ['duplicate-medication', 'pause-reminders', 'share-medication', 'delete-medication']) {
    assert.equal(off.find((i) => i.id === id).enabled, false, id);
  }
  const del = off.find((i) => i.id === 'delete-medication');
  assert.equal(del.accelerator, 'Delete');
  assert.equal(del.registerAccelerator, false);
  const on = flatten(buildMenuTemplate(deps({ hasSelection: () => true })));
  assert.equal(on.find((i) => i.id === 'delete-medication').enabled, true);
  const mac = flatten(buildMenuTemplate(deps({ platform: 'darwin' })));
  assert.equal(mac.find((i) => i.id === 'delete-medication').accelerator, 'Cmd+Backspace');
});

test('window management follows each platform: macOS Window menu, Windows File > Exit', () => {
  const mac = buildMenuTemplate(deps({ platform: 'darwin' }));
  assert.ok(mac.some((m) => m.role === 'windowMenu'), 'macOS has a Window menu');
  assert.equal(mac[mac.length - 1].label, 'Help');
  assert.ok(!mac.find((m) => m.label === 'Help').submenu.some((i) => i.id === 'about'), 'About is in the app menu on macOS');
  assert.equal(flatten(mac).find((i) => i.id === 'close-window').accelerator, 'Cmd+W');
  const exit = flatten(buildMenuTemplate(deps())).find((i) => i.id === 'quit');
  assert.equal(exit.label, 'Exit');
  assert.equal(exit.accelerator, undefined, 'Alt+F4 already closes the window');
});

test('only web, mail and phone links leave the app, and the dev check compares origins', () => {
  for (const ok of ['https://www.umgc.edu', 'http://example.com', 'mailto:dana@example.com', 'tel:+15555550100']) assert.ok(isSafeExternalUrl(ok), ok);
  for (const bad of ['file:///etc/passwd', 'smb://server/share', 'javascript:alert(1)', 'ms-settings:', 'not a url']) assert.ok(!isSafeExternalUrl(bad), bad);
  const dev = { isDev: true, devUrl: 'http://localhost:5173' };
  assert.ok(isAppUrl('http://localhost:5173/app/medications', dev));
  assert.ok(!isAppUrl('http://localhost:5173@evil.example/', dev));
  assert.ok(!isAppUrl('http://localhost:51730/', dev));
  assert.ok(isAppUrl('file:///app/index.html', { isDev: false }));
});

test('window reopens where it was left, and resets to the center if that spot is off-screen', () => {
  const primary = { workArea: { x: 0, y: 0, width: 1920, height: 1040 } };
  const displays = [primary];
  const back = restoreBounds({ x: 100, y: 80, width: 1300, height: 820, isMaximized: true }, displays, primary);
  assert.deepEqual([back.x, back.y, back.width, back.height, back.isMaximized], [100, 80, 1300, 820, true]);
  // Saved on a second monitor that has since been unplugged.
  const lost = restoreBounds({ x: 5000, y: 80, width: 1300, height: 820 }, displays, primary);
  assert.deepEqual([lost.x, lost.y, lost.width, lost.height, lost.isMaximized], [240, 70, 1440, 900, false]);
  // First run, and a small laptop at 125% scaling: minimum fits the work area.
  const small = { workArea: { x: 0, y: 0, width: 1093, height: 574 } };
  const first = restoreBounds(null, [small], small);
  assert.deepEqual(first.min, { width: 1024, height: 574 });
  assert.ok(first.width <= 1093 && first.height <= 574);
});
