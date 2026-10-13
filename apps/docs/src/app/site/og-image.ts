/** The site's address, for absolute links in share cards. */
export const SITE = 'https://ndop.dev';

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
