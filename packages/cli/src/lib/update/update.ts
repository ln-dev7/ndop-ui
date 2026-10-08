import {
  conflictMarkers,
  normalizeText,
  threeWayMerge,
  type MergeOutcome,
} from '@ndop/merge';
import type { NdopLock, RegistryItem } from '@ndop/schema';
import { applyCss, updateCssVars } from '../edit/stylesheet';
import { CliError } from '../errors';
import { planAgentFiles } from '../install/agents';
import { planItems } from '../install/items';
import {
  pristineFiles,
  type FormatText,
  type PristineFile,
} from '../install/pristine';
import {
  LOCK_FILE,
  readAliasBase,
  readConfig,
  readLock,
  serializeLock,
  type InstallContext,
} from '../install/project-files';
import { dependencyName, sha256, type PlanBuilder } from '../plan/plan';
import {
  parseRef,
  resolveItems,
  type ItemRef,
  type RegistryClient,
  type ResolvedItem,
} from '../registry/client';
import { compareVersions } from '../registry/version';
import { newTypeErrors } from './typecheck';

/**
 * What `ndop update` did to one file (ADR-0020).
 *
 * - `replaced`: the user never edited it, so it became the new version.
 * - `merged`: the user's edits and upstream's merged cleanly.
 * - `unchanged`: there was nothing to apply.
 * - `created`: upstream added it.
 * - `kept`: left as it is; see its note.
 * - `conflict`: written with conflict markers.
 * - `unresolved`: it still has markers from an earlier update.
 * - `pending`: an earlier conflict looks resolved but wasn't recorded;
 *   `ndop update --continue` records it.
 * - `resolved`: recorded by `--continue`.
 * - `missing`: it was deleted, and isn't restored (ADR-0010, rule 7).
 */
export type FileStatus =
  | 'replaced'
  | 'merged'
  | 'unchanged'
  | 'created'
  | 'kept'
  | 'conflict'
  | 'unresolved'
  | 'pending'
  | 'resolved'
  | 'missing';

/** Statuses that leave work for the user and exit with code 2. */
export const NEEDS_ATTENTION: readonly FileStatus[] = [
  'conflict',
  'unresolved',
  'pending',
];

/** One file in an {@link ItemUpdate}. */
export interface FileUpdate {
  /** Project-relative path. */
  path: string;
  /** What happened to it. */
  status: FileStatus;
  /** 1-based lines of each conflict, for `conflict`. */
  conflictLines?: number[];
  /** Why, when the status alone doesn't say. */
  note?: string;
}

/** One item `ndop update` touched. */
export interface ItemUpdate {
  /** Registry namespace. */
  registry: string;
  /** Item name. */
  name: string;
  /** Version before. */
  from: string;
  /** Version after. */
  to: string;
  /** Each file. */
  files: FileUpdate[];
}

/** Options for {@link planUpdate}. */
export interface UpdateOptions {
  /**
   * Record files whose conflicts were resolved by hand, instead of
   * updating (ADR-0010, rule 6).
   */
  continue?: boolean;
}

/** What {@link planUpdate} planned. */
export interface PlannedUpdate {
  /** Items updated or installed, dependencies first. */
  items: ResolvedItem[];
  /** Per item, what happened to each file. */
  updates: ItemUpdate[];
}

/**
 * Stages `ndop update` (RFC-0001, ADR-0010, ADR-0020): for each installed
 * item with a newer version, or the version asked for, each file is
 * replaced when the user never edited it and three-way merged otherwise,
 * with the pristine file at its base version as the merge base. Conflicts
 * are written with markers and keep their old base in the lockfile. New
 * upstream files are created, files upstream dropped are left to the
 * user, theme variables are merged one by one, new npm and registry
 * dependencies are installed, and the agent files are refreshed.
 *
 * @param builder - The plan being built.
 * @param client - Registry client.
 * @param names - Items to update, optionally `@<version>`; every installed
 *   item when empty.
 * @param options - `continue` records resolved conflicts instead.
 * @returns The items and what happened to their files.
 * @throws {@link CliError} without `ndop.json`, for items that aren't
 *   installed, and for targets older than what's installed.
 *
 * @example
 * ```ts
 * const { updates } = await planUpdate(builder, client, ['button']);
 * ```
 */
