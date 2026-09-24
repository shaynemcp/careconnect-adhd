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
const { app, BrowserWindow, Menu, shell, nativeTheme, dialog } = require('electron');
const path = require('node:path');
const { buildMenuTemplate } = require('./menu.cjs');
const { shortcutsHtml } = require('./shortcutsWindow.cjs');

const isDev = !app.isPackaged;
const DEV_URL = process.env.CARECONNECT_DEV_URL || 'http://localhost:5173';
const ZOOM_STEP = 0.5; // Chromium zoom levels; 0 = 100%, each step ≈ 10–20%
const ZOOM_MIN = -1; // ≈ 80%
const ZOOM_MAX = 4; // ≈ 200% (WCAG 1.4.4 Resize Text)

let mainWindow = null;
let shortcutsWindow = null;
let highContrast = nativeTheme.shouldUseHighContrastColors;

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
      if (wc) wc.print({ silent: false, printBackground: true });
      break;
    case 'show-shortcuts':
      showShortcuts();
      break;
    case 'about':
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'About CareConnect',
        message: 'CareConnect',
        detail: `Version ${app.getVersion()}\nMedication and appointment support for adults with ADHD or short-term memory loss, and the people who support them.\nSWEN 661 · Team 5 (E-Echo)`,
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
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    // Desktop layout is designed for large displays; below this it reflows
    // to a single column rather than scrolling sideways.
    minWidth: 1024,
    minHeight: 700,
    title: 'CareConnect',
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
    mainWindow.show();
    if (highContrast) send('cc:high-contrast', true);
  });

  // External links open in the real browser, never in the app shell.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Block navigation away from the app (defense in depth).
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = isDev ? url.startsWith(DEV_URL) : url.startsWith('file://');
    if (!allowed) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  if (isDev) {
    mainWindow.loadURL(DEV_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../web/dist/index.html'));
  }
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  installMenu();
  createWindow();
  nativeTheme.on('updated', () => {
    if (nativeTheme.shouldUseHighContrastColors !== highContrast) {
      highContrast = nativeTheme.shouldUseHighContrastColors;
      send('cc:high-contrast', highContrast);
      installMenu();
    }
  });
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
