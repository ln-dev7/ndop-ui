import type { IndexHtmlTransformContext } from 'vite';
import { deferScripts } from './defer-scripts';

/**
 * Runs the plugin's HTML transform.
 *
 * @param html - The page.
 * @returns The transformed page.
 */
function transform(html: string): string {
  const hook = deferScripts().transformIndexHtml as {
    handler: (html: string, context: IndexHtmlTransformContext) => string;
  };
  return hook.handler(html, {} as IndexHtmlTransformContext);
}

describe('deferScripts', () => {
  it('starts the entry and its preloads after the first paint', () => {
    const page = transform(
      '<head><script type="module" crossorigin src="/assets/index-1.js"></script>\n<link rel="modulepreload" crossorigin href="/assets/core-1.js">\n</head>',
    );
    expect(page).not.toContain('src="/assets/index-1.js"');
    expect(page).not.toContain('rel="modulepreload"');
    expect(page).toContain('["/assets/core-1.js"]');
    expect(page).toContain('import("/assets/index-1.js")');
    expect(page).toContain('requestAnimationFrame(()=>setTimeout(start))');
  });

  it('leaves a page without an entry script alone', () => {
    expect(transform('<head></head>')).toBe('<head></head>');
  });
});
