/**
 * A small stand-in for the `electron` module, so main.cjs and preload.cjs can be
 * loaded and driven under plain `node --test` (no Electron binary, no display).
 * Every call the shell makes is recorded so tests can assert on it.
 */
const Module = require('node:module');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');

function emitter() {
  const handlers = {};
  return {
    handlers,
    on(ev, fn) { (handlers[ev] ||= []).push(fn); return this; },
    once(ev, fn) { return this.on(ev, fn); },
    emit(ev, ...args) { for (const fn of handlers[ev] || []) fn(...args); },
  };
}

function createFakeElectron({ platform = process.platform, highContrast = false } = {}) {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-desktop-test-'));
  const calls = { opened: [], menus: [], dialogs: [], saveDialogs: [], errors: [], exposed: {}, sent: [], quit: 0 };
  const dialogAnswers = { messageBox: { response: 1 }, saveDialog: { canceled: true } };
  const windows = [];

  class FakeWebContents {
    constructor() {
      Object.assign(this, emitter());
      this.sentMessages = [];
      this.zoom = 0;
      this.windowOpenHandler = null;
      this.printResult = { ok: true, reason: '' };
    }
    send(channel, payload) { this.sentMessages.push([channel, payload]); }
    setWindowOpenHandler(fn) { this.windowOpenHandler = fn; }
    getZoomLevel() { return this.zoom; }
    setZoomLevel(z) { this.zoom = z; }
    print(_opts, cb) { cb(this.printResult.ok, this.printResult.reason); }
    async printToPDF() { return Buffer.from('%PDF-fake'); }
  }

  class BrowserWindow {
    constructor(opts) {
      Object.assign(this, emitter());
      this.opts = opts;
      this.webContents = new FakeWebContents();
      this.destroyed = false;
      this.shown = false;
      this.maximized = false;
      this.loaded = null;
      windows.push(this);
    }
    static getAllWindows() { return windows.filter((w) => !w.destroyed); }
    isDestroyed() { return this.destroyed; }
    loadURL(u) { this.loaded = u; }
    loadFile(f) { this.loaded = f; }
    show() { this.shown = true; }
    maximize() { this.maximized = true; }
    focus() { this.focused = true; }
    close() { this.emit('close'); this.destroyed = true; this.emit('closed'); }
    isMaximized() { return this.maximized; }
    getNormalBounds() { return { x: this.opts.x, y: this.opts.y, width: this.opts.width, height: this.opts.height }; }
  }

  let readyResolve;
  const ready = new Promise((r) => { readyResolve = r; });
  const app = Object.assign(emitter(), {
    isPackaged: false,
    whenReady: () => ready,
    getPath: () => userData,
    getVersion: () => '0.1.0',
    quit: () => { calls.quit += 1; },
  });

  const workArea = { x: 0, y: 0, width: 1920, height: 1040 };
  const electron = {
    app,
    BrowserWindow,
    Menu: {
      buildFromTemplate: (t) => t,
      setApplicationMenu: (m) => calls.menus.push(m),
    },
    shell: { openExternal: async (u) => { calls.opened.push(u); } },
    nativeTheme: Object.assign(emitter(), { shouldUseHighContrastColors: highContrast }),
    dialog: {
      showMessageBox: async (_w, o) => { calls.dialogs.push(o); return dialogAnswers.messageBox; },
      showSaveDialog: async (_w, o) => { calls.saveDialogs.push(o); return dialogAnswers.saveDialog; },
      showErrorBox: (t, m) => calls.errors.push([t, m]),
    },
    screen: { getAllDisplays: () => [{ workArea }], getPrimaryDisplay: () => ({ workArea }) },
    ipcMain: emitter(),
    ipcRenderer: Object.assign(emitter(), { send: (ch, v) => calls.sent.push([ch, v]) }),
    contextBridge: { exposeInMainWorld: (k, v) => { calls.exposed[k] = v; } },
  };

  return {
    electron, calls, windows, dialogAnswers, userData, platform,
    ready: async () => { readyResolve(); await ready; await new Promise((r) => setImmediate(r)); },
    lastMenu: () => calls.menus[calls.menus.length - 1],
    menuItem(id) {
      for (const top of this.lastMenu()) for (const it of top.submenu || []) if (it.id === id) return it;
      return undefined;
    },
  };
}

/** require() `file` with `electron` replaced by `fake.electron` and process.platform set. */
function loadWith(fake, file) {
  const resolved = require.resolve(file);
  const origLoad = Module._load;
  const origPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
  Object.defineProperty(process, 'platform', { value: fake.platform });
  Module._load = function (request, ...rest) {
    if (request === 'electron') return fake.electron;
    return origLoad.call(this, request, ...rest);
  };
  delete require.cache[resolved];
  try {
    return require(resolved);
  } finally {
    Module._load = origLoad;
    Object.defineProperty(process, 'platform', origPlatform);
  }
}

module.exports = { createFakeElectron, loadWith };
