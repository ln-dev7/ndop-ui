import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { logger, type PromiseExecutor } from '@nx/devkit';
import {
  extractPrimitiveMetadata,
  type PrimitiveMetadata,
} from '@ndop/metadata';
import type { PrimitivesApiExecutorSchema } from './schema';

/** One primitive in `index.json`. */
export interface PrimitiveSummary {
  /** Folder name, such as `dialog`. */
  name: string;
  /** Display name, from `spec.md`'s heading. */
  title: string;
  /** One sentence. */
  description: string;
}

/** A primitive's reference, as `<name>.json` holds it. */
export type PrimitiveReference = PrimitiveMetadata & PrimitiveSummary;

/**
 * Extracts every headless primitive's API reference with
 * `@ndop/metadata`, merged with its `spec.md`, and writes
 * `<outputPath>/index.json` and `<outputPath>/<name>.json` for the docs'
 * Primitives section (ADR-0016, amendment 12). A primitive is a folder
 * with `spec.md` and `src/index.ts`.
 *
 * @param options - Executor options from `project.json`.
 * @param context - Nx executor context.
 * @returns Whether every primitive was extracted.
 *
 * @example
 * ```json
 * "api": { "executor": "@ndop/workspace-plugin:primitives-api" }
 * ```
 */
const primitivesApi: PromiseExecutor<PrimitivesApiExecutorSchema> = async (
  options,
  context,
) => {
  const root = join(
    context.root,
    options.primitivesRoot ?? 'packages/primitives',
  );
  const prefix = options.importPrefix ?? '@ndop/primitives';
  const output = join(
    context.root,
    options.outputPath ?? 'dist/primitives-api',
  );
  const names = readdirSync(root, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(join(root, entry.name, 'spec.md')) &&
        existsSync(join(root, entry.name, 'src/index.ts')),
    )
    .map((entry) => entry.name)
    .sort();

  const references = extractPrimitiveMetadata({
    root: context.root,
    tsconfig: join(
      context.root,
      options.tsconfig ?? 'packages/primitives/tsconfig.lib.json',
    ),
    primitives: names.map((name) => ({
      name,
      importPath: `${prefix}/${name}`,
      entry: join(root, name, 'src/index.ts'),
    })),
  });
  if (!references) {
    logger.error(
      '@angular/compiler-cli was not found, so nothing was extracted.',
    );
    return { success: false };
  }

  mkdirSync(output, { recursive: true });
  const summaries = references.map((reference) =>
    summaryOf(
      reference,
      readFileSync(join(root, reference.name, 'spec.md'), 'utf-8'),
    ),
  );
  references.forEach((reference, index) => {
    writeFileSync(
      join(output, `${reference.name}.json`),
      `${JSON.stringify({ ...reference, ...summaries[index] }, null, 2)}\n`,
    );
  });
  writeFileSync(
    join(output, 'index.json'),
    `${JSON.stringify(summaries, null, 2)}\n`,
  );
  logger.info(`Extracted ${references.length} primitives to ${output}.`);
  return { success: true };
};

/**
 * A primitive's title and description, from its `spec.md` heading
 * (`# Dialog: accessibility contract`) and its pattern.
 *
 * @param reference - The extracted reference.
 * @param spec - Its `spec.md`.
 * @returns Its summary.
 */
export function summaryOf(
  reference: PrimitiveMetadata,
  spec: string,
): PrimitiveSummary {
  const title = spec.match(/^#\s+([^:\n]+)/m)?.[1]?.trim() ?? reference.name;
  const pattern = reference.pattern
    ? `the WAI-ARIA ${reference.pattern.name} pattern`
    : 'its pattern';
  return {
    name: reference.name,
    title,
    description: `Headless ${title}: the behavior, keyboard support and ARIA of ${pattern}, with no styles.`,
  };
}

export default primitivesApi;
