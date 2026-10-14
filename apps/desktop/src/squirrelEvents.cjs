/**
 * The Windows installer (Squirrel, built by scripts/package-win.cjs) starts the
 * app with a --squirrel-* flag during install, update and uninstall. On those
 * runs the app must only add or remove its Start menu and desktop shortcuts,
 * then quit, instead of opening a window.
 *
 * No Electron import here, so it is unit-tested.
 */
// Squirrel only runs on Windows, so always use Windows path rules (also keeps the
// tests correct when CI runs them on Linux).
const path = require('node:path').win32;

const ACTIONS = {
  '--squirrel-install': 'createShortcut',
  '--squirrel-updated': 'createShortcut',
  '--squirrel-uninstall': 'removeShortcut',
};

/**
 * What to do for this launch. Returns null for a normal launch, or
 * { quit: true, run?: [updateExe, args] } for an installer launch.
 */
function squirrelAction(argv, platform, execPath) {
  if (platform !== 'win32') return null;
  const flag = argv.find((a) => a.startsWith('--squirrel-'));
  // --squirrel-firstrun is the launch right after installing: open normally.
  if (!flag || flag === '--squirrel-firstrun') return null;
  const action = ACTIONS[flag];
  if (!action) return { quit: true }; // e.g. --squirrel-obsolete, --squirrel-firstrun
  const updateExe = path.resolve(path.dirname(execPath), '..', 'Update.exe');
  return { quit: true, run: [updateExe, [`--${action}`, path.basename(execPath)]] };
}

module.exports = { squirrelAction };
