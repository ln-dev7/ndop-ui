/**
 * How the service worker answers a request (ADR-0027):
 *
 * - `asset`: cache first. Built JS, CSS and fonts under `/assets/` have
 *   content hashes in their names, so a cached copy is never stale.
 * - `page`: network first, then the cached copy, then the offline page,
 *   so a deploy shows on the next load and visited pages read offline.
 * - `network`: left to the browser, uncached. The registry under `/r/`,
 *   which the CLI and agents read and must be current, the theme URL
 *   function under it, the worker itself, cross-origin requests, and
 *   files such as the `.md` twins and `llms.txt`, which agents fetch
 *   without a service worker anyway.
 */
export type Strategy = 'asset' | 'page' | 'network';

/** What {@link strategyFor} needs to know about a request. */
export interface RouteRequest {
  /** The request's URL. */
  url: string;
  /** Its HTTP method. */
  method: string;
  /** Its mode; `navigate` for a page load, a frame's included. */
  mode: string;
}

/**
 * Picks how the service worker answers a request.
 *
 * @param request - The request.
 * @param origin - The site's origin, such as `https://ndop.dev`.
 * @returns The strategy.
 */
export function strategyFor(request: RouteRequest, origin: string): Strategy {
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== origin) return 'network';
  if (url.pathname.startsWith('/r/') || url.pathname === '/sw.js') {
    return 'network';
  }
  if (url.pathname.startsWith('/assets/')) return 'asset';
  return request.mode === 'navigate' ? 'page' : 'network';
}

/**
 * Whether the app may ask the worker to save a URL for offline reading:
 * a page the reader opened in the app or a built file it loaded, never
 * something {@link strategyFor} leaves to the network.
 *
 * @param url - The URL.
 * @param origin - The site's origin.
 * @returns `true` when it is a same-origin page or asset.
 */
export function isCacheable(url: string, origin: string): boolean {
  const { href, pathname } = new URL(url, origin);
  const strategy = strategyFor(
    { url: href, method: 'GET', mode: 'navigate' },
    origin,
  );
  return (
    strategy === 'asset' || (strategy === 'page' && !/\.\w+$/.test(pathname))
  );
}

/**
 * The offline page without its scripts, for answering a page that was
 * never saved. Booted at another page's address, the app would route to
 * that page, whose code may not be cached, and hydration would fail
 * against the offline page's markup; without scripts, the server-rendered
 * page stands as it is, styles inlined.
 *
 * @param html - The offline page's HTML.
 * @returns The HTML without module scripts.
 */
export function withoutScripts(html: string): string {
  return html
    .replace(/<script\b[^>]*\btype="module"[^>]*>[\s\S]*?<\/script>/g, '')
    .replace(/<link\b[^>]*\brel="modulepreload"[^>]*>/g, '');
}
