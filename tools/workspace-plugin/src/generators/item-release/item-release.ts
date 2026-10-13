import {
  formatFiles,
  joinPathFragments,
  readJson,
  type Tree,
} from '@nx/devkit';
import {
  REGISTRY_ROOT,
  updateRegistryItem,
  type ManifestItem,
} from '../registry-entries';
import type { ItemReleaseGeneratorSchema, ReleaseBump } from './schema';

/** A plain `major.minor.patch` version, the only kind items release under. */
const RELEASE_VERSION = /^(\d+)\.(\d+)\.(\d+)$/;

/**
 * Releases registry items (ADR-0012, ADR-0020): sets each item's version
 * in `registry/registry.json` and adds a `## <version>` section with the
 * notes at the top of `registry/changelog/<name>.md`, creating the file,
 * headed with the item's title, for items that have none yet. `{previous}`
 * in the notes becomes the item's version before the release. The next
 * `nx build registry` writes the new versions' snapshots, which are
 * committed with the release as merge bases (ADR-0010).
 *
 * @param tree - Virtual file system the generator writes to.
 * @param options - Items, new version or bump, and notes; see
 *   `schema.json`.
 * @returns Resolves once files are written and formatted.
 * @throws If an item doesn't exist, no items are named, or a new version
 *   isn't above the current one.
 *
 * @example
 * ```bash
 * nx g @ndop/workspace-plugin:item-release button --bump=minor --notes="Adds an xs size."
 * nx g @ndop/workspace-plugin:item-release --all --to=1.0.0 --notes="Stable release; no code changes since {previous}."
 * ```
 */
export async function itemReleaseGenerator(
  tree: Tree,
  options: ItemReleaseGeneratorSchema,
): Promise<void> {
  if (!options.to === !options.bump) {
    throw new Error('Pass either --to or --bump.');
  }
  const manifest = readJson<{ items: ManifestItem[] }>(
    tree,
    joinPathFragments(REGISTRY_ROOT, 'registry.json'),
  );
  const names = options.all
    ? manifest.items.map((item) => item.name)
    : (options.names ?? []);
  if (names.length === 0) {
    throw new Error('Name the items to release, or pass --all.');
  }
  for (const name of names) {
    const item = manifest.items.find((entry) => entry.name === name);
    if (!item) {
      throw new Error(`The registry has no item "${name}".`);
    }
    const previous = String(item['version']);
    const next = options.to ?? bumpVersion(previous, options.bump ?? 'patch');
    if (compareRelease(next, previous) <= 0) {
      throw new Error(
        `${name}'s new version, ${next}, must be above ${previous}.`,
      );
    }
    updateRegistryItem(tree, name, (entry) => {
      entry['version'] = next;
    });
    addChangelogSection(
      tree,
      name,
      String(item['title'] ?? name),
      next,
      options.notes.replaceAll('{previous}', previous),
    );
  }
  if (!options.skipFormat) {
    await formatFiles(tree);
  }
}

/**
 * The next version after a bump.
 *
 * @param version - The current version.
 * @param bump - Which part to raise.
 * @returns The new version.
 * @throws If the current version isn't `major.minor.patch`.
 */
export function bumpVersion(version: string, bump: ReleaseBump): string {
  const [major, minor, patch] = parts(version);
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * Compares two `major.minor.patch` versions.
 *
 * @param a - A version.
 * @param b - Another.
 * @returns Negative when `a` is lower, positive when higher, `0` if equal.
 */
function compareRelease(a: string, b: string): number {
  const [left, right] = [parts(a), parts(b)];
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
}

/**
 * Splits a `major.minor.patch` version.
 *
 * @param version - The version.
 * @returns Its three numbers.
 * @throws If it has another form.
 */
function parts(version: string): [number, number, number] {
  const match = RELEASE_VERSION.exec(version);
  if (!match) {
    throw new Error(`"${version}" isn't a major.minor.patch version.`);
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/**
 * Adds a version's section above the newest one in an item's changelog,
 * keeping the title and any intro above it.
 *
 * @param tree - Virtual file system.
 * @param name - Item name.
 * @param title - The item's title, the heading of a new changelog.
 * @param version - The new version.
 * @param notes - What changed.
 */
function addChangelogSection(
  tree: Tree,
  name: string,
  title: string,
  version: string,
  notes: string,
): void {
  const file = joinPathFragments(REGISTRY_ROOT, 'changelog', `${name}.md`);
  const section = `## ${version}\n\n${notes.trim()}\n`;
  const current = tree.read(file, 'utf-8');
  if (current === null) {
    tree.write(file, `# ${title}\n\n${section}`);
    return;
  }
  const first = current.search(/^## /m);
  tree.write(
    file,
    first === -1
      ? `${current.trimEnd()}\n\n${section}`
      : `${current.slice(0, first)}${section}\n${current.slice(first)}`,
  );
}

export default itemReleaseGenerator;
