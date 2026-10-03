import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate, type NdopConfig, type RegistryItem } from '@ndop/schema';
import { CliError } from '../errors';

/**
 * Ndop's own registry, until a project or command overrides it
 * (ADR-0012).
 */
export const DEFAULT_REGISTRY_URL = 'https://ndop.dev/r/{name}.json';

/**
 * Namespace of the default registry, as recorded in `ndop.lock.json`.
 */
export const DEFAULT_NAMESPACE = '@ndop';

/**
 * Which registry an item comes from, and its name there.
 */
export interface ItemRef {
  /** Registry namespace, such as `@ndop` or `@acme`. */
  registry: string;
  /** Item name. */
  name: string;
}

/**
 * Where one registry's items are fetched from.
 */
export interface RegistrySource {
  /** URL template or local path template containing `{name}`. */
  url: string;
  /** Request headers, with `${VAR}` already expanded. */
  headers?: Record<string, string>;
}

/**
 * Reads the text at a URL or path. Injected so tests needn't serve
 * anything.
 */
export type Fetcher = (
  location: string,
  headers: Record<string, string>,
) => Promise<string>;

/**
 * Parses an item reference from the command line or a
 * `registryDependencies` entry.
 *
 * @param text - `name` or `@namespace/name`.
 * @param registry - Namespace of the item that depends on it, which bare
 *   names resolve in.
 * @returns The reference.
 * @throws {@link CliError} for URLs, which aren't supported yet, and
 *   anything else that isn't a name.
 */
export function parseRef(text: string, registry = DEFAULT_NAMESPACE): ItemRef {
  const scoped =
    /^(@[a-z0-9]+(?:-[a-z0-9]+)*)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(text);
  if (scoped) {
    return { registry: scoped[1] ?? registry, name: scoped[2] ?? text };
  }
  if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(text)) {
    return { registry, name: text };
  }
  if (/^https?:\/\//.test(text)) {
    throw new CliError(
      `Installing items by URL isn't supported yet: ${text}. Add a namespaced registry to ndop.json instead.`,
    );
  }
  throw new CliError(`"${text}" isn't an item name.`);
}

/**
 * The registries a project can install from: the default one, in order of
 * precedence the `--registry` option, the `NDOP_REGISTRY` environment
 * variable, the `registry` field of `ndop.json` and ndop.dev, plus every
 * namespaced registry in `ndop.json`.
 *
 * @param config - The project's `ndop.json`, when there is one.
 * @param override - The `--registry` option.
 * @param env - Environment variables.
 * @returns Sources by namespace.
 * @throws {@link CliError} when a header names an unset variable.
 */
export function registrySources(
  config: Pick<NdopConfig, 'registry' | 'registries'> | undefined,
  override: string | undefined,
  env: Record<string, string | undefined> = process.env,
): Record<string, RegistrySource> {
  const sources: Record<string, RegistrySource> = {
    [DEFAULT_NAMESPACE]: {
      url:
        override ??
        env['NDOP_REGISTRY'] ??
        config?.registry ??
        DEFAULT_REGISTRY_URL,
    },
  };
  for (const [namespace, entry] of Object.entries(config?.registries ?? {})) {
    if (typeof entry === 'string') {
      sources[namespace] = { url: entry };
    } else {
      sources[namespace] = {
        url: entry.url,
        headers: Object.fromEntries(
          Object.entries(entry.headers ?? {}).map(([key, value]) => [
            key,
            value.replace(/\$\{(\w+)\}/g, (_match, name: string) => {
              const expanded = env[name];
              if (expanded === undefined) {
                throw new CliError(
                  `Registry ${namespace} needs the ${name} environment variable.`,
                  'ndop.json',
                );
              }
              return expanded;
            }),
          ]),
        ),
      };
    }
  }
  return sources;
}

/**
 * Fetches http(s) URLs with `fetch`, and reads `file:` URLs and paths from
 * disk, relative paths from `base`.
 *
 * @param base - Folder relative paths resolve from.
 * @returns The fetcher.
 */
