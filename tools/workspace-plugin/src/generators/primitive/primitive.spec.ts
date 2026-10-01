import { addProjectConfiguration, readJson, type Tree } from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { primitiveGenerator } from './primitive';

const src = 'packages/primitives/src';

describe('primitive generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    addProjectConfiguration(tree, 'primitives', {
      root: 'packages/primitives',
      sourceRoot: src,
      projectType: 'library',
    });
    tree.write(`${src}/index.ts`, '/** Docs. */\nexport {};\n');
    tree.write(
      `${src}/index.spec.ts`,
      "describe('public API', () => { it('exports nothing yet', () => {}); });\n",
    );
  });

  it('writes the contract, directive and test into one folder', async () => {
    await primitiveGenerator(tree, { name: 'radio-group', skipFormat: true });

    expect(tree.exists(`${src}/radio-group/spec.md`)).toBe(true);
    expect(tree.exists(`${src}/radio-group/radio-group.spec.ts`)).toBe(true);
    const directive = tree.read(`${src}/radio-group/radio-group.ts`, 'utf-8');
    expect(directive).toContain("selector: '[ndRadioGroup]'");
    expect(directive).toContain('export class NdRadioGroup {}');
  });

  it('links the WAI-ARIA pattern when one is given', async () => {
    await primitiveGenerator(tree, {
      name: 'dialog',
      pattern: 'dialog-modal',
      skipFormat: true,
    });

    expect(tree.read(`${src}/dialog/spec.md`, 'utf-8')).toContain(
      'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
    );
  });

  it('exports the primitive and retires the empty-API guard', async () => {
    await primitiveGenerator(tree, { name: 'dialog', skipFormat: true });

    expect(tree.read(`${src}/index.ts`, 'utf-8')).toBe(
      "/** Docs. */\nexport * from './dialog/dialog';\n",
    );
    expect(tree.exists(`${src}/index.spec.ts`)).toBe(false);
  });

  it('appends further exports without touching earlier ones', async () => {
    await primitiveGenerator(tree, { name: 'dialog', skipFormat: true });
    await primitiveGenerator(tree, { name: 'tooltip', skipFormat: true });

    expect(tree.read(`${src}/index.ts`, 'utf-8')).toBe(
      "/** Docs. */\nexport * from './dialog/dialog';\nexport * from './tooltip/tooltip';\n",
    );
  });

  it('declares the Angular peer range and keeps an existing one', async () => {
    tree.write(
      'packages/primitives/package.json',
      JSON.stringify({ name: '@ndop/primitives', peerDependencies: {} }),
    );
    await primitiveGenerator(tree, { name: 'dialog', skipFormat: true });
    expect(
      readJson(tree, 'packages/primitives/package.json').peerDependencies,
    ).toEqual({ '@angular/core': '^21.0.0 || ^22.0.0' });

    tree.write(
      'packages/primitives/package.json',
      JSON.stringify({ peerDependencies: { '@angular/core': '^22.0.0' } }),
    );
    await primitiveGenerator(tree, { name: 'tooltip', skipFormat: true });
    expect(
      readJson(tree, 'packages/primitives/package.json').peerDependencies,
    ).toEqual({ '@angular/core': '^22.0.0' });
  });

  it('refuses to overwrite an existing primitive', async () => {
    await primitiveGenerator(tree, { name: 'dialog', skipFormat: true });

    await expect(
      primitiveGenerator(tree, { name: 'dialog', skipFormat: true }),
    ).rejects.toThrow('already exists');
  });
});
