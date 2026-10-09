/**
 * Packaged-app loading (Assignment 8, Part 4): the app:// protocol serves the
 * web build with a single-page-app fallback and refuses anything outside it.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { resolveRequest, APP_ORIGIN } = require('../src/appProtocol.cjs');
const { createFakeElectron, loadWith } = require('./support/fakeElectron.cjs');

function webRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-web-'));
  fs.mkdirSync(path.join(root, 'assets'));
  fs.writeFileSync(path.join(root, 'index.html'), '<!doctype html>');
  fs.writeFileSync(path.join(root, 'assets', 'app.js'), '');
  return root;
}

test('existing files are served as themselves', () => {
  const root = webRoot();
  assert.equal(resolveRequest(`${APP_ORIGIN}/assets/app.js`, root), path.join(root, 'assets', 'app.js'));
});

test('the root and client-side routes get index.html, so BrowserRouter works after a reload', () => {
  const root = webRoot();
  const index = path.join(root, 'index.html');
  assert.equal(resolveRequest(`${APP_ORIGIN}/`, root), index);
  assert.equal(resolveRequest(`${APP_ORIGIN}/app/medications?new=1`, root), index);
  assert.equal(resolveRequest(`${APP_ORIGIN}/assets/`, root), index, 'a directory is not a file');
});

test('paths that escape the web build, other hosts and other schemes are refused', () => {
  const root = webRoot();
  for (const bad of [
    `${APP_ORIGIN}/%2e%2e/%2e%2e/secret.txt`,
    `${APP_ORIGIN}/..%5c..%5cwindows%5cwin.ini`,
    'app://evil/index.html',
    'file:///C:/Windows/win.ini',
    `${APP_ORIGIN}/%E0%A4%A`,
    'not a url',
  ]) {
    const r = resolveRequest(bad, root);
    assert.ok(r === null || r === path.join(root, 'index.html'), `${bad} -> ${r}`);
    if (r) assert.ok(r.startsWith(root));
  }
  assert.equal(resolveRequest('app://evil/index.html', root), null);
  assert.equal(resolveRequest('not a url', root), null);
});

test('packaged app registers app://, serves the web build through it and loads it', async () => {
  const fake = createFakeElectron({ platform: 'win32', isPackaged: true });
  loadWith(fake, path.join(__dirname, '../src/main.cjs'));
  assert.equal(fake.calls.privilegedSchemes[0].scheme, 'app');
  assert.equal(fake.calls.privilegedSchemes[0].privileges.secure, true);
  await fake.ready();
  const win = fake.windows[0];
  assert.equal(win.loaded, 'app://careconnect/');

  const handler = fake.calls.protocolHandlers.app;
  const ok = await handler({ url: 'app://careconnect/app/medications' });
  assert.match(ok.headers.get('x-fetched'), /^file:.*web\/dist\/index\.html$/);
  assert.equal(ok.headers.get('content-type'), 'text/html', 'original headers are kept');
  assert.match(ok.headers.get('content-security-policy'), /script-src 'self';/);
  const refused = await handler({ url: 'app://evil/' });
  assert.equal(refused.status, 404);

  let prevented = false;
  win.webContents.emit('will-navigate', { preventDefault: () => { prevented = true; } }, 'app://careconnect/app');
  assert.equal(prevented, false, 'in-app navigation is allowed when packaged');
});
