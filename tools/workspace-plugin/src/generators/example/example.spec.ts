import { type Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { registryItems, writeRegistryFixture } from '../testing';
import { exampleGenerator } from './example';

describe('example generator', () => {
  let tree: Tree;

  beforeEach(async () => {
    tree = createTreeWithEmptyWorkspace();
    writeRegistryFixture(tree);
    await exampleGenerator(tree, {
      item: 'badge',
      case: 'with-icon',
      description: 'A badge with a leading icon.',
      skipFormat: true,
    });
  });

  it('writes a component using the item', () => {
    const source = tree.read('registry/examples/badge-with-icon.ts', 'utf-8');
    expect(source).toContain("import { Badge } from '@/ui/badge/badge';");
    expect(source).toContain("selector: 'example-badge-with-icon'");
    expect(source).toContain('export class BadgeWithIconExample {}');
  });

  it('registers it and lists it on the item', () => {
    const items = registryItems(tree);
    expect(items.get('badge-with-icon')).toEqual(
      expect.objectContaining({
        type: 'registry:primitive-usage',
        registryDependencies: ['badge'],
        angular: expect.objectContaining({
          exports: ['BadgeWithIconExample'],
        }),
      }),
    );
    expect(items.get('badge')?.['ndop']).toEqual({
      examples: ['badge-demo', 'badge-with-icon'],
    });
  });

  it('adds it to the harness lists, sorted', () => {
    expect(
      tree.read('apps/harness/src/app/examples/example-names.ts', 'utf-8'),
    ).toBe(
      "export const EXAMPLE_NAMES: readonly string[] = [\n  'badge-demo',\n  'badge-with-icon',\n  'card-demo',\n];\n",
    );
  });

  it('refuses an unknown item', async () => {
    await expect(
      exampleGenerator(tree, { item: 'nope', case: 'demo', description: 'x' }),
    ).rejects.toThrow('no item "nope"');
  });
});
