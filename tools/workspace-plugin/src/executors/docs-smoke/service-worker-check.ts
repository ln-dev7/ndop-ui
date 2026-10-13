import type { SmokeResult } from './checks';

/**
 * Checks the service worker in Playwright's Chromium (ADR-0027): the home
 * page registers `/sw.js`, the worker takes control and precaches the app
 * shell, and a fetch of `/r/index.json` from the page leaves no `/r/`
 * entry in any of its caches, since registry JSON must always come from
 * the network.
 *
 * @param base - The deployment's origin, such as `https://ndop.dev`.
 * @param timeout - Milliseconds to wait for the worker to take control.
 * @returns One result.
 */
export async function serviceWorkerCheck(
  base: string,
  timeout: number,
): Promise<SmokeResult> {
  const name = 'The service worker registers and leaves /r/ uncached';
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(new URL('/', base).href, { waitUntil: 'load' });
    // The app registers the worker once the browser is idle after load,
    // and the first worker claims the page that registered it.
    await page.waitForFunction(
      () => navigator.serviceWorker?.controller !== null,
      undefined,
      { timeout },
    );
    const cached = await page.evaluate(async () => {
      const response = await fetch('/r/index.json');
      if (!response.ok) throw new Error(`/r/index.json: ${response.status}`);
      await response.arrayBuffer();
      const urls: string[] = [];
      for (const key of await caches.keys()) {
        const cache = await caches.open(key);
        for (const request of await cache.keys()) urls.push(request.url);
      }
      return urls.map((url) => new URL(url).pathname);
    });
    if (!cached.includes('/')) {
      return { name, ok: false, problem: 'the worker precached no home page' };
    }
    const registry = cached.filter((path) => path.startsWith('/r/'));
    return registry.length
      ? { name, ok: false, problem: `cached ${registry.join(', ')}` }
      : { name, ok: true };
  } catch (error) {
    return {
      name,
      ok: false,
      problem: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await browser.close();
  }
}
