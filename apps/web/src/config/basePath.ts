/**
 * Where the app is served from, from the Vite build (`base`, set by BASE_PATH at build time).
 * "/" locally and on a root domain; "/careconnect-adhd/" on GitHub Pages (A11 Part 3).
 * Kept in its own module so Jest (CommonJS, no import.meta) can replace it with
 * jest.basePathStub.cjs.
 */
export const BASE_URL: string = import.meta.env.BASE_URL;

/** The same path as React Router wants it for `basename`: no trailing slash, "/" at the root. */
export const ROUTER_BASENAME = BASE_URL.replace(/\/+$/, '') || '/';
