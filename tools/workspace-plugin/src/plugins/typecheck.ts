import {
  createNodesFromFiles,
  type CreateNodes,
  type CreateNodesContext,
  type CreateNodesResult,
  type TargetConfiguration,
} from '@nx/devkit';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { dirname, join } from 'path';

/**
 * Options for the `typecheck` inferred target, set on the plugin entry in
 * `nx.json`.
 */
export interface TypecheckPluginOptions {
  /** Name of the inferred target. Defaults to `typecheck`. */
  targetName?: string;
}

/**
 * Tsconfig files that never describe sources to check: the editor-only
 * config Analog generates and ng-packagr's production overlay of the lib
 * config.
 */
const SKIPPED_TSCONFIGS = new Set([
  'tsconfig.editor.json',
  'tsconfig.lib.prod.json',
]);

/**
 * Infers a cached `typecheck` target for every project with a
 * `project.json`. It runs `ngc --noEmit` for Angular projects, so templates
 * are checked too, and `tsc --noEmit` otherwise, once per
 * `tsconfig.<kind>.json` so tests are checked as well as sources.
 *
 * Nx's own TypeScript plugin infers this only for workspaces built on
 * TypeScript project references; this workspace uses path aliases (see
 * ADR-0001), so Ndop infers the target itself.
 *
 * @example
 * ```json
 * { "plugins": [{ "plugin": "@ndop/workspace-plugin", "options": { "targetName": "typecheck" } }] }
 * ```
 */
export const createNodes: CreateNodes<TypecheckPluginOptions> = [
  '**/project.json',
  createTypecheckNodes,
];

/**
 * Runs {@link inferTypecheck} for each matched `project.json`.
 *
 * @param configFiles - Workspace-relative paths of matched `project.json` files.
 * @param options - Plugin options from `nx.json`.
 * @param context - Nx context; only `workspaceRoot` is used.
 * @returns One result per config file.
 */
function createTypecheckNodes(
  configFiles: readonly string[],
  options: TypecheckPluginOptions | undefined,
  context: CreateNodesContext,
) {
  return createNodesFromFiles(
    (configFile) =>
      inferTypecheck(configFile, options ?? {}, context.workspaceRoot),
    configFiles,
    options ?? {},
    context,
  );
}

/**
 * Builds the `typecheck` target for the project owning `configFile`.
 *
 * @param configFile - Workspace-relative path to a `project.json`.
 * @param options - Plugin options.
 * @param workspaceRoot - Absolute path of the workspace.
 * @returns The inferred project fragment, or nothing for the root project
 *   and projects without a tsconfig.
 */
function inferTypecheck(
  configFile: string,
  options: TypecheckPluginOptions,
  workspaceRoot: string,
): CreateNodesResult {
  const projectRoot = dirname(configFile);
  if (projectRoot === '.') {
    return {};
  }

  const absoluteRoot = join(workspaceRoot, projectRoot);
  const tsconfigs = findTsconfigs(absoluteRoot);
  if (tsconfigs.length === 0) {
    return {};
  }

  const angular = isAngularProject(absoluteRoot);
  const compiler = angular ? 'ngc' : 'tsc';
  const target: TargetConfiguration = {
    command: tsconfigs
      .map((file) => `${compiler} -p ${projectRoot}/${file} --noEmit`)
      .join(' && '),
    cache: true,
    inputs: [
      'default',
      '^production',
      {
        externalDependencies: angular
          ? ['typescript', '@angular/compiler-cli']
          : ['typescript'],
      },
    ],
    outputs: [],
    metadata: {
      description: `Type-check sources and tests with ${compiler}.`,
      technologies: ['typescript'],
    },
  };

  return {
    projects: {
      [projectRoot]: {
        targets: { [options.targetName ?? 'typecheck']: target },
      },
    },
  };
}

/**
 * Lists the tsconfigs to check in a project folder: every
 * `tsconfig.<kind>.json`, or `tsconfig.json` alone when it is the only one
 * (as in e2e projects).
 *
 * @param absoluteRoot - Absolute path of the project folder.
 * @returns File names, sorted for a stable command.
 */
function findTsconfigs(absoluteRoot: string): string[] {
  const all = readdirSync(absoluteRoot).filter((file) =>
    /^tsconfig(\..+)?\.json$/.test(file),
  );
  const kinds = all
    .filter((file) => file !== 'tsconfig.json' && !SKIPPED_TSCONFIGS.has(file))
    .sort();
  if (kinds.length > 0) {
    return kinds;
  }
  return all.includes('tsconfig.json') ? ['tsconfig.json'] : [];
}

/**
 * Detects an Angular project by `angularCompilerOptions` in its root
 * tsconfig, which is where the Nx Angular and Analog generators put them.
 *
 * @param absoluteRoot - Absolute path of the project folder.
 * @returns Whether the project is compiled by the Angular compiler.
 */
function isAngularProject(absoluteRoot: string): boolean {
  const tsconfig = join(absoluteRoot, 'tsconfig.json');
  return (
    existsSync(tsconfig) &&
    readFileSync(tsconfig, 'utf-8').includes('"angularCompilerOptions"')
  );
}
