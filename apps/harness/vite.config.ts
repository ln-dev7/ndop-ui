/// <reference types="vitest" />

import analog from '@analogjs/platform';
import { defineConfig } from 'vite';
import viteTsConfigPaths from 'vite-tsconfig-paths';

export default defineConfig(() => {
  return {
    root: import.meta.dirname,
    cacheDir: `../../node_modules/.vite`,
    build: {
      outDir: '../../dist/apps/harness/client',
      reportCompressedSize: true,
      target: ['es2020'],
    },
    server: {
      fs: {
        allow: ['.'],
      },
    },
    // Route discovery follows the home page's links, so every demo is
    // prerendered and its server render checked at build time.
    plugins: [
      analog({ prerender: { discover: true, routes: ['/'] } }),
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
