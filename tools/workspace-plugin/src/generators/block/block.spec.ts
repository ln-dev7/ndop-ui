import { type Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { registryItems, writeRegistryFixture } from '../testing';
import { blockGenerator } from './block';

describe('block generator', () => {
  let tree: Tree;

  beforeEach(async () => {
    tree = createTreeWithEmptyWorkspace();
    writeRegistryFixture(tree);
    await blockGenerator(tree, {
      name: 'login-01',
      category: 'auth',
      description: 'A login form in a card.',
      skipFormat: true,
    });
  });

  it('writes a page component', () => {
    const source = tree.read('registry/blocks/login-01/login-01.ts', 'utf-8');
    expect(source).toContain("selector: 'block-login-01'");
    expect(source).toContain('export class Login01Block {}');
    expect(source).toContain('<main');
  });

  it('registers it with its category, route hint and changelog', () => {
    expect(registryItems(tree).get('login-01')).toEqual(
      expect.objectContaining({
        type: 'registry:block',
        categories: ['auth'],
        files: [
          {
            path: 'blocks/login-01/login-01.ts',
            type: 'registry:block',
            target: '{blocks}/login-01/login-01.ts',
          },
        ],
        docs: expect.stringContaining(
          "import('./blocks/login-01/login-01').then((m) => m.Login01Block)",
        ),
      }),
    );
    expect(tree.exists('registry/changelog/login-01.md')).toBe(true);
  });

  it('adds it to the harness lists, including empty ones', () => {
    expect(
      tree.read('apps/harness/src/app/blocks/block-names.ts', 'utf-8'),
    ).toBe(
      "export const BLOCK_NAMES: readonly string[] = [\n  'login-01',\n];\n",
    );
    const blocks =
      tree.read('apps/harness/src/app/blocks/blocks.ts', 'utf-8') ?? '';
    expect(blocks).toContain(
      "import { Login01Block } from '@/blocks/login-01/login-01';",
    );
    expect(blocks).toContain("  'login-01': Login01Block,\n};");
  });
});
