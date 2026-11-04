import { copyFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Where the app is served from. "/" by default (local, Electron, a root domain); the GitHub
 * Pages build sets BASE_PATH=/careconnect-adhd/ (A11 Part 3, .github/workflows/deploy-web.yml).
 * Always ends in "/" because Vite, the router and the service worker all expect a folder.
 */
const BASE = `/${(process.env.BASE_PATH ?? '/').replace(/^\/+|\/+$/g, '')}/`.replace(/^\/\/$/, '/');

/** Public pages search engines may index. Everything under /app is behind sign-in. */
const PUBLIC_ROUTES = ['/', '/signin', '/signup'];

/** signin.html and signup.html: the public pages other than "/", which is index.html itself. */
const PUBLIC_PAGE_FILES = PUBLIC_ROUTES.filter((path) => path !== '/').map((path) => `${path.slice(1)}.html`);

/**
 * Build-time SEO and offline files (A10 Part 3):
 * - asset-manifest.json: every built JS/CSS file, so the service worker can precache the
 *   route chunks that index.html no longer names after code splitting.
 * - robots.txt: allows the public pages and keeps the signed-in app out of search results.
 * - sitemap.xml, and absolute og:image/og:url, only when SITE_URL is set (crawlers need
 *   absolute URLs): SITE_URL=https://... npm run build. On a sub-path, SITE_URL includes it.
 * - 404.html, a copy of index.html (A11 Part 3): GitHub Pages has no rewrite rules and serves
 *   404.html for any path it doesn't know, so a direct link or a reload on /app/medications
 *   still boots the app and the router opens the right screen.
 * - signin.html and signup.html, more copies of index.html: GitHub Pages serves /signin from
 *   signin.html with status 200, where 404.html would answer 404 and search engines would skip
 *   the page. The router still sets each page's title and description when it opens. /app stays
 *   on 404.html: it is noindex and disallowed in robots.txt.
 */
function siteFiles(): Plugin {
  const site = (process.env.SITE_URL ?? '').replace(/\/+$/, '');
  let outDir = 'dist';
  return {
    name: 'careconnect-site-files',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
    },
    transformIndexHtml(html) {
      if (!site) return html;
      return html
        .replace(/content="\/og-image\.png"/g, `content="${site}/og-image.png"`)
        .replace('</title>', `</title>\n    <meta property="og:url" content="${site}/" />`);
    },
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle)
        .filter((file) => file.startsWith('assets/') && /\.(js|css)$/.test(file))
        .map((file) => `${BASE}${file}`)
        .sort();
      this.emitFile({ type: 'asset', fileName: 'asset-manifest.json', source: JSON.stringify(assets, null, 2) });

      const robots = [
        'User-agent: *',
        `Allow: ${BASE}$`,
        `Allow: ${BASE}signin`,
        `Allow: ${BASE}signup`,
        `Disallow: ${BASE}app`,
        `Disallow: ${BASE}role`,
      ];
      if (site) robots.push('', `Sitemap: ${site}/sitemap.xml`);
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots.join('\n') + '\n' });

      if (site) {
        const urls = PUBLIC_ROUTES.map((path) => `  <url><loc>${site}${path}</loc></url>`).join('\n');
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
        });
      }
    },
    closeBundle() {
      for (const file of ['404.html', ...PUBLIC_PAGE_FILES]) {
        copyFileSync(join(outDir, 'index.html'), join(outDir, file));
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  base: BASE,
  plugins: [react(), siteFiles()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
