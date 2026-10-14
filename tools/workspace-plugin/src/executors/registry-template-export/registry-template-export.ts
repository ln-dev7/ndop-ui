import { resolve } from 'node:path';
import { logger, type PromiseExecutor } from '@nx/devkit';
import type { RegistryTemplateExportExecutorSchema } from './schema';
import { DEFAULT_SOURCE_URL, exportRegistryTemplate } from './template-export';

/**
 * Writes a standalone copy of `tools/registry-template`, ready to be the
 * root of the public `ndop-ui/registry-template` repository (ADR-0025).
 * See {@link exportRegistryTemplate} for what it copies and changes.
 *
 * @param options - Source, output, license and link base.
 * @param context - Nx executor context.
 * @returns Whether the copy was written.
 *
 * @example
 * ```sh
 * pnpm nx run registry-template:export
 * ```
 */
const registryTemplateExport: PromiseExecutor<
  RegistryTemplateExportExecutorSchema
> = async (options, context) => {
  const output = resolve(
    context.root,
    options.outputPath ?? 'dist/registry-template-repo',
  );
  try {
    const files = await exportRegistryTemplate({
      root: context.root,
      source: options.source ?? 'tools/registry-template',
      output,
      license: options.license ?? 'LICENSE',
      sourceUrl: options.sourceUrl ?? DEFAULT_SOURCE_URL,
    });
    logger.info(`Wrote ${files.length} files to ${output}:`);
    for (const file of files) logger.info(`  ${file}`);
    return { success: true };
  } catch (error) {
    logger.error((error as Error).message);
    return { success: false };
  }
};

export default registryTemplateExport;