export async function planUpdate(
  builder: PlanBuilder,
  client: RegistryClient,
  names: readonly string[],
  options: UpdateOptions = {},
): Promise<PlannedUpdate> {
  const config = await readConfig(builder);
  if (!config) {
    throw new CliError('No ndop.json here. Run ndop init first.');
  }
  const context: InstallContext = {
    config,
    aliasBase: await readAliasBase(builder, config.importAlias ?? '@/'),
  };
  const format: FormatText = (path, text) => builder.formatted(path, text);
  const installed = await readLock(builder);
  const refs = selected(installed, names);
  const pristine = pristineCache(client, context, format);

  if (options.continue) {
    const updates = await planContinue(builder, refs, pristine);
    if (updates.length > 0) {
      await planAgentFiles(builder, config, context.aliasBase);
    }
    return { items: [], updates };
  }

  const targets: ResolvedItem[] = [];
  for (const ref of refs) {
    const entry = installed.items[`${ref.registry}/${ref.name}`];
    const item = await client.get(ref);
    if (entry && compareVersions(item.version, entry.version) < 0) {
      throw new CliError(
        `${ref.registry}/${ref.name} ${item.version} is older than the installed ${entry.version}; ndop update only goes forward.`,
      );
    }
    targets.push({ ref: { registry: ref.registry, name: ref.name }, item });
  }

  const missing = targets.flatMap(({ ref, item }) =>
    (item.registryDependencies ?? [])
      .map((dependency) => parseRef(dependency, ref.registry))
      .filter((dependency) => !installed.items[keyOf(dependency)]),
  );
  const added = missing.length > 0 ? await resolveItems(client, missing) : [];
  if (added.length > 0) {
    await planItems(builder, context, added);
  }

  const lock = await readLock(builder);
  const before = serializeLock(lock);
  const updates: ItemUpdate[] = [];
  const updated: ResolvedItem[] = [];
  for (const target of ordered(targets)) {
    const key = keyOf(target.ref);
    const entry = lock.items[key];
    if (!entry) continue;
    const pending = entry.files.some((file) => file.version !== undefined);
    if (target.item.version === entry.version && !pending) continue;
    const update = await planItem(builder, context, pristine, entry, target);
    lock.items[key] = update.entry;
    updates.push(update.report);
    if (update.report.from !== update.report.to) updated.push(target);
  }

  const after = serializeLock(lock);
  if (after !== before) {
    await builder.stage(LOCK_FILE, after);
  }
  await warnOutdated(builder, client, lock, targets);
  if (added.length > 0 || updated.length > 0) {
    await planAgentFiles(builder, config, context.aliasBase);
  }
  return { items: [...added, ...updated], updates };
}

/** Pristine files of an item version, fetched and rebuilt once each. */
type PristineCache = (
  ref: ItemRef,
) => Promise<{ item: RegistryItem; files: Map<string, PristineFile> }>;

/**
 * Caches items and their pristine files by version for one command.
 *
 * @param client - Registry client.
 * @param context - Install context.
 * @param format - The project's formatter.
 * @returns The cache.
 */
function pristineCache(
  client: RegistryClient,
  context: InstallContext,
  format: FormatText,
): PristineCache {
  const cache = new Map<
    string,
    Promise<{ item: RegistryItem; files: Map<string, PristineFile> }>
  >();
  return (ref) => {
    const key = `${keyOf(ref)}@${ref.version ?? 'latest'}`;
    let entry = cache.get(key);
    if (!entry) {
      entry = client.get(ref).then(async (item) => ({
        item,
        files: await pristineFiles(context, format, item),
      }));
      cache.set(key, entry);
    }
    return entry;
  };
}

