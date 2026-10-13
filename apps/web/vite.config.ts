import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** Public pages search engines may index. Everything under /app is behind sign-in. */
const PUBLIC_ROUTES = ['/', '/signin', '/signup'];

/**
 * Build-time SEO and offline files (A10 Part 3):
 * - asset-manifest.json: every built JS/CSS file, so the service worker can precache the
 *   route chunks that index.html no longer names after code splitting.
 * - robots.txt: allows the public pages and keeps the signed-in app out of search results.
 * - sitemap.xml, and absolute og:image/og:url, only when SITE_URL is set (crawlers need
 *   absolute URLs and the app has no fixed public domain yet): SITE_URL=https://... npm run build
 */
function siteFiles(): Plugin {
  const site = (process.env.SITE_URL ?? '').replace(/\/+$/, '');
  return {
    name: 'careconnect-site-files',
    apply: 'build',
    transformIndexHtml(html) {
      if (!site) return html;
      return html
        .replace(/content="\/og-image\.png"/g, `content="${site}/og-image.png"`)
        .replace('</title>', `</title>\n    <meta property="og:url" content="${site}/" />`);
    },
    generateBundle(_options, bundle) {
      const assets = Object.keys(bundle)
        .filter((file) => file.startsWith('assets/') && /\.(js|css)$/.test(file))
        .map((file) => `/${file}`)
        .sort();
      this.emitFile({ type: 'asset', fileName: 'asset-manifest.json', source: JSON.stringify(assets, null, 2) });

      const robots = ['User-agent: *', 'Allow: /$', 'Allow: /signin', 'Allow: /signup', 'Disallow: /app', 'Disallow: /role'];
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
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), siteFiles()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
