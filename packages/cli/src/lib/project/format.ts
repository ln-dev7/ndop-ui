import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Formats a file's text before it is planned, so diffs, idempotency checks
 * and lockfile hashes all see exactly what will be written.
 */
export type Formatter = (path: string, content: string) => Promise<string>;

/**
 * Leaves text unchanged; used when the project has no Prettier.
 *
 * @param _path - Ignored.
 * @param content - Text to return.
 * @returns The same text.
 */
export const noFormat: Formatter = async (_path, content) => content;

/**
 * The parts of Prettier's API the CLI uses.
 */
interface PrettierApi {
  format(source: string, options: Record<string, unknown>): Promise<string>;
  resolveConfig(file: string): Promise<Record<string, unknown> | null>;
  getFileInfo(
    file: string,
    options: { ignorePath: string },
  ): Promise<{ ignored: boolean; inferredParser: string | null }>;
}

/**
 * Loads a module the project has installed, by its resolved path.
 */
export type ImportModule = (path: string) => Promise<unknown>;

/**
 * Loads a module with `import()`, as the published, ESM CLI does.
 *
 * @param path - Absolute path to the module's entry.
 * @returns The module namespace.
 */
export const importModule: ImportModule = (path) =>
  import(pathToFileURL(path).href);

/**
 * A formatter using the project's own Prettier and configuration
 * (RFC-0001: "Format written files with the project's Prettier config if
 * one exists"). Files Prettier ignores or can't parse are left unchanged.
 *
 * @param root - Absolute project root.
 * @param load - Loads Prettier once it's found; `import()` by default.
 * @returns The formatter, or {@link noFormat} when Prettier isn't
 *   installed in the project.
 */
export async function projectFormatter(
  root: string,
  load: ImportModule = importModule,
): Promise<Formatter> {
  let prettier: PrettierApi;
  try {
    const entry = createRequire(join(root, 'package.json')).resolve('prettier');
    // require.resolve finds Prettier's CommonJS entry, whose API an ESM
    // import exposes only as the default export.
    const loaded = (await load(entry)) as PrettierApi & {
      default?: PrettierApi;
    };
    prettier = loaded.default ?? loaded;
  } catch {
    return noFormat;
  }
  return async (path, content) => {
    const file = join(root, path);
    const info = await prettier.getFileInfo(file, {
      ignorePath: join(root, '.prettierignore'),
    });
    if (info.ignored || !info.inferredParser) {
      return content;
    }
    const config = (await prettier.resolveConfig(file)) ?? {};
    return prettier.format(content, { ...config, filepath: file });
  };
}