/**
 * Plans one item's update.
 *
 * @param builder - The plan.
 * @param context - Install context.
 * @param pristine - Pristine files by version.
 * @param entry - The item's lockfile entry.
 * @param target - The version to update to.
 * @returns The new lockfile entry and what happened.
 */
async function planItem(
  builder: PlanBuilder,
  context: InstallContext,
  pristine: PristineCache,
  entry: NdopLock['items'][string],
  target: ResolvedItem,
): Promise<{ entry: NdopLock['items'][string]; report: ItemUpdate }> {
  const ref = { registry: entry.registry, name: entry.name };
  const version = target.item.version;
  const targetFiles = await pristine({ ...ref, version });
  const byRegistryPath = new Map(
    [...targetFiles.files.values()].map((file) => [file.source.path, file]),
  );
  const files: NdopLock['items'][string]['files'] = [];
  const report: FileUpdate[] = [];
  const reached = new Set<string>();

  for (const installed of entry.files) {
    const baseVersion = installed.version ?? entry.version;
    const keep = (status: FileStatus, note?: string) => {
      files.push(
        baseVersion === version
          ? { path: installed.path, sha256: installed.sha256 }
          : { ...installed, version: baseVersion },
      );
      report.push({ path: installed.path, status, ...(note ? { note } : {}) });
    };
    const local = await builder.read(installed.path);
    if (local === undefined) {
      keep('missing', 'Deleted locally; not restored.');
      continue;
    }
    const markers = conflictMarkers(local);
    if (markers.count > 0 || !markers.wellFormed) {
      keep('unresolved', 'Resolve the conflict markers first.');
      continue;
    }
    if (installed.version !== undefined) {
      keep(
        'pending',
        'Resolved by hand? Run ndop update --continue to record it.',
      );
      continue;
    }
    const base = (await pristine({ ...ref, version: baseVersion })).files.get(
      installed.path,
    );
    if (!base) {
      keep(
        'kept',
        `It isn't in ${entry.name} ${baseVersion} as this project installs it; its aliases may have changed since.`,
      );
      continue;
    }
    const next = byRegistryPath.get(base.source.path);
    if (!next) {
      report.push({
        path: installed.path,
        status: 'kept',
        note: `${entry.name} ${version} no longer has it; it's yours now.`,
      });
      continue;
    }
    reached.add(next.path);
    if (next.path !== installed.path) {
      keep('kept', `${entry.name} ${version} moves it to ${next.path}.`);
      continue;
    }

    const record = () =>
      files.push({ path: installed.path, sha256: sha256(next.content) });
    if (sha256(local) === installed.sha256) {
      if (local === next.content) {
        report.push({ path: installed.path, status: 'unchanged' });
      } else {
        await builder.stage(installed.path, next.content, { format: false });
        report.push({ path: installed.path, status: 'replaced' });
      }
      record();
      continue;
    }

    const merge = (union: boolean): MergeOutcome =>
      threeWayMerge({
        base: base.content,
        local,
        remote: next.content,
        remoteVersion: version,
        union,
      });
    let outcome = merge(true);
    let note: string | undefined;
    if (outcome.unioned && installed.path.endsWith('.ts')) {
      const errors = newTypeErrors(installed.path, local, outcome.content);
      if (errors.length > 0) {
        outcome = merge(false);
        note = `Keeping both sides' additions didn't type-check (${errors[0]}).`;
      }
    }
    if (outcome.content !== local) {
      await builder.stage(installed.path, outcome.content, { format: false });
    }
    if (outcome.status === 'conflict') {
      files.push({ ...installed, version: baseVersion });
      report.push({
        path: installed.path,
        status: 'conflict',
        conflictLines: outcome.conflictLines,
        ...(note ? { note } : {}),
      });
      continue;
    }
    record();
    report.push({
      path: installed.path,
      status:
        outcome.status === 'merged'
          ? 'merged'
          : outcome.status === 'replaced'
            ? 'replaced'
            : 'unchanged',
    });
  }

  for (const file of targetFiles.files.values()) {
    if (reached.has(file.path)) continue;
    if (entry.files.some((installed) => installed.path === file.path)) continue;
    const local = await builder.read(file.path);
    if (local === undefined) {
      await builder.stage(file.path, file.content, { format: false });
      report.push({ path: file.path, status: 'created' });
    } else if (normalizeText(local) !== normalizeText(file.content)) {
      report.push({
        path: file.path,
        status: 'kept',
        note: `${entry.name} ${version} adds this file, but one is already here.`,
      });
      continue;
    } else {
      report.push({ path: file.path, status: 'unchanged' });
    }
    files.push({ path: file.path, sha256: sha256(file.content) });
  }

  const base = (await pristine({ ...ref, version: entry.version })).item;
  await planStyles(builder, context, base, target.item);
  builder.depend(target.item.dependencies ?? []);
  builder.depend(target.item.devDependencies ?? [], true);
  const kept = new Set(
    [
      ...(target.item.dependencies ?? []),
      ...(target.item.devDependencies ?? []),
    ].map(dependencyName),
  );
  for (const spec of [
    ...(base.dependencies ?? []),
    ...(base.devDependencies ?? []),
  ]) {
    if (!kept.has(dependencyName(spec))) {
      builder.warn(
        `${entry.name} ${version} no longer needs ${dependencyName(spec)}; remove it yourself if nothing else uses it.`,
      );
    }
  }
  return {
    entry: { name: entry.name, registry: entry.registry, version, files },
    report: {
      registry: entry.registry,
      name: entry.name,
      from: entry.version,
      to: version,
      files: report,
    },
  };
}

