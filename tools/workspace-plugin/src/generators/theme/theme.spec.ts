import { type Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { registryItems, writeRegistryFixture } from '../testing';
import { themeGenerator } from './theme';

describe('theme generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    writeRegistryFixture(tree);
  });

  it("starts from the default theme's tokens", async () => {
    await themeGenerator(tree, {
      name: 'ocean',
      description: 'Deep blues with a teal accent.',
      author: 'Jane Doe (https://example.com)',
      skipFormat: true,
    });

    expect(tree.read('registry/themes/ocean/theme.css', 'utf-8')).toBe(
      '/* Ocean theme: token values only (ADR-0006). */\n\n:root {\n  --radius: 0.625rem;\n}\n',
    );
    expect(registryItems(tree).get('ocean')).toEqual({
      name: 'ocean',
      type: 'registry:theme',
      version: '0.1.0',
      title: 'Ocean theme',
      description: 'Deep blues with a teal accent.',
      author: 'Jane Doe (https://example.com)',
      dependencies: ['@fontsource-variable/geist@^5.3.0'],
    });
    expect(tree.read('registry/changelog/ocean.md', 'utf-8')).toContain(
      '# Ocean theme',
    );
  });
});
