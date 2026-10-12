import { posix } from 'node:path';
import {
  COMPAT_ALIASES,
  compatDependencyUrl,
  DEFAULT_COMPAT_BASE_URL,
  SHADCN_COMPAT_TYPES,
  toShadcnItem,
  type RegistryItem,
} from '@ndop/schema';
import { relativeSpecifier, rewriteSpecifiers } from '../edit/typescript';
import { isNdopDependency } from './ndop-dependencies';
import type { BuildIssue } from './types';

/**
 * Points a file's `@/ui/…`, `@/lib/…` and `@/blocks/…` imports at the
 * imported files by relative path, both at Ndop's default aliases, so a
 * file the shadcn CLI copies as it is compiles without the `@/` alias.
 *
 * @param path - Project path the file installs to, such as
 *   `src/app/ui/dialog/dialog.ts`.
 * @param content - Its text.
 * @returns The text with those specifiers rewritten.
 *
 * @example
 * ```ts
 * compatImports('src/app/ui/dialog/dialog.ts', "import { cn } from '@/lib/utils';");
 * // "import { cn } from '../../lib/utils';"
 * ```
 */
export function compatImports(path: string, content: string): string {
  return rewriteSpecifiers(path, content, (specifier) => {
    const match = /^@\/(ui|lib|blocks)\/(.+)$/.exec(specifier);
    if (!match) {
      return undefined;
    }
    const [, alias = 'ui', rest = ''] = match;
    return relativeSpecifier(
      path,
      `${posix.join(COMPAT_ALIASES[alias as keyof typeof COMPAT_ALIASES], rest)}.ts`,
    );
  });
}

/**
 * The base URL compat items are served from, ending in `/`.
 *
 * @param baseUrl - The `--compat-base-url` option.
 * @returns The normalized URL, or `undefined` unless it is absolute
 *   HTTP(S): the shadcn CLI reads a relative dependency as a local file.
 */
export function normalizeCompatBaseUrl(baseUrl: string): string | undefined {
  if (!/^https?:\/\/[^/]/.test(baseUrl)) {
    return undefined;
  }
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
}

/**
 * The shadcn-compatible files of a build (ADR-0025): `r/compat/<name>.json`
 * for every `registry:ui`, `registry:block`, `registry:lib` and
 * `registry:theme` item, as universal items (see `toShadcnItem`).
 *
 * An item fails the build when one of its `registryDependencies` is
 * neither an item of this registry with compat output nor `@ndop/<name>`,
 * since nothing would serve it. `@ndop/<name>` points at Ndop's compat
 * item, and imports of its files are made relative like the registry's
 * own, at the same default aliases (ADR-0025).
 *
 * @param built - Built items, with file contents.
 * @param baseUrl - Normalized URL the compat items are served from.
 * @param issues - Receives problems.
 * @param ndopBaseUrl - Where Ndop's compat items are served.
 * @returns Each file's JSON, by output-relative path.
 */
export function compatOutputs(
  built: readonly RegistryItem[],
  baseUrl: string,
  issues: BuildIssue[],
  ndopBaseUrl: string = DEFAULT_COMPAT_BASE_URL,
): Map<string, Record<string, unknown>> {
  const emitted = built.filter((item) =>
    SHADCN_COMPAT_TYPES.includes(item.type),
  );
  const names = new Set(emitted.map((item) => item.name));
  const outputs = new Map<string, Record<string, unknown>>();
  for (const item of emitted) {
    for (const dependency of item.registryDependencies ?? []) {
      const ndop = isNdopDependency(dependency);
      if (
        compatDependencyUrl(dependency, baseUrl, ndopBaseUrl) === undefined ||
        (!ndop && !names.has(dependency))
      ) {
        issues.push({
          item: item.name,
          message: `registryDependencies lists "${dependency}", which has no shadcn-compatible item: only items of this registry and @ndop/<name> have one.`,
        });
      }
    }
    outputs.set(
      `r/compat/${item.name}.json`,
      toShadcnItem(item, {
        baseUrl,
        ndopBaseUrl,
        rewriteImports: compatImports,
      }),
    );
  }
  return outputs;
}
