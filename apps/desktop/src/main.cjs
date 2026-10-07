/**
 * CareConnect desktop shell (Assignment 7 — desktop design & early Electron implementation).
 *
 * Loads the shared web app and adds what a desktop user expects on top of it:
 * a full application menu bar with keyboard shortcuts (menu.cjs / shortcuts.cjs),
 * a Keyboard Shortcuts help window, zoom, a high-contrast toggle, and a window
 * sized for large displays. Keeping the desktop surface a thin shell over the
 * shared web build means accessibility work done once applies everywhere, and
 * keeps the Windows/macOS dual target cheap (see ADR 0002).
 */
const {
  app,
  BrowserWindow,
  Menu,
  shell,
  nativeTheme,
  dialog,
  screen,
  ipcMain,
  Notification,
  protocol,
  net,
} = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const appProtocol = require('./appProtocol.cjs');
const { squirrelAction } = require('./squirrelEvents.cjs');
const { buildMenuTemplate } = require('./menu.cjs');
const { shortcutsHtml } = require('./shortcutsWindow.cjs');
const { isSafeExternalUrl, isAppUrl } = require('./links.cjs');
const windowState = require('./windowState.cjs');

const isDev = !app.isPackaged;
const DEV_URL = process.env.CARECONNECT_DEV_URL || 'http://localhost:5173';
const ZOOM_STEP = 0.5; // Chromium zoom levels; 0 = 100%, each step ≈ 10–20%
const ZOOM_MIN = -1; // ≈ 80%
const ZOOM_MAX = 4; // ≈ 200% (WCAG 1.4.4 Resize Text)

// The packaged build of apps/web: next to the app in an installed copy
// (electron-builder extraResources), or in the repo when running unpackaged.
const WEB_ROOT = app.isPackaged
  ? path.join(process.resourcesPath, 'web', 'dist')
  : path.join(__dirname, '../../web/dist');

// Must happen before the app is ready: app:// behaves like https (secure,
// standard origin, fetch and storage allowed) so the web app runs unchanged.
if (!isDev) {
  protocol.registerSchemesAsPrivileged([
    { scheme: appProtocol.SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, allowServiceWorkers: true } },
  ]);
}

let mainWindow = null;
let shortcutsWindow = null;
// The user's View > High Contrast choice. It follows the OS setting only when
// the OS setting itself changes, so a manual choice survives e.g. dark mode
// switching at sunset.
let highContrast = nativeTheme.shouldUseHighContrastColors;
let osHighContrast = nativeTheme.shouldUseHighContrastColors;
// Whether a medication is selected in the web app (enables the Edit menu's
// medication items, including Delete).
let hasSelection = false;

/** Hand a link to the OS only if it is a web, mail or phone link. */
function openSafe(url) {
  if (isSafeExternalUrl(url)) shell.openExternal(url);
}

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send(channel, payload);
}

function showShortcuts() {
  if (shortcutsWindow && !shortcutsWindow.isDestroyed()) {
    shortcutsWindow.focus();
    return;
  }
  shortcutsWindow = new BrowserWindow({
    parent: mainWindow,
    width: 760,
    height: 640,
    minWidth: 480,
    minHeight: 400,
    title: 'Keyboard Shortcuts — CareConnect',
    autoHideMenuBar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true },
  });
  shortcutsWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(shortcutsHtml(process.platform)));
  // Esc closes the help window (no keyboard trap).
  shortcutsWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'Escape') {
      event.preventDefault();
      shortcutsWindow.close();
    }
  });
}

/**
 * Chromium can fail to print without showing anything, e.g. "No printers
 * available on the network" on a Mac with no printer set up. Say so, and offer
 * a PDF instead of leaving the user wondering whether anything happened.
 */
async function onPrintResult(ok, reason) {
  if (ok || !mainWindow || /cancel/i.test(reason || '')) return;
  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    title: 'Print',
    message: "CareConnect couldn't print this page.",
    detail: `${reason || 'The printer did not respond.'}\nYou can save it as a PDF instead and print or share that.`,
    buttons: ['Save as PDF…', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
  });
  if (response !== 0) return;
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save as PDF',
    defaultPath: path.join(app.getPath('documents'), 'CareConnect.pdf'),
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (canceled || !filePath || !mainWindow) return;
  try {
    const pdf = await mainWindow.webContents.printToPDF({ printBackground: true });
    await fs.promises.writeFile(filePath, pdf);
  } catch (err) {
    dialog.showErrorBox('Save as PDF', `The PDF could not be saved: ${err.message}`);
  }
}

function shellAction(name) {
  const wc = mainWindow && mainWindow.webContents;
  switch (name) {
    case 'zoom-in':
      if (wc) wc.setZoomLevel(Math.min(ZOOM_MAX, wc.getZoomLevel() + ZOOM_STEP));
      break;
    case 'zoom-out':
      if (wc) wc.setZoomLevel(Math.max(ZOOM_MIN, wc.getZoomLevel() - ZOOM_STEP));
      break;
    case 'zoom-reset':
      if (wc) wc.setZoomLevel(0);
      break;
    case 'high-contrast':
      highContrast = !highContrast;
      send('cc:high-contrast', highContrast);
      installMenu();
      break;
    case 'print':
      if (wc) wc.print({ silent: false, printBackground: true }, (ok, reason) => onPrintResult(ok, reason));
      break;
    case 'show-shortcuts':
      showShortcuts();
      break;
    case 'about':
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'About CareConnect',
        message: 'CareConnect',
        detail: `Version ${app.getVersion()}\nMedication and appointment support for adults with ADHD and the people who support them.\nSWEN 661 · Team 5`,
      });
      break;
    default:
      break;
  }
}

