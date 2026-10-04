import type { IndexHtmlTransformContext } from 'vite';
import { inlineCss } from './inline-css';

/**
 * Runs the plugin's HTML transform.
 *
 * @param html - The page.
 * @param bundle - Built assets, by file name.
 * @param fonts - Fonts to preload.
 * @returns The transformed page.
 */
function transform(
  html: string,
  bundle?: Record<string, unknown>,
  fonts?: RegExp[],
): string {
  const hook = inlineCss({ preloadFonts: fonts }).transformIndexHtml as {
    handler: (html: string, context: IndexHtmlTransformContext) => string;
  };
  return hook.handler(html, { bundle } as IndexHtmlTransformContext);
}

describe('inlineCss', () => {
  const page =
    '<head><link rel="stylesheet" crossorigin href="/assets/index-1.css"><script type="module" src="/assets/index-1.js"></script></head>';

  it('replaces linked stylesheets with their content', () => {
    expect(
      transform(page, {
        'assets/index-1.css': { type: 'asset', source: 'body{margin:0}' },
      }),
    ).toBe(
      '<head><style>body{margin:0}</style><script type="module" src="/assets/index-1.js"></script></head>',
    );
  });

  it('preloads the fonts asked for, after the title', () => {
    expect(
      transform(
        '<head><title>Docs</title></head>',
        {
          'assets/geist-latin-wght-normal-1.woff2': { type: 'asset' },
          'assets/geist-cyrillic-wght-normal-1.woff2': { type: 'asset' },
        },
        [/geist-latin-wght-normal/],
      ),
    ).toBe(
      '<head><title>Docs</title><link rel="preload" as="font" type="font/woff2" crossorigin href="/assets/geist-latin-wght-normal-1.woff2"></head>',
    );
  });

  it('leaves the page alone outside a build or for unknown files', () => {
    expect(transform(page)).toBe(page);
    expect(transform(page, {})).toBe(page);
  });
});
