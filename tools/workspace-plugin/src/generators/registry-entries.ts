import { joinPathFragments, type Tree, updateJson } from '@nx/devkit';

/** Where the registry's source lives in this workspace. */
export const REGISTRY_ROOT = 'registry';

/** An entry of `registry/registry.json`, as far as the generators need. */
export interface ManifestItem {
  /** Item name. */
  name: string;
  /** Item type, such as `registry:ui`. */
  type: string;
  /** Anything else the entry holds. */
  [field: string]: unknown;
}

/** The fields of `registry.json` the generators read. */
interface Manifest {
  items: ManifestItem[];
}

/**
 * Whether the registry already has an item of this name.
 *
 * @param tree - Virtual file system.
 * @param name - Item name.
 * @returns `true` when `registry.json` lists it.
 */
export function hasRegistryItem(tree: Tree, name: string): boolean {
  return readManifest(tree).items.some((item) => item.name === name);
}

/**
 * Reads one item of `registry.json`.
 *
 * @param tree - Virtual file system.
 * @param name - Item name.
 * @returns The entry, or `undefined`.
 */
export function readRegistryItem(
  tree: Tree,
  name: string,
): ManifestItem | undefined {
  return readManifest(tree).items.find((item) => item.name === name);
}

/**
 * Adds an item to `registry.json`, after the last item of the same type so
 * the manifest stays grouped by type, or at the end.
 *
 * @param tree - Virtual file system.
 * @param item - The new entry.
 * @throws If an item of that name exists.
 */
export function addRegistryItem(tree: Tree, item: ManifestItem): void {
  updateJson<Manifest>(tree, manifestPath(), (manifest) => {
    if (manifest.items.some((existing) => existing.name === item.name)) {
      throw new Error(`The registry already has an item "${item.name}".`);
    }
    const last = manifest.items
      .map((existing) => existing.type)
      .lastIndexOf(item.type);
    manifest.items.splice(
      last === -1 ? manifest.items.length : last + 1,
      0,
      item,
    );
    return manifest;
  });
}

/**
 * Changes one item of `registry.json` in place.
 *
 * @param tree - Virtual file system.
 * @param name - Item name.
 * @param update - Edits the entry.
 * @throws If there is no such item.
 */
export function updateRegistryItem(
  tree: Tree,
  name: string,
  update: (item: ManifestItem) => void,
): void {
  updateJson<Manifest>(tree, manifestPath(), (manifest) => {
    const item = manifest.items.find((existing) => existing.name === name);
    if (!item) {
      throw new Error(`The registry has no item "${name}".`);
    }
    update(item);
    return manifest;
  });
}

/**
 * Writes an item's changelog with its first release.
 *
 * @param tree - Virtual file system.
 * @param name - Item name.
 * @param title - Display name, the changelog's heading.
 */
export function writeFirstChangelog(
  tree: Tree,
  name: string,
  title: string,
): void {
  tree.write(
    joinPathFragments(REGISTRY_ROOT, 'changelog', `${name}.md`),
    `# ${title}\n\n## 0.1.0\n\nFirst release.\n`,
  );
}

/**
 * Inserts a line into a sorted list of lines between two markers of a
 * file, keeping it sorted. Used for the harness's hand-readable lists of
 * examples and blocks, whose shape the generators own.
 *
 * @param tree - Virtual file system.
 * @param file - Workspace-relative path.
 * @param start - Text of the line that opens the list.
 * @param end - Text of the line that closes it.
 * @param line - The line to insert.
 * @throws If the markers aren't found.
 */
export function insertSortedLine(
  tree: Tree,
  file: string,
  start: string,
  end: string,
  line: string,
): void {
  const lines = (tree.read(file, 'utf-8') ?? '').split('\n');
  const from = lines.findIndex((text) => text.includes(start));
  // Prettier prints an empty list on one line, `= [];` or `= {};`.
  const empty = lines[from]?.match(/^(.*[[{])([\]}];)$/);
  if (empty?.[1] && empty[2]) {
    lines.splice(from, 1, empty[1], empty[2]);
  }
  const to = lines.findIndex((text, index) => index > from && text === end);
  if (from === -1 || to === -1) {
    throw new Error(`Can't find the list to update in ${file}.`);
  }
  const list = [...lines.slice(from + 1, to), line].sort((a, b) =>
    a.trim().localeCompare(b.trim()),
  );
  lines.splice(from + 1, to - from - 1, ...list);
  tree.write(file, lines.join('\n'));
}

/**
 * The manifest's path.
 *
 * @returns `registry/registry.json`.
 */
function manifestPath(): string {
  return joinPathFragments(REGISTRY_ROOT, 'registry.json');
}

/**
 * Reads the manifest.
 *
 * @param tree - Virtual file system.
 * @returns Its items.
 */
function readManifest(tree: Tree): Manifest {
  return JSON.parse(tree.read(manifestPath(), 'utf-8') ?? '{"items":[]}');
}
