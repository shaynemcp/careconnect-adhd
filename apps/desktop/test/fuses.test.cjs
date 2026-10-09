/**
 * Electron fuses on the packaged exe (scripts/fuses.cjs).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { FuseV1Options } = require('@electron/fuses');
const { FUSES } = require('../scripts/fuses.cjs');

test('the exe cannot be run as Node, given Node flags, or load a modified app', () => {
  assert.equal(FUSES[FuseV1Options.RunAsNode], false);
  assert.equal(FUSES[FuseV1Options.EnableNodeOptionsEnvironmentVariable], false);
  assert.equal(FUSES[FuseV1Options.EnableNodeCliInspectArguments], false);
  assert.equal(FUSES[FuseV1Options.EnableEmbeddedAsarIntegrityValidation], true);
  assert.equal(FUSES[FuseV1Options.OnlyLoadAppFromAsar], true);
});
