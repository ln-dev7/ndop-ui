/// <reference types="vitest" />

import { join } from 'node:path';
import analog from '@analogjs/platform';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import { angularServerMode } from '../../tools/workspace-plugin/src/vite/angular-server-mode';
import { deferScripts } from '../../tools/workspace-plugin/src/vite/defer-scripts';
import { inlineCss } from '../../tools/workspace-plugin/src/vite/inline-css';
import { blockThumbnails } from './build/block-thumbnails';
import { brandAssets } from './build/brand-assets';
import { ogImages } from './build/og-images';
import { componentDocs } from './build/component-docs';
import { serviceWorker } from './build/service-worker';
import { writeSitemap } from './build/sitemap';
import {
  COLOR_REPLACEMENTS,
  LANGUAGES,
  THEMES,
  transformers,
} from './src/highlight/shiki';
import { headingIdsExtension } from './src/markdown/heading-ids';
import { stepsExtension } from './src/markdown/steps';

const workspace = join(import.meta.dirname, '../..');

// The Latin files of the two fonts every page uses (Geist and Geist Mono);
// the other subsets load only when text needs them. Pages preload them, and
// the service worker saves them at install.
const PAGE_FONTS = [/geist-(mono-)?latin-wght-normal-/];

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
          markedOptions: {
            extensions: [stepsExtension(), headingIdsExtension()],
          },
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
        // The offline page is linked from nowhere: the service worker
        // answers with it (ADR-0027). Nor is the not-found page, which
        // Cloudflare Pages serves for unknown paths from the top-level
        // `404.html` (ADR-0016, "Hosting"); a route ending in `.html` is
        // written under its own name.
        prerender: { discover: true, routes: ['/', '/offline', '/404.html'] },
        nitro: {
          hooks: {
            // Block thumbnails for the landing page and OG images
            // (ADR-0026), from the pages just prerendered into Analog's
            // public output.
            'prerender:done': async () => {
              // Search engines' list of the pages to index (ADR-0016,
              // amendment 15), from the same pages as the OG images.
              const listed = writeSitemap(
                join(workspace, 'dist/apps/docs/analog/public'),
              );
              console.log(`Sitemap: ${listed} pages`);
              const { taken, cached } = await blockThumbnails({
                workspace,
                site: join(workspace, 'dist/apps/docs/analog/public'),
              });
              console.log(
                `Block thumbnails: ${taken} taken, ${cached} from the cache`,
              );
              // OG images for every indexed page (ADR-0026, "OG images").
              const started = Date.now();
              const og = await ogImages({
                workspace,
                site: join(workspace, 'dist/apps/docs/analog/public'),
              });
              console.log(
                `OG images: ${og.taken} rendered, ${og.cached} from the cache, ${og.examples} examples shot, in ${Math.round((Date.now() - started) / 1000)}s`,
              );
            },
          },
          prerender: {
            // `/about` as `about.html`: Cloudflare Pages redirects `/about`
            // to `/about/` when the page is `about/index.html`, and every
            // link on the site has no trailing slash (ADR-0016, "Hosting").
            autoSubfolderIndex: false,
            // Links into the theme studio carry a theme in their query
            // (ADR-0023); the page itself is prerendered from its plain
            // link, and a query has no place in a static file's name.
            // Block previews link to the app routes a block would sit
            // among, such as /login, which aren't pages of this site
            // (ADR-0022). Among them is /docs, which here is only the
            // guides' layout, with no page of its own: prerendered, it was
            // an empty page titled like the home page for search engines
            // to find (ADR-0016, amendment 15).
            ignore: [
              (route: string) =>
                route.includes('?') ||
                !/^\/(?:$|offline$|404\.html$|docs\/|blocks(?:\/|$)|themes(?:\/|$))/.test(
                  route,
                ),
            ],
          },
        },
      }),
      // Component pages' data, from the built registry (`^build`).
      componentDocs({
        workspace,
        guides: join(import.meta.dirname, 'src/guides'),
      }),
      // Icons and the web app manifest, from the logo's masters.
      brandAssets(join(import.meta.dirname, 'brand')),
      // `/sw.js`, which precaches what the app needs to start offline.
      serviceWorker({
        source: join(import.meta.dirname, 'src/service-worker/worker.ts'),
        pages: ['/', '/offline'],
        files: PAGE_FONTS,
      }),
      angularServerMode(),
      // Tailwind's Vite plugin rewrites the url()s of stylesheets it
      // inlines, such as Fontsource's font files; its PostCSS plugin left
      // them relative to the inlined file, so the built site had no fonts.
      tailwindcss(),
      inlineCss({ preloadFonts: PAGE_FONTS }),
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
