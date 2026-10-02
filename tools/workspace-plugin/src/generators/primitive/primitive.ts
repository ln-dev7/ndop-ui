import { librarySecondaryEntryPointGenerator } from '@nx/angular/generators';
import {
  formatFiles,
  generateFiles,
  joinPathFragments,
  names,
  OverwriteStrategy,
  readJson,
  readProjectConfiguration,
  type Tree,
  updateJson,
} from '@nx/devkit';
import * as path from 'path';
import type { PrimitiveGeneratorSchema } from './schema';

/**
 * Angular peer range for published packages: the current major and the one
 * before it, per ADR-0001.
 */
const ANGULAR_PEER_RANGE = '^21.0.0 || ^22.0.0';

/**
 * Library tsconfig patterns that cover the root and every secondary entry
 * point, so adding a primitive never needs a new pattern.
 */
const LIB_INCLUDE = ['src/**/*.ts', '*/src/**/*.ts'];
const LIB_EXCLUDE = ['**/*.spec.ts', '**/*.test.ts'];

/**
 * Scaffolds a headless primitive as its own secondary entry point,
 * `@ndop/primitives/<name>` (ADR-0004), so every primitive starts with the
 * same shape:
 *
 * - `<name>/spec.md`: the accessibility contract, written before code;
 * - `<name>/src/<name>.ts`: an `Nd<Name>` directive with selector
 *   `[nd<Name>]`, and its test;
 * - `<name>/ng-package.json`, the tsconfig path and lib include, via
 *   `@nx/angular:library-secondary-entry-point`;
 * - an `@angular/core` peer on the hosting package.
 *
 * @param tree - Virtual file system the generator writes to.
 * @param options - Generator options; see `schema.json`.
 * @returns Resolves once files are written and formatted.
 * @throws If the primitive's folder already exists.
 *
 * @example
 * ```bash
 * nx g @ndop/workspace-plugin:primitive dialog --pattern=dialog-modal
 * ```
 */
export async function primitiveGenerator(
  tree: Tree,
  options: PrimitiveGeneratorSchema,
): Promise<void> {
  const projectName = options.project ?? 'primitives';
  const project = readProjectConfiguration(tree, projectName);
  const n = names(options.name);
  const folder = joinPathFragments(project.root, n.fileName);

  if (tree.exists(folder)) {
    throw new Error(`Primitive "${n.fileName}" already exists at ${folder}.`);
  }

  await librarySecondaryEntryPointGenerator(tree, {
    library: projectName,
    name: n.fileName,
    skipModule: true,
    skipFormat: true,
  });

  normalizeLibTsconfig(tree, project.root);

  const packageName = readJson<{ name: string }>(
    tree,
    joinPathFragments(project.root, 'package.json'),
  ).name;

  // Overwrite: the Nx generator writes a placeholder index.ts and README.
  generateFiles(
    tree,
    path.join(__dirname, 'files'),
    folder,
    {
      ...n,
      pattern: options.pattern ?? '',
      importPath: `${packageName}/${n.fileName}`,
    },
    { overwriteStrategy: OverwriteStrategy.Overwrite },
  );

  addAngularPeer(tree, project.root);

  if (!options.skipFormat) {
    await formatFiles(tree);
  }
}

/**
 * Resets the library's `tsconfig.lib.json` include and exclude lists to
 * wildcard patterns. `@nx/angular:library-secondary-entry-point` prefixes
 * every existing pattern with the new entry point's name, so each additional
 * primitive would otherwise nest the previous ones
 * (`popover/label/separator/src/**`).
 *
 * @param tree - Virtual file system the generator writes to.
 * @param projectRoot - Root folder of the hosting project.
 */
function normalizeLibTsconfig(tree: Tree, projectRoot: string): void {
  const tsconfig = joinPathFragments(projectRoot, 'tsconfig.lib.json');
  if (!tree.exists(tsconfig)) {
    return;
  }
  updateJson(tree, tsconfig, (json) => ({
    ...json,
    include: LIB_INCLUDE,
    exclude: LIB_EXCLUDE,
  }));
}

/**
 * Declares `@angular/core` as a peer of the hosting package, since the
 * generated directive imports it. An existing range is left alone.
 *
 * @param tree - Virtual file system the generator writes to.
 * @param projectRoot - Root folder of the hosting project.
 */
function addAngularPeer(tree: Tree, projectRoot: string): void {
  updateJson(tree, joinPathFragments(projectRoot, 'package.json'), (json) => {
    json.peerDependencies ??= {};
    json.peerDependencies['@angular/core'] ??= ANGULAR_PEER_RANGE;
    return json;
  });
}

export default primitiveGenerator;
