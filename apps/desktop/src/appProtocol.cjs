/**
 * The packaged app serves the web build from app://careconnect/ instead of
 * file://, so the web app's BrowserRouter sees ordinary paths ("/app/medications")
 * and a reload on any route still works. Unknown paths fall back to index.html,
 * the way a web server hosting a single-page app would.
 *
 * No Electron import here, so the path logic is unit-tested.
 */
const fs = require('node:fs');
const path = require('node:path');

const SCHEME = 'app';
const HOST = 'careconnect';
const APP_ORIGIN = `${SCHEME}://${HOST}`;

/**
 * Map a request URL to a file inside `root`, or null if it must be refused.
 * Existing files are served as-is; anything else (a client-side route) gets
 * index.html. Paths that would escape `root` are refused.
 */
function resolveRequest(url, root) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== `${SCHEME}:` || u.host !== HOST) return null;
  let rel;
  try {
    rel = decodeURIComponent(u.pathname);
  } catch {
    return null;
  }
  const base = path.resolve(root);
  const file = path.resolve(base, '.' + rel);
  if (file !== base && !file.startsWith(base + path.sep)) return null;
  if (file !== base && fs.existsSync(file) && fs.statSync(file).isFile()) return file;
  return path.join(base, 'index.html');
}

module.exports = { SCHEME, HOST, APP_ORIGIN, resolveRequest };
