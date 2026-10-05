import {
  DEFAULT_NAMESPACE,
  RegistryClient,
  type Fetcher,
  type RegistrySource,
} from '@ndop/cli/registry';
import {
  componentMarkdown,
  withDependencies,
  type BuiltItem,
  type Metadata,
} from '@ndop/metadata';
import { validate, type Registry, type RegistryItem } from '@ndop/schema';

/** An entry of a registry's `index.json`. */
export type IndexEntry = Registry['items'][number];

/**
 * A request the server can't answer, such as an unknown item. Its message
 * says how to fix the call, and becomes the tool error's text.
 */
export class CatalogError extends Error {
  /**
   * Creates the error.
   *
   * @param message - What went wrong and what to call instead.
   */
  constructor(message: string) {
    super(message);
    this.name = 'CatalogError';
  }
}

/**
 * A registry, read the way `ndop add` reads it (ADR-0009): `index.json`,
 * items and `metadata/<name>.json` through the CLI's registry client and
 * fetcher, each fetched once and cached for the life of the server.
 */
export class Catalog {
  private readonly client: RegistryClient;
  private readonly files = new Map<string, Promise<unknown>>();
  private indexEntries?: Promise<IndexEntry[]>;

  /**
   * Creates a catalog.
   *
   * @param source - The registry, with `{name}` in its URL or path.
   * @param fetcher - Reads a location's text.
   */
  constructor(
    private readonly source: RegistrySource,
    private readonly fetcher: Fetcher,
  ) {
    this.client = new RegistryClient({ [DEFAULT_NAMESPACE]: source }, fetcher);
  }

  /**
   * Every item the registry lists, validated against the registry schema.
   *
   * @returns The index's items.
   */
  index(): Promise<IndexEntry[]> {
    this.indexEntries ??= this.json('index').then((data) => {
      const checked = validate('registry', data);
      if (!checked.valid) {
        throw new CatalogError(
          `The registry's index.json isn't valid: ${checked.issues[0]?.path || '/'} ${checked.issues[0]?.message}.`,
        );
      }
      return checked.value.items;
    });
    return this.indexEntries;
  }

  /**
   * The index entries of one type, by title.
   *
   * @param type - Item type, such as `registry:ui`.
   * @returns The entries.
   */
  async ofType(type: string): Promise<IndexEntry[]> {
    return (await this.index())
      .filter((entry) => entry.type === type)
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  /**
   * One built item, with every file's content.
   *
   * @param name - Item name.
   * @param type - The type it must have, for a clearer error.
   * @returns The item.
   * @throws {@link CatalogError} when the registry doesn't list it.
   */
  async item(name: string, type?: string): Promise<RegistryItem> {
    await this.known(name, type);
    return this.client.get({ registry: DEFAULT_NAMESPACE, name });
  }

  /**
   * A component's metadata, validated against the metadata schema.
   *
   * @param name - Component name.
   * @returns The metadata.
   */
  async metadata(name: string): Promise<Metadata> {
    await this.known(name, 'registry:ui');
    const data = await this.json(`metadata/${name}`);
    const checked = validate('metadata', data);
    if (!checked.valid) {
      throw new CatalogError(
        `metadata/${name}.json isn't valid: ${checked.issues[0]?.path || '/'} ${checked.issues[0]?.message}.`,
      );
    }
    return data as Metadata;
  }

  /**
   * A component's documentation as Markdown: its docs page's `.md` twin.
   *
   * @param name - Component name.
   * @returns The Markdown.
   */
  async markdown(name: string): Promise<string> {
    const files = new Map<string, unknown>();
    const item = await this.item(name, 'registry:ui');
    files.set(`${name}.json`, item);
    files.set(`metadata/${name}.json`, await this.metadata(name));
    await this.withDependencies(item, files);
    for (const example of item.ndop?.examples ?? []) {
      files.set(`${example}.json`, await this.item(example));
    }
    return componentMarkdown(name, <T>(file: string) => files.get(file) as T);
  }

  /**
   * An item and every item it depends on, transitively, each once.
   *
   * @param item - The item.
   * @param files - Receives each item, as `<name>.json`.
   * @returns The item first, then its dependencies.
   */
  async withDependencies(
    item: RegistryItem,
    files = new Map<string, unknown>(),
  ): Promise<RegistryItem[]> {
    files.set(`${item.name}.json`, item);
    const queue = [...(item.registryDependencies ?? [])];
    for (let name = queue.shift(); name !== undefined; name = queue.shift()) {
      if (files.has(`${name}.json`)) continue;
      const dependency = await this.item(name);
      files.set(`${name}.json`, dependency);
      queue.push(...(dependency.registryDependencies ?? []));
    }
    return withDependencies(
      item as BuiltItem,
      <T>(file: string) => files.get(file) as T,
    ) as RegistryItem[];
  }

  /**
   * Checks that the registry lists an item, of the expected type.
   *
   * @param name - Item name.
   * @param type - Expected type, if any.
   * @throws {@link CatalogError} naming the closest items otherwise.
   */
  private async known(name: string, type?: string): Promise<void> {
    const entries = await this.index();
    const entry = entries.find((candidate) => candidate.name === name);
    if (entry && (!type || entry.type === type)) return;
    const pool = entries.filter(
      (candidate) => !type || candidate.type === type,
    );
    const kind = type === 'registry:ui' ? 'component' : 'item';
    if (entry) {
      throw new CatalogError(
        `"${name}" is a ${entry.type} item, not a ${kind}.`,
      );
    }
    const closest = pool
      .map((candidate) => ({
        name: candidate.name,
        distance: distance(name, candidate.name),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3)
      .map((candidate) => candidate.name);
    throw new CatalogError(
      `The registry has no ${kind} named "${name}".` +
        (closest.length ? ` Closest: ${closest.join(', ')}.` : ''),
    );
  }

  /**
   * Fetches and parses a registry file, once.
   *
   * @param name - File name without `.json`, such as `index` or
   *   `metadata/dialog`.
   * @returns The parsed JSON.
   */
  private json(name: string): Promise<unknown> {
    let data = this.files.get(name);
    if (!data) {
      const location = this.source.url.replaceAll('{name}', name);
      data = this.fetcher(location, this.source.headers ?? {}).then((text) => {
        try {
          return JSON.parse(text) as unknown;
        } catch {
          throw new CatalogError(`${location} isn't valid JSON.`);
        }
      });
      this.files.set(name, data);
    }
    return data;
  }
}

/**
 * Edit distance between two names, for "did you mean" suggestions.
 *
 * @param a - A name.
 * @param b - Another.
 * @returns The Levenshtein distance.
 */
export function distance(a: string, b: string): number {
  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      current[j] = Math.min(
        (previous[j] ?? 0) + 1,
        (current[j - 1] ?? 0) + 1,
        (previous[j - 1] ?? 0) + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    previous = current;
  }
  return previous[b.length] ?? 0;
}