/**
 * Updates the stylesheet for an item's new version: theme variables one
 * by one (ADR-0020), and its `css` rules when they changed.
 *
 * @param builder - The plan.
 * @param context - Install context.
 * @param base - The installed version.
 * @param target - The version updated to.
 */
async function planStyles(
  builder: PlanBuilder,
  context: InstallContext,
  base: RegistryItem,
  target: RegistryItem,
): Promise<void> {
  const cssChanged =
    target.css && JSON.stringify(target.css) !== JSON.stringify(base.css);
  const varsChanged =
    target.cssVars &&
    JSON.stringify(target.cssVars) !== JSON.stringify(base.cssVars);
  if (!cssChanged && !varsChanged) return;
  const stylesheet = context.config.tailwind.css;
  let css = await builder.read(stylesheet);
  if (css === undefined) {
    throw new CliError(
      `${stylesheet} doesn't exist; ndop.json's tailwind.css must point at your global stylesheet.`,
      stylesheet,
    );
  }
  if (cssChanged && target.css) css = applyCss(css, target.css);
  if (varsChanged && target.cssVars) {
    const result = updateCssVars(css, base.cssVars, target.cssVars);
    css = result.css;
    for (const variable of result.kept) {
      builder.warn(
        `Kept your value of ${variable}; ${target.name} ${target.version} changed it too.`,
      );
    }
  }
  await builder.stage(stylesheet, css);
}

/**
 * Records conflicts resolved by hand: each pending file without markers
 * moves to its item's version, with that version's pristine hash, and is
 * not merged again (ADR-0010, rule 6).
 *
 * @param builder - The plan.
 * @param refs - Items to look at.
 * @param pristine - Pristine files by version.
 * @returns What happened to each pending file.
 */
