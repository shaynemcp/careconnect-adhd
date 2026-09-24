/**
 * Builds the CareConnect application menu template from shortcuts.cjs.
 *
 * Kept free of Electron imports so it can be unit-tested with `node --test`:
 * main.cjs passes in the handlers and calls Menu.buildFromTemplate().
 */
const { COMMANDS, MENU_ORDER } = require('./shortcuts.cjs');

/**
 * @param {object} deps
 * @param {(path: string) => void} deps.navigate   route the renderer
 * @param {(name: string) => void} deps.command    send an app command to the renderer
 * @param {(name: string) => void} deps.shell      main-process action (zoom, contrast, help…)
 * @param {() => boolean} [deps.isHighContrast]    current high-contrast state
 * @param {string} [deps.platform]                 process.platform
 */
function buildMenuTemplate(deps) {
  const platform = deps.platform || process.platform;
  const toItem = (c) => {
    const item = { id: c.id, label: c.label };
    if (c.accelerator) item.accelerator = c.accelerator;
    if (c.action.type === 'role') {
      item.role = c.action.value;
    } else if (c.action.type === 'navigate') {
      item.click = () => deps.navigate(c.action.value);
    } else if (c.action.type === 'command') {
      item.click = () => deps.command(c.action.value);
    } else {
      item.click = () => deps.shell(c.action.value);
    }
    if (c.checkbox) {
      item.type = 'checkbox';
      item.checked = deps.isHighContrast ? !!deps.isHighContrast() : false;
    }
    return item;
  };

  const withSeparators = (menu, items) => {
    // Group related items so the menu reads in short chunks (cognitive load).
    const breaks = { File: ['print-today', 'quit'], Edit: ['cut', 'find'], View: ['zoom-in', 'high-contrast'], Dose: ['undo-dose', 'call-caregiver'], Help: ['about'] }[menu] || [];
    const out = [];
    for (const it of items) {
      if (breaks.includes(it.id) && out.length) out.push({ type: 'separator' });
      out.push(it);
    }
    return out;
  };

  const template = MENU_ORDER.map((menu) => ({
    label: platform === 'darwin' ? menu : `&${menu}`, // Alt+F, Alt+E, … on Windows
    submenu: withSeparators(menu, COMMANDS.filter((c) => c.menu === menu).map(toItem)),
  }));

  if (platform === 'darwin') {
    // macOS expects the app menu first; Quit lives there instead of File.
    template.unshift({ label: 'CareConnect', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'quit' }] });
    const file = template.find((m) => m.label === 'File');
    file.submenu = file.submenu.filter((i) => i.id !== 'quit');
    if (file.submenu[file.submenu.length - 1]?.type === 'separator') file.submenu.pop();
  }
  return template;
}

module.exports = { buildMenuTemplate };
