import { posix } from 'node:path';
import type { RegistryItem } from '@ndop/schema';
import { rewriteSpecifiers } from '../edit/typescript';
import {
  projectSpecifier,
  targetPath,
  type InstallContext,
} from './project-files';

/** One registry file of an item, as the item schema describes it. */
export type RegistryFile = NonNullable<RegistryItem['files']>[number];

/** A registry file as `ndop add` writes it into this project. */
export interface PristineFile {
  /** Project-relative path it's written to. */
  path: string;
  /** The registry file it comes from. */
  source: RegistryFile;
  /** The text `ndop add` writes. */
  content: string;
}

/**
 * Formats a file's text the way the project formats written files.
 */
export type FormatText = (path: string, content: string) => Promise<string>;

/**
 * The pristine text of a registry file: what `ndop add` writes for it in
 * this project, with `@/` imports rewritten to the project's aliases and
 * the project's formatting applied (ADR-0010). Its hash is what the
 * lockfile records, and `diff` and `update` rebuild it for any version to
 * get the file the user started from.
 *
 * @param context - Where files go and how they import each other.
 * @param format - The project's formatter.
 * @param file - A registry file, with its content.
 * @returns Where it goes and its text.
 *
 * @example
 * ```ts
 * const { path, content } = await pristineFile(context, builder.formatted.bind(builder), item.files[0]);
 * ```
 */
export async function pristineFile(
  context: InstallContext,
  format: FormatText,
  file: RegistryFile,
): Promise<PristineFile> {
  const path = targetPath(context.config, file.target);
  const content = path.endsWith('.ts')
    ? rewriteRegistryImports(context, path, file.content ?? '')
    : (file.content ?? '');
  return { path, source: file, content: await format(path, content) };
}

/**
 * Every file of an item, pristine, keyed by project path.
 *
 * @param context - Where files go and how they import each other.
 * @param format - The project's formatter.
 * @param item - A fetched item, with file contents.
 * @returns Its files by project path, in the item's order.
 */
export async function pristineFiles(
  context: InstallContext,
  format: FormatText,
  item: RegistryItem,
): Promise<Map<string, PristineFile>> {
  const files = new Map<string, PristineFile>();
  for (const file of item.files ?? []) {
    const pristine = await pristineFile(context, format, file);
    files.set(pristine.path, pristine);
  }
  return files;
}

/**
 * Points an item file's `@/ui/…`, `@/lib/…` and `@/blocks/…` imports at
 * where the project's aliases put those files (ADR-0012). With the default
 * aliases nothing changes.
 *
 * @param context - Install context.
 * @param path - Project path the file is installed to.
 * @param content - File text from the registry.
 * @returns The text with specifiers rewritten.
 */
function rewriteRegistryImports(
  context: InstallContext,
  path: string,
  content: string,
): string {
  return rewriteSpecifiers(path, content, (specifier) => {
    const match = /^@\/(ui|lib|blocks)\/(.+)$/.exec(specifier);
    if (!match) {
      return undefined;
    }
    const [, alias = 'ui', rest = ''] = match;
    return projectSpecifier(
      context,
      path,
      posix.join(
        context.config.aliases[alias as 'ui' | 'lib' | 'blocks'],
        rest,
      ),
    );
  });
}
