/**
 * Electron fuses for the packaged CareConnect.exe: switches baked into the
 * binary that turn off ways to run it as something other than CareConnect.
 *
 * - RunAsNode off: ELECTRON_RUN_AS_NODE can't turn the exe into plain Node.
 * - NODE_OPTIONS and --inspect flags off: no injecting code or a debugger.
 * - ASAR integrity on, app only from app.asar: a modified app.asar won't load.
 *   Both packagers embed the hash Electron checks (@electron/packager 18.3+,
 *   electron-builder 25.1+).
 * - Cookie encryption on.
 *
 * Used by scripts/package-win.cjs and as electron-builder's afterPack hook.
 */
const path = require('node:path');
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');

const FUSES = {
  version: FuseVersion.V1,
  [FuseV1Options.RunAsNode]: false,
  [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
  [FuseV1Options.EnableNodeCliInspectArguments]: false,
  [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
  [FuseV1Options.OnlyLoadAppFromAsar]: true,
  [FuseV1Options.EnableCookieEncryption]: true,
};

function applyFuses(exePath) {
  return flipFuses(exePath, FUSES);
}

/** electron-builder afterPack hook. */
async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;
  await applyFuses(path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`));
}

module.exports = afterPack;
module.exports.applyFuses = applyFuses;
module.exports.FUSES = FUSES;
