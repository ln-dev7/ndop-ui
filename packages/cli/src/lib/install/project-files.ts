import { posix } from 'node:path';
import {
  schemas,
  validate,
  type NdopConfig,
  type NdopLock,
} from '@ndop/schema';
import { parseJsonc } from '../edit/json';
import { relativeSpecifier } from '../edit/typescript';
import { CliError } from '../errors';

/** The project configuration file. */
export const CONFIG_FILE = 'ndop.json';

/** The lockfile recording installed items (RFC-0001, "Lockfile"). */
export const LOCK_FILE = 'ndop.lock.json';

/**
 * Reads something that can read project files: a project file system or a
 * plan builder, which also sees staged changes.
 */
interface Reader {
  read(path: string): Promise<string | undefined>;
}

/**
 * Reads and validates `ndop.json`.
 *
 * @param reader - Project reader.
 * @returns The configuration, or `undefined` when the file doesn't exist.
 * @throws {@link CliError} when it is invalid.
 */
export async function readConfig(
  reader: Reader,
): Promise<NdopConfig | undefined> {
  const text = await reader.read(CONFIG_FILE);
  if (text === undefined) {
    return undefined;
  }
  const checked = validate('config', parseJsonc(text, CONFIG_FILE));
  if (!checked.valid) {
    const [first] = checked.issues;
    throw new CliError(
      `${CONFIG_FILE} is invalid: ${first?.path || '/'} ${first?.message}.`,
      CONFIG_FILE,
    );
  }
  return checked.value;
}

/**
 * Reads and validates `ndop.lock.json`.
 *
 * @param reader - Project reader.
 * @returns The lockfile; an empty one when the file doesn't exist.
 * @throws {@link CliError} when it is invalid.
 */
export async function readLock(reader: Reader): Promise<NdopLock> {
  const text = await reader.read(LOCK_FILE);
  if (text === undefined) {
    return { $schema: schemas.lock.$id, lockfileVersion: 1, items: {} };
  }
  const checked = validate('lock', JSON.parse(text));
  if (!checked.valid) {
    throw new CliError(`${LOCK_FILE} is invalid.`, LOCK_FILE);
  }
  return checked.value;
}

/**
 * Serializes the lockfile with items and agent files sorted by key, so its
 * diffs stay small and stable.
 *
 * @param lock - The lockfile.
 * @returns File text.
 */
export function serializeLock(lock: NdopLock): string {
  const items = Object.fromEntries(
    Object.keys(lock.items)
      .sort()
      .map((key) => [key, lock.items[key]]),
  );
  const agentFiles = lock.agentFiles
    ? {
        agentFiles: Object.fromEntries(
          Object.keys(lock.agentFiles)
            .sort()
            .map((key) => [key, lock.agentFiles?.[key]]),
        ),
      }
    : {};
  return `${JSON.stringify({ ...lock, items, ...agentFiles }, null, 2)}\n`;
}

/**
 * The project folder the import alias points at, read from the
 * `compilerOptions.paths` of `tsconfig.json`, such as `src/app` for
 * `"@/*": ["./src/app/*"]`.
 *
 * @param reader - Project reader.
 * @param importAlias - The alias, such as `@/`.
 * @returns The folder, or `undefined` when the alias isn't mapped.
 */
export async function readAliasBase(
  reader: Reader,
  importAlias: string,
): Promise<string | undefined> {
  const text = await reader.read('tsconfig.json');
  if (text === undefined) {
    return undefined;
  }
  const tsconfig = parseJsonc<{
    compilerOptions?: { paths?: Record<string, string[]>; baseUrl?: string };
  }>(text, 'tsconfig.json');
  const [target] =
    tsconfig.compilerOptions?.paths?.[`${aliasPrefix(importAlias)}*`] ?? [];
  if (!target?.endsWith('/*')) {
    return undefined;
  }
  return posix.normalize(
    posix.join(tsconfig.compilerOptions?.baseUrl ?? '.', target.slice(0, -2)),
  );
}

/**
 * The alias with a trailing slash, as used in specifiers.
 *
 * @param importAlias - Such as `@/` or `@`.
 * @returns Such as `@/`.
 */
export function aliasPrefix(importAlias: string): string {
  return importAlias.endsWith('/') ? importAlias : `${importAlias}/`;
}

/**
 * How installed files are placed and import each other.
 */
export interface InstallContext {
  /** The project's `ndop.json`. */
  config: NdopConfig;
  /** Folder the import alias points at, when it is mapped. */
  aliasBase: string | undefined;
}

/**
 * Resolves an item file's target to a project path.
 *
 * @param config - The project's `ndop.json`.
 * @param target - Such as `{ui}/dialog/dialog.ts`.
 * @returns Such as `src/app/ui/dialog/dialog.ts`.
 */
export function targetPath(config: NdopConfig, target: string): string {
  return posix.normalize(
    target.replace(
      /^\{(ui|lib|blocks)\}/,
      (_match, alias: 'ui' | 'lib' | 'blocks') => config.aliases[alias],
    ),
  );
}

/**
 * The specifier a file uses to import another project file: through the
 * import alias when the alias covers it, otherwise relative.
 *
 * @param context - Install context.
 * @param from - Project path of the importing file.
 * @param to - Project path of the imported file, without extension.
 * @returns The specifier.
 */
export function projectSpecifier(
  context: InstallContext,
  from: string,
  to: string,
): string {
  const base = context.aliasBase;
  if (base !== undefined && (base === '.' || to.startsWith(`${base}/`))) {
    return `${aliasPrefix(context.config.importAlias ?? '@/')}${posix.relative(base, to)}`;
  }
  return relativeSpecifier(from, `${to}.ts`);
}
