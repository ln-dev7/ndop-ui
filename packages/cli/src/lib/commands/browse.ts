import { resolve } from 'node:path';
import { ITEM_TYPES, type NdopLock, type Registry } from '@ndop/schema';
import { CliError } from '../errors';
import { readConfig, readLock } from '../install/project-files';
import { Catalog, type IndexEntry } from '../registry/catalog';
import {
  DEFAULT_NAMESPACE,
  itemKey,
  registrySources,
  type ItemRef,
  type RegistrySource,
} from '../registry/client';
import { RUN_CLI } from '../run-command';
import type { CommandEnvironment } from './environment';

/** An item type, such as `registry:ui`. */
export type ItemType = (typeof ITEM_TYPES)[number];

/**
 * The short names `--type` takes, and how `ndop list` and `ndop view` name
 * each type, in the order `ndop list` groups them.
 */
export const TYPE_NAMES: Readonly<
  Record<ItemType, { short: string; one: string; many: string }>
> = {
  'registry:ui': { short: 'ui', one: 'component', many: 'Components' },
  'registry:block': { short: 'block', one: 'block', many: 'Blocks' },
  'registry:theme': { short: 'theme', one: 'theme', many: 'Themes' },
  'registry:lib': { short: 'lib', one: 'library', many: 'Libraries' },
  'registry:style': { short: 'style', one: 'style', many: 'Styles' },
  'registry:file': { short: 'file', one: 'file', many: 'Files' },
  'registry:primitive-usage': {
    short: 'example',
    one: 'example',
    many: 'Examples',
  },
};

/** The site whose routes {@link docsUrl} knows: Ndop's own registry. */
const NDOP_REGISTRY_NAME = 'ndop';

/**
 * Reads a `--type` value.
 *
 * @param text - A short name such as `ui` or `example`, or a full type
 *   such as `registry:ui`.
 * @returns The item type.
 * @throws {@link CliError} naming the valid values otherwise.
 *
 * @example
 * ```ts
 * parseType('example'); // 'registry:primitive-usage'
 * ```
 */
export function parseType(text: string): ItemType {
  const found = ITEM_TYPES.find(
    (type) => type === text || TYPE_NAMES[type].short === text,
  );
  if (!found) {
    throw new CliError(
      `"${text}" isn't an item type. Use one of: ${Object.values(TYPE_NAMES)
        .map((names) => names.short)
        .join(', ')}.`,
    );
  }
  return found;
}

/**
 * How `ndop list` and `ndop view` name an item type.
 *
 * @param type - The type.
 * @returns Its names; the type itself for one Ndop doesn't know.
 */
export function typeNames(type: string): {
  short: string;
  one: string;
  many: string;
} {
  return TYPE_NAMES[type as ItemType] ?? { short: type, one: type, many: type };
}

/** The options `ndop list` and `ndop view` share. */
export interface BrowseOptions {
  /** The project root, or any folder outside a project. */
  cwd: string;
  /** The default registry's URL template for this run. */
  registry?: string;
}

/** What `ndop list` and `ndop view` need to browse registries. */
export interface BrowseContext {
  /** Registries by namespace, the default one first. */
  sources: Record<string, RegistrySource>;
  /** The project's lockfile; empty outside a project. */
  lock: NdopLock;
  /**
   * The catalog of one registry, created once.
   *
   * @param namespace - Such as `@ndop` or `@acme`.
   * @returns Its catalog.
   * @throws {@link CliError} for an unknown registry, or one whose
   *   headers need an unset environment variable.
   */
  catalog(namespace: string): Catalog;
}

/**
 * Opens the registries a folder installs from, as `ndop add` does: the
 * default one and every namespaced one in `ndop.json`. Outside a project,
 * only the default registry.
 *
 * @param options - `--cwd` and `--registry`.
 * @param environment - Injected outside world.
 * @returns The registries and the lockfile.
 * @throws {@link CliError} when `ndop.json` or the lockfile is invalid.
 */
export async function browseContext(
  options: BrowseOptions,
  environment: CommandEnvironment,
): Promise<BrowseContext> {
  const root = resolve(options.cwd);
  const fs = environment.fs(root);
  const config = await readConfig(fs);
  const sources = registrySources(config, options.registry, environment.env);
  const fetcher = environment.fetcher(root);
  const catalogs = new Map<string, Catalog>();
  return {
    sources,
    lock: await readLock(fs),
    catalog(namespace) {
      const source = sources[namespace];
      if (!source) {
        throw new CliError(
          `Unknown registry ${namespace}. Add it to "registries" in ndop.json.`,
          'ndop.json',
        );
      }
      if (source.missing) {
        throw new CliError(
          `Registry ${namespace} needs the ${source.missing} environment variable.`,
          'ndop.json',
        );
      }
      let catalog = catalogs.get(namespace);
      if (!catalog) {
        catalog = new Catalog(source, fetcher);
        catalogs.set(namespace, catalog);
      }
      return catalog;
    },
  };
}

/**
 * The name `ndop add` takes for an item: bare in the default registry,
 * `@namespace/name` in another.
 *
 * @param ref - The item's registry and name.
 * @returns The name.
 *
 * @example
 * ```ts
 * displayName({ registry: '@acme', name: 'data-table' }); // '@acme/data-table'
 * ```
 */
export function displayName(ref: Pick<ItemRef, 'registry' | 'name'>): string {
  return ref.registry === DEFAULT_NAMESPACE
    ? ref.name
    : `${ref.registry}/${ref.name}`;
}

/**
 * The command that installs an item.
 *
 * @param ref - The item's registry and name.
 * @returns Such as `npx @ndop/cli add button`.
 */
export function installCommand(
  ref: Pick<ItemRef, 'registry' | 'name'>,
): string {
  return `${RUN_CLI} add ${displayName(ref)}`;
}

/**
 * The version of an item the lockfile records.
 *
 * @param lock - The lockfile.
 * @param ref - The item's registry and name.
 * @returns The installed version, or `undefined` when it isn't installed.
 */
export function installedVersion(
  lock: NdopLock,
  ref: Pick<ItemRef, 'registry' | 'name'>,
): string | undefined {
  return lock.items[itemKey(ref)]?.version;
}

/**
 * Where an item of Ndop's own registry is documented: a component's page,
 * a block's, the theme gallery, or for an example the page of the first
 * component that shows it. Other registries' sites have their own routes,
 * so their items get none.
 *
 * @param registry - The registry's index.
 * @param entry - The item's index entry.
 * @returns The URL, or `undefined` when the item has no page.
 *
 * @example
 * ```ts
 * docsUrl(index, { name: 'dialog', type: 'registry:ui', … });
 * // 'https://ndop.dev/docs/components/dialog'
 * ```
 */
export function docsUrl(
  registry: Registry,
  entry: Pick<IndexEntry, 'name' | 'type'>,
): string | undefined {
  if (registry.name !== NDOP_REGISTRY_NAME) return undefined;
  const site = registry.homepage.replace(/\/+$/, '');
  switch (entry.type) {
    case 'registry:ui':
      return `${site}/docs/components/${entry.name}`;
    case 'registry:block':
      return `${site}/blocks/${entry.name}`;
    case 'registry:theme':
      return `${site}/themes`;
    case 'registry:primitive-usage': {
      const component = registry.items.find(
        (candidate) =>
          candidate.type === 'registry:ui' &&
          candidate.ndop?.examples?.includes(entry.name),
      );
      return component
        ? `${site}/docs/components/${component.name}`
        : undefined;
    }
    default:
      return undefined;
  }
}
