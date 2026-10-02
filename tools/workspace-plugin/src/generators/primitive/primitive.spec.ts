import {
  addProjectConfiguration,
  readJson,
  type Tree,
  writeJson,
} from '@nx/devkit';
import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';

import { primitiveGenerator } from './primitive';

const root = 'packages/primitives';

describe('primitive generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
    addProjectConfiguration(tree, 'primitives', {
      root,
      sourceRoot: root,
      projectType: 'library',
    });
    writeJson(tree, `${root}/package.json`, { name: '@ndop/primitives' });
    writeJson(tree, `${root}/ng-package.json`, {
      lib: { entryFile: 'src/index.ts' },
    });
    writeJson(tree, `${root}/tsconfig.lib.json`, {
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.spec.ts'],
    });
    tree.write(`${root}/src/index.ts`, 'export {};\n');
    writeJson(tree, 'tsconfig.base.json', {
      compilerOptions: {
        paths: { '@ndop/primitives': [`${root}/src/index.ts`] },
      },
    });
  });

  it('creates a secondary entry point for the primitive', async () => {
    await primitiveGenerator(tree, { name: 'radio-group', skipFormat: true });

    expect(
      readJson(tree, 'tsconfig.base.json').compilerOptions.paths[
        '@ndop/primitives/radio-group'
      ],
    ).toEqual([`./${root}/radio-group/src/index.ts`]);
    expect(tree.exists(`${root}/radio-group/ng-package.json`)).toBe(true);
    expect(tree.read(`${root}/radio-group/src/index.ts`, 'utf-8')).toBe(
      "export * from './radio-group';\n",
    );
  });

  it('writes the contract, directive, test and README', async () => {
    await primitiveGenerator(tree, { name: 'radio-group', skipFormat: true });

    expect(tree.exists(`${root}/radio-group/spec.md`)).toBe(true);
    expect(tree.exists(`${root}/radio-group/src/radio-group.spec.ts`)).toBe(
      true,
    );
    const directive = tree.read(
      `${root}/radio-group/src/radio-group.ts`,
      'utf-8',
    );
    expect(directive).toContain("selector: '[ndRadioGroup]'");
    expect(directive).toContain('export class NdRadioGroup {}');
    expect(tree.read(`${root}/radio-group/README.md`, 'utf-8')).toContain(
      "import { NdRadioGroup } from '@ndop/primitives/radio-group';",
    );
  });

  it('keeps the library tsconfig patterns flat across several primitives', async () => {
    await primitiveGenerator(tree, { name: 'dialog', skipFormat: true });
    await primitiveGenerator(tree, { name: 'tooltip', skipFormat: true });

    const lib = readJson(tree, `${root}/tsconfig.lib.json`);
    expect(lib.include).toEqual(['src/**/*.ts', '*/src/**/*.ts']);
    expect(lib.exclude).toEqual(['**/*.spec.ts', '**/*.test.ts']);
  });

  it('leaves the root entry point alone', async () => {
    await primitiveGenerator(tree, { name: 'dialog', skipFormat: true });

    expect(tree.read(`${root}/src/index.ts`, 'utf-8')).toBe('export {};\n');
  });

  it('links the WAI-ARIA pattern when one is given', async () => {
    await primitiveGenerator(tree, {
      name: 'dialog',
      pattern: 'dialog-modal',
      skipFormat: true,
    });

    expect(tree.read(`${root}/dialog/spec.md`, 'utf-8')).toContain(
      'https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/',
    );
  });

  it('declares the Angular peer range and keeps an existing one', async () => {
    await primitiveGenerator(tree, { name: 'dialog', skipFormat: true });
    expect(readJson(tree, `${root}/package.json`).peerDependencies).toEqual({
      '@angular/core': '^21.0.0 || ^22.0.0',
    });

    writeJson(tree, `${root}/package.json`, {
      name: '@ndop/primitives',
      peerDependencies: { '@angular/core': '^22.0.0' },
    });
    await primitiveGenerator(tree, { name: 'tooltip', skipFormat: true });
    expect(readJson(tree, `${root}/package.json`).peerDependencies).toEqual({
      '@angular/core': '^22.0.0',
    });
  });

  it('refuses to overwrite an existing primitive', async () => {
    await primitiveGenerator(tree, { name: 'dialog', skipFormat: true });

    await expect(
      primitiveGenerator(tree, { name: 'dialog', skipFormat: true }),
    ).rejects.toThrow('already exists');
  });
});
