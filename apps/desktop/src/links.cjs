/**
 * Which URLs the shell may load itself and which it may hand to the OS.
 * No Electron import, so it is unit-tested.
 */

// Only web and mail/phone links leave the app. file:, smb:, custom protocols
// and anything else are dropped instead of being passed to the OS.
const EXTERNAL_SCHEMES = new Set(['https:', 'http:', 'mailto:', 'tel:']);

function parse(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/** True if the URL may be opened in the user's browser or mail/phone app. */
function isSafeExternalUrl(url) {
  const u = parse(url);
  return !!u && EXTERNAL_SCHEMES.has(u.protocol);
}

/**
 * True if the main window may navigate to the URL itself. Compares origins,
 * so "http://localhost:5173@evil.example/" does not pass as the dev server.
 */
function isAppUrl(url, { isDev, devUrl }) {
  const u = parse(url);
  if (!u) return false;
  if (isDev) {
    const dev = parse(devUrl);
    return !!dev && u.origin === dev.origin;
  }
  // Packaged: only pages served from app://careconnect/ (see appProtocol.cjs).
  return u.protocol === 'app:' && u.host === 'careconnect';
}

module.exports = { isSafeExternalUrl, isAppUrl };
