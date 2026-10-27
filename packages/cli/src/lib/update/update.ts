import {
  conflictMarkers,
  normalizeText,
  partialRemote,
  threeWayMerge,
  upstreamHunks,
  type MergeOutcome,
  type UpstreamHunk,
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
  itemKey,
  itemOrigin,
  lockedRef,
  parseRef,
  resolveItems,
  versionedUrl,
  type ItemRef,
  type RegistryClient,
  type ResolvedItem,
} from '../registry/client';
import { compareVersions } from '../registry/version';
import { followMigrations } from './diff';
import { newTypeErrors } from './typecheck';
import {
  codemodsBetween,
  renameExports,
  moveExports,
  nativeDialogs,
  renameInlineInputs,
  renameInputs,
  type AngularCompiler,
  type Codemod,
} from './codemods';

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
 * - `renamed`: upstream moved it, through a migration; your edits moved
 *   with it.
 * - `deleted`: upstream deleted it, through a migration, and you hadn't
 *   edited it.
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
  | 'missing'
  | 'renamed'
  | 'deleted';

/** Statuses that leave work for the user and exit with code 2. */
export const NEEDS_ATTENTION: readonly FileStatus[] = [
  'conflict',
  'unresolved',
  'pending',
];

/** One file in an {@link ItemUpdate}. */
export interface FileUpdate {
  /** Project-relative path, after any move. */
  path: string;
  /** Where it was, when upstream moved it. */
  from?: string;
  /** What happened to it. */
  status: FileStatus;
  /** 1-based lines of each conflict, for `conflict`. */
  conflictLines?: number[];
  /** Why, when the status alone doesn't say. */
  note?: string;
}

/** One item `ndop update` touched. */
export interface ItemUpdate {
  /** Registry namespace; absent for an item installed by URL. */
  registry?: string;
  /** The URL an item installed by URL comes from (ADR-0025). */
  source?: string;
  /** Item name. */
  name: string;
  /** Version before. */
  from: string;
  /** Version after. */
  to: string;
  /** Each file. */
  files: FileUpdate[];
  /** Codemods run on the project's own files, with the files each changed. */
  codemods?: (Codemod & { files: string[] })[];
}

/**
 * Asks which of upstream's hunks to apply to a file, for `--interactive`.
 *
 * @param path - Project path of the file.
 * @param hunks - Upstream's changes to it, in file order.
 * @returns Indexes of the accepted hunks.
 */
export type ChooseHunks = (
  path: string,
  hunks: readonly UpstreamHunk[],
) => Promise<number[]>;

