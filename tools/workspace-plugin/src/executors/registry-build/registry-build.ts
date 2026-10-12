import { join } from 'node:path';
import { logger, type PromiseExecutor } from '@nx/devkit';
import { buildRegistry, formatBuildResult } from '@ndop/cli';
import type { RegistryBuildExecutorSchema } from './schema';

/**
 * Builds an Ndop registry the way `ndop build` does, so Ndop's own registry
 * builds through Nx with caching (RFC-0001, Nx-first workflow). Paths are
 * relative to the workspace root; the registry root defaults to the
 * project's root.
 *
 * @param options - Executor options from `project.json`.
 * @param context - Nx executor context.
 * @returns Whether the build passed.
 *
 * @example
 * ```json
 * "build": {
 *   "executor": "@ndop/workspace-plugin:registry-build",
 *   "options": { "outputPath": "dist/registry" }
 * }
 * ```
 */
const registryBuild: PromiseExecutor<RegistryBuildExecutorSchema> = async (
  options,
  context,
) => {
  const projectRoot = context.projectName
    ? context.projectsConfigurations.projects[context.projectName]?.root
    : undefined;
  const registryRoot = options.registryRoot ?? projectRoot;
  if (registryRoot === undefined) {
    logger.error('registry-build needs registryRoot outside a project.');
    return { success: false };
  }
  const result = await buildRegistry({
    root: join(context.root, registryRoot),
    output: join(context.root, options.outputPath),
    ...(options.frozenSnapshots === undefined
      ? {}
      : { frozenSnapshots: options.frozenSnapshots }),
    ...(options.compile === undefined ? {} : { compile: options.compile }),
    ...(options.metadata === undefined ? {} : { metadata: options.metadata }),
    ...(options.tsconfig
      ? { tsconfig: join(context.root, options.tsconfig) }
      : {}),
    ...(options.compat ? { compat: options.compat } : {}),
    ...(options.compatBaseUrl ? { compatBaseUrl: options.compatBaseUrl } : {}),
    ...(options.registry
      ? {
          registry: /^[a-z][a-z0-9+.-]*:/i.test(options.registry)
            ? options.registry
            : join(context.root, options.registry),
        }
      : {}),
  });
  const text = formatBuildResult(result, false).trimEnd();
  if (result.ok) {
    logger.info(text);
  } else {
    logger.error(text);
  }
  return { success: result.ok };
};

export default registryBuild;
