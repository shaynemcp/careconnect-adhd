/**
 * Single source of truth for CareConnect desktop commands and keyboard shortcuts.
 *
 * The application menu (menu.cjs), the Keyboard Shortcuts help window and the
 * shortcut documentation are all generated from this list, so a shortcut can
 * never be documented one way and wired another.
 *
 * accelerator is either one Electron accelerator for every platform
 * ("CmdOrCtrl+N" is Ctrl on Windows/Linux and Cmd on macOS) or an object with a
 * macOS value and a default for Windows/Linux, used where the two platforms
 * disagree (Redo, Full Screen, Delete). null means the item has no shortcut.
 *
 * action.type:
 *   navigate — route inside the web app (sent to the renderer over IPC)
 *   command  — app action the renderer handles (e.g. mark the next dose taken)
 *   shell    — handled in the main process (zoom, high contrast, help, quit)
 *   role     — built-in Electron role (undo, redo, cut, copy, paste, …)
 *
 * Optional flags:
 *   platforms:      only shown on these platforms (e.g. Exit on Windows/Linux)
 *   needsSelection: acts on the selected medication; disabled until the web
 *                     app reports a selection, so it never fires while typing
 *   contextMenu:    also offered in a right-click menu (Figure 9); every such
 *                     command must be in the menu bar too (tested)
 */
