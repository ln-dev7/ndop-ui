import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { dirname, extname, join, normalize } from 'node:path';

/** One page to photograph. */
export interface Shot {
  /** The page's route on the built site, such as `/blocks/login-01/preview`. */
  route: string;
  /** Color scheme the browser reports to the page. */
  scheme: 'light' | 'dark';
  /**
   * Where the images go, relative to the site's root and without the
   * width and extension: `blocks/login-01-light` writes
   * `blocks/login-01-light-640.webp` and so on.
   */
  out: string;
  /**
   * What the page's look depends on, hashed with the options: unchanged
   * inputs reuse the cached images instead of photographing again.
   */
  inputs: string[];
}

/** Options for {@link screenshotPages}. */
export interface ScreenshotOptions {
  /** The built site's static files. */
  dir: string;
  /** Where images are cached between builds, by content hash. */
  cache: string;
  /** The browser window, in CSS pixels. */
  viewport: { width: number; height: number };
  /** Widths to write, in pixels; each image keeps the window's ratio. */
  widths: number[];
  /** WebP quality, from 0 to 1. */
  quality: number;
  /** The pages. */
  shots: Shot[];
}

/** Content types the static server sends, by extension. */
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

/**
 * Serves a built static site on a free loopback port, answering a route
 * with its `<route>.html` or `index.html` as the host does, for
 * photographing its pages.
 *
 * @param dir - The site's files.
 * @returns The server and its origin.
 */
export async function serveSite(
  dir: string,
): Promise<{ server: Server; origin: string }> {
  const server = createServer((request, response) => {
    const path = normalize(
      decodeURIComponent(new URL(request.url ?? '/', 'http://x').pathname),
    );
    const candidates = [
      join(dir, path),
      join(dir, `${path}.html`),
      join(dir, path, 'index.html'),
    ];
    const file = candidates.find(
      (candidate) =>
        candidate.startsWith(dir) &&
        existsSync(candidate) &&
        statSync(candidate).isFile(),
    );
    if (!file) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
    });
    response.end(readFileSync(file));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  return { server, origin: `http://127.0.0.1:${port}` };
}

/**
 * Photographs pages of the built site in Chromium and writes each as WebP
 * at several widths, for thumbnails and, later, OG images (ADR-0026).
 * Images are cached by a hash of each shot's inputs and the options, so
 * an unchanged page isn't photographed again. Chromium encodes the WebP
 * itself, through a canvas, so the build needs no image library.
 *
 * Needs Playwright's Chromium: `pnpm exec playwright install chromium`.
 *
 * @param options - The site, the cache, the window, sizes and pages.
 * @returns How many shots were taken and how many came from the cache.
 */
export async function screenshotPages(
  options: ScreenshotOptions,
): Promise<{ taken: number; cached: number }> {
  const hashOf = (shot: Shot) =>
    createHash('sha256')
      .update(
        JSON.stringify([
          shot.route,
          shot.scheme,
          options.viewport,
          options.widths,
          options.quality,
        ]),
      )
      .update(shot.inputs.join('\0'))
      .digest('hex')
      .slice(0, 16);
  const cached = (shot: Shot, width: number) =>
    join(options.cache, `${hashOf(shot)}-${width}.webp`);
  const write = (shot: Shot, width: number) => {
    const target = join(options.dir, `${shot.out}-${width}.webp`);
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(cached(shot, width), target);
  };

  const missing = options.shots.filter((shot) =>
    options.widths.some((width) => !existsSync(cached(shot, width))),
  );
  if (missing.length > 0) {
    mkdirSync(options.cache, { recursive: true });
    const { chromium } = await import('@playwright/test');
    const { server, origin } = await serveSite(options.dir);
    const browser = await chromium.launch();
    try {
      for (const shot of missing) {
        const context = await browser.newContext({
          viewport: options.viewport,
          colorScheme: shot.scheme,
          reducedMotion: 'reduce',
        });
        const page = await context.newPage();
        await page.goto(origin + shot.route, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        const png = (await page.screenshot({ type: 'png' })).toString('base64');
        // Scaled and encoded by the browser: canvas WebP is Chromium's own.
        const images = await page.evaluate(
          async ({ png, widths, quality }) => {
            const image = new Image();
            image.src = `data:image/png;base64,${png}`;
            await image.decode();
            return widths.map((width) => {
              const canvas = document.createElement('canvas');
              canvas.width = width;
              canvas.height = Math.round(
                (image.naturalHeight / image.naturalWidth) * width,
              );
              const context = canvas.getContext('2d');
              if (!context) throw new Error('No 2D canvas');
              context.imageSmoothingQuality = 'high';
              context.drawImage(image, 0, 0, canvas.width, canvas.height);
              return canvas
                .toDataURL('image/webp', quality)
                .replace(/^data:image\/webp;base64,/, '');
            });
          },
          { png, widths: options.widths, quality: options.quality },
        );
        images.forEach((data, index) =>
          writeFileSync(
            cached(shot, options.widths[index] ?? 0),
            Buffer.from(data, 'base64'),
          ),
        );
        await context.close();
      }
    } finally {
      await browser.close();
      server.close();
    }
  }
  for (const shot of options.shots) {
    for (const width of options.widths) write(shot, width);
  }
  return {
    taken: missing.length,
    cached: options.shots.length - missing.length,
  };
}
