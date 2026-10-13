import { createHash } from 'node:crypto';
import type { Plugin, Rolldown } from 'vite';

/** Options of {@link serviceWorker}. */
export interface ServiceWorkerOptions {
  /** Absolute path of the worker's source (`src/service-worker/worker.ts`). */
  source: string;
  /** Pages to precache besides the code, such as `/` and `/offline`. */
  pages: string[];
  /** Built files to precache by name, such as the fonts every page uses. */
  files: RegExp[];
}

/**
 * The build's version: a hash of every file it emits, so any change to
 * the site makes a new worker, and a rebuild of the same site doesn't.
 *
 * @param bundle - The browser build's output.
 * @returns Twelve hex digits.
 */
export function bundleVersion(bundle: Rolldown.OutputBundle): string {
  const hash = createHash('sha256');
  for (const name of Object.keys(bundle).sort()) {
    const output = bundle[name];
    if (!output) continue;
    hash.update(name);
    hash.update(output.type === 'chunk' ? output.code : output.source);
  }
  return hash.digest('hex').slice(0, 12);
}

/**
 * What the worker saves at install: the given pages, the entry scripts and
 * everything they import statically, and the built files the options
 * name. No stylesheet: every page carries its styles inlined
 * (`inline-css.ts`), the offline page included.
 *
 * @param bundle - The browser build's output.
 * @param options - The pages and files to add.
 * @returns Absolute paths, without duplicates.
 */
export function precacheList(
  bundle: Rolldown.OutputBundle,
  options: Pick<ServiceWorkerOptions, 'pages' | 'files'>,
): string[] {
  const code = new Set<string>();
  const visit = (name: string) => {
    const chunk = bundle[name];
    if (chunk?.type !== 'chunk' || code.has(name)) return;
    code.add(name);
    chunk.imports.forEach(visit);
  };
  for (const output of Object.values(bundle)) {
    if (output.type === 'chunk' && output.isEntry) visit(output.fileName);
  }
  const files = Object.keys(bundle).filter((name) =>
    options.files.some((file) => file.test(name)),
  );
  return [
    ...new Set([
      ...options.pages,
      ...[...code, ...files].sort().map((name) => `/${name}`),
    ]),
  ];
}

/**
 * Builds the docs' service worker (ADR-0027) into `/sw.js`, with the
 * build's version and precache list compiled in. It is emitted after
 * every other file, so the version covers them all, and only by the
 * browser build: the dev server has no worker, and the app registers one
 * only in production builds.
 *
 * @param options - The worker's source and what it precaches.
 * @returns The Vite plugin.
 */
export function serviceWorker(options: ServiceWorkerOptions): Plugin {
  return {
    name: 'ndop:service-worker',
    apply: 'build',
    generateBundle: {
      order: 'post',
      async handler(_options, bundle) {
        if (this.environment.config.consumer !== 'client') return;
        // Loaded when building only: esbuild refuses to load under the
        // unit tests' jsdom, whose TextEncoder isn't Node's.
        const { build } = await import('esbuild');
        const result = await build({
          entryPoints: [options.source],
          bundle: true,
          write: false,
          format: 'iife',
          target: 'es2020',
          minify: true,
          legalComments: 'none',
          logLevel: 'silent',
          define: {
            NDOP_SW_VERSION: JSON.stringify(bundleVersion(bundle)),
            NDOP_SW_PRECACHE: JSON.stringify(precacheList(bundle, options)),
          },
        });
        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source: result.outputFiles[0]?.text ?? '',
        });
      },
    },
  };
}
