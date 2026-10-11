/// <reference types="vitest" />

import analog from '@analogjs/platform';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import { angularServerMode } from '../../tools/workspace-plugin/src/vite/angular-server-mode';

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
        '@angular/cdk/accordion',
        '@angular/cdk/bidi',
        '@angular/cdk/listbox',
        '@angular/cdk/menu',
        '@angular/cdk/overlay',
        '@angular/cdk/platform',
        '@angular/cdk/portal',
        '@angular/forms',
        '@angular/forms/signals',
        '@lucide/angular',
        'clsx',
        'tailwind-merge',
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
      // Rewrites the url()s of inlined stylesheets, such as Fontsource's
      // font files, which Tailwind's PostCSS plugin left unresolved.
      tailwindcss(),
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