export function defaultFetcher(base: string): Fetcher {
  return async (location, headers) => {
    if (/^https?:\/\//.test(location)) {
      const response = await fetch(location, { headers });
      if (!response.ok) {
        throw new CliError(
          `${location} answered ${response.status} ${response.statusText}.`,
        );
      }
      return response.text();
    }
    const path = location.startsWith('file:')
      ? fileURLToPath(location)
      : isAbsolute(location)
        ? location
        : resolve(base, location);
    try {
      return await readFile(path, 'utf-8');
    } catch {
      throw new CliError(`Can't read ${path}.`);
    }
  };
}

/**
 * Fetches built registry items and checks them against the item schema,
 * caching each item for the life of a command.
 */
export class RegistryClient {
  private readonly cache = new Map<string, Promise<RegistryItem>>();

  /**
   * Creates a client.
   *
   * @param sources - Registries by namespace, from {@link registrySources}.
   * @param fetcher - Reads a location's text.
   */
  constructor(
    private readonly sources: Record<string, RegistrySource>,
    private readonly fetcher: Fetcher,
  ) {}

  /**
   * Fetches one item.
   *
   * @param ref - Which item.
   * @returns The item, with every file's content.
   * @throws {@link CliError} for unknown registries, failed requests and
   *   invalid items.
   */
  get(ref: ItemRef): Promise<RegistryItem> {
    const key = `${ref.registry}/${ref.name}`;
    let item = this.cache.get(key);
    if (!item) {
      item = this.load(ref);
      this.cache.set(key, item);
    }
    return item;
  }

  /**
   * Fetches and validates an item.
   *
   * @param ref - Which item.
   * @returns The item.
   */
  private async load(ref: ItemRef): Promise<RegistryItem> {
    const source = this.sources[ref.registry];
    if (!source) {
      throw new CliError(
        `Unknown registry ${ref.registry}. Add it to "registries" in ndop.json.`,
        'ndop.json',
      );
    }
    const location = source.url.replaceAll('{name}', ref.name);
    let text: string;
    try {
      text = await this.fetcher(location, source.headers ?? {});
    } catch (error) {
      throw error instanceof CliError
        ? error
        : new CliError(`Can't fetch ${location}: ${(error as Error).message}`);
    }
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      throw new CliError(`${location} isn't valid JSON.`);
    }
    const checked = validate('registry-item', data);
    if (!checked.valid) {
      const [first] = checked.issues;
      throw new CliError(
        `${location} isn't a valid registry item: ${first?.path || '/'} ${first?.message}.`,
      );
    }
    if (checked.value.name !== ref.name) {
      throw new CliError(
        `${location} holds "${checked.value.name}", not "${ref.name}".`,
      );
    }
    if (
      (checked.value.files ?? []).some((file) => file.content === undefined)
    ) {
      throw new CliError(
        `${location} has files without content; is it a built item?`,
      );
    }
    return checked.value;
  }
}

/**
 * An item to install, with where it came from.
 */
export interface ResolvedItem {
  /** Registry and name. */
  ref: ItemRef;
  /** The fetched item. */
  item: RegistryItem;
}

/**
 * Fetches items and, recursively, their `registryDependencies`.
 *
 * @param client - Registry client.
 * @param refs - Items asked for.
 * @returns Every item once, each after the items it depends on.
 */
export async function resolveItems(
  client: RegistryClient,
  refs: readonly ItemRef[],
): Promise<ResolvedItem[]> {
  const ordered: ResolvedItem[] = [];
  const seen = new Set<string>();
  const visit = async (ref: ItemRef): Promise<void> => {
    const key = `${ref.registry}/${ref.name}`;
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    const item = await client.get(ref);
    for (const dependency of item.registryDependencies ?? []) {
      await visit(parseRef(dependency, ref.registry));
    }
    ordered.push({ ref, item });
  };
  for (const ref of refs) {
    await visit(ref);
  }
  return ordered;
}
