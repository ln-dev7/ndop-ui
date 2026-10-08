import type { NdopLock, RegistryItem } from '@ndop/schema';
import { conflictMarkers, normalizeText } from '@ndop/merge';
import { createTwoFilesPatch } from 'diff';
import { CliError } from '../errors';
import {
  pristineFiles,
  type FormatText,
  type PristineFile,
} from '../install/pristine';
import type { InstallContext } from '../install/project-files';
import { sha256 } from '../plan/plan';
import {
  parseRef,
  type ItemRef,
  type RegistryClient,
} from '../registry/client';
import { compareVersions } from '../registry/version';

/**
 * How an installed file compares with what was installed (ADR-0010).
 *
 * - `unchanged`: it hashes to the lockfile's `sha256`.
 * - `edited`: it differs; the user changed it, or an update merged into it.
 * - `conflicted`: it still has conflict markers from an update.
 * - `missing`: it isn't on disk.
 */
export type LocalState = 'unchanged' | 'edited' | 'conflicted' | 'missing';

/**
 * What upstream did to an installed file between its base version and the
 * target.
 */
export type UpstreamState = 'unchanged' | 'changed' | 'renamed' | 'removed';

/** One installed file in a {@link ItemDiff}. */
export interface FileDiff {
  /** Project-relative path. */
  path: string;
  /** Its base version: the item's, or its own when pending (ADR-0010). */
  baseVersion: string;
  /** How it compares with what was installed. */
  local: LocalState;
  /** What upstream changed. */
  upstream: UpstreamState;
  /** Where it moves, for `renamed`. */
  renamedTo?: string;
  /** Unified diff of the user's changes: base against disk. */
  localPatch?: string;
  /** Unified diff of upstream's changes: base against target. */
  upstreamPatch?: string;
}

/** An installed item compared with its base and a target version. */
export interface ItemDiff {
  /** Registry namespace. */
  registry: string;
  /** Item name. */
  name: string;
  /** Installed version. */
  version: string;
  /** Version compared against: the latest, or `--to`. */
  target: string;
  /** Each installed file. */
  files: FileDiff[];
  /** Files the target adds, by project path. */
  added: string[];
  /** Codemods an update to the target would run (ADR-0020). */
  codemods: NonNullable<RegistryItem['codemods']>;
  /** Things that make the diff less exact. */
  warnings: string[];
}

/** Inputs to {@link diffItems}. */
export interface DiffInput {
  /** Reads project files. */
  reader: { read(path: string): Promise<string | undefined> };
  /** The project's formatter. */
  format: FormatText;
  /** Where files go and how they import each other. */
  context: InstallContext;
  /** The project's lockfile. */
  lock: NdopLock;
  /** Registry client. */
  client: RegistryClient;
  /** Items to compare, as `name` or `@namespace/name`; all when empty. */
  names: readonly string[];
  /** A target version instead of the latest; one item only. */
  to?: string;
}

/**
 * Compares installed items with what was installed and with a newer
 * version: `ndop diff` (ADR-0020). Each file's base is rebuilt pristine
 * from the immutable `<name>@<version>` snapshot (ADR-0010), so the user's
 * changes are told apart from upstream's.
 *
 * @param input - Project, lockfile, registry and which items.
 * @returns One entry per item, in lockfile order.
 * @throws {@link CliError} for items that aren't installed, a `to` with
 *   other than one item, and registry failures.
 *
 * @example
 * ```ts
 * const [button] = await diffItems({ reader, format, context, lock, client, names: ['button'] });
 * button.files.filter((file) => file.local === 'edited');
 * ```
 */
