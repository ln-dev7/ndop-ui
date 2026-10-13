import { join } from 'node:path';
import { inflateSync } from 'node:zlib';
import { MARK_PATH } from '../src/app/site/logo-mark';
import { brandFiles, INDIGO, webManifest } from './brand-assets';

/**
 * A PNG's dimensions, from its header chunk.
 *
 * @param png - The PNG file.
 * @returns Width and height in pixels.
 */
function dimensions(png: Uint8Array): [number, number] {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return [view.getUint32(16), view.getUint32(20)];
}

/**
 * The alpha of an RGBA PNG's top-left pixel. Whatever a scanline's filter,
 * the first pixel of the first line is stored as it is, after the line's
 * filter byte.
 *
 * @param png - The PNG file.
 * @returns 0 (transparent) to 255 (opaque).
 */
function cornerAlpha(png: Uint8Array): number {
  const file = Buffer.from(png);
  expect(file[25], 'RGBA').toBe(6);
  const data: Buffer[] = [];
  for (let at = 8; at < file.length; ) {
    const length = file.readUInt32BE(at);
    if (file.toString('latin1', at + 4, at + 8) === 'IDAT') {
      data.push(file.subarray(at + 8, at + 8 + length));
    }
    at += 12 + length;
  }
  return inflateSync(Buffer.concat(data))[4] ?? -1;
}

describe('brandFiles', () => {
  const files = brandFiles(join(import.meta.dirname, '../brand'));
  const binary = (path: string) => files.get(path)?.body as Uint8Array;

  it('generates the icons, the manifest and the masters', () => {
    expect([...files.keys()]).toEqual([
      '/favicon.svg',
      '/favicon.ico',
      '/apple-touch-icon.png',
      '/icon-192.png',
      '/icon-512.png',
      '/icon-maskable-512.png',
      '/manifest.webmanifest',
      '/brand/ndop-mark-black.svg',
      '/brand/ndop-mark-indigo.svg',
      '/brand/ndop-mark-white.svg',
      '/brand/ndop-tile-black-on-white.svg',
      '/brand/ndop-tile-indigo-on-white.svg',
      '/brand/ndop-tile-white-on-black.svg',
      '/brand/ndop-tile-white-on-indigo.svg',
    ]);
    expect(files.get('/manifest.webmanifest')?.type).toBe(
      'application/manifest+json',
    );
  });

  it('renders each PNG at its size', () => {
    expect(dimensions(binary('/apple-touch-icon.png'))).toEqual([180, 180]);
    expect(dimensions(binary('/icon-192.png'))).toEqual([192, 192]);
    expect(dimensions(binary('/icon-512.png'))).toEqual([512, 512]);
    expect(dimensions(binary('/icon-maskable-512.png'))).toEqual([512, 512]);
  });

  it('packs 16, 32 and 48 px PNGs into the ICO', () => {
    const ico = binary('/favicon.ico');
    const view = new DataView(ico.buffer, ico.byteOffset, ico.byteLength);
    const sizes = [0, 1, 2].map((index) => {
      const at = 6 + 16 * index;
      const png = ico.slice(
        view.getUint32(at + 12, true),
        view.getUint32(at + 12, true) + view.getUint32(at + 8, true),
      );
      return [view.getUint8(at), ...dimensions(png)];
    });
    expect(sizes).toEqual([
      [16, 16, 16],
      [32, 32, 32],
      [48, 48, 48],
    ]);
  });

  it('fills the corners of the icons platforms round themselves', () => {
    // iOS fills transparent corners with black, and launchers mask
    // maskable icons to their own shape.
    expect(cornerAlpha(binary('/apple-touch-icon.png'))).toBe(255);
    expect(cornerAlpha(binary('/icon-maskable-512.png'))).toBe(255);
    expect(cornerAlpha(binary('/icon-512.png'))).toBe(0);
  });

  it('draws the same mark as the site header', () => {
    for (const [path, file] of files) {
      if (path.endsWith('.svg')) {
        expect(file.body, path).toContain(`d="${MARK_PATH}"`);
      }
    }
  });

  it('describes the app in the manifest', () => {
    expect(
      JSON.parse(files.get('/manifest.webmanifest')?.body as string),
    ).toEqual(webManifest());
    expect(webManifest()).toMatchObject({
      name: 'Ndop UI',
      short_name: 'Ndop',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      theme_color: INDIGO,
    });
  });
});
