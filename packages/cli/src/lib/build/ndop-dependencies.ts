import { DEFAULT_COMPAT_BASE_URL, type RegistryItem } from '@ndop/schema';
import { CliError } from '../errors';
import {
  DEFAULT_NAMESPACE,
  defaultFetcher,
  itemKey,
  parseRef,
  RegistryClient,
  registrySources,
  resolveItems,
  type Fetcher,
} from '../registry/client';
import type { BuildIssue } from './types';

/** How `@ndop/<name>` registry dependencies are written. */
const NDOP_PREFIX = `${DEFAULT_NAMESPACE}/`;

/**
 * Whether a `registryDependencies` entry is an item of Ndop's registry,
 * whose files the depending item may import in code (ADR-0025).
 *
 * @param dependency - The entry.
 * @returns Whether it is `@ndop/<name>`.
 */
export function isNdopDependency(dependency: string): boolean {
  return dependency.startsWith(NDOP_PREFIX);
}

/** Where {@link fetchNdopDependencies} fetches from. */
export interface NdopSourceOptions {
  /** Registry root; relative paths resolve from it. */
  root: string;
  /** The default registry's URL or path template, overriding the rest. */
  registry?: string;
  /** Environment variables, for `NDOP_REGISTRY`. */
  env?: Record<string, string | undefined>;
  /** Reads items; fetches URLs and reads paths by default. */
  fetcher?: Fetcher;
}

/**
 * The default registry's URL or path template, chosen as `ndop add`
 * chooses it: the option, then `NDOP_REGISTRY`, then ndop.dev.
 *
 * @param options - The build's option and environment.
 * @returns The template, with `{name}`.
 */
export function ndopRegistryUrl(
  options: Pick<NdopSourceOptions, 'registry' | 'env'>,
): string {
  const sources = registrySources(
    undefined,
    options.registry,
    options.env ?? process.env,
  );
  return sources[DEFAULT_NAMESPACE]?.url ?? '';
}

/**
 * Fetches every item's `@ndop/<name>` registry dependencies from the
 * default registry, with their own dependencies, transitively, so the
 * build can check and compile imports of their files (ADR-0025).
 *
 * @param built - Built items.
 * @param options - Where Ndop's registry is.
 * @param issues - Receives one issue per item whose dependencies can't be
 *   fetched.
 * @returns The fetched items, by `@ndop/<name>`.
 */
export async function fetchNdopDependencies(
  built: readonly RegistryItem[],
  options: NdopSourceOptions,
  issues: BuildIssue[],
): Promise<Map<string, RegistryItem>> {
  const fetched = new Map<string, RegistryItem>();
  const wanted = built.filter((item) =>
    (item.registryDependencies ?? []).some(isNdopDependency),
  );
  if (wanted.length === 0) {
    return fetched;
  }
  const client = new RegistryClient(
    registrySources(undefined, options.registry, options.env ?? process.env),
    options.fetcher ?? defaultFetcher(options.root),
  );
  for (const item of wanted) {
    const refs = (item.registryDependencies ?? [])
      .filter(isNdopDependency)
      .map((dependency) => parseRef(dependency));
    try {
      for (const { ref, item: dependency } of await resolveItems(
        client,
        refs,
      )) {
        fetched.set(itemKey(ref), dependency);
      }
    } catch (error) {
      if (!(error instanceof CliError)) throw error;
      issues.push({
        item: item.name,
        message: `Can't fetch its @ndop registryDependencies from ${ndopRegistryUrl(options)}: ${error.message}`,
      });
    }
  }
  return fetched;
}

/**
 * Where Ndop's shadcn-compatible items are served, derived from the
 * default registry's URL: `…/{name}.json` becomes `…/compat/`. A path or
 * any other template falls back to ndop.dev's, since compat output is
 * for publishing.
 *
 * @param registryUrl - The default registry's template.
 * @returns The compat base URL, ending in `/`.
 *
 * @example
 * ```ts
 * ndopCompatBaseUrl('https://mirror.dev/r/{name}.json'); // 'https://mirror.dev/r/compat/'
 * ```
 */
export function ndopCompatBaseUrl(registryUrl: string): string {
  return /^https?:\/\//.test(registryUrl) && registryUrl.endsWith('{name}.json')
    ? `${registryUrl.slice(0, -'{name}.json'.length)}compat/`
    : DEFAULT_COMPAT_BASE_URL;
}
