/**
 * Preload bridge between the Electron menu and the web app.
 *
 * Runs with contextIsolation on: the web app never gets Node or ipcRenderer,
 * only this small, typed surface.
 */
const { contextBridge, ipcRenderer } = require('electron');

// Menu → "navigate": update the URL and let React Router pick it up.
ipcRenderer.on('cc:navigate', (_event, path) => {
  if (typeof path !== 'string' || !path.startsWith('/')) return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
});

// Menu → "command": re-dispatched as a DOM event the web app can listen for,
// e.g. window.addEventListener('careconnect:command', e => e.detail === 'mark-next-dose-taken').
ipcRenderer.on('cc:command', (_event, name) => {
  window.dispatchEvent(new CustomEvent('careconnect:command', { detail: name }));
});

// Menu → "high contrast": a class on <html> the web stylesheet can target.
ipcRenderer.on('cc:high-contrast', (_event, on) => {
  document.documentElement.classList.toggle('cc-high-contrast', !!on);
});

contextBridge.exposeInMainWorld('careconnectDesktop', {
  isDesktop: true,
  platform: process.platform,
});
