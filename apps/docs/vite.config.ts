/// <reference types="vitest" />

import analog from '@analogjs/platform';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import { angularServerMode } from '../../tools/workspace-plugin/src/vite/angular-server-mode';
import { LANGUAGES, THEMES, transformers } from './src/highlight/shiki';

export default defineConfig(() => {
  return {
    root: import.meta.dirname,
    cacheDir: `../../node_modules/.vite`,
    build: {
      outDir: '../../dist/apps/docs/client',
      reportCompressedSize: true,
      target: ['es2020'],
    },
    // The dependency scan doesn't reach lazily routed pages; without these,
    // a first visit re-optimizes and reloads open pages (see the harness).
    optimizeDeps: {
      include: [
        '@angular/cdk/a11y',
        '@angular/cdk/bidi',
        '@angular/cdk/overlay',
        '@angular/cdk/platform',
        '@angular/cdk/portal',
        '@angular/forms',
        '@angular/forms/signals',
      ],
    },
    server: {
      fs: {
        // Registry items, examples and fonts live outside the app root.
        allow: ['../..'],
      },
    },
    plugins: [
      analog({
        // Markdown is rendered and highlighted at build time, so no
        // highlighter ships to the browser.
        content: {
          highlighter: 'shiki',
          shikiOptions: {
            highlighter: { langs: LANGUAGES, themes: Object.values(THEMES) },
            highlight: {
              themes: THEMES,
              defaultColor: false,
              transformers: transformers(),
            },
          },
        },
        // Every page is linked from the navigation, so following links
        // from the home page prerenders the whole site.
        prerender: { discover: true, routes: ['/'] },
      }),
      angularServerMode(),
      // Tailwind's Vite plugin rewrites the url()s of stylesheets it
      // inlines, such as Fontsource's font files; its PostCSS plugin left
      // them relative to the inlined file, so the built site had no fonts.
      tailwindcss(),
      // The base config covers workspace files outside the app, such as
      // the registry items the docs render.
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
