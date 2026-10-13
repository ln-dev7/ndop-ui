import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
// By path: Vite bundles this file with its config, and that bundler
// resolves neither tsconfig paths nor unbuilt workspace packages.
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  BLOCK_CATEGORIES,
  COMPONENT_GROUPS,
} from '../../../registry/categories';
import { MARK_PATH } from '../src/app/site/mark-path';
import { GUIDE_SECTIONS } from '../src/app/site/guide-sections';
import { OG_SIZE, ogImagePath } from '../src/app/site/og-image';
import { serveSite } from './screenshots';

/** A page that gets an OG image. */
export interface OgPage {
  /** Its path, such as `/docs/components/button`. */
  path: string;
  /** Its title, from its `og:title`. */
  title: string;
  /** Its section or kind, shown above the title. */
  eyebrow: string;
  /**
   * For a component page, the component, whose main example the image
   * shows; a block's page shows the block's thumbnail instead.
   */
  component?: string;
}

/** What {@link ogEyebrow} looks up. */
export interface OgLookup {
  /** A component's catalog group slug, by its name. */
  componentGroup(name: string): string | undefined;
  /** A block's category slug, by its name. */
  blockCategory(name: string): string | undefined;
}

/**
 * The eyebrow of a page's OG image: the part of the site it belongs to,
 * such as "Components · Inputs" or "Guide · Get started".
 *
 * @param path - The page's path.
 * @param lookup - The registry's groups and categories.
 * @returns The eyebrow.
 */
export function ogEyebrow(path: string, lookup: OgLookup): string {
  const parts = path.split('/').filter(Boolean);
  const group = (slug: string | undefined) =>
    COMPONENT_GROUPS.find((entry) => entry.slug === slug)?.title;
  const category = (slug: string | undefined) =>
    BLOCK_CATEGORIES.find((entry) => entry.slug === slug)?.title;
  const [first, second, third, fourth] = parts;
  if (first === 'docs' && second === 'components' && third) {
    if (fourth === 'changelog') return 'Changelog';
    const title = group(lookup.componentGroup(third));
    return title ? `Components · ${title}` : 'Components';
  }
  if (first === 'docs' && second === 'primitives') return 'Primitives';
  if (first === 'docs' && second) {
    const title = GUIDE_SECTIONS.find(([folder]) => folder === second)?.[1];
    return title ? `Guide · ${title}` : 'Guide';
  }
  if (first === 'blocks') {
    const title =
      category(second) ?? category(lookup.blockCategory(second ?? ''));
    return title ? `Blocks · ${title}` : 'Blocks';
  }
  if (first === 'themes') return 'Themes';
  return 'Docs';
}

/**
 * Escapes text for HTML.
 *
 * @param text - The text.
 * @returns It, safe in an element or attribute.
 */
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ] ?? char,
  );

/**
 * Decodes the entities Angular's server renderer writes in attributes.
 *
 * @param text - An attribute's value.
 * @returns Its text.
 */
const unescape = (text: string) =>
  text
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(+code))
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

/**
 * The OG image's page: indigo with a lattice of the mark's leaves, the
 * mark and name, the eyebrow and title, and, for a component, its main
 * example on a white card. The home page gets the headline instead.
 *
 * @param page - The page.
 * @param font - The URL of the site's Geist font file.
 * @param example - The example's render as a data URL, if any.
 * @param framed - Whether the render is a whole page, such as a block's,
 *   which gets a hairline frame so it doesn't melt into the card.
 * @returns A standalone HTML document of 1200 by 630 pixels.
 */
