#!/usr/bin/env node
/**
 * Checks the colour tokens in tailwind.config.js (run: npm run check:contrast).
 *
 * 1. Every token whose comment states a ratio ("6.5:1 on white") really has
 *    that ratio, so the comments and the design documentation can't drift.
 * 2. Every token the apps use for normal-size text meets WCAG 1.4.3 (4.5:1)
 *    on white and on the page background (neutral-50).
 *
 * Exits with 1 and lists each failure.
 */
import { readFileSync } from 'node:fs';
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

console.table(rows);
if (failures.length) {
  console.error(`\n${failures.length} contrast problem(s):\n- ${failures.join('\n- ')}`);
  process.exit(1);
}
console.log(`\nAll ${rows.length} stated ratios match and all ${TEXT_TOKENS.length} text tokens pass 4.5:1 on white and neutral-50.`);
