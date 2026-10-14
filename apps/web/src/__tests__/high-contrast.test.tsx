/**
 * High Contrast mode (#44): the `cc-high-contrast` class on <html> must change
 * computed colours, and must leave white text on dark fills white.
 *
 * jsdom does not load stylesheets imported by main.tsx, so this test injects
 * the real src/high-contrast.css. Tailwind's utilities are not available
 * either, so the few base colours these rules compete with (.text-white, the
 * skip link's white text, a neutral text colour) are declared here with the
 * same selectors Tailwind generates. jsdom keeps var(--hc-*) unresolved, which
 * is enough to tell which rule won.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Appointments from '../pages/Appointments';

const WHITE = 'rgb(255, 255, 255)';
const BASE = `.text-white { color: ${WHITE}; }
.skip-link { color: ${WHITE}; }
.btn-primary { color: ${WHITE}; }
.text-neutral-500 { color: rgb(87, 83, 78); }`;

const styles: HTMLStyleElement[] = [];
beforeAll(() => {
  for (const css of [BASE, readFileSync(join(__dirname, '../high-contrast.css'), 'utf8')]) {
    const el = document.createElement('style');
    el.textContent = css;
    document.head.appendChild(el);
    styles.push(el);
  }
});
afterAll(() => styles.forEach((el) => el.remove()));
afterEach(() => document.documentElement.classList.remove('cc-high-contrast'));

const colour = (el: Element) => getComputedStyle(el).color;

function markup() {
  document.body.innerHTML = `
    <a id="skip" class="skip-link" href="#main-content">Skip to main content</a>
    <h1 id="hero" class="text-white">Hero on a dark gradient</h1>
    <h2 id="plain">Plain heading</h2>
    <p id="muted" class="text-neutral-500">Secondary text</p>
    <a id="link" href="/app">Ordinary link</a>
    <a id="button-link" class="btn-primary" href="/signup">Get started</a>`;
  return (id: string) => document.getElementById(id)!;
}

test('the class changes computed colours: headings, secondary text and links', () => {
  const el = markup();
  expect(colour(el('plain'))).not.toBe('var(--hc-text)');
  expect(colour(el('muted'))).toBe('rgb(87, 83, 78)');

  document.documentElement.classList.add('cc-high-contrast');

  expect(colour(el('plain'))).toBe('var(--hc-text)');
  expect(colour(el('muted'))).toBe('var(--hc-text)');
  expect(colour(el('link'))).toBe('var(--hc-calm)');
});

test('white text on dark fills stays white: hero heading, skip link, button link', () => {
  const el = markup();
  document.documentElement.classList.add('cc-high-contrast');

  expect(colour(el('hero'))).toBe(WHITE);
  expect(colour(el('skip'))).toBe(WHITE);
  expect(colour(el('button-link'))).toBe(WHITE);
});

test('the Appointments "Today" heading (h2 since #59) stays white on its dark pill', () => {
  const { container } = render(<MemoryRouter><Appointments /></MemoryRouter>);
  const today = container.querySelector('#group-today')!;
  expect(today.tagName).toBe('H2');
  expect(today).toHaveClass('text-white');

  document.documentElement.classList.add('cc-high-contrast');

  expect(colour(today)).toBe(WHITE);
});
