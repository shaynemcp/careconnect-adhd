/**
 * WebP, right-sized versions of a photo for <img srcSet>.
 *
 * The Memories photos come from the Pexels image CDN, which resizes (w=) and
 * converts (fm=webp) on request. WebP is about 35% smaller than the JPEG for the
 * same photo (26.6 kB vs 40.8 kB at 600 px wide). Any other URL is returned
 * unchanged, with no srcSet.
 */

/** Widths offered to the browser; it picks one from `sizes` and the screen density. */
export const PHOTO_WIDTHS = [400, 600, 900, 1200] as const;

const PEXELS_HOST = 'images.pexels.com';

function withParams(url: URL, width: number): string {
  const u = new URL(url.toString());
  u.searchParams.set('auto', 'compress');
  u.searchParams.set('cs', 'tinysrgb');
  u.searchParams.set('fm', 'webp');
  u.searchParams.set('w', String(width));
  return u.toString();
}

export interface ResponsivePhoto {
  src: string;
  srcSet?: string;
}

export function responsivePhoto(src: string, defaultWidth = 600): ResponsivePhoto {
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return { src };
  }
  if (url.hostname !== PEXELS_HOST) return { src };
  return {
    src: withParams(url, defaultWidth),
    srcSet: PHOTO_WIDTHS.map((w) => `${withParams(url, w)} ${w}w`).join(', '),
  };
}
