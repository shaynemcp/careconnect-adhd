#!/usr/bin/env node
/**
 * Checks the colour tokens in tailwind.config.js (run: npm run check:contrast).
 *
 * 1. Every token whose comment states a ratio ("6.5:1 on white") really has
 *    that ratio, so the comments and the design documentation can't drift.
 * 2. Every token the apps use for normal-size text meets WCAG 1.4.3 (4.5:1)
 *    on white and on the page background (neutral-50).
 * 3. The global focus ring is at least 3:1 on those backgrounds.
 * 4. Every High Contrast mode colour (--hc-* in high-contrast.css) is at least 7:1.
 * 5. No web page uses text-neutral-400 or (outside aria-hidden icons and dark
 *    backgrounds) text-neutral-300 for text.
 *
 * Exits with 1 and lists each failure.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../tailwind.config.js';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(join(here, '../tailwind.config.js'), 'utf8');
const colors = config.theme.extend.colors;

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const WHITE = '#ffffff';
const PAGE = colors.neutral[50];
// Tokens used for normal-size text somewhere in web, Flutter or React Native.
const TEXT_TOKENS = [
  'neutral.600', 'neutral.700', 'neutral.800', 'neutral.900',
  'calm.600', 'calm.700', 'success.600', 'success.700',
  'warning.600', 'warning.700', 'warning.800', 'warning.900',
  'alert.600', 'alert.700',
];

const failures = [];
const rows = [];

// 1. Stated ratios match (allow rounding to one decimal place).
const commented = /(\w+):\s*\{([^{}]*)\}/g;
for (const [, group, body] of source.matchAll(commented)) {
  for (const [, shade, hex, claim] of body.matchAll(/(\d{2,3}):\s*'(#[0-9a-fA-F]{6})',\s*\/\/[^\n]*?([\d.]+):1 on white/g)) {
    const actual = contrast(hex, WHITE);
    rows.push({ token: `${group}-${shade}`, hex, stated: `${claim}:1`, actual: `${actual.toFixed(2)}:1` });
    if (Math.abs(actual - Number(claim)) > 0.06) failures.push(`${group}-${shade} ${hex}: comment says ${claim}:1, measured ${actual.toFixed(2)}:1`);
  }
}

// 2. Text tokens pass 4.5:1 on white and on the page background.
for (const path of TEXT_TOKENS) {
  const [group, shade] = path.split('.');
  const hex = colors[group]?.[shade];
  if (!hex) {
    failures.push(`${group}-${shade}: listed as a text token but not defined`);
    continue;
  }
  for (const [bgName, bg] of [['white', WHITE], ['neutral-50', PAGE]]) {
    const ratio = contrast(hex, bg);
    if (ratio < 4.5) failures.push(`${group}-${shade} ${hex} on ${bgName}: ${ratio.toFixed(2)}:1 is below 4.5:1 (WCAG 1.4.3)`);
  }
}

// 3. The global focus ring (index.css) is at least 3:1 against the surfaces it
//    sits on. It has a 3px offset, so its neighbours are the page and dialog
//    backgrounds, never the control itself (WCAG 1.4.11 / 2.4.7).
const css = readFileSync(join(here, '../src/index.css'), 'utf8');
const ring = css.match(/\*:focus-visible\s*\{[^}]*outline:\s*\d+px\s+solid\s+(#[0-9a-fA-F]{6})/)?.[1];
if (!ring) {
  failures.push('index.css: could not find the global *:focus-visible outline colour');
} else {
  for (const [bgName, bg] of [['white', WHITE], ['neutral-50', PAGE]]) {
    const ratio = contrast(ring, bg);
    if (ratio < 3) failures.push(`focus ring ${ring} on ${bgName}: ${ratio.toFixed(2)}:1 is below 3:1 (WCAG 1.4.11)`);
  }
}

// 4. High Contrast mode (src/high-contrast.css): every --hc-* colour is at
//    least 7:1 on the high-contrast background (WCAG 1.4.6, the AAA level
//    that mode is for).
const hcCss = readFileSync(join(here, '../src/high-contrast.css'), 'utf8');
const hcBlock = hcCss.match(/html\.cc-high-contrast\s*\{([^}]*)\}/)?.[1] ?? '';
const hc = Object.fromEntries([...hcBlock.matchAll(/--hc-([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map(([, k, v]) => [k, v]));
if (!hc.bg) {
  failures.push('high-contrast.css: html.cc-high-contrast has no --hc-bg colour');
} else {
  for (const [name, hex] of Object.entries(hc)) {
    if (name === 'bg') continue;
    const ratio = contrast(hex, hc.bg);
    if (ratio < 7) failures.push(`high contrast --hc-${name} ${hex}: ${ratio.toFixed(2)}:1 on ${hc.bg}, below 7:1`);
  }
}

// 5. No page uses a text colour that fails 1.4.3. neutral-400 (2.85:1) is for
//    disabled borders only; neutral-300 is allowed only on aria-hidden icons
//    or on a dark (neutral-800/900) background.
const srcDir = join(here, '../src');
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(dir, e.name)) : e.name.endsWith('.tsx') ? [join(dir, e.name)] : []);
for (const file of walk(srcDir)) {
  if (file.includes('__tests__')) continue;
  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    const where = `${file.slice(srcDir.length + 1).replace(/\\/g, '/')}:${i + 1}`;
    if (/\btext-neutral-400\b/.test(line)) failures.push(`${where}: text-neutral-400 is 2.85:1, use text-neutral-500 or darker`);
    if (/\btext-neutral-300\b/.test(line) && !/aria-hidden="true"|bg-neutral-(800|900)/.test(line)) {
      failures.push(`${where}: text-neutral-300 is 1.65:1; only for aria-hidden icons or dark backgrounds`);
    }
  });
}

console.table(rows);
if (failures.length) {
  console.error(`\n${failures.length} contrast problem(s):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`\nAll ${rows.length} stated ratios match and all ${TEXT_TOKENS.length} text tokens pass 4.5:1 on white and neutral-50.`);
console.log(`Focus ring ${ring} passes 3:1, all ${Object.keys(hc).length - 1} high-contrast colours pass 7:1, and no page uses a failing text colour.`);
