import { formatFiles, generateFiles, names, type Tree } from '@nx/devkit';
import * as path from 'path';
import {
  addRegistryItem,
  hasRegistryItem,
  insertSortedLine,
  readRegistryItem,
  updateRegistryItem,
} from '../registry-entries';
import { titleOf } from '../styled-item/styled-item';
import type { ExampleGeneratorSchema } from './schema';

/** The harness's lists of examples, which the generator keeps sorted. */
const HARNESS = 'apps/harness/src/app/examples';

/**
 * Scaffolds an example of a registry item (ADR-0014):
 *
 * - `registry/examples/<item>-<case>.ts`, a component using the item's
 *   first export;
 * - its `registry.json` entry at 0.1.0, depending on the item;
 * - the name in the item's `ndop.examples`, so its docs page shows it;
 * - its name in the harness's `EXAMPLE_NAMES`, which links its route,
 *   `/examples/<item>-<case>`, where it is rendered, server-rendered,
 *   hydrated and checked with axe; the route loads any example file.
 *
 * @param tree - Virtual file system the generator writes to.
 * @param options - Generator options; see `schema.json`.
 * @returns Resolves once files are written and formatted.
 * @throws If the item doesn't exist or the example does.
 *
 * @example
 * ```bash
 * nx g @ndop/workspace-plugin:example switch demo --description="A switch with a label."
 * ```
 */
export async function exampleGenerator(
  tree: Tree,
  options: ExampleGeneratorSchema,
): Promise<void> {
  const item = readRegistryItem(tree, options.item);
  if (!item) {
    throw new Error(`The registry has no item "${options.item}".`);
  }
  const name = `${options.item}-${options.case}`;
  if (hasRegistryItem(tree, name)) {
    throw new Error(`The registry already has an example "${name}".`);
  }
  const n = names(name);
  const exports = (item['angular'] as { exports?: string[] } | undefined)
    ?.exports;
  const part = exports?.find((symbol) => /^[A-Z]/.test(symbol));
  const itemTitle =
    typeof item['title'] === 'string' ? item['title'] : titleOf(options.item);
  if (!part) {
    throw new Error(`"${options.item}" exports no directive to show.`);
  }

  generateFiles(tree, path.join(__dirname, 'files'), '.', {
    name,
    className: n.className,
    item: options.item,
    part,
    title: itemTitle,
    description: options.description,
  });
  addRegistryItem(tree, {
    name,
    type: 'registry:primitive-usage',
    version: '0.1.0',
    title: `${itemTitle} ${options.case.replace(/-/g, ' ')}`,
    description: options.description,
    registryDependencies: [options.item],
    files: [
      {
        path: `examples/${name}.ts`,
        type: 'registry:primitive-usage',
        target: `{blocks}/examples/${name}.ts`,
      },
    ],
    angular: {
      minVersion: '21.0.0',
      exports: [`${n.className}Example`],
      zoneless: true,
      ssr: true,
    },
  });
  updateRegistryItem(tree, options.item, (entry) => {
    const ndop = (entry['ndop'] ??= {}) as { examples?: string[] };
    ndop.examples = [...(ndop.examples ?? []), name];
  });

  insertSortedLine(
    tree,
    `${HARNESS}/example-names.ts`,
    'export const EXAMPLE_NAMES',
    '];',
    `  '${name}',`,
  );
  if (!options.skipFormat) {
    await formatFiles(tree);
  }
}

export default exampleGenerator;
