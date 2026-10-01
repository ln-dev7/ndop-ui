import {
  formatFiles,
  generateFiles,
  joinPathFragments,
  names,
  OverwriteStrategy,
  readProjectConfiguration,
  type Tree,
  updateJson,
} from '@nx/devkit';
import * as path from 'path';
import type { PrimitiveGeneratorSchema } from './schema';

/**
 * Text of the placeholder spec that guards an empty package's public API.
 * It is removed when the first primitive is exported, because from then on
 * the primitive's own tests cover the entry point.
 */
const EMPTY_API_GUARD = "it('exports nothing yet'";

/**
 * Angular peer range for published packages: the current major and the one
 * before it, per ADR-0001.
 */
const ANGULAR_PEER_RANGE = '^21.0.0 || ^22.0.0';

/**
 * Scaffolds a headless primitive so every primitive starts with the same
 * shape: `<name>/spec.md` (the accessibility contract, written before code),
 * `<name>/<name>.ts` (an `Nd<Name>` directive with selector `[nd<Name>]`) and
 * `<name>/<name>.spec.ts`, plus an export from the project's `src/index.ts`.
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
  const project = readProjectConfiguration(
    tree,
    options.project ?? 'primitives',
  );
  const sourceRoot =
    project.sourceRoot ?? joinPathFragments(project.root, 'src');
  const n = names(options.name);
  const folder = joinPathFragments(sourceRoot, n.fileName);

  if (tree.exists(folder)) {
    throw new Error(`Primitive "${n.fileName}" already exists at ${folder}.`);
  }

  generateFiles(
    tree,
    path.join(__dirname, 'files'),
    sourceRoot,
    { ...n, pattern: options.pattern ?? '' },
    { overwriteStrategy: OverwriteStrategy.ThrowIfExisting },
  );

  addExport(tree, sourceRoot, n.fileName);
  addAngularPeer(tree, project.root);

  if (!options.skipFormat) {
    await formatFiles(tree);
  }
}

/**
 * Exports the new primitive from the project's entry point, dropping the
 * empty-package placeholder export and its guard spec on first use.
 *
 * @param tree - Virtual file system the generator writes to.
 * @param sourceRoot - The hosting project's source root.
 * @param fileName - Kebab-case primitive name, used for folder and file.
 */
function addExport(tree: Tree, sourceRoot: string, fileName: string): void {
  const indexPath = joinPathFragments(sourceRoot, 'index.ts');
  const exportLine = `export * from './${fileName}/${fileName}';`;
  const current = tree.read(indexPath, 'utf-8') ?? '';
  if (current.includes(exportLine)) {
    return;
  }
  tree.write(
    indexPath,
    `${current.replace('export {};\n', '')}${exportLine}\n`,
  );

  const guardSpec = joinPathFragments(sourceRoot, 'index.spec.ts');
  if (tree.read(guardSpec, 'utf-8')?.includes(EMPTY_API_GUARD)) {
    tree.delete(guardSpec);
  }
}

/**
 * Declares `@angular/core` as a peer of the hosting package, since the
 * generated directive imports it. An existing range is left alone.
 *
 * @param tree - Virtual file system the generator writes to.
 * @param projectRoot - Root folder of the hosting project.
 */
function addAngularPeer(tree: Tree, projectRoot: string): void {
  const packageJson = joinPathFragments(projectRoot, 'package.json');
  if (!tree.exists(packageJson)) {
    return;
  }
  updateJson(tree, packageJson, (json) => {
    json.peerDependencies ??= {};
    json.peerDependencies['@angular/core'] ??= ANGULAR_PEER_RANGE;
    return json;
  });
}

export default primitiveGenerator;