async function planContinue(
  builder: PlanBuilder,
  refs: readonly ItemRef[],
  pristine: PristineCache,
): Promise<ItemUpdate[]> {
  const lock = await readLock(builder);
  const before = serializeLock(lock);
  const updates: ItemUpdate[] = [];
  for (const ref of refs) {
    const entry = lock.items[keyOf(ref)];
    if (!entry?.files.some((file) => file.version !== undefined)) continue;
    const current = await pristine({ ...ref, version: entry.version });
    const report: FileUpdate[] = [];
    entry.files = await Promise.all(
      entry.files.map(async (file) => {
        if (file.version === undefined) return file;
        const local = await builder.read(file.path);
        const markers =
          local === undefined ? undefined : conflictMarkers(local);
        const next = current.files.get(file.path);
        if (!markers) {
          report.push({ path: file.path, status: 'missing' });
          return file;
        }
        if (markers.count > 0 || !markers.wellFormed) {
          report.push({
            path: file.path,
            status: 'unresolved',
            note: 'Resolve the conflict markers first.',
          });
          return file;
        }
        if (!next) {
          report.push({
            path: file.path,
            status: 'kept',
            note: `${entry.name} ${entry.version} no longer has it.`,
          });
          return file;
        }
        report.push({ path: file.path, status: 'resolved' });
        return { path: file.path, sha256: sha256(next.content) };
      }),
    );
    updates.push({
      registry: entry.registry,
      name: entry.name,
      from: entry.version,
      to: entry.version,
      files: report,
    });
  }
  const after = serializeLock(lock);
  if (after !== before) await builder.stage(LOCK_FILE, after);
  return updates;
}

/**
 * Reports installed registry dependencies of the updated items that have
 * a newer version but weren't asked for: `ndop update` updates only the
 * items it's given (ADR-0020).
 *
 * @param builder - The plan, which receives the warnings.
 * @param client - Registry client.
 * @param lock - The lockfile.
 * @param targets - Items being updated.
 */
async function warnOutdated(
  builder: PlanBuilder,
  client: RegistryClient,
  lock: NdopLock,
  targets: readonly ResolvedItem[],
): Promise<void> {
  const updating = new Set(targets.map(({ ref }) => keyOf(ref)));
  const checked = new Set<string>();
  for (const { ref, item } of targets) {
    for (const dependency of item.registryDependencies ?? []) {
      const dependencyRef = parseRef(dependency, ref.registry);
      const key = keyOf(dependencyRef);
      const entry = lock.items[key];
      if (!entry || updating.has(key) || checked.has(key)) continue;
      checked.add(key);
      const latest = await client.get(dependencyRef);
      if (compareVersions(latest.version, entry.version) > 0) {
        builder.warn(
          `${key} ${latest.version} is out; run ndop update ${dependencyRef.name} too.`,
        );
      }
    }
  }
}

/**
 * The installed items a command names, or all of them.
 *
 * @param lock - The lockfile.
 * @param names - Names from the command line.
 * @returns Their references, with any version asked for.
 * @throws {@link CliError} for items that aren't installed.
 */
function selected(lock: NdopLock, names: readonly string[]): ItemRef[] {
  if (names.length === 0) {
    return Object.values(lock.items).map(({ registry, name }) => ({
      registry,
      name,
    }));
  }
  return names.map((name) => {
    const ref = parseRef(name);
    if (!lock.items[keyOf(ref)]) {
      throw new CliError(
        `${keyOf(ref)} isn't installed. Run ndop add ${name} instead.`,
      );
    }
    return ref;
  });
}

/**
 * Orders items so each comes after the items it depends on.
 *
 * @param targets - Items to update.
 * @returns The same items, dependencies first.
 */
function ordered(targets: readonly ResolvedItem[]): ResolvedItem[] {
  const byKey = new Map(targets.map((target) => [keyOf(target.ref), target]));
  const result: ResolvedItem[] = [];
  const seen = new Set<string>();
  const visit = (target: ResolvedItem) => {
    const key = keyOf(target.ref);
    if (seen.has(key)) return;
    seen.add(key);
    for (const dependency of target.item.registryDependencies ?? []) {
      const found = byKey.get(keyOf(parseRef(dependency, target.ref.registry)));
      if (found) visit(found);
    }
    result.push(target);
  };
  targets.forEach(visit);
  return result;
}

/**
 * The lockfile key of an item.
 *
 * @param ref - Its reference.
 * @returns `@namespace/name`.
 */
function keyOf(ref: ItemRef): string {
  return `${ref.registry}/${ref.name}`;
}