function installMenu() {
  const template = buildMenuTemplate({
    platform: process.platform,
    navigate: (p) => send('cc:navigate', p),
    command: (c) => send('cc:command', c),
    shell: shellAction,
    isHighContrast: () => highContrast,
    hasSelection: () => hasSelection,
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function windowStateFile() {
  return path.join(app.getPath('userData'), 'window-state.json');
}

function createWindow() {
  // Reopen where the user left the window; reset to the center if that spot is
  // no longer on a connected display (see windowState.cjs).
  const bounds = windowState.restoreBounds(
    windowState.load(windowStateFile()),
    screen.getAllDisplays(),
    screen.getPrimaryDisplay(),
  );
  mainWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    // The desktop layout goes down to 1024×700 (two panes, then an icon rail),
    // but never asks for more room than the display's work area has.
    minWidth: bounds.min.width,
    minHeight: bounds.min.height,
    title: 'CareConnect',
    // Taskbar/title-bar icon on Windows and Linux (macOS uses the app bundle's icon).
    icon: path.join(__dirname, '../assets/icon.png'),
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      // Security defaults — the renderer gets no Node access.
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  // Avoid a white flash before first paint; reduced-motion friendly.
  mainWindow.once('ready-to-show', () => {
    if (bounds.isMaximized) mainWindow.maximize();
    mainWindow.show();
  });

  // Re-send the contrast state on every load, so it survives a reload.
  mainWindow.webContents.on('did-finish-load', () => {
    send('cc:high-contrast', highContrast);
  });
  // Handle Ctrl/Cmd+Enter before the focused renderer control can also
  // interpret Enter (for example, activating a focused tel: link).
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const commandModifier = process.platform === 'darwin' ? input.meta : input.control;

    if (
      input.type === 'keyDown' &&
      input.key === 'Enter' &&
      commandModifier &&
      !input.shift &&
      !input.alt
    ) {
      event.preventDefault();
      send('cc:command', 'mark-next-dose-taken');
    }
  });
  mainWindow.on('close', () => windowState.save(windowStateFile(), mainWindow));

  // External links open in the real browser, never in the app shell, and only
  // if they are web, mail or phone links.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openSafe(url);
    return { action: 'deny' };
  });

  // Block navigation away from the app (defense in depth).
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!isAppUrl(url, { isDev, devUrl: DEV_URL })) {
      event.preventDefault();
      openSafe(url);
    }
  });

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
  } else {
    mainWindow.loadURL(`${appProtocol.APP_ORIGIN}/`);
  }
  mainWindow.on('closed', () => {
    mainWindow = null;
    hasSelection = false;
  });
}

// An installer run (Windows Squirrel) only adds or removes shortcuts, then quits.
const installerRun = squirrelAction(process.argv, process.platform, process.execPath);
if (installerRun) {
  if (installerRun.run) {
    const [exe, args] = installerRun.run;
    require('node:child_process')
      .spawn(exe, args, { detached: true, stdio: 'ignore' })
      .on('error', () => app.quit())
      .on('close', () => app.quit());
  } else {
    app.quit();
  }
} else app.whenReady().then(() => {
  if (!isDev) {
    protocol.handle(appProtocol.SCHEME, (request) => {
      const file = appProtocol.resolveRequest(request.url, WEB_ROOT);
      if (!file) return new Response('Not found', { status: 404 });
      return net.fetch(pathToFileURL(file).toString());
    });
  }
  installMenu();
  createWindow();
  nativeTheme.on('updated', () => {
    // Fires for any theme change (dark mode too). Only a change to the OS
    // contrast setting itself overrides the user's menu choice.
    const os = nativeTheme.shouldUseHighContrastColors;
    if (os === osHighContrast) return;
    osHighContrast = os;
    highContrast = os;
    send('cc:high-contrast', highContrast);
    installMenu();
  });
  // The web app reports when a medication is selected or deselected.
  ipcMain.on('cc:selection', (event, selected) => {
    if (!mainWindow || event.sender !== mainWindow.webContents) return;
    if (!!selected === hasSelection) return;
    hasSelection = !!selected;
    installMenu();
  });
  ipcMain.on('cc:schedule-reminder', (event, payload) => {
  if (!mainWindow || event.sender !== mainWindow.webContents) return;

  const label =
    typeof payload?.label === 'string' ? payload.label.trim() : '';
  const minutes = Number(payload?.minutes);

  if (!label || !Number.isFinite(minutes) || minutes <= 0) return;

  setTimeout(() => {
    if (!Notification.isSupported()) return;

    new Notification({
      title: 'CareConnect Reminder',
      body: `${label} is due now.`,
    }).show();
  }, minutes * 60 * 1000);
});
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
