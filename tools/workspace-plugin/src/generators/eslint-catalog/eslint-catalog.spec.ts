import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import type { Tree } from '@nx/devkit';
import { CATALOG_FILE, eslintCatalogGenerator } from './eslint-catalog';

describe('eslint-catalog generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('writes the catalog from metadata and primitives exports', async () => {
    tree.write(
      'dist/registry/r/metadata/dialog.json',
      JSON.stringify({
        name: 'dialog',
        parts: [
          {
            name: 'DialogContent',
            selector: '[ndDialogContent]',
            role: 'dialog',
            ariaAttributes: ['aria-labelledby'],
          },
          { name: 'DialogTitle', selector: '[ndDialogTitle]' },
          { name: 'DialogClose', selector: 'button[ndDialogClose]' },
        ],
      }),
    );
    tree.write(
      'dist/packages/primitives/package.json',
      JSON.stringify({
        exports: {
          '.': {},
          './dialog': {},
          './internal': {},
          './package.json': {},
        },
      }),
    );
    await eslintCatalogGenerator(tree, {});
    const source = tree.read(CATALOG_FILE, 'utf-8') ?? '';
    // The test tree has no Prettier config, so the object stays JSON.
    const catalog = JSON.parse(
      /CATALOG: Catalog = (\{[\s\S]*\});/.exec(source)?.[1] ?? '{}',
    );
    expect(catalog).toEqual({
      buttons: ['button[ndDialogClose]'],
      controls: [],
      hidden: [],
      dialogs: [{ content: '[ndDialogContent]', title: '[ndDialogTitle]' }],
      primitiveEntryPoints: ['@ndop/primitives', '@ndop/primitives/dialog'],
    });
  });

  it('says to build first when the registry is missing', async () => {
    await expect(eslintCatalogGenerator(tree, {})).rejects.toThrow(
      'Build the registry and the primitives first',
    );
  });
});
