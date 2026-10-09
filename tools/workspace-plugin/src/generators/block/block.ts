import { formatFiles, generateFiles, names, type Tree } from '@nx/devkit';
import * as path from 'path';
import {
  addRegistryItem,
  hasRegistryItem,
  insertSortedLine,
  writeFirstChangelog,
} from '../registry-entries';
import { titleOf } from '../styled-item/styled-item';
import type { BlockGeneratorSchema } from './schema';

/** The harness's lists of blocks, which the generator keeps sorted. */
const HARNESS = 'apps/harness/src/app/blocks';

/**
 * Scaffolds a registry block (ADR-0022):
 *
 * - `registry/blocks/<name>/<name>.ts`, a standalone page component;
 * - its `registry.json` entry at 0.1.0, with its gallery category first
 *   and the route to add in `docs`, which `ndop add` prints;
 * - `registry/changelog/<name>.md`;
 * - the harness route `/blocks/<name>`, where it is rendered,
 *   server-rendered, hydrated and checked with axe.
 *
 * @param tree - Virtual file system the generator writes to.
 * @param options - Generator options; see `schema.json`.
 * @returns Resolves once files are written and formatted.
 * @throws If the registry already has an item of that name.
 *
 * @example
 * ```bash
 * nx g @ndop/workspace-plugin:block login-01 --category=auth --description="A login form in a card."
 * ```
 */
export async function blockGenerator(
  tree: Tree,
  options: BlockGeneratorSchema,
): Promise<void> {
  const name = options.name;
  if (hasRegistryItem(tree, name)) {
    throw new Error(`The registry already has an item "${name}".`);
  }
  const n = names(name);
  const title = titleOf(name);
  const symbol = `${n.className}Block`;

  generateFiles(tree, path.join(__dirname, 'files'), '.', {
    name,
    className: n.className,
    title,
    description: options.description,
  });
  addRegistryItem(tree, {
    name,
    type: 'registry:block',
    version: '0.1.0',
    title,
    description: options.description,
    categories: [options.category],
    files: [
      {
        path: `blocks/${name}/${name}.ts`,
        type: 'registry:block',
        target: `{blocks}/${name}/${name}.ts`,
      },
    ],
    angular: {
      minVersion: '21.0.0',
      exports: [symbol],
      zoneless: true,
      ssr: true,
    },
    docs: `Route to it, for example: { path: '${name}', loadComponent: () => import('./blocks/${name}/${name}').then((m) => m.${symbol}) }`,
  });
  writeFirstChangelog(tree, name, title);

  insertSortedLine(
    tree,
    `${HARNESS}/block-names.ts`,
    'export const BLOCK_NAMES',
    '];',
    `  '${name}',`,
  );
  insertSortedLine(
    tree,
    `${HARNESS}/blocks.ts`,
    "import type { Type } from '@angular/core';",
    '',
    `import { ${symbol} } from '@/blocks/${name}/${name}';`,
  );
  insertSortedLine(
    tree,
    `${HARNESS}/blocks.ts`,
    'export const BLOCKS',
    '};',
    `  '${name}': ${symbol},`,
  );

  if (!options.skipFormat) {
    await formatFiles(tree);
  }
}

export default blockGenerator;
