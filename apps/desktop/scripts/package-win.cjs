/**
 * Builds the Windows installer: release/CareConnect-Setup.exe.
 *
 *   npm run package:win --workspace @careconnect/desktop
 *
 * 1. builds apps/web (the UI the desktop app loads from app://careconnect/),
 * 2. packages the Electron app with @electron/packager (asar, no Node in the renderer),
 * 3. copies the web build to resources/web/dist, where main.cjs looks for it,
 * 4. wraps it in a per-user Squirrel installer with electron-winstaller.
 *
 * Squirrel is used instead of electron-builder's NSIS target because the
 * app-builder helper that NSIS needs was quarantined by antivirus on our
 * Windows test machine; @electron/packager and electron-winstaller are pure
 * JavaScript plus Squirrel's signed tools.
 */
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const DESKTOP = path.resolve(__dirname, '..');
const REPO = path.resolve(DESKTOP, '../..');
const OUT = path.join(DESKTOP, 'out');
const RELEASE = path.join(DESKTOP, 'release');
const pkg = JSON.parse(fs.readFileSync(path.join(DESKTOP, 'package.json'), 'utf8'));
const electronVersion = require(require.resolve('electron/package.json', { paths: [DESKTOP] })).version;

function step(msg) { console.log(`\n== ${msg}`); }

async function main() {
  if (process.platform !== 'win32') throw new Error('package:win must run on Windows.');

  step('Building apps/web');
  execSync('npm run build --workspace @careconnect/web', { cwd: REPO, stdio: 'inherit' });

  step('Staging the app (src/ and a runtime-only package.json)');
  fs.rmSync(OUT, { recursive: true, force: true });
  const stage = path.join(OUT, 'stage');
  fs.mkdirSync(stage, { recursive: true });
  fs.cpSync(path.join(DESKTOP, 'src'), path.join(stage, 'src'), { recursive: true });
  fs.cpSync(path.join(DESKTOP, 'build'), path.join(stage, 'build'), { recursive: true }); // window icon
  const { name, productName, version, description, main } = pkg;
  fs.writeFileSync(path.join(stage, 'package.json'),
    JSON.stringify({ name, productName, version, description, main, author: 'SWEN 661 Team 5' }, null, 2));

  step(`Packaging with Electron ${electronVersion}`);
  const { packager } = require('@electron/packager');
  const [appDir] = await packager({
    dir: stage, name: 'CareConnect', platform: 'win32', arch: 'x64', electronVersion,
    out: OUT, overwrite: true, asar: true, appCopyright: 'SWEN 661 Team 5',
    icon: path.join(DESKTOP, 'build', 'icon.ico'), // CareConnect.exe icon
  });
  fs.cpSync(path.join(REPO, 'apps/web/dist'), path.join(appDir, 'resources/web/dist'), { recursive: true });

  step('Building the installer');
  const { createWindowsInstaller } = require('electron-winstaller');
  fs.rmSync(RELEASE, { recursive: true, force: true });
  await createWindowsInstaller({
    appDirectory: appDir, outputDirectory: RELEASE, exe: 'CareConnect.exe',
    name: 'CareConnect', title: 'CareConnect', authors: 'SWEN 661 Team 5',
    description: pkg.description, setupExe: 'CareConnect-Setup.exe', noMsi: true,
    setupIcon: path.join(DESKTOP, 'build', 'icon.ico'), // CareConnect-Setup.exe icon
    iconUrl: pathToFileURL(path.join(DESKTOP, 'build', 'icon.ico')).href, // Settings > Apps icon
  });
  console.log(`\nDone: ${path.join(RELEASE, 'CareConnect-Setup.exe')}`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
