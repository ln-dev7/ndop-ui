import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import type { Plugin } from 'vite';
import { icoFromPngs } from './ico';

/** The brand's indigo (ADR-0026), the PWA theme color. */
export const INDIGO = '#1E3170';

/**
 * The tile every icon is made from: the white mark on indigo, which reads
 * in light and dark browser chrome alike, where a white tile glares in a
 * dark tab strip and loses its edge in a light one.
 */
const TILE = 'ndop-tile-white-on-indigo.svg';

/**
 * How large the mark is on a maskable icon, against the tile's: 80%
 * keeps the leaf's tips well inside the safe zone, the centered circle of
 * 80% of the icon that every launcher mask leaves visible.
 */
const MASKABLE_SCALE = 0.8;

/** A file the docs serve, with its content type. */
export interface BrandFile {
  /** The `Content-Type` header. */
  type: string;
  /** The file. */
  body: Uint8Array | string;
}

/**
 * Renders an SVG to a PNG of the given width.
 *
 * @param svg - The SVG.
 * @param width - Width in pixels; the height follows the aspect ratio.
 * @returns The PNG file.
 */
function png(svg: string, width: number): Uint8Array {
  return new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: false },
  })
    .render()
    .asPng();
}

/**
 * The tile without its rounded corners, for platforms that round icons
 * themselves. iOS fills transparent corners with black, and launchers
 * mask maskable icons to their own shape.
 *
 * @param tile - The tile's SVG.
 * @returns The square SVG.
 */
function square(tile: string): string {
  return tile.replace(/\s+rx="[^"]*"/, '');
}

/**
 * The web app manifest (ADR-0027).
 *
 * @returns The manifest.
 */
export function webManifest(): Record<string, unknown> {
  return {
    id: '/',
    name: 'Ndop UI',
    short_name: 'Ndop',
    description:
      'Accessible Angular components you own and can still update, built for you and your agent.',
    lang: 'en',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: INDIGO,
    background_color: '#ffffff',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}

/**
 * Generates the site's icons and manifest from the logo's SVG masters
 * (ADR-0026, ADR-0027), so they never drift from the logo: the favicons,
 * the Apple touch icon, the manifest's icons, the manifest itself, and the
 * masters at `/brand/`.
 *
 * @param brand - Absolute folder of the SVG masters.
 * @returns The files by URL path.
 */
export function brandFiles(brand: string): Map<string, BrandFile> {
  const svg = 'image/svg+xml';
  const pngType = 'image/png';
  const masters = readdirSync(brand)
    .filter((file) => file.endsWith('.svg'))
    .sort();
  const tile = readFileSync(join(brand, TILE), 'utf-8');
  const maskable = square(tile).replace(
    '<path ',
    `<path transform="translate(48 48) scale(${MASKABLE_SCALE}) translate(-48 -48)" `,
  );
  return new Map<string, BrandFile>([
    ['/favicon.svg', { type: svg, body: tile }],
    [
      '/favicon.ico',
      {
        type: 'image/x-icon',
        body: icoFromPngs(
          [16, 32, 48].map((size) => ({ size, png: png(tile, size) })),
        ),
      },
    ],
    ['/apple-touch-icon.png', { type: pngType, body: png(square(tile), 180) }],
    ['/icon-192.png', { type: pngType, body: png(tile, 192) }],
    ['/icon-512.png', { type: pngType, body: png(tile, 512) }],
    ['/icon-maskable-512.png', { type: pngType, body: png(maskable, 512) }],
    [
      '/manifest.webmanifest',
      {
        type: 'application/manifest+json',
        body: `${JSON.stringify(webManifest(), null, 2)}\n`,
      },
    ],
    ...masters.map(
      (file) =>
        [
          `/brand/${file}`,
          { type: svg, body: readFileSync(join(brand, file), 'utf-8') },
        ] as const,
    ),
  ]);
}

/**
 * Serves {@link brandFiles} in development and emits them with the build,
 * as `componentDocs` does the machine-readable docs. They are generated
 * once per server or build.
 *
 * @param brand - Absolute folder of the SVG masters.
 * @returns The Vite plugin.
 */
export function brandAssets(brand: string): Plugin {
  let files: Map<string, BrandFile> | undefined;
  const generated = () => (files ??= brandFiles(brand));
  return {
    name: 'ndop:brand-assets',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const file = generated().get(request.url?.split(/[?#]/)[0] ?? '');
        if (!file) return next();
        response.setHeader('Content-Type', file.type);
        response.end(file.body);
      });
    },
    generateBundle() {
      // The site's static files come from the browser build only.
      if (this.environment.config.consumer !== 'client') return;
      for (const [path, file] of generated()) {
        this.emitFile({
          type: 'asset',
          fileName: path.slice(1),
          source: file.body,
        });
      }
    },
  };
}
