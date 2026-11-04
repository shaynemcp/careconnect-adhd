// Bundle size analysis for the production build (A11 Part 4).
// usage (after npm run build): node scripts/bundle-report.mjs [out.md]
// Lists every JS and CSS file in dist/assets with its raw, gzip and brotli size,
// split into what the first page load downloads (referenced by dist/index.html)
// and the route chunks that load on demand. Writes Markdown to out.md if given.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync, brotliCompressSync } from 'node:zlib';

const DIST = new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const ASSETS = join(DIST, 'assets');
const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const initial = new Set([...html.matchAll(/assets\/([^"']+\.(?:js|css))/g)].map((m) => m[1]));

const kb = (n) => (n / 1024).toFixed(1);
const rows = readdirSync(ASSETS)
  .filter((f) => /\.(js|css)$/.test(f))
  .map((f) => {
    const buf = readFileSync(join(ASSETS, f));
    return { f, raw: buf.length, gz: gzipSync(buf, { level: 9 }).length, br: brotliCompressSync(buf).length, first: initial.has(f) };
  })
  .sort((a, b) => b.gz - a.gz);

const sum = (list, k) => list.reduce((t, r) => t + r[k], 0);
const first = rows.filter((r) => r.first);
const lazy = rows.filter((r) => !r.first);
const table = (list) => [
  '| File | Raw kB | gzip kB | brotli kB |',
  '|---|---:|---:|---:|',
  ...list.map((r) => `| \`${r.f}\` | ${kb(r.raw)} | ${kb(r.gz)} | ${kb(r.br)} |`),
].join('\n');

const md = [
  '# Bundle size report',
  '',
  `Generated ${new Date().toISOString().slice(0, 10)} from \`dist/\` by \`scripts/bundle-report.mjs\`.`,
  '',
  `**First load** (files in \`index.html\`): ${kb(sum(first, 'raw'))} kB raw, **${kb(sum(first, 'gz'))} kB gzip**, ${kb(sum(first, 'br'))} kB brotli.`,
  `**On demand** (${lazy.length} route chunks, loaded when a screen opens): ${kb(sum(lazy, 'raw'))} kB raw, ${kb(sum(lazy, 'gz'))} kB gzip in total.`,
  '',
  '## First load',
  '',
  table(first),
  '',
  '## Loaded on demand',
  '',
  table(lazy),
  '',
].join('\n');

if (process.argv[2]) writeFileSync(process.argv[2], md);
console.log(md);
