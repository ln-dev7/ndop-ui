import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** A prerendered page that search engines may index. */
export interface IndexedPage {
  /** Its path, such as `/docs/components/button`, the home page as `/`. */
  path: string;
  /** Its title, from its `og:title`. */
  title: string;
}

/**
 * Decodes the entities Angular's server renderer writes in attributes.
 *
 * @param text - An attribute's value.
 * @returns Its text.
 */
const unescape = (text: string) =>
  text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(+code))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/**
 * Lists the prerendered pages search engines may index: every HTML file
 * under the site with an `og:title`, which `PageMeta` sets on every page
 * it describes, except pages marked `noindex`, such as block previews, the
 * offline page and the not-found page. Pages are prerendered as
 * `<route>.html`, the home page as `index.html`; the registry (`/r/`) and
 * the hashed assets hold no pages.
 *
 * The OG images and the sitemap both come from this list, so every page
 * in the sitemap has a share image and the reverse (ADR-0016, amendment
 * 15; ADR-0026).
 *
 * @param site - The built site's static files.
 * @returns Each page's path and title, sorted by path.
 */
export function indexedPages(site: string): IndexedPage[] {
  const pages: IndexedPage[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'assets' && entry.name !== 'r') walk(full);
      } else if (entry.name.endsWith('.html')) {
        const html = readFileSync(full, 'utf-8');
        if (/<meta name="robots" content="[^"]*noindex/.test(html)) continue;
        const title = html.match(
          /<meta property="og:title" content="([^"]*)"/,
        )?.[1];
        if (!title) continue;
        const file = relative(site, full).split(sep).join('/');
        const path = `/${file.replace(/(?:^|\/)index\.html$|\.html$/, '')}`;
        pages.push({
          path: path.replace(/\/$/, '') || '/',
          title: unescape(title),
        });
      }
    }
  };
  walk(site);
  return pages.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
