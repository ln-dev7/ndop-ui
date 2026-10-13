import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { screenshotPages, type Shot } from './screenshots';

/** Where thumbnails go, under the site's root. */
export const THUMBNAIL_DIR = 'blocks/thumbs';

/** Thumbnail widths, in pixels; the window is 1280 by 800. */
export const THUMBNAIL_WIDTHS = [640, 1280];

/** Options for {@link blockThumbnails}. */
export interface BlockThumbnailOptions {
  /** The workspace's root. */
  workspace: string;
  /** The built site's static files, where previews were prerendered. */
  site: string;
}

/**
 * Writes a light and a dark thumbnail of every block to
 * `/blocks/thumbs/<name>-<scheme>-<width>.webp`, photographed from its
 * prerendered preview page (ADR-0022, ADR-0026), for the landing page.
 * A block is photographed again only when its registry item, one of the
 * items it depends on, or the site's styles change.
 *
 * @param options - The workspace and the built site.
 * @returns How many shots were taken and how many came from the cache.
 */
export async function blockThumbnails(
  options: BlockThumbnailOptions,
): Promise<{ taken: number; cached: number }> {
  const registry = join(options.workspace, 'dist/registry/r');
  const text = (path: string) =>
    existsSync(path) ? readFileSync(path, 'utf-8') : '';
  const styles = [
    'apps/docs/src/styles.css',
    'packages/core/styles.css',
    'registry/themes/default/theme.css',
  ].map((path) => text(join(options.workspace, path)));
  const index = JSON.parse(text(join(registry, 'index.json'))) as {
    items: { name: string; type: string }[];
  };
  const shots: Shot[] = index.items
    .filter((item) => item.type === 'registry:block')
    .flatMap((item) => {
      const json = text(join(registry, `${item.name}.json`));
      const dependencies = (
        (JSON.parse(json) as { registryDependencies?: string[] })
          .registryDependencies ?? []
      ).map((name) => text(join(registry, `${name}.json`)));
      return (['light', 'dark'] as const).map((scheme) => ({
        route: `/blocks/${item.name}/preview`,
        scheme,
        out: `${THUMBNAIL_DIR}/${item.name}-${scheme}`,
        inputs: [json, ...dependencies, ...styles],
      }));
    });
  return screenshotPages({
    dir: options.site,
    cache: join(options.workspace, 'node_modules/.cache/ndop-screenshots'),
    viewport: { width: 1280, height: 800 },
    widths: THUMBNAIL_WIDTHS,
    quality: 0.82,
    shots,
  });
}
