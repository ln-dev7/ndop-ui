import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import {
  Catalog,
  DEFAULT_NAMESPACE,
  defaultFetcher,
  registrySources,
  type Fetcher,
} from '@ndop/cli/api';
import type { NdopConfig } from '@ndop/schema';

/** Options of {@link catalogFor}. */
export interface CatalogOptions {
  /** Where the server runs; `ndop.json` is looked for here and above. */
  cwd: string;
  /** The `--registry` option, which wins over everything else. */
  registry?: string;
  /** Environment variables, for `NDOP_REGISTRY` and registry headers. */
  env?: Record<string, string | undefined>;
  /** Reads a location's text; the CLI's fetcher by default. */
  fetcher?: Fetcher;
}

/**
 * The registry the CLI would use in a folder (ADR-0009, ADR-0012): the
 * `--registry` option, then `NDOP_REGISTRY`, then the `registry` field of the
 * nearest `ndop.json`, then ndop.dev. Relative paths resolve from the
 * project, as in the CLI.
 *
 * @param options - Folder, override, environment and fetcher.
 * @returns The catalog.
 */
export async function catalogFor(options: CatalogOptions): Promise<Catalog> {
  const config = await nearestConfig(resolve(options.cwd));
  const sources = registrySources(
    config?.config,
    options.registry,
    options.env ?? process.env,
  );
  const source = sources[DEFAULT_NAMESPACE];
  if (!source) throw new Error('No default registry.');
  return new Catalog(
    source,
    options.fetcher ?? defaultFetcher(config?.root ?? resolve(options.cwd)),
  );
}

/**
 * The nearest `ndop.json`, in a folder or above it.
 *
 * @param folder - Absolute folder to start from.
 * @returns The project's root and config, or nothing outside a project.
 */
async function nearestConfig(
  folder: string,
): Promise<{ root: string; config: NdopConfig } | undefined> {
  for (let current = folder; ; current = dirname(current)) {
    const text = await readFile(join(current, 'ndop.json'), 'utf-8').catch(
      () => undefined,
    );
    if (text !== undefined) {
      return { root: current, config: JSON.parse(text) as NdopConfig };
    }
    if (dirname(current) === current) return undefined;
  }
}
