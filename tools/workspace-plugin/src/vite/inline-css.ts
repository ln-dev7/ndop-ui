import type { Plugin } from 'vite';

/** Options of {@link inlineCss}. */
export interface InlineCssOptions {
  /**
   * Fonts to preload, matched against built asset names, such as
   * `/geist-latin-wght-normal/`. The fonts a page's text uses arrive with
   * the page instead of after its styles, so text doesn't paint in a
   * fallback font and then move.
   */
  preloadFonts?: RegExp[];
}

/**
 * Replaces the built `index.html`'s stylesheet links with the stylesheets
 * themselves, so a prerendered page paints without waiting for another
 * request, and preloads the given fonts. On a slow connection, a linked
 * stylesheet competes with the page's module preloads, and it alone held
 * first paint back by about a second on the docs (ADR-0016, "Quality
 * gates"). Stylesheet `url()`s must be absolute, as Tailwind's Vite plugin
 * writes them.
 *
 * @param options - Fonts to preload.
 * @returns The Vite plugin, for production builds only.
 */
export function inlineCss(options: InlineCssOptions = {}): Plugin {
  return {
    name: 'ndop:inline-css',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        const bundle = context.bundle;
        if (!bundle) return html;
        const fonts = Object.keys(bundle)
          .filter((file) =>
            options.preloadFonts?.some((font) => font.test(file)),
          )
          .map(
            (file) =>
              `<link rel="preload" as="font" type="font/woff2" crossorigin href="/${file}">`,
          )
          .join('');
        return html
          .replace('</title>', `</title>${fonts}`)
          .replace(
            /<link\b[^>]*\brel="stylesheet"[^>]*\bhref="\/([^"]+\.css)"[^>]*>/g,
            (tag, file: string) => {
              const asset = bundle[file];
              return asset?.type === 'asset'
                ? `<style>${String(asset.source)}</style>`
                : tag;
            },
          );
      },
    },
  };
}
