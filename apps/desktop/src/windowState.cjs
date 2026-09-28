/**
 * Remembers the main window's size, position and maximized state between
 * sessions, the way Windows and macOS apps are expected to.
 * The bounds logic has no Electron import, so it is unit-tested.
 */
const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_SIZE = { width: 1440, height: 900 };
const MIN_SIZE = { width: 1024, height: 700 };

const intersects = (a, b) =>
  a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

const centerIn = (size, area) => ({
  x: Math.round(area.x + (area.width - size.width) / 2),
  y: Math.round(area.y + (area.height - size.height) / 2),
  ...size,
});

/**
 * Minimum window size for a display. The design minimum is 1024×700, but a
 * small laptop at 125% scaling has less room than that (about 1093×574 on a
 * 1366×768 screen), so the minimum never exceeds the display's work area.
 */
function minimumSize(workArea) {
  return {
    width: Math.min(MIN_SIZE.width, workArea.width),
    height: Math.min(MIN_SIZE.height, workArea.height),
  };
}

/**
 * Bounds to open the window with.
 * @param {object|null} saved   { x, y, width, height, isMaximized } from last time
 * @param {Array<{workArea: object}>} displays   screen.getAllDisplays()
 * @param {{workArea: object}} primary           screen.getPrimaryDisplay()
 */
function restoreBounds(saved, displays, primary) {
  const area = primary.workArea;
  const min = minimumSize(area);
  const fallbackSize = {
    width: Math.max(min.width, Math.min(DEFAULT_SIZE.width, area.width)),
    height: Math.max(min.height, Math.min(DEFAULT_SIZE.height, area.height)),
  };
  const valid =
    saved &&
    [saved.x, saved.y, saved.width, saved.height].every(Number.isFinite) &&
    saved.width > 0 &&
    saved.height > 0;
  // A saved position on a monitor that is no longer connected opens centered
  // on the primary display instead of off-screen.
  if (!valid || !displays.some((d) => intersects(saved, d.workArea))) {
    return { ...centerIn(fallbackSize, area), isMaximized: false, min };
  }
  return {
    x: saved.x,
    y: saved.y,
    width: Math.max(min.width, saved.width),
    height: Math.max(min.height, saved.height),
    isMaximized: !!saved.isMaximized,
    min,
  };
}

function load(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null; // first run or unreadable file: use the defaults
  }
}

function save(file, win) {
  try {
    // getNormalBounds() is the size to restore to, even while maximized.
    const b = win.getNormalBounds();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ ...b, isMaximized: win.isMaximized() }));
  } catch {
    // Not being able to save the window position must never block quitting.
  }
}

module.exports = { restoreBounds, minimumSize, load, save, DEFAULT_SIZE, MIN_SIZE };
