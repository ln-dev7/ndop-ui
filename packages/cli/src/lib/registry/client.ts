import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SEMVER_PATTERN,
  validate,
  type NdopConfig,
  type NdopLock,
  type RegistryItem,
} from '@ndop/schema';
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
 * Which registry an item comes from, and its name there, or the URL it's
 * fetched from.
 */
export interface ItemRef {
  /**
   * Registry namespace, such as `@ndop` or `@acme`. For an item fetched
   * from a URL, the namespace its bare-name `registryDependencies` resolve
   * in, which is always the default one (ADR-0025).
   */
  registry: string;
  /**
   * Item name. For a URL typed on the command line, a guess from the URL
   * until the item is fetched; {@link resolveItems} sets the real one.
   */
  name: string;
  /**
   * A specific version, fetched from `<name>@<version>` (ADR-0010), or
   * from `<url without .json>@<version>.json` for a URL item; the latest
   * when absent.
   */
  version?: string;
  /** The URL the item is fetched from, for an item installed by URL. */
  url?: string;
}

/** The prefix that asserts an item is a theme, as in `theme:ocean`. */
const THEME_PREFIX = 'theme:';

/**
 * Where one registry's items are fetched from.
 */
export interface RegistrySource {
  /** URL template or local path template containing `{name}`. */
  url: string;
  /** Request headers, with `${VAR}` already expanded. */
  headers?: Record<string, string>;
  /**
   * An environment variable one of the headers needs that isn't set.
   * Fetching from the registry then fails naming it; other registries
   * still work.
   */
  missing?: string;
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
 * @param text - `name` or `@namespace/name`, optionally followed by
 *   `@<version>`, or the URL of an item's JSON (ADR-0025).
 * @param registry - Namespace of the item that depends on it, which bare
 *   names resolve in.
 * @returns The reference.
 * @throws {@link CliError} for invalid versions, URLs that are neither
 *   HTTPS nor local HTTP, and anything else that isn't a name.
 *
 * @example
 * ```ts
 * parseRef('@acme/data-table@1.2.0');
 * // { registry: '@acme', name: 'data-table', version: '1.2.0' }
 * parseRef('https://ndop.dev/r/themes/ocean.json');
 * // { registry: '@ndop', name: 'ocean', url: 'https://ndop.dev/r/themes/ocean.json' }
 * ```
 */
export function parseRef(text: string, registry = DEFAULT_NAMESPACE): ItemRef {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) {
    return parseUrl(text);
  }
  const versioned = /^(@?[^@]+)@([^@/]+)$/.exec(text);
  if (versioned) {
    const [, item = '', version = ''] = versioned;
    if (!new RegExp(SEMVER_PATTERN).test(version)) {
      throw new CliError(
        `"${version}" in "${text}" isn't a version. Use a semantic version, such as ${item}@1.2.0.`,
      );
    }
    return { ...parseName(item, registry), version };
  }
  return parseName(text, registry);
}

/**
 * Parses an item reference without a version.
 *
 * @param text - `name` or `@namespace/name`.
 * @param registry - Namespace bare names resolve in.
 * @returns The reference.
 * @throws {@link CliError} for URLs and anything else that isn't a name.
 */
function parseName(text: string, registry: string): ItemRef {
  const scoped =
    /^(@[a-z0-9]+(?:-[a-z0-9]+)*)\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(text);
  if (scoped) {
    return { registry: scoped[1] ?? registry, name: scoped[2] ?? text };
  }
  if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(text)) {
    return { registry, name: text };
  }
  throw new CliError(`"${text}" isn't an item name.`);
}

/**
 * Parses the URL of an item's JSON. HTTPS is required, except on the
 * local machine, so an item can't be swapped in transit (ADR-0025).
 *
 * @param text - The URL.
 * @returns The reference, named after the URL's file until it's fetched.
 * @throws {@link CliError} for anything but HTTPS and local HTTP.
 */
