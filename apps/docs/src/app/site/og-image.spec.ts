import { ogImagePath } from './og-image';

describe('ogImagePath', () => {
  it('maps a page to its image under /og', () => {
    expect(ogImagePath('/docs/components/button')).toBe(
      '/og/docs/components/button.jpg',
    );
  });

  it('names the home page index', () => {
    expect(ogImagePath('/')).toBe('/og/index.jpg');
  });

  it('ignores a trailing slash, query and fragment', () => {
    expect(ogImagePath('/themes/?from=indigo#top')).toBe('/og/themes.jpg');
  });
});
