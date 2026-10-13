import type { Rolldown } from 'vite';
import { bundleVersion, precacheList } from './service-worker';

/**
 * A chunk of a fake build.
 *
 * @param fileName - Its name.
 * @param fields - What else it says.
 * @returns The chunk.
 */
function chunk(
  fileName: string,
  fields: { isEntry?: boolean; imports?: string[]; css?: string[] } = {},
): Rolldown.OutputChunk {
  return {
    type: 'chunk',
    fileName,
    code: `/* ${fileName} */`,
    isEntry: fields.isEntry ?? false,
    imports: fields.imports ?? [],
    viteMetadata: {
      importedCss: new Set(fields.css ?? []),
      importedAssets: new Set(),
      __modules: {},
    },
  } as unknown as Rolldown.OutputChunk;
}

/**
 * An asset of a fake build.
 *
 * @param fileName - Its name.
 * @returns The asset.
 */
function asset(fileName: string): Rolldown.OutputAsset {
  return {
    type: 'asset',
    fileName,
    source: fileName,
  } as unknown as Rolldown.OutputAsset;
}

const bundle: Rolldown.OutputBundle = {
  'assets/main-a.js': chunk('assets/main-a.js', {
    isEntry: true,
    imports: ['assets/core-b.js'],
    css: ['assets/main-c.css'],
  }),
  'assets/core-b.js': chunk('assets/core-b.js', {
    imports: ['assets/shared-d.js'],
  }),
  'assets/shared-d.js': chunk('assets/shared-d.js', {
    imports: ['assets/core-b.js'],
  }),
  'assets/page-e.js': chunk('assets/page-e.js'),
  'assets/main-c.css': asset('assets/main-c.css'),
  'assets/geist-latin-wght-normal-f.woff2': asset(
    'assets/geist-latin-wght-normal-f.woff2',
  ),
  'assets/geist-cyrillic-wght-normal-g.woff2': asset(
    'assets/geist-cyrillic-wght-normal-g.woff2',
  ),
  'r/index.json': asset('r/index.json'),
};

describe('precacheList', () => {
  it('lists the pages, the entry with its static imports, and the named files', () => {
    expect(
      precacheList(bundle, {
        pages: ['/', '/offline'],
        files: [/geist-latin-wght-normal-/],
      }),
    ).toEqual([
      '/',
      '/offline',
      '/assets/core-b.js',
      '/assets/geist-latin-wght-normal-f.woff2',
      '/assets/main-a.js',
      '/assets/shared-d.js',
    ]);
  });
});

describe('bundleVersion', () => {
  it('changes with any file and stays for the same build', () => {
    const version = bundleVersion(bundle);
    expect(version).toMatch(/^[0-9a-f]{12}$/);
    expect(bundleVersion({ ...bundle })).toBe(version);
    expect(
      bundleVersion({ ...bundle, 'r/new.json': asset('r/new.json') }),
    ).not.toBe(version);
  });
});
