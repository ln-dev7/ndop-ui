import { expect, test, type Page } from '@playwright/test';
import { open } from './support/open';

/** The generated icons (ADR-0027): path, content type and side in px. */
const ICONS: [path: string, type: string, size?: number][] = [
  ['/favicon.svg', 'image/svg+xml'],
  ['/favicon.ico', 'image/x-icon'],
  ['/apple-touch-icon.png', 'image/png', 180],
  ['/icon-192.png', 'image/png', 192],
  ['/icon-512.png', 'image/png', 512],
  ['/icon-maskable-512.png', 'image/png', 512],
  ['/brand/ndop-mark-black.svg', 'image/svg+xml'],
  ['/brand/ndop-tile-white-on-indigo.svg', 'image/svg+xml'],
];

/**
 * A PNG's width and height, from its header chunk.
 *
 * @param png - The PNG file.
 * @returns `[width, height]`.
 */
function dimensions(png: Buffer): [number, number] {
  return [png.readUInt32BE(16), png.readUInt32BE(20)];
}

test.describe('icons and the manifest', () => {
  test('every icon is served with its type and size', async ({ request }) => {
    for (const [path, type, size] of ICONS) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      expect(response.headers()['content-type'], path).toBe(type);
      if (size) {
        expect(dimensions(await response.body()), path).toEqual([size, size]);
      }
    }
    const ico = await (await request.get('/favicon.ico')).body();
    // An icon file with three images: 16, 32 and 48 px.
    expect([ico.readUInt16LE(2), ico.readUInt16LE(4)]).toEqual([1, 3]);
    expect([ico[6], ico[22], ico[38]]).toEqual([16, 32, 48]);
  });

  test('the manifest describes an installable app', async ({ request }) => {
    const response = await request.get('/manifest.webmanifest');
    expect(response.headers()['content-type']).toBe(
      'application/manifest+json',
    );
    const manifest = (await response.json()) as {
      icons: { src: string; sizes: string; purpose?: string }[];
    };
    expect(manifest).toMatchObject({
      name: 'Ndop UI',
      short_name: 'Ndop',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      theme_color: '#1E3170',
    });
    expect(manifest.icons.map((icon) => icon.purpose ?? 'any')).toEqual([
      'any',
      'any',
      'maskable',
    ]);
    for (const icon of manifest.icons) {
      const png = await (await request.get(icon.src)).body();
      expect(dimensions(png).join('x'), icon.src).toBe(icon.sizes);
    }
  });

  test('every page links the icons, the manifest and the theme colors', async ({
    request,
  }) => {
    const html = await (
      await request.get('/docs/getting-started/introduction')
    ).text();
    for (const tag of [
      '<link rel="icon" href="/favicon.ico" sizes="32x32">',
      '<link rel="icon" href="/favicon.svg" type="image/svg+xml">',
      '<link rel="apple-touch-icon" href="/apple-touch-icon.png">',
      '<link rel="manifest" href="/manifest.webmanifest">',
    ]) {
      expect(html).toContain(tag);
    }
    expect(html).toMatch(
      /<meta name="theme-color" content="#1E3170" media="\(prefers-color-scheme: light\)">/,
    );
    expect(html).toMatch(
      /<meta name="theme-color" content="#0a0a0a" media="\(prefers-color-scheme: dark\)">/,
    );
  });
});

/**
 * Whether the service worker has saved a URL, in any of its caches.
 *
 * @param page - A page of the site.
 * @param path - The URL's path.
 * @returns `true` once it is saved.
 */
async function isSaved(page: Page, path: string): Promise<boolean> {
  return page.evaluate(async (url) => {
    for (const key of await caches.keys()) {
      if (await (await caches.open(key)).match(url)) return true;
    }
    return false;
  }, path);
}

/**
 * Opens a page and waits until the service worker controls it and has
 * saved it.
 *
 * @param page - A Playwright page.
 * @param path - The route.
 */
async function openSaved(page: Page, path: string): Promise<void> {
  await open(page, path);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', resolve),
      );
    }
  });
  await expect.poll(() => isSaved(page, path)).toBe(true);
}

test.describe('the service worker', () => {
  // Chromium applies offline emulation to a service worker's own requests;
  // ADR-0027 checks offline reading there.
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Offline reading is checked in Chromium',
  );

  test('registers on the production build', async ({ page }) => {
    await openSaved(page, '/');
    const worker = await page.evaluate(
      () => navigator.serviceWorker.controller?.scriptURL,
    );
    expect(new URL(worker ?? '').pathname).toBe('/sw.js');
    expect(await isSaved(page, '/offline')).toBe(true);
  });

  test('a visited page reads offline, opened directly or in the app', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openSaved(page, '/docs/getting-started/introduction');
    await page
      .getByRole('navigation', { name: 'Docs' })
      .getByRole('link', { name: 'Theming' })
      .click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Theming');
    await expect
      .poll(() => isSaved(page, '/docs/getting-started/theming'))
      .toBe(true);

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Theming');
    await page.goto('/docs/getting-started/introduction');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Introduction',
    );
  });

  test('never answers the registry from its cache', async ({
    page,
    context,
  }) => {
    await openSaved(page, '/');
    const fetchIndex = () =>
      page.evaluate(() =>
        fetch('/r/index.json', { cache: 'no-store' }).then(
          (response) => response.status,
          () => 'failed',
        ),
      );
    expect(await fetchIndex()).toBe(200);
    await context.setOffline(true);
    expect(await fetchIndex()).toBe('failed');
    expect(await isSaved(page, '/r/index.json')).toBe(false);
  });

  test('a page never visited answers with the offline page', async ({
    page,
    context,
  }) => {
    await openSaved(page, '/');
    await context.setOffline(true);
    await page.goto('/docs/components/dialog');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      "You're offline",
    );
    await expect(page).toHaveURL(/\/docs\/components\/dialog$/);
    await page.getByRole('link', { name: 'Go to the home page' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Own your components. Update them anyway.',
    );
  });
});
