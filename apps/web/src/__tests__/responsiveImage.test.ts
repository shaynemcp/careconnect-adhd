import { PHOTO_WIDTHS, responsivePhoto } from '../utils/responsiveImage';

const PEXELS = 'https://images.pexels.com/photos/3807571/pexels-photo-3807571.jpeg?auto=compress&cs=tinysrgb&w=600';

describe('responsivePhoto (A11 image optimization)', () => {
  test('a Pexels photo is served as WebP at the default width', () => {
    const { src } = responsivePhoto(PEXELS);
    const url = new URL(src);
    expect(url.searchParams.get('fm')).toBe('webp');
    expect(url.searchParams.get('w')).toBe('600');
    expect(url.searchParams.get('auto')).toBe('compress');
  });

  test('srcSet offers every width, each as WebP with a matching w descriptor', () => {
    const { srcSet } = responsivePhoto(PEXELS);
    const entries = srcSet!.split(', ').map((e) => e.split(' '));
    expect(entries.map(([, d]) => d)).toEqual(PHOTO_WIDTHS.map((w) => `${w}w`));
    for (const [u, d] of entries) {
      const url = new URL(u);
      expect(url.searchParams.get('fm')).toBe('webp');
      expect(`${url.searchParams.get('w')}w`).toBe(d);
    }
  });

  test('the original photo path is kept, only the parameters change', () => {
    const { src } = responsivePhoto(PEXELS, 900);
    expect(new URL(src).pathname).toBe('/photos/3807571/pexels-photo-3807571.jpeg');
    expect(new URL(src).searchParams.get('w')).toBe('900');
  });

  test.each([
    ['/icons/icon-192.png'],
    ['https://example.com/photo.jpg'],
    ['not a url'],
  ])('%s is returned unchanged with no srcSet', (src) => {
    expect(responsivePhoto(src)).toEqual({ src });
  });
});
