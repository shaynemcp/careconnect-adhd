/**
 * Builds the CareConnect application menu template from shortcuts.cjs.
 *
 * Kept free of Electron imports so it can be unit-tested with `node --test`:
 * main.cjs passes in the handlers and calls Menu.buildFromTemplate().
 */
const { MENU_ORDER, commandsFor, resolveAccelerator } = require('./shortcuts.cjs');

// A separator goes before each of these ids, so every menu reads in short
// groups (cognitive load; see design doc §6).
const GROUP_BREAKS = {
  File: ['print-today', 'close-window', 'quit'],
  Edit: ['cut', 'find', 'open-medication', 'pause-reminders', 'delete-medication'],
  View: ['zoom-in', 'high-contrast'],
  Dose: ['remind-later', 'undo-dose', 'call-caregiver'],
  Help: ['about'],
};

/**
 * @param {object} deps
 * @param {(path: string) => void} deps.navigate   route the renderer
 * @param {(name: string) => void} deps.command    send an app command to the renderer
 * @param {(name: string) => void} deps.shell      main-process action (zoom, contrast, help…)
 * @param {() => boolean} [deps.isHighContrast]    current high-contrast state
 * @param {() => boolean} [deps.hasSelection]      a medication is selected in the web app
 * @param {string} [deps.platform]                 process.platform
 */
function buildMenuTemplate(deps) {
  const platform = deps.platform || process.platform;
  const isMac = platform === 'darwin';
  const hasSelection = deps.hasSelection ? !!deps.hasSelection() : false;

  const toItem = (c) => {
    const item = { id: c.id, label: c.label };
    const accelerator = resolveAccelerator(c.accelerator, platform);
    if (accelerator) item.accelerator = accelerator;
    // Show the key but let the web app handle it, so Delete still deletes text.
    if (accelerator && c.registerOnWindows === false && !isMac) item.registerAccelerator = false;
    if (c.action.type === 'role') {
      item.role = c.action.value;
    } else if (c.action.type === 'navigate') {
      item.click = () => deps.navigate(c.action.value);
    } else if (c.action.type === 'command') {
      item.click = () => deps.command(c.action.value);
    } else {
      item.click = () => deps.shell(c.action.value);
    }
    if (c.needsSelection) item.enabled = hasSelection;
    if (c.checkbox) {
      item.type = 'checkbox';
      item.checked = deps.isHighContrast ? !!deps.isHighContrast() : false;
    }
    return item;
  };

  const withSeparators = (menu, items) => {
    const breaks = GROUP_BREAKS[menu] || [];
    const out = [];
    for (const it of items) {
      if (breaks.includes(it.id) && out.length) out.push({ type: 'separator' });
      out.push(it);
    }
    return out;
  };

  const commands = commandsFor(platform);
  const template = MENU_ORDER.map((menu) => ({
    label: isMac ? menu : `&${menu}`, // Alt+F, Alt+E, … on Windows
    submenu: withSeparators(menu, commands.filter((c) => c.menu === menu).map(toItem)),
  }));

  if (isMac) {
    // macOS expects the app menu first, with About, Services, Hide and Quit.
    template.unshift({
      label: 'CareConnect',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    });
    // And a Window menu (Minimize ⌘M, Zoom, Bring All to Front) before Help.
    template.splice(template.length - 1, 0, { role: 'windowMenu' });
  }
  return template;
}

module.exports = { buildMenuTemplate };
