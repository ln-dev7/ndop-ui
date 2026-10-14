/**
 * The docs' service worker, served at `/sw.js` (ADR-0027). The build
 * (`build/service-worker.ts`) bundles this file and defines the two
 * constants below from the build's own output.
 *
 * Update model: a deploy changes the version, so the browser installs a
 * new worker, which precaches the new shell beside the old cache and
 * waits. The app tells it to take over on the reader's next navigation,
 * which then loads as a whole new page (`site/offline.ts`), so no page
 * ever mixes two builds' code; the old caches are deleted then.
 */
import { isCacheable, strategyFor, withoutScripts } from './routes';

/** The build's version, a hash of its files. */
declare const NDOP_SW_VERSION: string;
/**
 * What the app needs to start offline: `/`, the offline page, the entry
 * scripts and the fonts every page uses.
 */
declare const NDOP_SW_PRECACHE: string[];

/** The service worker events used here, which the DOM types leave out. */
interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void;
}
interface FetchEvent extends ExtendableEvent {
  readonly request: Request;
  respondWith(response: Promise<Response>): void;
}
interface ExtendableMessageEvent extends ExtendableEvent {
  readonly data: unknown;
}
interface WorkerScope {
  readonly location: Location;
  readonly clients: { claim(): Promise<void> };
  skipWaiting(): Promise<void>;
  addEventListener(
    type: 'install' | 'activate',
    listener: (event: ExtendableEvent) => void,
  ): void;
  addEventListener(type: 'fetch', listener: (event: FetchEvent) => void): void;
  addEventListener(
    type: 'message',
    listener: (event: ExtendableMessageEvent) => void,
  ): void;
}

const worker = self as unknown as WorkerScope;
const origin = worker.location.origin;
const PREFIX = 'ndop-';
const CACHE = `${PREFIX}${NDOP_SW_VERSION}`;
const OFFLINE = '/offline';

/**
 * A response the cache can answer a page load with. Browsers refuse a
 * redirected response for a navigation, so a redirect followed on the way,
 * such as a trailing slash, is dropped from it.
 *
 * @param response - A successful response.
 * @returns It, or a copy without the redirect.
 */
function storable(response: Response): Response {
  return response.redirected
    ? new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      })
    : response;
}

/**
 * Fetches a URL and saves it.
 *
 * @param cache - The current cache.
 * @param url - A same-origin path.
 */
async function save(cache: Cache, url: string): Promise<void> {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`${url} answered ${response.status}`);
  await cache.put(url, storable(response));
}

/**
 * Answers from the cache, or fetches and saves: built files never change
 * under the same name.
 *
 * @param request - A request for a file under `/assets/`.
 * @returns The response.
 */
async function cacheFirst(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

/**
 * Fetches a page and saves it, or, offline, answers with its saved copy,
 * then with the offline page.
 *
 * @param request - A page load.
 * @returns The response.
 */
async function networkFirst(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request.url, storable(response.clone()));
    }
    return response;
  } catch (error) {
    const saved = await cache.match(request.url, {
      ignoreSearch: true,
      ignoreVary: true,
    });
    if (saved) return saved;
    const offline = await cache.match(OFFLINE, { ignoreVary: true });
    if (!offline) throw error;
    return new Response(withoutScripts(await offline.text()), {
      status: 503,
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }
}

worker.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.all(NDOP_SW_PRECACHE.map((url) => save(cache, url))),
      ),
  );
});

worker.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      ),
  );
});

worker.addEventListener('fetch', (event) => {
  const strategy = strategyFor(event.request, origin);
  if (strategy === 'asset') event.respondWith(cacheFirst(event.request));
  else if (strategy === 'page') event.respondWith(networkFirst(event.request));
});

worker.addEventListener('message', (event) => {
  const data = event.data as { type?: string; urls?: unknown } | null;
  if (data?.type === 'skip-waiting') {
    event.waitUntil(worker.skipWaiting());
  } else if (data?.type === 'claim') {
    // The first worker takes the page that registered it, so the code that
    // page loads from then on is saved too; a later one only activates when
    // a page asks, as it navigates. The page asks once nothing is loading:
    // a module preloaded before the takeover and imported after it is
    // fetched again through the worker, and the preload is wasted (Safari
    // warns about it).
    event.waitUntil(worker.clients.claim());
  } else if (data?.type === 'save' && Array.isArray(data.urls)) {
    // Pages the reader opened inside the app, and the code they loaded
    // before this worker controlled them, so they read offline too.
    const urls = data.urls.filter(
      (url): url is string =>
        typeof url === 'string' && isCacheable(url, origin),
    );
    event.waitUntil(
      caches.open(CACHE).then(async (cache) => {
        for (const url of urls) {
          const path = new URL(url, origin).pathname;
          const asset = path.startsWith('/assets/');
          if (asset && (await cache.match(path))) continue;
          // One page failing to save, such as offline, leaves the rest.
          await save(cache, path).catch(() => undefined);
        }
      }),
    );
  }
});
