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