const COMMANDS = [
  // File
  { id: 'new-medication', menu: 'File', label: 'New Medication…', accelerator: 'CmdOrCtrl+N', action: { type: 'navigate', value: '/app/manage-medications?new=1' } },
  { id: 'new-appointment', menu: 'File', label: 'New Appointment…', accelerator: 'CmdOrCtrl+Shift+N', action: { type: 'navigate', value: '/app/manage-appointments?new=1' } },
  { id: 'print-today', menu: 'File', label: 'Print…', accelerator: 'CmdOrCtrl+P', action: { type: 'shell', value: 'print' }, contextMenu: 'dose' },
  { id: 'close-window', menu: 'File', label: 'Close Window', accelerator: 'Cmd+W', action: { type: 'role', value: 'close' }, platforms: ['darwin'] },
  // Windows convention is File > Exit with no shortcut (Alt+F4 already closes
  // the window). On macOS Quit (⌘Q) lives in the app menu instead (menu.cjs).
  { id: 'quit', menu: 'File', label: 'Exit', accelerator: null, action: { type: 'role', value: 'quit' }, platforms: ['win32', 'linux'] },

  // Edit
  { id: 'undo', menu: 'Edit', label: 'Undo', accelerator: 'CmdOrCtrl+Z', action: { type: 'role', value: 'undo' } },
  { id: 'redo', menu: 'Edit', label: 'Redo', accelerator: { darwin: 'Shift+Cmd+Z', default: 'Ctrl+Y' }, action: { type: 'role', value: 'redo' } },
  { id: 'cut', menu: 'Edit', label: 'Cut', accelerator: 'CmdOrCtrl+X', action: { type: 'role', value: 'cut' } },
  { id: 'copy', menu: 'Edit', label: 'Copy', accelerator: 'CmdOrCtrl+C', action: { type: 'role', value: 'copy' }, contextMenu: 'dose' },
  { id: 'paste', menu: 'Edit', label: 'Paste', accelerator: 'CmdOrCtrl+V', action: { type: 'role', value: 'paste' } },
  { id: 'select-all', menu: 'Edit', label: 'Select All', accelerator: 'CmdOrCtrl+A', action: { type: 'role', value: 'selectAll' } },
  { id: 'find', menu: 'Edit', label: 'Find…', accelerator: 'CmdOrCtrl+F', action: { type: 'command', value: 'focus-search' } },
  // Selected medication (the medication context menu in Figure 9).
  { id: 'open-medication', menu: 'Edit', label: 'Open Medication', accelerator: null, action: { type: 'command', value: 'open-medication' }, needsSelection: true, contextMenu: 'medication' },
  { id: 'edit-medication', menu: 'Edit', label: 'Edit Medication…', accelerator: null, action: { type: 'command', value: 'edit-medication' }, needsSelection: true, contextMenu: 'medication' },
  { id: 'duplicate-medication', menu: 'Edit', label: 'Duplicate Medication', accelerator: null, action: { type: 'command', value: 'duplicate-medication' }, needsSelection: true, contextMenu: 'medication' },
  { id: 'pause-reminders', menu: 'Edit', label: 'Pause Reminders', accelerator: null, action: { type: 'command', value: 'pause-reminders' }, needsSelection: true, contextMenu: 'medication' },
  { id: 'share-medication', menu: 'Edit', label: 'Share with Caregiver', accelerator: null, action: { type: 'command', value: 'share-with-caregiver' }, needsSelection: true, contextMenu: 'medication' },
  // Delete on Windows/Linux, ⌘⌫ on macOS (the Finder "Move to Trash" key).
  // Only enabled while a medication is selected, and never registered as a
  // global key on Windows/Linux, so Delete in a text field still deletes text.
  { id: 'delete-medication', menu: 'Edit', label: 'Delete Medication…', accelerator: { darwin: 'Cmd+Backspace', default: 'Delete' }, action: { type: 'command', value: 'delete-medication' }, needsSelection: true, contextMenu: 'medication', registerOnWindows: false },

  // View
  { id: 'go-today', menu: 'View', label: 'Home', accelerator: 'CmdOrCtrl+1', action: { type: 'navigate', value: '/app' } },
  { id: 'go-medications', menu: 'View', label: 'Medications', accelerator: 'CmdOrCtrl+2', action: { type: 'navigate', value: '/app/medications' } },
  { id: 'go-appointments', menu: 'View', label: 'Appointments', accelerator: 'CmdOrCtrl+3', action: { type: 'navigate', value: '/app/appointments' } },
  { id: 'go-schedule', menu: 'View', label: 'My Day', accelerator: 'CmdOrCtrl+4', action: { type: 'navigate', value: '/app/schedule' } },
  { id: 'go-caregiver', menu: 'View', label: 'Caregiver Notes', accelerator: 'CmdOrCtrl+5', action: { type: 'navigate', value: '/app/caregiver' } },
  { id: 'go-activity', menu: 'View', label: 'Activity Log', accelerator: 'CmdOrCtrl+6', action: { type: 'navigate', value: '/app/activity' } },
  { id: 'zoom-in', menu: 'View', label: 'Zoom In', accelerator: 'CmdOrCtrl+=', action: { type: 'shell', value: 'zoom-in' } },
  { id: 'zoom-out', menu: 'View', label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', action: { type: 'shell', value: 'zoom-out' } },
  { id: 'zoom-reset', menu: 'View', label: 'Actual Size', accelerator: 'CmdOrCtrl+0', action: { type: 'shell', value: 'zoom-reset' } },
  { id: 'high-contrast', menu: 'View', label: 'High Contrast', accelerator: 'CmdOrCtrl+Shift+H', action: { type: 'shell', value: 'high-contrast' }, checkbox: true },
  // Windows/Linux only. macOS adds its own View > Enter Full Screen (🌐F), so a
  // second item would only duplicate it. F11 is Show Desktop on macOS, which is
  // why it must never be used there.
  { id: 'full-screen', menu: 'View', label: 'Toggle Full Screen', accelerator: 'F11', action: { type: 'role', value: 'togglefullscreen' }, platforms: ['win32', 'linux'] },

  // Dose (the dose-row context menu in Figure 9)
  { id: 'mark-next-taken', menu: 'Dose', label: 'Mark Next Dose Taken', accelerator: 'CmdOrCtrl+Enter', action: { type: 'command', value: 'mark-next-dose-taken' }, contextMenu: 'dose' },
  { id: 'skip-next', menu: 'Dose', label: 'Skip Next Dose…', accelerator: 'CmdOrCtrl+Shift+S', action: { type: 'command', value: 'skip-next-dose' }, contextMenu: 'dose' },
  // No shortcuts here on purpose: Ctrl+Shift+R is reload in Chromium, and
  // fewer keys to learn is better for this audience.
  { id: 'remind-later', menu: 'Dose', label: 'Remind Me in 10 Minutes', accelerator: null, action: { type: 'command', value: 'remind-in-10-minutes' }, contextMenu: 'dose' },
  { id: 'edit-schedule', menu: 'Dose', label: 'Edit Schedule…', accelerator: null, action: { type: 'command', value: 'edit-schedule' }, contextMenu: 'dose' },
  { id: 'undo-dose', menu: 'Dose', label: 'Undo Last Dose Change', accelerator: 'CmdOrCtrl+Shift+U', action: { type: 'command', value: 'undo-dose-change' } },
  { id: 'call-caregiver', menu: 'Dose', label: 'Call My Caregiver', accelerator: 'CmdOrCtrl+Shift+C', action: { type: 'command', value: 'call-caregiver' } },

  // Help
  { id: 'shortcuts', menu: 'Help', label: 'Keyboard Shortcuts', accelerator: 'CmdOrCtrl+/', action: { type: 'shell', value: 'show-shortcuts' } },
  { id: 'help', menu: 'Help', label: 'Keyboard Shortcuts Help', accelerator: 'F1', action: { type: 'shell', value: 'show-shortcuts' } },
  // On macOS About lives in the app menu, so Help > About is Windows/Linux only.
  { id: 'about', menu: 'Help', label: 'About CareConnect', accelerator: null, action: { type: 'shell', value: 'about' }, platforms: ['win32', 'linux'] },
];

const MENU_ORDER = ['File', 'Edit', 'View', 'Dose', 'Help'];

/** Commands shown on a platform, in menu order. */
function commandsFor(platform) {
  return COMMANDS.filter((c) => !c.platforms || c.platforms.includes(platform === 'darwin' ? 'darwin' : platform === 'linux' ? 'linux' : 'win32'));
}

/** The Electron accelerator a command uses on a platform, or null. */
function resolveAccelerator(accelerator, platform) {
  if (!accelerator) return null;
  if (typeof accelerator === 'string') return accelerator;
  return platform === 'darwin' ? accelerator.darwin : accelerator.default;
}

// Apple lists modifiers in a fixed order: Control, Option, Shift, Command.
const MAC_MODIFIERS = [
  ['Ctrl', '⌃'],
  ['Alt', '⌥'],
  ['Shift', '⇧'],
  ['Cmd', '⌘'],
];
const MAC_KEYS = { Enter: '↩', Backspace: '⌫', Delete: '⌦', Escape: '⎋', Left: '←', Right: '→', Up: '↑', Down: '↓' };

/**
 * Human-readable accelerator for a platform:
 * "CmdOrCtrl+Shift+N" → "Ctrl+Shift+N" on Windows/Linux, "⇧⌘N" on macOS.
 */
function displayAccelerator(accelerator, platform) {
  const accel = resolveAccelerator(accelerator, platform);
  if (!accel) return '';
  const parts = accel.split('+');
  // "Ctrl+=" and "Ctrl+-" split cleanly; "Ctrl++" would not, so it is not used.
  const key = parts.pop();
  const mods = parts.map((m) => {
    if (m === 'CmdOrCtrl' || m === 'CommandOrControl') return platform === 'darwin' ? 'Cmd' : 'Ctrl';
    if (m === 'Command') return 'Cmd';
    if (m === 'Control') return 'Ctrl';
    if (m === 'Option') return 'Alt';
    return m;
  });
  if (platform === 'darwin') {
    const glyphs = MAC_MODIFIERS.filter(([name]) => mods.includes(name)).map(([, g]) => g).join('');
    return glyphs + (MAC_KEYS[key] || key);
  }
  return [...mods, key === 'Delete' ? 'Del' : key].join('+');
}

module.exports = { COMMANDS, MENU_ORDER, commandsFor, resolveAccelerator, displayAccelerator };
