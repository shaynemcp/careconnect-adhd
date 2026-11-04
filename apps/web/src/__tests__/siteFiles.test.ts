/**
 * The build's page files (careconnect-site-files in vite.config.ts), next to the SEO checks in
 * pwaSeo.test.tsx. GitHub Pages answers /signin with signin.html and status 200; without that
 * file it falls back to 404.html with status 404, and search engines skip a page listed in
 * sitemap.xml. This runs the plugin's last step on a stand-in build folder.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Plugin } from 'vite';

// Only the config object is needed, not Vite or the React plugin themselves.
jest.mock('vite', () => ({ defineConfig: (config: unknown) => config }));
jest.mock('@vitejs/plugin-react', () => () => ({ name: 'vite:react-stub' }));

import config from '../../vite.config';

const INDEX_HTML = '<!doctype html><title>CareConnect</title><div id="root"></div>';

function sitePlugin(): Plugin {
  const plugins = ((config.plugins ?? []) as unknown[]).flat() as (Plugin | null)[];
  const plugin = plugins.find((p) => p?.name === 'careconnect-site-files');
  if (!plugin) throw new Error('careconnect-site-files is not in vite.config.ts plugins');
  return plugin;
}

describe('build output for GitHub Pages', () => {
  let root: string;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'careconnect-build-'));
    writeFileSync(join(root, 'index.html'), INDEX_HTML);
    const plugin = sitePlugin();
    (plugin.configResolved as (resolved: object) => void)({ root, build: { outDir: '.' } });
    (plugin.closeBundle as () => void)();
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  test('writes signin.html and signup.html, so Pages answers the public pages with 200', () => {
    expect(readdirSync(root)).toEqual(expect.arrayContaining(['signin.html', 'signup.html']));
  });

  test('writes 404.html for /app deep links, and no page file for signed-in screens', () => {
    expect(readdirSync(root).sort()).toEqual(['404.html', 'index.html', 'signin.html', 'signup.html']);
  });

  test('each copy is index.html unchanged: the router sets the title and description', () => {
    for (const file of ['signin.html', 'signup.html', '404.html']) {
      expect(readFileSync(join(root, file), 'utf8')).toBe(INDEX_HTML);
    }
  });
});
