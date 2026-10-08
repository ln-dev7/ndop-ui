import {
  SEMVER_PATTERN,
  schemas,
  type Changelog,
  type RegistryItem,
} from '@ndop/schema';
import { compareVersions } from '../registry/version';

/** Item types whose changelog must cover every version (ADR-0020). */
export const DOCUMENTED_TYPES: readonly RegistryItem['type'][] = [
  'registry:ui',
  'registry:block',
  'registry:theme',
];

/** One version's entry in a {@link Changelog}. */
type ChangelogVersion = Changelog['versions'][number];

/** What changed between two versions of an item. */
export type VersionChanges = ChangelogVersion['changes'];

/**
 * Splits `changelog/<name>.md` into its version sections: each
 * `## <version>` heading starts one, and anything above the first is the
 * page's title or intro, which is ignored. `##` is reserved for versions,
 * so use `###` and below inside a section.
 *
 * @param markdown - The file's text.
 * @returns Each version's notes, trimmed, and any problem with the
 *   headings.
 *
 * @example
 * ```ts
 * const { sections } = parseChangelog('# Button\n\n## 0.2.0\n\nAdds `xs`.\n');
 * sections.get('0.2.0'); // 'Adds `xs`.\n'
 * ```
 */
export function parseChangelog(markdown: string): {
  sections: Map<string, string>;
  problems: string[];
} {
  const sections = new Map<string, string>();
  const problems: string[] = [];
  const semver = new RegExp(SEMVER_PATTERN);
  let current: { version: string; lines: string[] } | undefined;
  const close = () => {
    if (!current) return;
    const text = current.lines.join('\n').trim();
    sections.set(current.version, text ? `${text}\n` : '');
  };
  let fenced = false;
  for (const line of markdown.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const heading = fenced ? null : /^##\s+(.*?)\s*$/.exec(line);
    if (!heading) {
      current?.lines.push(line);
      continue;
    }
    close();
    const version = heading[1] ?? '';
    if (!semver.test(version)) {
      problems.push(
        `"## ${version}" isn't a version. Level-2 headings name versions; use ### inside a version.`,
      );
      current = undefined;
    } else if (sections.has(version)) {
      problems.push(`${version} has two sections.`);
      current = undefined;
    } else {
      current = { version, lines: [] };
    }
  }
  close();
  return { sections, problems };
}

/**
 * Computes what changed from one version of an item to the next: the RFC's
 * "what `ndop update` will do" notes. Files are named by target, such as
 * `{ui}/button/button.ts`, since that's where they land in a project.
 *
 * @param previous - The version before, or `undefined` for the first one.
 * @param current - The version described.
 * @returns The changes.
 *
 * @example
 * ```ts
 * const changes = versionChanges(button010, button011);
 * changes.files.changed; // ['{ui}/button/button.ts']
 * ```
 */
export function versionChanges(
  previous: RegistryItem | undefined,
  current: RegistryItem,
): VersionChanges {
  const filesOf = (item: RegistryItem | undefined) =>
    new Map((item?.files ?? []).map((file) => [file.path, file]));
  const before = filesOf(previous);
  const after = filesOf(current);
  const targetOf = (path: string) =>
    after.get(path)?.target ?? before.get(path)?.target ?? path;
  const files = {
    added: [...after.keys()].filter((path) => !before.has(path)),
    changed: [...after.keys()].filter(
      (path) =>
        before.has(path) &&
        (before.get(path)?.content !== after.get(path)?.content ||
          before.get(path)?.target !== after.get(path)?.target),
    ),
    removed: [...before.keys()].filter((path) => !after.has(path)),
  };

  const known = new Set(
    (previous?.migrations ?? []).map(
      (migration) => `${migration.from}>${migration.to ?? ''}`,
    ),
  );
  const migrations = (current.migrations ?? [])
    .filter(
      (migration) => !known.has(`${migration.from}>${migration.to ?? ''}`),
    )
    .map((migration) => ({
      from: targetOf(migration.from),
      ...(migration.to ? { to: targetOf(migration.to) } : {}),
    }));

  const packages = (item: RegistryItem | undefined) =>
    new Map(
      (item?.dependencies ?? []).map((spec) => [
        spec.replace(/(?<=.)@.*$/, ''),
        spec,
      ]),
    );
  const oldPackages = packages(previous);
  const newPackages = packages(current);
  const oldItems = new Set(previous?.registryDependencies ?? []);
  const newItems = new Set(current.registryDependencies ?? []);

  return {
    files: {
      added: files.added.map(targetOf),
      changed: files.changed.map(targetOf),
      removed: files.removed.map(targetOf),
    },
    migrations,
    codemods: (current.codemods ?? []).filter(
      (codemod) => codemod.since === current.version,
    ),
    dependencies: {
      added: [...newPackages]
        .filter(([name]) => !oldPackages.has(name))
        .map(([, spec]) => spec),
      changed: [...newPackages]
        .filter(
          ([name, spec]) =>
            oldPackages.has(name) && oldPackages.get(name) !== spec,
        )
        .map(([, spec]) => spec),
      removed: [...oldPackages.keys()].filter((name) => !newPackages.has(name)),
    },
    registryDependencies: {
      added: [...newItems].filter((name) => !oldItems.has(name)),
      removed: [...oldItems].filter((name) => !newItems.has(name)),
    },
  };
}

/**
 * Builds one item's changelog from its version snapshots and notes.
 *
 * @param name - The item.
 * @param versions - Every snapshotted version of it, in any order.
 * @param notes - Notes by version, from {@link parseChangelog}.
 * @returns The changelog, newest version first.
 */
export function itemChangelog(
  name: string,
  versions: readonly RegistryItem[],
  notes: ReadonlyMap<string, string>,
): Changelog {
  const ordered = [...versions].sort((a, b) =>
    compareVersions(a.version, b.version),
  );
  return {
    $schema: schemas.changelog.$id,
    name,
    versions: ordered
      .map((item, index) => ({
        version: item.version,
        notes: notes.get(item.version) ?? '',
        changes: versionChanges(ordered[index - 1], item),
      }))
      .reverse(),
  };
}