function parseUrl(text: string): ItemRef {
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new CliError(`"${text}" isn't a valid URL.`);
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) {
    throw new CliError(
      `Can't install from ${text}: use an https:// URL (http:// works only for localhost).`,
    );
  }
  const file = url.pathname.split('/').pop() ?? '';
  return {
    registry: DEFAULT_NAMESPACE,
    name: decodeURIComponent(file).replace(/\.json$/, ''),
    url: text,
  };
}

/**
 * Parses an item reference that may start with `theme:`, which only
 * asserts that the item is a theme (ADR-0023).
 *
 * @param text - Such as `theme:ocean`, `theme:@acme/ocean`,
 *   `theme:https://…` or anything {@link parseRef} reads.
 * @returns The reference, and whether it must be a theme.
 * @throws {@link CliError} as {@link parseRef} does.
 *
 * @example
 * ```ts
 * parseRequest('theme:@acme/ocean');
 * // { ref: { registry: '@acme', name: 'ocean' }, theme: true }
 * ```
 */
export function parseRequest(text: string): { ref: ItemRef; theme: boolean } {
  return text.startsWith(THEME_PREFIX)
    ? { ref: parseRef(text.slice(THEME_PREFIX.length)), theme: true }
    : { ref: parseRef(text), theme: false };
}

/**
 * Checks that every item asked for as `theme:<name>` is a theme: a
 * `registry:theme`, or a shadcn `registry:style` that carries theme
 * variables, as tweakcn's themes are (ADR-0023).
 *
 * @param requests - What was asked for, from {@link parseRequest}.
 * @param items - The resolved items.
 * @throws {@link CliError} naming the first item that isn't a theme.
 */
export function assertThemes(
  requests: readonly { ref: ItemRef; theme: boolean }[],
  items: readonly ResolvedItem[],
): void {
  for (const request of requests) {
    if (!request.theme) continue;
    const found = items.find(({ ref }) =>
      request.ref.url
        ? ref.url === request.ref.url
        : itemKey(ref) === itemKey(request.ref),
    );
    const theme =
      found?.item.type === 'registry:theme' ||
      (found?.item.type === 'registry:style' && found.item.cssVars);
    if (found && !theme) {
      throw new CliError(
        `${itemKey(found.ref)} is a ${found.item.type} item, not a theme; drop "theme:" to install it anyway.`,
      );
    }
  }
}

/**
 * The lockfile key of an item: `@namespace/name`, or the URL it was
 * installed from (ADR-0025).
 *
 * @param ref - Its reference.
 * @returns The key.
 *
 * @example
 * ```ts
 * itemKey({ registry: '@ndop', name: 'dialog' }); // '@ndop/dialog'
 * ```
 */
export function itemKey(ref: ItemRef): string {
  return ref.url ?? `${ref.registry}/${ref.name}`;
}

/**
 * The reference a lockfile entry was installed from.
 *
 * @param entry - The entry.
 * @returns Its namespace and name, or its URL.
 */
export function lockedRef(
  entry: Pick<NdopLock['items'][string], 'name' | 'registry' | 'source'>,
): ItemRef {
  return entry.source
    ? { registry: DEFAULT_NAMESPACE, name: entry.name, url: entry.source }
    : { registry: entry.registry ?? DEFAULT_NAMESPACE, name: entry.name };
}

/**
 * Where an item came from, as its lockfile entry and reports record it:
 * its namespace, or for a URL item the URL as `source` (ADR-0025).
 *
 * @param ref - Its reference.
 * @returns `{ registry }` or `{ source }`.
 */
export function itemOrigin(
  ref: ItemRef,
): { registry: string; source?: never } | { source: string; registry?: never } {
  return ref.url ? { source: ref.url } : { registry: ref.registry };
}

/**
 * Where a URL item's version is: `<url without .json>@<version>.json`,
 * which `ndop build` writes next to the item, with any query string kept
 * (ADR-0025).
 *
 * @param url - The item's URL.
 * @param version - The version.
 * @returns The versioned URL.
 *
 * @example
 * ```ts
 * versionedUrl('https://x.dev/r/ocean.json?t=1', '1.0.0');
 * // 'https://x.dev/r/ocean@1.0.0.json?t=1'
 * ```
 */
