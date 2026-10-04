/// <reference types="vitest" />

import { join } from 'node:path';
import analog from '@analogjs/platform';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import { angularServerMode } from '../../tools/workspace-plugin/src/vite/angular-server-mode';
import { deferScripts } from '../../tools/workspace-plugin/src/vite/defer-scripts';
import { inlineCss } from '../../tools/workspace-plugin/src/vite/inline-css';
import { componentDocs } from './build/component-docs';
import {
  COLOR_REPLACEMENTS,
  LANGUAGES,
  THEMES,
  transformers,
} from './src/highlight/shiki';
import { stepsExtension } from './src/markdown/steps';

const workspace = join(import.meta.dirname, '../..');

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
          markedOptions: { extensions: [stepsExtension()] },
          shikiOptions: {
            highlighter: { langs: LANGUAGES, themes: Object.values(THEMES) },
            highlight: {
              themes: THEMES,
              colorReplacements: COLOR_REPLACEMENTS,
              defaultColor: false,
              transformers: transformers(),
            },
          },
        },
        // Every page is linked from the navigation, so following links
        // from the home page prerenders the whole site.
        prerender: { discover: true, routes: ['/'] },
      }),
      // Component pages' data, from the built registry (`^build`).
      componentDocs({
        workspace,
        guides: join(import.meta.dirname, 'src/guides'),
      }),
      angularServerMode(),
      // Tailwind's Vite plugin rewrites the url()s of stylesheets it
      // inlines, such as Fontsource's font files; its PostCSS plugin left
      // them relative to the inlined file, so the built site had no fonts.
      tailwindcss(),
      inlineCss({
        // The Latin files of the two fonts every page uses (Geist and
        // Geist Mono); the other subsets load only when text needs them.
        preloadFonts: [/geist-(mono-)?latin-wght-normal-/],
      }),
      deferScripts(),
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
