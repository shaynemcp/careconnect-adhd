/**
 * Content-Security-Policy for the main window (Assignment 8: no Electron
 * security warnings). The packaged app sends it from the app:// handler; in
 * development it is added to the Vite dev server's responses.
 *
 * Allowed outside the app: Google Fonts (index.css), the Pexels photos in the
 * demo memories (mockData.ts) and the Supabase chat function (ChatBot.tsx).
 * No 'unsafe-eval' anywhere. Development also needs inline scripts (Vite's
 * React Refresh preamble) and a WebSocket back to Vite for hot reload.
 *
 * No Electron import here, so the policy is unit-tested.
 */
const PROD_SOURCES = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  // React and Vite set inline styles; Google Fonts serves the Inter stylesheet.
  'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
  'font-src': ["'self'", 'https://fonts.gstatic.com'],
  'img-src': ["'self'", 'data:', 'https://images.pexels.com'],
  // The service worker (public/sw.js) fetches and caches Google Fonts itself,
  // and a worker's fetch() is checked against connect-src.
  'connect-src': ["'self'", 'https://*.supabase.co', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
  'worker-src': ["'self'"],
  'manifest-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
};

function contentSecurityPolicy({ isDev = false, devUrl = '' } = {}) {
  const sources = Object.fromEntries(Object.entries(PROD_SOURCES).map(([k, v]) => [k, [...v]]));
  if (isDev) {
    sources['script-src'].push("'unsafe-inline'");
    if (devUrl) sources['connect-src'].push(new URL(devUrl).origin.replace(/^http/, 'ws'));
  }
  return Object.entries(sources).map(([k, v]) => `${k} ${v.join(' ')}`).join('; ');
}

/** A copy of `response` with the policy header added. */
function withCsp(response, policy) {
  const headers = new Headers(response.headers);
  headers.set('Content-Security-Policy', policy);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

module.exports = { contentSecurityPolicy, withCsp };
