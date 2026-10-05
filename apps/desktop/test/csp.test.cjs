/**
 * Content-Security-Policy (Assignment 8: no Electron security warnings).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { contentSecurityPolicy, withCsp } = require('../src/csp.cjs');
const { createFakeElectron, loadWith } = require('./support/fakeElectron.cjs');

function directives(policy) {
  return Object.fromEntries(policy.split('; ').map((d) => { const [k, ...v] = d.split(' '); return [k, v]; }));
}

test('the packaged policy only runs the app\'s own scripts and never allows eval', () => {
  const d = directives(contentSecurityPolicy());
  assert.deepEqual(d['script-src'], ["'self'"]);
  assert.deepEqual(d['object-src'], ["'none'"]);
  assert.ok(!contentSecurityPolicy().includes('unsafe-eval'));
  assert.ok(!contentSecurityPolicy({ isDev: true, devUrl: 'http://localhost:5173' }).includes('unsafe-eval'));
});

test('the policy allows the outside resources the web app uses', () => {
  const d = directives(contentSecurityPolicy());
  assert.ok(d['style-src'].includes('https://fonts.googleapis.com'));
  assert.ok(d['font-src'].includes('https://fonts.gstatic.com'));
  assert.ok(d['img-src'].includes('https://images.pexels.com'));
  assert.ok(d['connect-src'].includes('https://*.supabase.co'));
  assert.ok(d['connect-src'].includes('https://fonts.gstatic.com'), 'the service worker caches fonts with fetch()');
});

test('development adds only what Vite hot reload needs', () => {
  const d = directives(contentSecurityPolicy({ isDev: true, devUrl: 'http://localhost:5174/app' }));
  assert.ok(d['script-src'].includes("'unsafe-inline'"));
  assert.ok(d['connect-src'].includes('ws://localhost:5174'));
  assert.ok(!directives(contentSecurityPolicy())['connect-src'].some((s) => s.startsWith('ws:')));
});

test('withCsp keeps the body, status and headers and adds the policy', async () => {
  const res = withCsp(new Response('hi', { status: 200, headers: { 'content-type': 'text/plain' } }), "default-src 'self'");
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'text/plain');
  assert.equal(res.headers.get('content-security-policy'), "default-src 'self'");
  assert.equal(await res.text(), 'hi');
});

test('in development the policy is added to dev server responses only', async () => {
  const fake = createFakeElectron({ platform: 'win32', isPackaged: false });
  loadWith(fake, path.join(__dirname, '../src/main.cjs'));
  await fake.ready();
  const hook = fake.calls.headersHook;
  assert.equal(typeof hook, 'function');

  let result;
  hook({ url: 'http://localhost:5173/src/main.tsx', responseHeaders: { 'Content-Type': ['text/javascript'] } }, (r) => { result = r; });
  assert.deepEqual(result.responseHeaders['Content-Type'], ['text/javascript']);
  assert.match(result.responseHeaders['Content-Security-Policy'][0], /connect-src .*ws:\/\/localhost:5173/);

  hook({ url: 'https://fonts.googleapis.com/css2', responseHeaders: {} }, (r) => { result = r; });
  assert.deepEqual(result, {}, 'other sites keep their own headers');
});
