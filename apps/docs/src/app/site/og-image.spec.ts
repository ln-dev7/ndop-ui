import { ogImagePath, pageUrl } from './og-image';

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

describe('pageUrl', () => {
  it('gives a page its absolute address without a trailing slash', () => {
    expect(pageUrl('/docs/components/button')).toBe(
      'https://ndop.dev/docs/components/button',
    );
    expect(pageUrl('/themes/?from=indigo#top')).toBe('https://ndop.dev/themes');
  });

  it('keeps the slash of the home page', () => {
    expect(pageUrl('/')).toBe('https://ndop.dev/');
  });
});
