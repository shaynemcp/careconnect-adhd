import { expect, test } from '@playwright/test';

// The public pages in sitemap.xml answer with status 200: search engines skip a page served
// with 404. On GitHub Pages that takes signin.html and signup.html in the build (vite.config.ts,
// checked in siteFiles.test.ts). `vite preview` answers 200 for any path, so this test only
// catches a problem on the live site, where the deploy workflow runs it after publishing.

test('public pages answer with status 200', async ({ request }) => {
  for (const path of ['', 'signin', 'signup']) {
    expect((await request.get(path)).status(), `/${path}`).toBe(200);
  }
});
