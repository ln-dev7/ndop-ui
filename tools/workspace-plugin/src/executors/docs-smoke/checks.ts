import { CUSTOM_THEME_PATH, encodeTheme } from '@ndop/schema/theme';

/** The outcome of one check of a deployed docs site. */
export interface SmokeResult {
  /** What was checked, such as `GET /r/index.json`. */
  name: string;
  /** Whether it passed. */
  ok: boolean;
  /** What was wrong, when it failed. */
  problem?: string;
}

/** A `fetch`-compatible function, so tests can stand in for the network. */
export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

/** A component page, which every build has (ADR-0016, "Hosting"). */
export const PAGE = '/docs/components/dialog';

/**
 * A theme URL's `t` for a one-token theme, which the theme URL Function
 * answers with a `registry:theme` item (ADR-0023).
 */
export const SAMPLE_THEME = encodeTheme({
  theme: {},
  light: { primary: 'oklch(0.5 0.2 260)' },
  dark: {},
});

/** Thrown by a check's body to fail it with a message. */
class CheckFailure extends Error {}

/**
 * Fails the check unless `condition` holds.
 *
 * @param condition - What must be true.
 * @param problem - What to report otherwise.
 */
function ensure(condition: unknown, problem: string): asserts condition {
  if (!condition) throw new CheckFailure(problem);
}

/**
 * Runs one check, turning a thrown failure or network error into a
 * failed result, so every check runs and reports.
 *
 * @param name - The check's name.
 * @param body - The check; it throws to fail.
 * @returns The result.
 */
