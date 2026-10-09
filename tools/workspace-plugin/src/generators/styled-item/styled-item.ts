import { formatFiles, generateFiles, names, type Tree } from '@nx/devkit';
import * as path from 'path';
import {
  addRegistryItem,
  hasRegistryItem,
  writeFirstChangelog,
} from '../registry-entries';
import type { StyledItemGeneratorSchema } from './schema';

/**
 * Scaffolds a styled registry item (ADR-0021), so every item starts with
 * the same shape:
 *
 * - `registry/ui/<name>/<name>.ts`: a `[nd<Name>]` directive with a
 *   `variants()` table and a `class` input merged last, composing the
 *   primitive of the same name with `--primitive`;
 * - its test and `docs.md`;
 * - its `registry.json` entry at 0.1.0, with its docs group as first
 *   category, and `registry/changelog/<name>.md`.
 *
 * @param tree - Virtual file system the generator writes to.
 * @param options - Generator options; see `schema.json`.
 * @returns Resolves once files are written and formatted.
 * @throws If the registry already has an item of that name.
 *
 * @example
 * ```bash
 * nx g @ndop/workspace-plugin:styled-item switch --category=inputs --primitive --description="A control that toggles between on and off."
 * ```
 */
export async function styledItemGenerator(
  tree: Tree,
  options: StyledItemGeneratorSchema,
): Promise<void> {
  const n = names(options.name);
  if (hasRegistryItem(tree, n.fileName)) {
    throw new Error(`The registry already has an item "${n.fileName}".`);
  }
  const title = options.title ?? titleOf(n.fileName);
  generateFiles(tree, path.join(__dirname, 'files'), '.', {
    ...n,
    title,
    description: options.description,
    primitive: options.primitive ?? false,
  });
  addRegistryItem(tree, {
    name: n.fileName,
    type: 'registry:ui',
    version: '0.1.0',
    title,
    description: options.description,
    ...(options.primitive ? { dependencies: ['@ndop/primitives'] } : {}),
    registryDependencies: ['utils'],
    categories: [options.category],
    files: [
      {
        path: `ui/${n.fileName}/${n.fileName}.ts`,
        type: 'registry:ui',
        target: `{ui}/${n.fileName}/${n.fileName}.ts`,
      },
    ],
    angular: {
      minVersion: '21.0.0',
      exports: [n.className],
      zoneless: true,
      ssr: true,
    },
    ndop: { metadata: `metadata/${n.fileName}.json`, examples: [] },
  });
  writeFirstChangelog(tree, n.fileName, title);
  if (!options.skipFormat) {
    await formatFiles(tree);
  }
}

/**
 * An item's display name from its kebab-case name.
 *
 * @param name - Such as `radio-group`.
 * @returns Such as `Radio Group`.
 */
export function titleOf(name: string): string {
  return name
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default styledItemGenerator;
