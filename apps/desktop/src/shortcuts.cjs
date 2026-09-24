/**
 * Single source of truth for CareConnect desktop commands and keyboard shortcuts.
 *
 * The application menu (menu.cjs), the Keyboard Shortcuts help window and the
 * shortcut documentation are all generated from this list, so a shortcut can
 * never be documented one way and wired another.
 *
 * Accelerators use Electron's "CmdOrCtrl" so the same list works on Windows
 * (Ctrl) and macOS (Cmd) — see ADR 0002 (desktop OS target is still open).
 *
 * action.type:
 *   navigate — route inside the web app (sent to the renderer over IPC)
 *   command  — app action the renderer handles (e.g. mark the next dose taken)
 *   shell    — handled in the main process (zoom, high contrast, help, quit)
 *   role     — built-in Electron role (undo, redo, cut, copy, paste, …)
 */
const COMMANDS = [
  // File
  { id: 'new-medication', menu: 'File', label: 'New Medication…', accelerator: 'CmdOrCtrl+N', action: { type: 'navigate', value: '/app/manage-medications?new=1' } },
  { id: 'new-appointment', menu: 'File', label: 'New Appointment…', accelerator: 'CmdOrCtrl+Shift+N', action: { type: 'navigate', value: '/app/manage-appointments?new=1' } },
  { id: 'print-today', menu: 'File', label: 'Print…', accelerator: 'CmdOrCtrl+P', action: { type: 'shell', value: 'print' } },
  { id: 'quit', menu: 'File', label: 'Quit CareConnect', accelerator: 'CmdOrCtrl+Q', action: { type: 'role', value: 'quit' } },

  // Edit
  { id: 'undo', menu: 'Edit', label: 'Undo', accelerator: 'CmdOrCtrl+Z', action: { type: 'role', value: 'undo' } },
  { id: 'redo', menu: 'Edit', label: 'Redo', accelerator: 'CmdOrCtrl+Y', action: { type: 'role', value: 'redo' } },
  { id: 'cut', menu: 'Edit', label: 'Cut', accelerator: 'CmdOrCtrl+X', action: { type: 'role', value: 'cut' } },
  { id: 'copy', menu: 'Edit', label: 'Copy', accelerator: 'CmdOrCtrl+C', action: { type: 'role', value: 'copy' } },
  { id: 'paste', menu: 'Edit', label: 'Paste', accelerator: 'CmdOrCtrl+V', action: { type: 'role', value: 'paste' } },
  { id: 'find', menu: 'Edit', label: 'Find…', accelerator: 'CmdOrCtrl+F', action: { type: 'command', value: 'focus-search' } },

  // View
  { id: 'go-today', menu: 'View', label: 'Today', accelerator: 'CmdOrCtrl+1', action: { type: 'navigate', value: '/app' } },
  { id: 'go-medications', menu: 'View', label: 'Medications', accelerator: 'CmdOrCtrl+2', action: { type: 'navigate', value: '/app/medications' } },
  { id: 'go-appointments', menu: 'View', label: 'Appointments', accelerator: 'CmdOrCtrl+3', action: { type: 'navigate', value: '/app/appointments' } },
  { id: 'go-schedule', menu: 'View', label: 'Schedule', accelerator: 'CmdOrCtrl+4', action: { type: 'navigate', value: '/app/schedule' } },
  { id: 'go-caregiver', menu: 'View', label: 'Caregiver Dashboard', accelerator: 'CmdOrCtrl+5', action: { type: 'navigate', value: '/app/caregiver' } },
  { id: 'go-activity', menu: 'View', label: 'Activity Log', accelerator: 'CmdOrCtrl+6', action: { type: 'navigate', value: '/app/activity' } },
  { id: 'zoom-in', menu: 'View', label: 'Zoom In', accelerator: 'CmdOrCtrl+=', action: { type: 'shell', value: 'zoom-in' } },
  { id: 'zoom-out', menu: 'View', label: 'Zoom Out', accelerator: 'CmdOrCtrl+-', action: { type: 'shell', value: 'zoom-out' } },
  { id: 'zoom-reset', menu: 'View', label: 'Actual Size', accelerator: 'CmdOrCtrl+0', action: { type: 'shell', value: 'zoom-reset' } },
  { id: 'high-contrast', menu: 'View', label: 'High Contrast', accelerator: 'CmdOrCtrl+Shift+H', action: { type: 'shell', value: 'high-contrast' }, checkbox: true },
  { id: 'full-screen', menu: 'View', label: 'Toggle Full Screen', accelerator: 'F11', action: { type: 'role', value: 'togglefullscreen' } },

  // Dose
  { id: 'mark-next-taken', menu: 'Dose', label: 'Mark Next Dose Taken', accelerator: 'CmdOrCtrl+Enter', action: { type: 'command', value: 'mark-next-dose-taken' } },
  { id: 'skip-next', menu: 'Dose', label: 'Skip Next Dose…', accelerator: 'CmdOrCtrl+Shift+S', action: { type: 'command', value: 'skip-next-dose' } },
  { id: 'undo-dose', menu: 'Dose', label: 'Undo Last Dose Change', accelerator: 'CmdOrCtrl+Shift+U', action: { type: 'command', value: 'undo-dose-change' } },
  { id: 'call-caregiver', menu: 'Dose', label: 'Call My Caregiver', accelerator: 'CmdOrCtrl+Shift+C', action: { type: 'command', value: 'call-caregiver' } },

  // Help
  { id: 'shortcuts', menu: 'Help', label: 'Keyboard Shortcuts', accelerator: 'CmdOrCtrl+/', action: { type: 'shell', value: 'show-shortcuts' } },
  { id: 'help', menu: 'Help', label: 'CareConnect Help', accelerator: 'F1', action: { type: 'shell', value: 'show-shortcuts' } },
  { id: 'about', menu: 'Help', label: 'About CareConnect', accelerator: null, action: { type: 'shell', value: 'about' } },
];

const MENU_ORDER = ['File', 'Edit', 'View', 'Dose', 'Help'];

/** Human-readable accelerator for a platform: "CmdOrCtrl+N" → "Ctrl+N" / "⌘N". */
function displayAccelerator(accelerator, platform) {
  if (!accelerator) return '';
  if (platform === 'darwin') {
    return accelerator
      .replace('CmdOrCtrl+', '⌘')
      .replace('Shift+', '⇧')
      .replace('Enter', '↩');
  }
  return accelerator.replace('CmdOrCtrl', 'Ctrl');
}

module.exports = { COMMANDS, MENU_ORDER, displayAccelerator };
