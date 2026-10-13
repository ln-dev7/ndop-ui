/**
 * Every registry theme's name, sorted, for the home page's links, which
 * prerendering and the e2e crawl follow. A lazy glob, so the home page
 * doesn't load the stylesheets themselves.
 */
export const THEME_NAMES: readonly string[] = Object.keys(
  import.meta.glob('../../../../../registry/themes/*/theme.css', {
    query: '?raw',
  }),
)
  .map((path) => /\/themes\/([^/]+)\/theme\.css$/.exec(path)?.[1] ?? path)
  .sort();
