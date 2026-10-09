import { type Tree, writeJson } from '@nx/devkit';

/**
 * Writes the registry and harness files the registry generators edit, in
 * the shapes the real ones have, into a test tree.
 *
 * @param tree - A test tree.
 */
export function writeRegistryFixture(tree: Tree): void {
  writeJson(tree, 'registry/registry.json', {
    name: 'ndop',
    items: [
      { name: 'utils', type: 'registry:lib' },
      {
        name: 'default',
        type: 'registry:theme',
        dependencies: ['@fontsource-variable/geist@^5.3.0'],
      },
      {
        name: 'badge',
        type: 'registry:ui',
        angular: { exports: ['badgeVariants', 'Badge'] },
        ndop: { examples: ['badge-demo'] },
      },
      { name: 'badge-demo', type: 'registry:primitive-usage' },
    ],
  });
  tree.write(
    'registry/themes/default/theme.css',
    '/*\n * Ndop default theme.\n */\n\n:root {\n  --radius: 0.625rem;\n}\n',
  );
  tree.write(
    'apps/harness/src/app/examples/example-names.ts',
    "export const EXAMPLE_NAMES: readonly string[] = [\n  'badge-demo',\n  'card-demo',\n];\n",
  );
  tree.write(
    'apps/harness/src/app/examples/examples.ts',
    [
      "import type { Type } from '@angular/core';",
      "import { BadgeDemoExample } from '@/examples/badge-demo';",
      "import { CardDemoExample } from '@/examples/card-demo';",
      '',
      'export const EXAMPLES: Readonly<Record<string, Type<unknown>>> = {',
      "  'badge-demo': BadgeDemoExample,",
      "  'card-demo': CardDemoExample,",
      '};',
      '',
    ].join('\n'),
  );
  tree.write(
    'apps/harness/src/app/blocks/block-names.ts',
    'export const BLOCK_NAMES: readonly string[] = [];\n',
  );
  tree.write(
    'apps/harness/src/app/blocks/blocks.ts',
    "import type { Type } from '@angular/core';\n\nexport const BLOCKS: Readonly<Record<string, Type<unknown>>> = {};\n",
  );
}

/**
 * The registry items of a test tree, by name.
 *
 * @param tree - A test tree.
 * @returns Each entry.
 */
export function registryItems(
  tree: Tree,
): Map<string, Record<string, unknown> & { type: string }> {
  const manifest = JSON.parse(
    tree.read('registry/registry.json', 'utf-8') ?? '{}',
  ) as { items: (Record<string, unknown> & { name: string; type: string })[] };
  return new Map(manifest.items.map((item) => [item.name, item]));
}
