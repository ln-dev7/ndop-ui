import { formatFiles, joinPathFragments, type Tree } from '@nx/devkit';
import {
  addRegistryItem,
  hasRegistryItem,
  readRegistryItem,
  REGISTRY_ROOT,
  writeFirstChangelog,
} from '../registry-entries';
import { titleOf } from '../styled-item/styled-item';
import type { ThemeGeneratorSchema } from './schema';

/** The theme new themes start from. */
const BASE_THEME = 'default';

/**
 * Scaffolds a registry theme (ADR-0023): `registry/themes/<name>/theme.css`
 * with the default theme's tokens to edit, its `registry.json` entry at
 * 0.1.0 with the same font dependencies, and its changelog. `ndop build`
 * turns the stylesheet into the item's `cssVars`.
 *
 * @param tree - Virtual file system the generator writes to.
 * @param options - Generator options; see `schema.json`.
 * @returns Resolves once files are written and formatted.
 * @throws If the registry already has an item of that name.
 *
 * @example
 * ```bash
 * nx g @ndop/workspace-plugin:theme ocean --description="Deep blues with a teal accent."
 * ```
 */
export async function themeGenerator(
  tree: Tree,
  options: ThemeGeneratorSchema,
): Promise<void> {
  if (hasRegistryItem(tree, options.name)) {
    throw new Error(`The registry already has an item "${options.name}".`);
  }
  const base = tree.read(
    joinPathFragments(REGISTRY_ROOT, 'themes', BASE_THEME, 'theme.css'),
    'utf-8',
  );
  if (base === null) {
    throw new Error(`The ${BASE_THEME} theme's theme.css is missing.`);
  }
  const title = `${titleOf(options.name)} theme`;
  tree.write(
    joinPathFragments(REGISTRY_ROOT, 'themes', options.name, 'theme.css'),
    base.replace(
      /^\/\*[\s\S]*?\*\/\n/,
      `/* ${title}: token values only (ADR-0006). */\n`,
    ),
  );
  const dependencies = readRegistryItem(tree, BASE_THEME)?.['dependencies'];
  addRegistryItem(tree, {
    name: options.name,
    type: 'registry:theme',
    version: '0.1.0',
    title,
    description: options.description,
    ...(options.author ? { author: options.author } : {}),
    ...(Array.isArray(dependencies) ? { dependencies } : {}),
  });
  writeFirstChangelog(tree, options.name, title);
  if (!options.skipFormat) {
    await formatFiles(tree);
  }
}

export default themeGenerator;