export async function diffItems(input: DiffInput): Promise<ItemDiff[]> {
  const { lock, client } = input;
  const keys = input.names.length
    ? input.names.map((name) => {
        const ref = parseRef(name);
        const key = `${ref.registry}/${ref.name}`;
        if (!lock.items[key]) {
          throw new CliError(
            `${key} isn't installed. Run ndop add ${name} first.`,
          );
        }
        return key;
      })
    : Object.keys(lock.items);
  if (input.to !== undefined && keys.length !== 1) {
    throw new CliError('--to compares one item; name it.');
  }

  const pristine = new Map<string, Promise<Map<string, PristineFile>>>();
  const files = (ref: ItemRef, item: Promise<RegistryItem>) => {
    const key = `${ref.registry}/${ref.name}@${ref.version ?? 'latest'}`;
    let cached = pristine.get(key);
    if (!cached) {
      cached = item.then((fetched) =>
        pristineFiles(input.context, input.format, fetched),
      );
      pristine.set(key, cached);
    }
    return cached;
  };

  const diffs: ItemDiff[] = [];
  for (const key of keys) {
    const entry = lock.items[key];
    if (!entry) continue;
    const ref: ItemRef = { registry: entry.registry, name: entry.name };
    const targetRef: ItemRef = input.to ? { ...ref, version: input.to } : ref;
    const target = await client.get(targetRef);
    if (compareVersions(target.version, entry.version) < 0) {
      throw new CliError(
        `${key} ${target.version} is older than the installed ${entry.version}.`,
      );
    }
    const targetFiles = await files(targetRef, Promise.resolve(target));
    const byRegistryPath = new Map(
      [...targetFiles.values()].map((file) => [file.source.path, file]),
    );
    const warnings: string[] = [];
    const reached = new Set<string>();
    const fileDiffs: FileDiff[] = [];

    for (const installed of entry.files) {
      const baseVersion = installed.version ?? entry.version;
      const baseRef = { ...ref, version: baseVersion };
      const base = (await files(baseRef, client.get(baseRef))).get(
        installed.path,
      );
      const text = await input.reader.read(installed.path);
      const local = localState(text, installed.sha256);
      if (!base) {
        warnings.push(
          `${installed.path} isn't in ${entry.name} ${baseVersion} as this project installs it; its aliases may have changed since.`,
        );
        fileDiffs.push({
          path: installed.path,
          baseVersion,
          local,
          upstream: 'unchanged',
        });
        continue;
      }
      if (sha256(base.content) !== installed.sha256) {
        warnings.push(
          `${installed.path}: the project's formatting or aliases changed since ${baseVersion} was installed, so its diffs show more than your edits.`,
        );
      }
      const moved = followMigrations(target, base.source.path);
      const next = moved.deleted ? undefined : byRegistryPath.get(moved.path);
      if (next) reached.add(next.path);
      const upstream: UpstreamState = !next
        ? 'removed'
        : next.path !== installed.path
          ? 'renamed'
          : normalizeText(next.content) === normalizeText(base.content)
            ? 'unchanged'
            : 'changed';
      fileDiffs.push({
        path: installed.path,
        baseVersion,
        local,
        upstream,
        ...(upstream === 'renamed' && next ? { renamedTo: next.path } : {}),
        ...(text !== undefined && local !== 'unchanged'
          ? {
              localPatch: patch(
                installed.path,
                base.content,
                text,
                `ndop@${baseVersion}`,
                'local',
              ),
            }
          : {}),
        ...(next && upstream !== 'unchanged'
          ? {
              upstreamPatch: patch(
                next.path,
                base.content,
                next.content,
                `ndop@${baseVersion}`,
                `ndop@${target.version}`,
              ),
            }
          : {}),
      });
    }

    diffs.push({
      registry: entry.registry,
      name: entry.name,
      version: entry.version,
      target: target.version,
      files: fileDiffs,
      added: [...targetFiles.keys()].filter(
        (path) =>
          !reached.has(path) &&
          !entry.files.some((installed) => installed.path === path),
      ),
      codemods: (target.codemods ?? []).filter(
        (codemod) =>
          compareVersions(codemod.since, entry.version) > 0 &&
          compareVersions(codemod.since, target.version) <= 0,
      ),
      warnings,
    });
  }
  return diffs;
}

/**
 * Where a registry file ends up in a newer version of its item, following
 * the item's migrations, chains included (ADR-0020).
 *
 * @param item - The newer version.
 * @param path - The file's registry path in the older version.
 * @returns Its registry path in the newer version, or `deleted`.
 *
 * @example
 * ```ts
 * followMigrations(item, 'ui/card/card.ts'); // { path: 'ui/card/card-root.ts', deleted: false }
 * ```
 */
export function followMigrations(
  item: RegistryItem,
  path: string,
): { path: string; deleted: boolean } {
  const present = new Set((item.files ?? []).map((file) => file.path));
  const seen = new Set<string>();
  let current = path;
  while (!present.has(current) && !seen.has(current)) {
    seen.add(current);
    const migration = item.migrations?.find((entry) => entry.from === current);
    if (!migration) break;
    if (migration.to === undefined) return { path: current, deleted: true };
    current = migration.to;
  }
  return { path: current, deleted: false };
}

/**
 * How an installed file compares with what was installed (ADR-0010).
 *
 * @param text - The file on disk, or `undefined` when it's gone.
 * @param recorded - Its `sha256` in the lockfile.
 * @returns Its state.
 *
 * @example
 * ```ts
 * localState(await fs.read(file.path), file.sha256); // 'edited'
 * ```
 */
export function localState(
  text: string | undefined,
  recorded: string,
): LocalState {
  return text === undefined
    ? 'missing'
    : hasMarkers(text)
      ? 'conflicted'
      : sha256(text) === recorded
        ? 'unchanged'
        : 'edited';
}

/**
 * Whether a file still has conflict markers, complete or not.
 *
 * @param text - File content.
 * @returns Whether it needs resolving.
 */
function hasMarkers(text: string): boolean {
  const markers = conflictMarkers(text);
  return markers.count > 0 || !markers.wellFormed;
}

/**
 * A unified diff, ignoring line-ending differences.
 *
 * @param path - File path, in both headers.
 * @param before - Old text.
 * @param after - New text.
 * @param from - Label of the old side.
 * @param to - Label of the new side.
 * @returns The patch.
 */
function patch(
  path: string,
  before: string,
  after: string,
  from: string,
  to: string,
): string {
  return createTwoFilesPatch(
    `a/${path}`,
    `b/${path}`,
    normalizeText(before),
    normalizeText(after),
    from,
    to,
  );
}
