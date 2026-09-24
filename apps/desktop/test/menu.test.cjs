/**
 * Unit tests for the desktop menu and shortcut map (run: npm test --workspace @careconnect/desktop).
 * No Electron needed — menu.cjs and shortcuts.cjs are plain CommonJS.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { COMMANDS, MENU_ORDER, displayAccelerator } = require('../src/shortcuts.cjs');
const { buildMenuTemplate } = require('../src/menu.cjs');
const { shortcutsHtml } = require('../src/shortcutsWindow.cjs');

const noop = () => {};
const deps = (over = {}) => ({ platform: 'win32', navigate: noop, command: noop, shell: noop, ...over });
const flatten = (template) => template.flatMap((m) => m.submenu).filter((i) => i.type !== 'separator');

test('every shortcut is unique (no two commands share a key)', () => {
  const keys = COMMANDS.map((c) => c.accelerator).filter(Boolean);
  assert.equal(new Set(keys).size, keys.length, `duplicate accelerator in ${keys.join(', ')}`);
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
  const file = t.find((m) => m.label === 'File');
  assert.ok(!file.submenu.some((i) => i.id === 'quit'));
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

test('Edit items use native roles so text fields get real undo/copy/paste', () => {
  const items = flatten(buildMenuTemplate(deps()));
  for (const r of ['undo', 'redo', 'cut', 'copy', 'paste']) assert.equal(items.find((i) => i.id === r).role, r);
});

test('shortcut labels read correctly per platform', () => {
  assert.equal(displayAccelerator('CmdOrCtrl+Shift+N', 'win32'), 'Ctrl+Shift+N');
  assert.equal(displayAccelerator('CmdOrCtrl+Shift+N', 'darwin'), '⌘⇧N');
  assert.equal(displayAccelerator('F1', 'win32'), 'F1');
});

test('Keyboard Shortcuts window lists every shortcut in accessible tables', () => {
  const html = shortcutsHtml('win32');
  assert.match(html, /<html lang="en">/);
  assert.match(html, /<th scope="col">Shortcut<\/th>/);
  for (const c of COMMANDS.filter((x) => x.accelerator)) {
    assert.ok(html.includes(displayAccelerator(c.accelerator, 'win32')), `missing ${c.id}`);
  }
});
