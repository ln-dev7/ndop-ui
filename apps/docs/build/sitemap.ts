import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pageUrl } from '../src/app/site/og-image';
import { indexedPages } from './indexed-pages';

/** The sitemap protocol's namespace (sitemaps.org/protocol.html). */
const NAMESPACE = 'http://www.sitemaps.org/schemas/sitemap/0.9';

/**
 * Escapes text for an XML element, as the sitemap protocol requires of
 * URLs.
 *
 * @param text - The text.
 * @returns It, safe between tags.
 */
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[char] ?? char,
  );

/**
 * A sitemap of pages, in the sitemap protocol's XML: one `<url>` with its
 * `<loc>` per page, the page's canonical address ({@link pageUrl}).
 *
 * It has no `<lastmod>`: Google uses it only when it is consistently
 * accurate, and a page here is assembled from metadata, the registry,
 * guides and shared layout, so neither the build's date nor one source
 * file's commit date would be. `<changefreq>` and `<priority>` are left
 * out too; Google ignores them.
 *
 * @param paths - The pages' paths, such as `/docs/components/button`.
 * @returns The sitemap, UTF-8 XML ending in a newline.
 *
 * @example
 * ```ts
 * sitemapXml(['/', '/docs/components/button']);
 * ```
 */
export function sitemapXml(paths: readonly string[]): string {
  const urls = paths.map(
    (path) => `  <url>\n    <loc>${escape(pageUrl(path))}</loc>\n  </url>`,
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<urlset xmlns="${NAMESPACE}">`,
    ...urls,
    '</urlset>',
    '',
  ].join('\n');
}

/**
 * Writes `/sitemap.xml` for the built site: every page search engines may
 * index ({@link indexedPages}), so pages marked `noindex`, Markdown twins,
 * the registry and the assets stay out (ADR-0016, amendment 15). The
 * sitemap protocol allows 50,000 URLs in one file, far above the site's
 * size.
 *
 * @param site - The built site's static files, where pages were
 *   prerendered.
 * @returns How many pages it lists.
 * @throws When the site has no page to list, which means the prerender
 *   failed.
 */
export function writeSitemap(site: string): number {
  const paths = indexedPages(site).map((page) => page.path);
  if (!paths.length) {
    throw new Error(`No indexable pages under ${site}; was it prerendered?`);
  }
  writeFileSync(join(site, 'sitemap.xml'), sitemapXml(paths));
  return paths.length;
}
