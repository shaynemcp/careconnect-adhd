import { useEffect } from 'react';

const APP_NAME = 'CareConnect';

/**
 * Name the window after the current screen (WCAG 2.4.2, #55). Electron's window
 * title follows document.title, so NVDA+T and Alt+Tab say which screen is open.
 * On unmount the title goes back to the app name, so a screen that sets no
 * title of its own never shows the previous screen's name.
 */
export function useDocumentTitle(screen: string) {
  useEffect(() => {
    document.title = screen === APP_NAME ? APP_NAME : `${screen} - ${APP_NAME}`;
    return () => {
      document.title = APP_NAME;
    };
  }, [screen]);
}

/**
 * Set the page's search description (meta name="description" and the matching
 * og:description), for the public pages search engines index. On unmount the
 * tags go back to what index.html shipped, so a later page never keeps this
 * page's text.
 */
export function usePageDescription(description: string) {
  useEffect(() => {
    const tags = ['meta[name="description"]', 'meta[property="og:description"]']
      .map((sel) => document.head.querySelector<HTMLMetaElement>(sel))
      .filter((tag): tag is HTMLMetaElement => tag !== null);
    const previous = tags.map((tag) => tag.content);
    tags.forEach((tag) => {
      tag.content = description;
    });
    return () => {
      tags.forEach((tag, i) => {
        tag.content = previous[i];
      });
    };
  }, [description]);
}

/**
 * Keep signed-in screens out of search results (meta name="robots" noindex).
 * They hold personal care information; robots.txt already disallows /app, and
 * this covers a crawler that reaches a page anyway.
 */
export function useNoIndex() {
  useEffect(() => {
    const tag = document.createElement('meta');
    tag.name = 'robots';
    tag.content = 'noindex';
    document.head.appendChild(tag);
    return () => {
      tag.remove();
    };
  }, []);
}
