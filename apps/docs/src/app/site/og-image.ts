/** The site's address, for absolute links in share cards. */
export const SITE = 'https://ndop.dev';

/**
 * A page's one public address: its canonical link, its `og:url` and its
 * sitemap entry, so the three can't disagree (ADR-0016, amendment 15).
 * Paths have no trailing slash, as Cloudflare Pages serves them; the home
 * page keeps its `/`.
 *
 * @param path - The page's path, such as `/docs/components/button`.
 * @returns Its absolute URL, such as `https://ndop.dev/docs/components/button`.
 *
 * @example
 * ```ts
 * pageUrl('/'); // 'https://ndop.dev/'
 * ```
 */
export function pageUrl(path: string): string {
  const clean = path.split(/[?#]/)[0]?.replace(/\/+$/, '') ?? '';
  return `${SITE}${clean || '/'}`;
}

/** The X account credited as the author of share cards (`twitter:creator`). */
export const CREATOR = '@valerymelou';

/** An OG image's size in pixels, as ADR-0026 sets it. */
export const OG_SIZE = { width: 1200, height: 630 } as const;

/**
 * Where a page's OG image is served (ADR-0026, "OG images"): its path
 * under `/og`, the home page as `/og/index.jpg`. The build writes the
 * image at the same path, so the two can't disagree.
 *
 * @param path - The page's path, such as `/docs/components/button`.
 * @returns The image's path, such as `/og/docs/components/button.jpg`.
 *
 * @example
 * ```ts
 * ogImagePath('/'); // '/og/index.jpg'
 * ```
 */
export function ogImagePath(path: string): string {
  const clean = path.split(/[?#]/)[0]?.replace(/\/+$/, '') ?? '';
  return `/og${clean === '' ? '/index' : clean}.jpg`;
}