export function ogHtml(
  page: OgPage,
  font: string,
  example?: string,
  framed = false,
): string {
  const home = page.path === '/';
  const length = page.title.length;
  const size = home ? 76 : length > 40 ? 56 : length > 22 ? 68 : 84;
  // The mark's leaf is centered on (48, 48) in its own units.
  const leaf = (x: number, y: number) =>
    `<path transform="translate(${x - 48} ${y - 48})" d="${MARK_PATH}"/>`;
  const title = home
    ? 'Own your components.<br><span class="soft">Update them anyway.</span>'
    : escape(page.title);
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
@font-face { font-family: Geist; src: url(${font}) format('woff2'); font-weight: 100 900; }
* { box-sizing: border-box; margin: 0; }
html, body { width: ${OG_SIZE.width}px; height: ${OG_SIZE.height}px; }
body { position: relative; overflow: hidden; background: #1e3170; color: #fff;
  font-family: Geist, sans-serif; -webkit-font-smoothing: antialiased; }
.lattice { position: absolute; inset: 0; color: #fff; opacity: .055; }
.brand { position: absolute; left: 72px; top: 64px; display: flex; align-items: center;
  gap: 14px; font-size: 30px; font-weight: 600; letter-spacing: -.01em; }
.brand svg { height: 40px; }
.copy { position: absolute; left: 72px; bottom: 72px; width: ${example ? 540 : 1000}px; }
.eyebrow { font-size: 26px; font-weight: 500; color: rgba(255,255,255,.72); }
h1 { margin-top: 18px; font-size: ${size}px; line-height: 1.04; font-weight: 700;
  letter-spacing: -.035em; text-wrap: balance; display: -webkit-box;
  -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.soft { color: rgba(255,255,255,.62); }
.card { position: absolute; right: 64px; bottom: 64px; width: 520px; padding: 36px;
  display: flex; align-items: center; justify-content: center; min-height: 200px;
  background: #fff; border-radius: 28px;
  box-shadow: 0 30px 60px -20px rgba(4,10,40,.55), 0 0 0 1px rgba(255,255,255,.12); }
.card img { display: block; max-width: 100%; max-height: 430px; object-fit: contain; }
.card img.framed { border-radius: 10px; box-shadow: 0 0 0 1px rgba(15,23,42,.1); }
</style></head><body>
<svg class="lattice" width="100%" height="100%" aria-hidden="true">
  <defs><pattern id="leaves" width="64" height="104" patternUnits="userSpaceOnUse"
    patternTransform="translate(32 0) scale(0.9)">
    <g fill="currentColor" fill-rule="evenodd">
      ${leaf(32, 52)}${leaf(0, 0)}${leaf(64, 0)}${leaf(0, 104)}${leaf(64, 104)}
    </g>
  </pattern></defs>
  <rect width="100%" height="100%" fill="url(#leaves)"/>
</svg>
<div class="brand">
  <svg viewBox="28.5 10 39 76"><path fill="#fff" fill-rule="evenodd" d="${MARK_PATH}"/></svg>
  Ndop UI
</div>
<div class="copy">
  <p class="eyebrow">${escape(home ? 'Angular 21 & 22 · Open source · MIT' : page.eyebrow)}</p>
  <h1>${title}</h1>
</div>
${example ? `<div class="card"><img src="${example}" alt=""${framed ? ' class="framed"' : ''}></div>` : ''}
</body></html>`;
}

/** Options for {@link ogImages}. */
export interface OgImageOptions {
  /** The workspace's root. */
  workspace: string;
  /** The built site's static files, where pages were prerendered. */
  site: string;
}

/**
 * Lists the prerendered pages that get an OG image: every `index.html`
 * under the site with an `og:title`, except pages marked `noindex`, such
 * as block previews and the offline page.
 *
 * @param site - The built site's static files.
 * @returns Each page's path and title.
 */
export function ogPages(site: string): { path: string; title: string }[] {
  const pages: { path: string; title: string }[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'assets' && entry.name !== 'r') walk(full);
      } else if (entry.name === 'index.html') {
        const html = readFileSync(full, 'utf-8');
        if (/<meta name="robots" content="noindex"/.test(html)) continue;
        const title = html.match(
          /<meta property="og:title" content="([^"]*)"/,
        )?.[1];
        if (!title) continue;
        const path = `/${relative(site, dirname(full)).split(sep).join('/')}`;
        pages.push({ path: path === '/' ? '/' : path, title: unescape(title) });
      }
    }
  };
  walk(site);
  return pages.map((page) => ({
    ...page,
    path: page.path.replace(/\/$/, '') || '/',
  }));
}

/**
 * Writes a 1200 by 630 JPEG OG image for every indexed page of the built
 * site (ADR-0026, "OG images"), at {@link ogImagePath}: each composed as
 * an HTML page with the site's own Geist and photographed in Chromium.
 * A component page's image shows its main example, photographed from the
 * prerendered page in light mode. Both shots are cached by content hash
 * in the same cache as block thumbnails, so a build only renders pages
 * whose title, section or example changed.
 *
 * @param options - The workspace and the built site.
 * @returns How many images were rendered and how many came from the cache.
 */
export async function ogImages(
  options: OgImageOptions,
): Promise<{ taken: number; cached: number; examples: number }> {
  const registry = join(options.workspace, 'dist/registry/r');
  const cache = join(options.workspace, 'node_modules/.cache/ndop-screenshots');
  mkdirSync(cache, { recursive: true });
  const text = (path: string) =>
    existsSync(path) ? readFileSync(path, 'utf-8') : '';
  const index = JSON.parse(text(join(registry, 'index.json'))) as {
    items: { name: string; type: string; categories?: string[] }[];
  };
  const item = (name: string, type: string) =>
    index.items.find((entry) => entry.name === name && entry.type === type);
  const lookup: OgLookup = {
    componentGroup: (name) => item(name, 'registry:ui')?.categories?.[0],
    blockCategory: (name) => item(name, 'registry:block')?.categories?.[0],
  };
  const pages: OgPage[] = ogPages(options.site).map((page) => {
    const component = page.path.match(/^\/docs\/components\/([^/]+)$/)?.[1];
    const eyebrow = ogEyebrow(page.path, lookup);
    return {
      ...page,
      // A gallery's title is its section's name; saying it twice reads
      // as a mistake.
      eyebrow: eyebrow === page.title ? 'Gallery' : eyebrow,
      ...(component ? { component } : {}),
    };
  });
  const font = readdirSync(join(options.site, 'assets')).find((file) =>
    /^geist-latin-wght-normal-.*\.woff2$/.test(file),
  );
  const styles = [
    'apps/docs/src/styles.css',
    'packages/core/styles.css',
    'registry/themes/default/theme.css',
  ].map((path) => text(join(options.workspace, path)));
  const hash = (...parts: string[]) =>
    createHash('sha256').update(parts.join('\0')).digest('hex').slice(0, 16);

  let taken = 0;
  let examples = 0;
  const { chromium } = await import('@playwright/test');
  const { server, origin } = await serveSite(options.site);
  const browser = await chromium.launch();
  try {
    // One tab for examples and one for images, reused: a new context per
    // page tripled the time.
    const examplesTab = await (
      await browser.newContext({
        viewport: { width: 1280, height: 900 },
        deviceScaleFactor: 2,
        colorScheme: 'light',
        reducedMotion: 'reduce',
      })
    ).newPage();
    const imageTab = await (
      await browser.newContext({ viewport: OG_SIZE, deviceScaleFactor: 1 })
    ).newPage();
    // Served from the site's origin, so the font loads as on the site:
    // a page set from a string has no origin, and the font needs one.
    let current = '';
    await imageTab.route(`${origin}/__og`, (route) =>
      route.fulfill({ contentType: 'text/html', body: current }),
    );
    for (const page of pages) {
      let example: string | undefined;
      // A block's page shows the thumbnail the build already took of it.
      const block = page.path.match(/^\/blocks\/([^/]+)$/)?.[1];
      const thumbnail = block
        ? join(options.site, `blocks/thumbs/${block}-light-1280.webp`)
        : '';
      if (thumbnail && existsSync(thumbnail)) {
        example = `data:image/webp;base64,${readFileSync(thumbnail).toString('base64')}`;
      }
      if (page.component) {
        const shot = join(
          cache,
          `og-example-${hash(
            'cropped',
            page.component,
            text(join(registry, `${page.component}.json`)),
            text(join(registry, `metadata/${page.component}.json`)),
            ...styles,
          )}.png`,
        );
        if (!existsSync(shot)) {
          await examplesTab.goto(origin + page.path, {
            waitUntil: 'networkidle',
          });
          await examplesTab.evaluate(() => document.fonts.ready);
          // The example itself, with some room, not the preview's frame,
          // whose padding would leave it small on the card.
          const box = await examplesTab
            .locator('docs-example-preview figure > div > *')
            .first()
            .evaluate((element) => {
              element.scrollIntoView({ block: 'center' });
              const rect = element.getBoundingClientRect();
              return rect.width && rect.height
                ? {
                    x: rect.x,
                    y: rect.y,
                    width: rect.width,
                    height: rect.height,
                  }
                : null;
            })
            .catch(() => null);
          if (box) {
            const pad = 24;
            writeFileSync(
              shot,
              await examplesTab.screenshot({
                type: 'png',
                clip: {
                  x: box.x - pad,
                  y: box.y - pad,
                  width: box.width + pad * 2,
                  height: box.height + pad * 2,
                },
              }),
            );
            examples++;
          }
        }
        if (existsSync(shot)) {
          example = `data:image/png;base64,${readFileSync(shot).toString('base64')}`;
        }
      }
      const html = ogHtml(
        page,
        `${origin}/assets/${font}`,
        example,
        Boolean(block && example),
      );
      const cached = join(cache, `og-${hash(html.replace(origin, ''))}.jpg`);
      if (!existsSync(cached)) {
        current = html;
        await imageTab.goto(`${origin}/__og`, { waitUntil: 'load' });
        await imageTab.evaluate(() => document.fonts.ready);
        // JPEG: the lattice and the example made PNGs of 130 to 200 KB.
        writeFileSync(
          cached,
          await imageTab.screenshot({ type: 'jpeg', quality: 90 }),
        );
        taken++;
      }
      const target = join(options.site, ogImagePath(page.path).slice(1));
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(cached, target);
    }
  } finally {
    await browser.close();
    server.close();
  }
  return { taken, cached: pages.length - taken, examples };
}