/** Options for {@link planUpdate}. */
export interface UpdateOptions {
  /**
   * Asks which upstream hunks to apply to each file that needs a merge
   * (ADR-0020, `--interactive`); all of them when left out.
   */
  chooseHunks?: ChooseHunks;
  /**
   * Loads the project's `@angular/compiler`, for `rename-input` codemods.
   */
  angularCompiler?: () => Promise<AngularCompiler | undefined>;
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
 * dependencies are installed, and the agent files are refreshed. An item
 * installed by URL is fetched from that URL again; when its host has no
 * versioned URL for the merge base, untouched files are replaced and
 * edited ones kept and reported (ADR-0025).
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
    const entry = installed.items[itemKey(ref)];
    const item = await client.get(ref);
    if (entry && compareVersions(item.version, entry.version) < 0) {
      throw new CliError(
        `${itemKey(ref)} ${item.version} is older than the installed ${entry.version}; ndop update only goes forward.`,
      );
    }
    targets.push({
      ref: {
        registry: ref.registry,
        name: ref.name,
        ...(ref.url ? { url: ref.url } : {}),
      },
      item,
    });
  }

  const missing = targets.flatMap(({ ref, item }) =>
    (item.registryDependencies ?? [])
      .map((dependency) => parseRef(dependency, ref.registry))
      .filter((dependency) => !installed.items[itemKey(dependency)]),
  );
  const added = missing.length > 0 ? await resolveItems(client, missing) : [];
  if (added.length > 0) {
    await planItems(builder, context, added);
  }

  const lock = await readLock(builder);
  const before = serializeLock(lock);
  const updates: ItemUpdate[] = [];
  const updated: ResolvedItem[] = [];
  let loaded: Promise<AngularCompiler | undefined> | undefined;
  const compiler = () =>
    (loaded ??= options.angularCompiler?.() ?? Promise.resolve(undefined));
  for (const target of ordered(targets)) {
    const key = itemKey(target.ref);
    const entry = lock.items[key];
    if (!entry) continue;
    const pending = entry.files.some((file) => file.version !== undefined);
    if (target.item.version === entry.version && !pending) continue;
    const codemods = codemodsBetween(target.item, entry.version);
    const ran =
      codemods.length > 0
        ? await planCodemods(builder, context, pristine, entry, target, {
            codemods,
            compiler,
          })
        : [];
    const update = await planItem(
      builder,
      context,
      pristine,
      entry,
      target,
      options,
    );
    lock.items[key] = update.entry;
    updates.push(
      ran.length > 0 ? { ...update.report, codemods: ran } : update.report,
    );
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
    const key = `${itemKey(ref)}@${ref.version ?? 'latest'}`;
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
 * @param options - Hunk choices.
 * @returns The new lockfile entry and what happened.
 */
async function planItem(
  builder: PlanBuilder,
  context: InstallContext,
  pristine: PristineCache,
  entry: NdopLock['items'][string],
  target: ResolvedItem,
  options: UpdateOptions,
): Promise<{ entry: NdopLock['items'][string]; report: ItemUpdate }> {
  const ref = lockedRef(entry);
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
    const baseFiles = await baseOf(pristine, { ...ref, version: baseVersion });
    if (!baseFiles) {
      const next = targetFiles.files.get(installed.path);
      if (!next) {
        report.push({
          path: installed.path,
          status: 'kept',
          note: `${entry.name} ${version} no longer has it; it's yours now.`,
        });
        continue;
      }
      reached.add(next.path);
      if (sha256(local) !== installed.sha256) {
        keep(
          'kept',
          `Kept your edits: there's no ${versionedUrl(ref.url ?? '', baseVersion)} to merge with. Bring in ${entry.name} ${version}'s changes by hand, then run ndop update --continue.`,
        );
        continue;
      }
      if (local !== next.content) {
        await builder.stage(next.path, next.content, { format: false });
      }
      files.push({ path: next.path, sha256: sha256(next.content) });
      report.push({
        path: next.path,
        status: local === next.content ? 'unchanged' : 'replaced',
      });
      continue;
    }
    const base = baseFiles.files.get(installed.path);
    if (!base) {
      keep(
        'kept',
        `It isn't in ${entry.name} ${baseVersion} as this project installs it; its aliases may have changed since.`,
      );
      continue;
    }
    const unedited = sha256(local) === installed.sha256;
    const moved = followMigrations(target.item, base.source.path);
    if (moved.deleted) {
      if (unedited) {
        builder.remove(installed.path);
        report.push({ path: installed.path, status: 'deleted' });
      } else {
        report.push({
          path: installed.path,
          status: 'kept',
          note: `${entry.name} ${version} deletes it; kept because you edited it. It's yours now.`,
        });
      }
      continue;
    }
    const next = byRegistryPath.get(moved.path);
    if (!next) {
      report.push({
        path: installed.path,
        status: 'kept',
        note: `${entry.name} ${version} no longer has it; it's yours now.`,
      });
      continue;
    }
    reached.add(next.path);
    const path = next.path;
    const from = path === installed.path ? undefined : installed.path;
    if (from) {
      const taken =
        (await builder.read(path)) !== undefined &&
        !entry.files.some((file) => file.path === path);
      if (taken) {
        keep(
          'kept',
          `${entry.name} ${version} moves it to ${path}, but a file is already there.`,
        );
        continue;
      }
      builder.remove(from);
      builder.warn(`${from} moved to ${path}; update the imports of it.`);
    }
    const moveNote = from ? { from } : {};

    if (unedited) {
      if (from || local !== next.content) {
        await builder.stage(path, next.content, { format: false });
      }
      files.push({ path, sha256: sha256(next.content) });
      report.push({
        path,
        status: from
          ? 'renamed'
          : local === next.content
            ? 'unchanged'
            : 'replaced',
        ...moveNote,
      });
      continue;
    }

    const { outcome, note } = await mergeFile(
      path,
      base.content,
      local,
      next.content,
      version,
      options.chooseHunks,
    );
    if (from || outcome.content !== local) {
      await builder.stage(path, outcome.content, { format: false });
    }
    if (outcome.status === 'conflict') {
      files.push({ path, sha256: installed.sha256, version: baseVersion });
      report.push({
        path,
        status: 'conflict',
        conflictLines: outcome.conflictLines,
        ...moveNote,
        ...(note ? { note } : {}),
      });
      continue;
    }
    files.push({ path, sha256: sha256(next.content) });
    report.push({
      path,
      status: from
        ? 'renamed'
        : outcome.status === 'merged'
          ? 'merged'
          : outcome.status === 'replaced'
            ? 'replaced'
            : 'unchanged',
      ...moveNote,
      ...(note ? { note } : {}),
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

  const base = (await baseOf(pristine, { ...ref, version: entry.version }))
    ?.item;
  await planStyles(builder, context, base, target.item);
  // A newly required range must replace an installed older package too;
  // name-only dependency checks would leave native markup on 1.x runtimes.
  for (const dev of [false, true]) {
    const field = dev ? 'devDependencies' : 'dependencies';
    const previous = new Map(
      (base?.[field] ?? []).map((spec) => [dependencyName(spec), spec]),
    );
    for (const spec of target.item[field] ?? []) {
      const name = dependencyName(spec);
      builder.depend([spec], dev, spec !== name && previous.get(name) !== spec);
    }
  }
  const kept = new Set(
    [
      ...(target.item.dependencies ?? []),
      ...(target.item.devDependencies ?? []),
    ].map(dependencyName),
  );
  for (const spec of [
    ...(base?.dependencies ?? []),
    ...(base?.devDependencies ?? []),
  ]) {
    if (!kept.has(dependencyName(spec))) {
      builder.warn(
        `${entry.name} ${version} no longer needs ${dependencyName(spec)}; remove it yourself if nothing else uses it.`,
      );
    }
  }
  return {
    entry: { name: entry.name, ...itemOrigin(ref), version, files },
    report: {
      ...itemOrigin(ref),
      name: entry.name,
      from: entry.version,
      to: version,
      files: report,
    },
  };
}

/** The codemods {@link planCodemods} runs, and what it runs them with. */
interface CodemodRun {
  /** The codemods the update crosses. */
  codemods: readonly Codemod[];
  /** Loads the project's Angular compiler, once. */
  compiler: () => Promise<AngularCompiler | undefined>;
}

/**
 * Runs an update's codemods on the project's own files under `src/`:
 * everything but the item's files, which the merge updates (ADR-0020).
 *
 * @param builder - The plan.
 * @param context - Install context.
 * @param pristine - Pristine files by version.
 * @param entry - The item's lockfile entry.
 * @param target - The version updated to.
 * @param run - The codemods and the compiler.
 * @returns Each codemod with the files it changed.
 */
async function planCodemods(
  builder: PlanBuilder,
  context: InstallContext,
  pristine: PristineCache,
  entry: NdopLock['items'][string],
  target: ResolvedItem,
  run: CodemodRun,
): Promise<(Codemod & { files: string[] })[]> {
  const targetFiles = await pristine({
    ...lockedRef(entry),
    version: target.item.version,
  });
  const itemFiles = new Set([
    ...entry.files.map((file) => file.path),
    ...targetFiles.files.keys(),
  ]);
  const modules = [...itemFiles].map((path) => path.replace(/\.ts$/, ''));
  const sources = (await builder.fs.list('src')).filter(
    (path) =>
      !itemFiles.has(path) && (path.endsWith('.ts') || path.endsWith('.html')),
  );
  const ran: (Codemod & { files: string[] })[] = [];
  for (const codemod of run.codemods) {
    const compiler =
      codemod.kind === 'rename-input' || codemod.kind === 'native-dialog'
        ? await run.compiler()
        : undefined;
    if (
      (codemod.kind === 'rename-input' || codemod.kind === 'native-dialog') &&
      !compiler
    ) {
      if (codemod.kind === 'native-dialog')
        throw new CliError(
          'Install @angular/compiler in the project before updating native dialogs. No files have been written.',
        );
      builder.warn(
        `Couldn't load @angular/compiler, so rename the ${codemod.from} input to ${codemod.to} on ${codemod.selector} in your templates yourself.`,
      );
      continue;
    }
    const changed: string[] = [];
    for (const path of sources) {
      const text = await builder.read(path);
      if (text === undefined) continue;
      const next =
        codemod.kind === 'rename-export' || codemod.kind === 'move-export'
          ? path.endsWith('.ts')
            ? codemod.kind === 'move-export'
              ? moveExports(context, path, text, modules, [codemod])
              : renameExports(context, path, text, modules, [codemod])
            : text
          : compiler && path.endsWith('.ts')
            ? renameInlineInputs(compiler, path, text, [codemod])
            : compiler
              ? nativeDialogs(
                  compiler,
                  renameInputs(compiler, text, [codemod]),
                  [codemod],
                )
              : text;
      if (next !== text) {
        await builder.stage(path, next, { format: false });
        changed.push(path);
      }
    }
    ran.push({ ...codemod, files: changed });
  }
  return ran;
}

/**
 * Merges one edited file (ADR-0003): with `chooseHunks`, only the upstream
 * hunks the user accepts are merged; a union of insertions that adds type
 * errors to a `.ts` file is merged again without it.
 *
 * @param path - Project path, for the type check and the prompt.
 * @param base - Pristine file at its base version.
 * @param local - The file on disk.
 * @param remote - Pristine file at the target version.
 * @param version - Target version, for the conflict markers.
 * @param chooseHunks - Asks which upstream hunks to apply.
 * @returns The outcome, and a note when it needs explaining.
 */
async function mergeFile(
  path: string,
  base: string,
  local: string,
  remote: string,
  version: string,
  chooseHunks: ChooseHunks | undefined,
): Promise<{ outcome: MergeOutcome; note?: string }> {
  let applied = remote;
  let note: string | undefined;
  if (chooseHunks) {
    const hunks = upstreamHunks(base, remote);
    if (hunks.length > 0) {
      const accepted = await chooseHunks(path, hunks);
      if (accepted.length < hunks.length) {
        applied = partialRemote(base, remote, accepted);
        note = `Skipped ${hunks.length - accepted.length} of ${hunks.length} upstream changes.`;
      }
    }
  }
  const merge = (union: boolean): MergeOutcome =>
    threeWayMerge({
      base,
      local,
      remote: applied,
      remoteVersion: version,
      union,
      // TypeScript merges declaration by declaration first (ADR-0003,
      // amendment 2).
      structural: path.endsWith('.ts'),
    });
  let outcome = merge(true);
  if (outcome.unioned && path.endsWith('.ts')) {
    const errors = newTypeErrors(path, local, outcome.content);
    if (errors.length > 0) {
      outcome = merge(false);
      note = [
        note,
        `Keeping both sides' additions didn't type-check (${errors[0]}).`,
      ]
        .filter(Boolean)
        .join(' ');
    }
  }
  return note ? { outcome, note } : { outcome };
}

/**
 * Updates the stylesheet for an item's new version: theme variables one
 * by one (ADR-0020), and its `css` rules when they changed.
 *
 * @param builder - The plan.
 * @param context - Install context.
 * @param base - The installed version; unknown for a URL item without
 *   versioned URLs, when only variables the stylesheet lacks are added.
 * @param target - The version updated to.
 */
async function planStyles(
  builder: PlanBuilder,
  context: InstallContext,
  base: RegistryItem | undefined,
  target: RegistryItem,
): Promise<void> {
  const cssChanged =
    target.css && JSON.stringify(target.css) !== JSON.stringify(base?.css);
  const varsChanged =
    target.cssVars &&
    JSON.stringify(target.cssVars) !== JSON.stringify(base?.cssVars);
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
    const result = updateCssVars(css, base?.cssVars, target.cssVars);
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
    const entry = lock.items[itemKey(ref)];
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
      ...itemOrigin(ref),
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
  const updating = new Set(targets.map(({ ref }) => itemKey(ref)));
  const checked = new Set<string>();
  for (const { ref, item } of targets) {
    for (const dependency of item.registryDependencies ?? []) {
      const dependencyRef = parseRef(dependency, ref.registry);
      const key = itemKey(dependencyRef);
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
    return Object.values(lock.items).map(lockedRef);
  }
  return names.map((name) => {
    const ref = parseRef(name);
    const entry = lock.items[itemKey(ref)];
    if (!entry) {
      throw new CliError(
        `${itemKey(ref)} isn't installed. Run ndop add ${name} instead.`,
      );
    }
    return ref.version
      ? { ...lockedRef(entry), version: ref.version }
      : lockedRef(entry);
  });
}

/**
 * An item version's pristine files, or `undefined` when a URL item's
 * version can't be fetched: its host doesn't publish versioned URLs
 * (ADR-0025).
 *
 * @param pristine - Pristine files by version.
 * @param ref - The item and version.
 * @returns The item and its files, if there are any to merge with.
 */
async function baseOf(
  pristine: PristineCache,
  ref: ItemRef,
): Promise<Awaited<ReturnType<PristineCache>> | undefined> {
  if (!ref.url) return pristine(ref);
  try {
    return await pristine(ref);
  } catch (error) {
    if (error instanceof CliError) return undefined;
    throw error;
  }
}

/**
 * Orders items so each comes after the items it depends on.
 *
 * @param targets - Items to update.
 * @returns The same items, dependencies first.
 */
function ordered(targets: readonly ResolvedItem[]): ResolvedItem[] {
  const byKey = new Map(targets.map((target) => [itemKey(target.ref), target]));
  const result: ResolvedItem[] = [];
  const seen = new Set<string>();
  const visit = (target: ResolvedItem) => {
    const key = itemKey(target.ref);
    if (seen.has(key)) return;
    seen.add(key);
    for (const dependency of target.item.registryDependencies ?? []) {
      const found = byKey.get(
        itemKey(parseRef(dependency, target.ref.registry)),
      );
      if (found) visit(found);
    }
    result.push(target);
  };
  targets.forEach(visit);
  return result;
}
