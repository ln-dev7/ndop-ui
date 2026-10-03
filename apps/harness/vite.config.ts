/// <reference types="vitest" />

import analog from '@analogjs/platform';
import { defineConfig, type Plugin } from 'vite';
import viteTsConfigPaths from 'vite-tsconfig-paths';

/**
 * Sets `ngServerMode` in every Angular package file the dev server renders
 * on the server. Analog 2.7.5 (and 2.8.0) does this only for files ending
 * in `core.mjs` or `platform-server.mjs`, but Angular 22 also reads the flag
 * from chunk files such as `_debug_node-chunk.mjs` and from
 * `@angular/common`, so browser-only hooks like `afterNextRender` ran during
 * dev SSR. Production builds define the flag and are unaffected.
 *
 * @returns A Vite plugin.
 */
function angularServerMode(): Plugin {
  return {
    name: 'harness-angular-server-mode',
    transform(code, id, options) {
      if (options?.ssr && /\/@angular\/[^/]+\/fesm2022\/[^/]+\.mjs$/.test(id)) {
        return { code: code.replaceAll('ngServerMode', 'true') };
      }
      return undefined;
    },
  };
}

export default defineConfig(() => {
  return {
    root: import.meta.dirname,
    cacheDir: `../../node_modules/.vite`,
    build: {
      outDir: '../../dist/apps/harness/client',
      reportCompressedSize: true,
      target: ['es2020'],
    },
    // Vite's dependency scan doesn't reach the lazily routed pages, so it
    // found these on first visit, re-optimized and reloaded open pages,
    // which broke e2e tests running on a cold cache (as on CI).
    optimizeDeps: {
      include: [
        '@angular/cdk/a11y',
        '@angular/cdk/overlay',
        '@angular/cdk/platform',
        '@angular/cdk/portal',
        '@angular/forms',
        '@angular/forms/signals',
      ],
    },
    server: {
      fs: {
        // The harness serves workspace sources (registry items, examples)
        // and fonts from the root node_modules, all outside the app root.
        allow: ['../..'],
      },
    },
    // Route discovery follows the home page's links, so every demo is
    // prerendered and its server render checked at build time.
    plugins: [
      analog({ prerender: { discover: true, routes: ['/'] } }),
      angularServerMode(),
      // The app tsconfig only includes entry files, and the plugin applies
      // aliases only to files its tsconfig includes; the base config covers
      // every workspace file.
      viteTsConfigPaths({ projects: ['../../tsconfig.base.json'] }),
    ],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['src/test-setup.ts'],
      include: ['**/*.spec.ts'],
      reporters: ['default'],
    },
  };
});