export function versionedUrl(url: string, version: string): string {
  const parsed = new URL(url);
  parsed.pathname = `${parsed.pathname.replace(/\.json$/, '')}@${version}.json`;
  return parsed.toString();
}

/**
 * The registries a project can install from: the default one, in order of
 * precedence the `--registry` option, the `NDOP_REGISTRY` environment
 * variable, the `registry` field of `ndop.json` and ndop.dev, plus every
 * namespaced registry in `ndop.json`.
 *
 * `${VAR}` in a namespaced registry's headers expands from `env`. An unset
 * variable doesn't fail here, only when an item is fetched from that
 * registry (see {@link RegistrySource.missing}), so a private registry
 * without its token doesn't stop installs from the others (ADR-0025).
 *
 * @param config - The project's `ndop.json`, when there is one.
 * @param override - The `--registry` option.
 * @param env - Environment variables.
 * @returns Sources by namespace.
 *
 * @example
 * ```ts
 * registrySources(
 *   { registries: { '@acme': { url: 'https://acme.dev/r/{name}.json', headers: { Authorization: 'Bearer ${ACME_TOKEN}' } } } },
 *   undefined,
 *   { ACME_TOKEN: 's3cret' },
 * )['@acme'];
 * // { url: 'https://acme.dev/r/{name}.json', headers: { Authorization: 'Bearer s3cret' } }
 * ```
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
      continue;
    }
    let missing: string | undefined;
    const headers = Object.fromEntries(
      Object.entries(entry.headers ?? {}).map(([key, value]) => [
        key,
        value.replace(/\$\{(\w+)\}/g, (_match, name: string) => {
          const expanded = env[name];
          if (expanded === undefined) missing ??= name;
          return expanded ?? '';
        }),
      ]),
    );
    sources[namespace] = {
      url: entry.url,
      ...(entry.headers ? { headers } : {}),
      ...(missing ? { missing } : {}),
    };
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
   * Fetches one item, at its latest version or the one `ref` names. A
   * version is fetched from the registry's URL template with
   * `<name>@<version>` in place of `{name}`, which is where `ndop build`
   * writes it (ADR-0010).
   *
   * @param ref - Which item, and optionally which version.
   * @returns The item, with every file's content.
   * @throws {@link CliError} for unknown registries, registries whose
   *   headers need an unset environment variable, failed requests and
   *   invalid items.
   */
  get(ref: ItemRef): Promise<RegistryItem> {
    const key = `${itemKey(ref)}@${ref.version ?? 'latest'}`;
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
    if (ref.url) {
      return this.loadUrl(ref, ref.url);
    }
    const source = this.sources[ref.registry];
    if (!source) {
      throw new CliError(
        `Unknown registry ${ref.registry}. Add it to "registries" in ndop.json.`,
        'ndop.json',
      );
    }
    if (source.missing) {
      throw new CliError(
        `Registry ${ref.registry} needs the ${source.missing} environment variable.`,
        'ndop.json',
      );
    }
    const location = source.url.replaceAll(
      '{name}',
      ref.version ? `${ref.name}@${ref.version}` : ref.name,
    );
    return this.fetchItem(ref, location, source.headers ?? {});
  }

  /**
   * Fetches an item installed by URL. A version comes from its versioned
   * URL; when there's none, the URL itself still serves it if that's the
   * version it holds.
   *
   * @param ref - Which item.
   * @param url - Its URL.
   * @returns The item.
   */
  private async loadUrl(ref: ItemRef, url: string): Promise<RegistryItem> {
    if (!ref.version) {
      return this.fetchItem(ref, url, {});
    }
    let item: RegistryItem;
    try {
      item = await this.fetchItem(ref, versionedUrl(url, ref.version), {});
    } catch (error) {
      if (!(error instanceof CliError)) throw error;
      item = await this.get({ registry: ref.registry, name: ref.name, url });
      if (item.version !== ref.version) {
        throw new CliError(
          `Can't fetch version ${ref.version} of ${url}: ${error.message}`,
        );
      }
    }
    // A locked URL item knows its name; another item at that URL isn't it.
    if (item.name !== ref.name) {
      throw new CliError(`${url} holds "${item.name}", not "${ref.name}".`);
    }
    return item;
  }

  /**
   * Fetches and validates the item at a location.
   *
   * @param ref - Which item, to check what the location holds.
   * @param location - URL or path.
   * @param headers - Request headers.
   * @returns The item.
   */
  private async fetchItem(
    ref: ItemRef,
    location: string,
    headers: Record<string, string>,
  ): Promise<RegistryItem> {
    let text: string;
    try {
      text = await this.fetcher(location, headers);
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
    const checked = validate(
      'registry-item',
      ref.url ? withShadcnDefaults(data, text) : data,
    );
    if (!checked.valid) {
      const [first] = checked.issues;
      throw new CliError(
        `${location} isn't a valid registry item: ${first?.path || '/'} ${first?.message}.`,
      );
    }
    if (!ref.url && checked.value.name !== ref.name) {
      throw new CliError(
        `${location} holds "${checked.value.name}", not "${ref.name}".`,
      );
    }
    if (ref.version && checked.value.version !== ref.version) {
      throw new CliError(
        `${location} holds version ${checked.value.version}, not ${ref.version}.`,
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
 * Fetches items and, recursively, their `registryDependencies`. An item
 * asked for at a version gets that version even when another item depends
 * on it; dependencies are otherwise fetched at their latest version.
 *
 * A bare name in `registryDependencies` resolves in the registry of the
 * item that lists it, so a third-party registry's items depend on each
 * other by name and on Ndop's as `@ndop/<name>`, which always means the
 * default registry, wherever `--registry` or `NDOP_REGISTRY` points it. A
 * URL item's bare-name dependencies resolve in the default registry
 * (ADR-0025).
 *
 * @param client - Registry client.
 * @param refs - Items asked for.
 * @returns Every item once, each after the items it depends on.
 * @throws {@link CliError} when the same item is asked for at two versions.
 */
export async function resolveItems(
  client: RegistryClient,
  refs: readonly ItemRef[],
): Promise<ResolvedItem[]> {
  const pinned = new Map<string, string>();
  for (const ref of refs) {
    const key = itemKey(ref);
    const version = pinned.get(key);
    if (ref.version && version && version !== ref.version) {
      throw new CliError(
        `${key} is asked for at ${version} and ${ref.version}; pick one.`,
      );
    }
    if (ref.version) pinned.set(key, ref.version);
  }
  const ordered: ResolvedItem[] = [];
  const seen = new Set<string>();
  const visit = async (asked: ItemRef): Promise<void> => {
    const key = itemKey(asked);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    const version = asked.version ?? pinned.get(key);
    const fetched: ItemRef = {
      registry: asked.registry,
      name: asked.name,
      ...(version ? { version } : {}),
      ...(asked.url ? { url: asked.url } : {}),
    };
    const item = await client.get(fetched);
    // A URL only guesses the name; the item says what it is.
    const ref = asked.url ? { ...fetched, name: item.name } : fetched;
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

/**
 * Fills in what Ndop requires and shadcn's item format leaves optional, so
 * shadcn and tweakcn items install from a URL unchanged (ADR-0023): the
 * title from the name, a description saying where it came from, and a
 * version from the content, `0.0.0-<hash>`. A changed item gets a new
 * version, so `ndop update` still notices.
 *
 * @param data - The parsed item.
 * @param text - Its JSON, for the version.
 * @returns The item with the fields set, or `data` unchanged when it isn't
 *   an object.
 */
function withShadcnDefaults(data: unknown, text: string): unknown {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return data;
  }
  const item = data as Record<string, unknown>;
  const name = typeof item['name'] === 'string' ? item['name'] : 'item';
  return {
    title: name
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
    description: `${name}, installed from a URL.`,
    version: `0.0.0-${createHash('sha256').update(text).digest('hex').slice(0, 8)}`,
    ...item,
  };
}