async function check(
  name: string,
  body: () => Promise<void>,
): Promise<SmokeResult> {
  try {
    await body();
    return { name, ok: true };
  } catch (error) {
    return {
      name,
      ok: false,
      problem: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * The longest time, in seconds, a `Cache-Control` value lets a cache keep
 * a response without asking again.
 *
 * @param value - The header, or `null` when absent.
 * @returns Its `max-age`, or `undefined` when it sets none.
 */
export function maxAge(value: string | null): number | undefined {
  const match = value?.match(/(?:^|,)\s*max-age=(\d+)/i);
  return match ? Number(match[1]) : undefined;
}

/**
 * Whether a response must be revalidated on every use: `no-cache`,
 * `no-store` or `max-age=0`, and never `immutable`. Files that must change
 * with a deploy, such as the registry index and the service worker, need
 * this.
 *
 * @param value - The `Cache-Control` header, or `null` when absent.
 * @returns `true` when caches always ask again.
 */
export function alwaysRevalidated(value: string | null): boolean {
  if (!value || /\bimmutable\b/i.test(value)) return false;
  return /\bno-(?:cache|store)\b/i.test(value) || maxAge(value) === 0;
}

/**
 * Describes a response for a failure message.
 *
 * @param response - The response.
 * @returns Such as `308 to /docs/` or `200 text/html`.
 */
function summary(response: Response): string {
  const location = response.headers.get('location');
  return location
    ? `${response.status} to ${location}`
    : `${response.status} ${response.headers.get('content-type') ?? 'without a content type'}`;
}

/**
 * The fetch-level checks of a deployed docs site (ADR-0028, "Docs
 * deployment"), each against what Cloudflare Pages and the site promise:
 *
 * - A page is served at its path without a trailing slash, with no
 *   redirect, and its `/`-ended and `.html` forms redirect there
 *   (ADR-0016, "Hosting").
 * - An unknown path answers the site's own not-found page with a 404.
 * - `/r/index.json` is JSON with the registry's items, readable from any
 *   origin and revalidated on every use, so the CLI always reads the
 *   current registry.
 * - The theme URL Function (ADR-0023) answers a theme with its item and a
 *   missing theme with a 400.
 * - `/sw.js` is JavaScript that caches revalidate, so a deploy's new
 *   worker is found on the next visit (ADR-0027).
 *
 * Redirects are never followed, so each answer is checked as sent.
 *
 * @param base - The deployment's origin, such as `https://ndop.dev`.
 * @param fetcher - Fetches a URL; the global `fetch` by default.
 * @returns One result per check, in order.
 */
export async function fetchChecks(
  base: string,
  fetcher: Fetcher = fetch,
): Promise<SmokeResult[]> {
  const get = (path: string) =>
    fetcher(new URL(path, base).href, {
      redirect: 'manual',
      headers: { 'cache-control': 'no-cache' },
    });
  const redirectsTo = async (from: string, to: string) => {
    const response = await get(from);
    const location = response.headers.get('location');
    ensure(
      [301, 308].includes(response.status) &&
        location &&
        new URL(location, new URL(from, base)).pathname === to,
      `expected a permanent redirect to ${to}, got ${summary(response)}`,
    );
  };
  return Promise.all([
    check(`GET ${PAGE} is the page, without a redirect`, async () => {
      const response = await get(PAGE);
      ensure(
        response.status === 200 &&
          response.headers.get('content-type')?.startsWith('text/html'),
        `expected 200 text/html, got ${summary(response)}`,
      );
    }),
    check(`GET ${PAGE}/ redirects to ${PAGE}`, () =>
      redirectsTo(`${PAGE}/`, PAGE),
    ),
    check(`GET ${PAGE}.html redirects to ${PAGE}`, () =>
      redirectsTo(`${PAGE}.html`, PAGE),
    ),
    check('An unknown path answers the 404 page with a 404', async () => {
      const response = await get(`/ndop-smoke-${Date.now().toString(36)}`);
      ensure(
        response.status === 404 &&
          response.headers.get('content-type')?.startsWith('text/html'),
        `expected 404 text/html, got ${summary(response)}`,
      );
      ensure(
        (await response.text()).includes('Page not found'),
        "expected the site's not-found page, got another page",
      );
    }),
    check('GET /r/index.json is the registry, always fresh', async () => {
      const response = await get('/r/index.json');
      ensure(
        response.status === 200 &&
          response.headers.get('content-type')?.startsWith('application/json'),
        `expected 200 application/json, got ${summary(response)}`,
      );
      const cacheControl = response.headers.get('cache-control');
      ensure(
        alwaysRevalidated(cacheControl),
        `expected caches to revalidate it, got Cache-Control: ${cacheControl ?? 'none'}`,
      );
      ensure(
        response.headers.get('access-control-allow-origin') === '*',
        'expected Access-Control-Allow-Origin: *',
      );
      const index = (await response.json()) as { items?: unknown };
      ensure(
        Array.isArray(index.items) && index.items.length > 0,
        'expected a registry index with items',
      );
    }),
    check(`GET ${CUSTOM_THEME_PATH}?t=… is a theme item`, async () => {
      const response = await get(`${CUSTOM_THEME_PATH}?t=${SAMPLE_THEME}`);
      ensure(
        response.status === 200 &&
          response.headers.get('content-type')?.startsWith('application/json'),
        `expected 200 application/json, got ${summary(response)}`,
      );
      const item = (await response.json()) as { name?: string; type?: string };
      ensure(
        item.name === 'custom' && item.type === 'registry:theme',
        `expected the registry:theme item "custom", got ${item.type ?? 'no type'} "${item.name ?? ''}"`,
      );
    }),
    check(`GET ${CUSTOM_THEME_PATH} without a theme is a 400`, async () => {
      const response = await get(CUSTOM_THEME_PATH);
      ensure(response.status === 400, `expected 400, got ${summary(response)}`);
    }),
    check('GET /sw.js is the service worker, always fresh', async () => {
      const response = await get('/sw.js');
      ensure(
        response.status === 200 &&
          /^(?:text|application)\/javascript\b/.test(
            response.headers.get('content-type') ?? '',
          ),
        `expected 200 JavaScript, got ${summary(response)}`,
      );
      const cacheControl = response.headers.get('cache-control');
      ensure(
        alwaysRevalidated(cacheControl),
        `expected caches to revalidate it, got Cache-Control: ${cacheControl ?? 'none'}`,
      );
    }),
  ]);
}

/**
 * Runs {@link fetchChecks} until every check passes or the timeout ends.
 * A new Pages deployment serves its static files before its Functions
 * answer everywhere, so a check of the theme URL can fail for a few
 * seconds after the home page loads.
 *
 * @param base - The deployment's origin.
 * @param timeout - Milliseconds to keep trying failed checks.
 * @param fetcher - Fetches a URL; the global `fetch` by default.
 * @param interval - Milliseconds between tries.
 * @returns The last run's results.
 */
export async function settledChecks(
  base: string,
  timeout: number,
  fetcher: Fetcher = fetch,
  interval = 5000,
): Promise<SmokeResult[]> {
  const deadline = Date.now() + timeout;
  for (;;) {
    const results = await fetchChecks(base, fetcher);
    if (results.every((result) => result.ok) || Date.now() >= deadline) {
      return results;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

/**
 * Waits until the deployment answers its home page, since a new
 * deployment's URL can take a few seconds to answer everywhere.
 *
 * @param base - The deployment's origin.
 * @param timeout - Milliseconds to keep trying.
 * @param fetcher - Fetches a URL; the global `fetch` by default.
 * @param interval - Milliseconds between tries.
 * @returns Once the home page answers 200.
 * @throws When it hasn't by the timeout, with the last answer.
 */
export async function waitForSite(
  base: string,
  timeout: number,
  fetcher: Fetcher = fetch,
  interval = 3000,
): Promise<void> {
  const deadline = Date.now() + timeout;
  let last = 'no answer';
  for (;;) {
    try {
      const response = await fetcher(new URL('/', base).href);
      if (response.status === 200) return;
      last = summary(response);
    } catch (error) {
      last = error instanceof Error ? error.message : String(error);
    }
    if (Date.now() >= deadline) {
      throw new Error(
        `${base} didn't answer its home page within ${timeout / 1000}s: ${last}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}
