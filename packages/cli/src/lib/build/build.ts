import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { extractMetadata } from '@ndop/metadata';
import {
  schemas,
  validate,
  type Registry,
  type RegistryItem,
} from '@ndop/schema';
import { themeContrast } from '@ndop/schema/theme';
import { DOCUMENTED_TYPES, itemChangelog, parseChangelog } from './changelog';
import { compileFiles, writeScratchTsconfig } from './compile';
import { checkExports, checkImports, sourceProject } from './sources';
import { themeFromCss } from './theme';
import type {
  BuildIssue,
  BuildOptions,
  BuildResult,
  SnapshotStatus,
} from './types';

/** The registry's license and notices, served next to its items. */
const LICENSE_FILE = 'LICENSE.txt';

/**
 * Builds a registry: validates the source manifest and every item, checks
 * imports and exports, type-checks the items with `ngc`, checks version
 * snapshots, then writes the static registry (ADR-0012):
 *
 * - `<output>/r/index.json`: the manifest, items without file contents;
 * - `<output>/r/<name>.json`: each item's latest version, with contents;
 * - `<output>/r/<name>@<version>.json`: every snapshotted version, the
 *   immutable merge bases `ndop update` reads;
 * - `<output>/r/metadata/<name>.json`: each `registry:ui` item's API,
 *   accessibility contract and docs notes (ADR-0007), which fail the build
 *   when incomplete;
 * - `<output>/r/changelog/<name>.json`: each item's versions, newest first,
 *   with the notes from `<root>/changelog/<name>.md` and what changed since
 *   the version before (ADR-0020). Items with docs pages (`registry:ui`,
 *   `registry:block`, `registry:theme`) fail the build without a section
 *   for every version.
 * - `<output>/r/LICENSE.txt`: `<root>/LICENSE.txt` as it is, when the
 *   registry has one, so the license and third-party notices of the items
 *   are served with them (ADR-0014, amendment 2).
 *
 * A snapshot is written to `<root>/snapshots/<name>@<version>.json` the
 * first time a version is built, and must be committed. If one already
 * exists and the item now builds differently, the build fails: the item
 * changed without a version bump.
 *
 * `registry:theme` items without `cssVars` read them from
 * `<root>/themes/<name>/theme.css` (see {@link themeFromCss}), so a theme's
 * tokens live in one stylesheet that apps and tests can import directly.
 * A theme fails the build when a text color in it is under 4.5:1 against
 * its background, in light or dark (ADR-0023; see {@link contrastProblems}).
 *
 * Nothing is written when any check fails, or with `dryRun`.
 *
 * @param options - Where the registry is and where it goes.
 * @returns What was built, written and found wrong.
 *
 * @example
 * ```ts
 * const result = await buildRegistry({ root: 'registry', output: 'dist/registry' });
 * if (!result.ok) process.exitCode = 1;
 * ```
 */
export async function buildRegistry(
  options: BuildOptions,
): Promise<BuildResult> {
  const { root, output } = options;
  const frozen = options.frozenSnapshots ?? Boolean(process.env['CI']);
  const issues: BuildIssue[] = [];
  const warnings: string[] = [];
  const result = (extra: Partial<BuildResult> = {}): BuildResult => ({
    ok: issues.length === 0,
    items: [],
    files: [],
    issues,
    warnings,
    ...extra,
  });

  const manifest = await readManifest(root, issues);
  if (!manifest) {
    return result();
  }

  const byName = new Map<string, RegistryItem>();
  for (const item of manifest.items) {
    if (byName.has(item.name)) {
      issues.push({ item: item.name, message: 'Duplicate item name.' });
    }
    byName.set(item.name, item);
  }

  const built: RegistryItem[] = [];
  for (const item of manifest.items) {
    built.push(await buildItem(item, root, byName, issues));
  }

  const builtByName = new Map(built.map((item) => [item.name, item]));
  const project = sourceProject();
  for (const item of built) {
    issues.push(...checkImports(item, builtByName, project));
    issues.push(...checkExports(item, project));
  }

  const metadata = new Map<string, string>();
  const wantsCompile = options.compile !== false;
  const wantsMetadata =
    options.metadata !== false &&
    built.some((item) => item.type === 'registry:ui');
  if ((wantsCompile || wantsMetadata) && issues.length === 0) {
    const files = built.flatMap((item) =>
      (item.files ?? [])
        .map((file) => file.path)
        .filter((path) => path.endsWith('.ts')),
    );
    const tsconfig = await writeScratchTsconfig(root, files, options.tsconfig);
    try {
      if (wantsCompile) {
        const compiled = await compileFiles(root, tsconfig);
        if (compiled.skipped) {
          warnings.push(
            '@angular/compiler-cli was not found from the registry root, so items were not type-checked.',
          );
        } else {
          issues.push(...compiled.issues);
        }
      }
      if (wantsMetadata && issues.length === 0) {
        await addMetadata(
          root,
          built,
          tsconfig.path,
          metadata,
          issues,
          warnings,
        );
      }
    } finally {
      await tsconfig.dispose();
    }
  }

  const snapshots = await checkSnapshots(built, root, frozen, issues);
  const changelogs = await checkChangelogs(built, root, snapshots.all, issues);
  const reports = built.map((item) => ({
    name: item.name,
    version: item.version,
    snapshot: snapshots.status.get(item.name),
  }));
  if (issues.length > 0) {
    return result({ items: reports });
  }

  const index: Registry = {
    $schema: schemas.registry.$id,
    name: manifest.name,
    homepage: manifest.homepage,
    items: built.map(withoutContent),
  };
  const indexCheck = validate('registry', index);
  if (!indexCheck.valid) {
    issues.push(
      ...indexCheck.issues.map((issue) => ({
        file: 'r/index.json',
        message: `${issue.path} ${issue.message}`,
      })),
    );
    return result({ items: reports });
  }

  const outputs = new Map<string, string>([['r/index.json', json(index)]]);
  for (const item of built) {
    outputs.set(`r/${item.name}.json`, json(item));
  }
  for (const [name, content] of metadata) {
    outputs.set(`r/metadata/${name}.json`, content);
  }
  for (const [file, content] of snapshots.all) {
    outputs.set(`r/${file}`, content);
  }
  for (const [name, content] of changelogs) {
    outputs.set(`r/changelog/${name}.json`, content);
  }
  const license = await readOptional(join(root, LICENSE_FILE));
  if (license !== undefined) {
    outputs.set(`r/${LICENSE_FILE}`, license);
  }

  if (!options.dryRun) {
    await rm(join(output, 'r'), { recursive: true, force: true });
    for (const [file, content] of outputs) {
      await write(join(output, file), content);
    }
    for (const [file, content] of snapshots.created) {
      await write(join(root, 'snapshots', file), content);
    }
  }
  return result({ items: reports, files: [...outputs.keys()] });
}

/**
 * Extracts every `registry:ui` item's metadata (ADR-0007) and checks that
 * the item points at it from `ndop.metadata`.
 *
 * @param root - Registry root.
 * @param built - Built items.
 * @param tsconfig - The build's scratch tsconfig.
 * @param metadata - Receives each file's content, by item name.
 * @param issues - Receives completeness problems.
 * @param warnings - Receives a note when the Angular compiler is missing.
 */
async function addMetadata(
  root: string,
  built: readonly RegistryItem[],
  tsconfig: string,
  metadata: Map<string, string>,
  issues: BuildIssue[],
  warnings: string[],
): Promise<void> {
  const result = await extractMetadata({ root, items: built, tsconfig });
  if (result.skipped) {
    warnings.push(
      '@angular/compiler-cli was not found from the registry root, so no metadata was extracted.',
    );
    return;
  }
  issues.push(...result.issues);
  for (const entry of result.metadata) {
    const expected = `metadata/${entry.name}.json`;
    const item = built.find((candidate) => candidate.name === entry.name);
    if (item?.ndop?.metadata !== expected) {
      issues.push({
        item: entry.name,
        file: 'registry.json',
        message: `ndop.metadata must be "${expected}".`,
      });
    }
    metadata.set(entry.name, json(entry));
  }
}

/**
 * Reads and validates `<root>/registry.json`.
 *
 * @param root - Registry root.
 * @param issues - Receives problems.
 * @returns The manifest, or `undefined` when it can't be used.
 */
async function readManifest(
  root: string,
  issues: BuildIssue[],
): Promise<Registry | undefined> {
  const file = 'registry.json';
  let data: unknown;
  try {
    data = JSON.parse(await readFile(join(root, file), 'utf-8'));
  } catch (error) {
    issues.push({ file, message: `Can't read the manifest: ${String(error)}` });
    return undefined;
  }
  const checked = validate('registry', data);
  if (!checked.valid) {
    issues.push(
      ...checked.issues.map((issue) => ({
        file,
        message: `${issue.path || '/'} ${issue.message}`,
      })),
    );
    return undefined;
  }
  return checked.value;
}

/**
 * The blocks gallery's categories (ADR-0022). A block's first `categories`
 * entry must be one of them, so the gallery and `list_blocks` can file it.
 */
export const BLOCK_CATEGORIES: readonly string[] = [
  'auth',
  'dashboard',
  'settings',
  'data-table',
  'sidebar',
  'marketing',
];

/**
 * Builds one item: embeds file contents, derives theme tokens, checks
 * registry dependencies and validates the result against the item schema.
 *
 * @param source - The manifest entry.
 * @param root - Registry root.
 * @param byName - Every manifest item, by name.
 * @param issues - Receives problems.
 * @returns The built item.
 */
async function buildItem(
  source: RegistryItem,
  root: string,
  byName: ReadonlyMap<string, RegistryItem>,
  issues: BuildIssue[],
): Promise<RegistryItem> {
  const item: RegistryItem = {
    ...structuredClone(source),
    $schema: schemas['registry-item'].$id,
  };
  const report = (message: string, file?: string) =>
    issues.push({ item: item.name, ...(file ? { file } : {}), message });

  for (const file of item.files ?? []) {
    try {
      file.content = await readFile(join(root, file.path), 'utf-8');
    } catch {
      report('File not found.', file.path);
    }
  }

  for (const dependency of item.registryDependencies ?? []) {
    if (!dependency.includes('/') && !byName.has(dependency)) {
      report(
        `registryDependencies lists "${dependency}", which isn't in the manifest.`,
      );
    }
  }

  if (
    item.type === 'registry:block' &&
    !BLOCK_CATEGORIES.includes(item.categories?.[0] ?? '')
  ) {
    report(
      `A block's first category must be one of ${BLOCK_CATEGORIES.join(', ')}.`,
    );
  }

  if (item.type === 'registry:theme' && !item.cssVars) {
    const file = `themes/${item.name}/theme.css`;
    let css: string | undefined;
    try {
      css = await readFile(join(root, file), 'utf-8');
    } catch {
      report('A theme without cssVars needs this stylesheet.', file);
    }
    if (css !== undefined) {
      const theme = themeFromCss(css);
      if ('problems' in theme) {
        theme.problems.forEach((problem) => report(problem, file));
      } else {
        item.cssVars = theme.parts.cssVars;
        item.css = { ...theme.parts.css, ...item.css };
        const declared = new Set(
          (item.dependencies ?? []).map((d) => d.replace(/(?<=.)@.*$/, '')),
        );
        for (const name of theme.parts.packages) {
          if (!declared.has(name)) {
            report(
              `Imports "${name}", which isn't in the item's dependencies.`,
              file,
            );
          }
        }
      }
    }
  }

  if (item.type === 'registry:theme' && item.cssVars) {
    contrastProblems(item.cssVars).forEach((problem) => report(problem));
  }

  const checked = validate('registry-item', item);
  if (!checked.valid) {
    checked.issues.forEach((issue) =>
      report(`${issue.path || '/'} ${issue.message}`),
    );
  }
  return item;
}

/**
 * The text pairs of a theme under the 4.5:1 WCAG 2 contrast they need, in
 * light or dark (ADR-0023). A pair is skipped when the theme lacks either
 * token or a value isn't a color it can read. Lines, rings and chart
 * colors are left to the theme studio's warnings.
 *
 * @param cssVars - The theme's variables.
 * @returns One message per failing pair, light first.
 *
 * @example
 * ```ts
 * contrastProblems(item.cssVars);
 * // ['Light: muted-foreground on muted is 4.34:1; text needs 4.5:1.']
 * ```
 */
export function contrastProblems(
  cssVars: NonNullable<RegistryItem['cssVars']>,
): string[] {
  return themeContrast({
    light: cssVars.light ?? {},
    dark: cssVars.dark ?? {},
  })
    .filter((result) => result.text && result.ratio !== undefined && !result.ok)
    .map((result) => {
      // Rounding down keeps a ratio just under the minimum from printing
      // as the minimum itself.
      const ratio = (Math.floor((result.ratio ?? 0) * 100) / 100).toFixed(2);
      const mode = result.mode === 'light' ? 'Light' : 'Dark';
      return `${mode}: ${result.foreground} on ${result.background} is ${ratio}:1; text needs ${result.min}:1.`;
    });
}

/**
 * Compares each built item with its version's snapshot.
 *
 * @param built - Built items.
 * @param root - Registry root.
 * @param frozen - Whether a missing snapshot is an error.
 * @param issues - Receives problems.
 * @returns Each item's status, the snapshots to create, and every snapshot
 *   (existing and new) by file name.
 */
async function checkSnapshots(
  built: readonly RegistryItem[],
  root: string,
  frozen: boolean,
  issues: BuildIssue[],
): Promise<{
  status: Map<string, SnapshotStatus>;
  created: Map<string, string>;
  all: Map<string, string>;
}> {
  const folder = join(root, 'snapshots');
  const all = new Map<string, string>();
  let names: string[] = [];
  try {
    names = (await readdir(folder)).filter((name) => name.endsWith('.json'));
  } catch {
    // No snapshots folder yet: every item is on its first version.
  }
  for (const name of names.sort()) {
    all.set(name, await readFile(join(folder, name), 'utf-8'));
  }

  const status = new Map<string, SnapshotStatus>();
  const created = new Map<string, string>();
  for (const item of built) {
    const file = `${item.name}@${item.version}.json`;
    const content = json(item);
    const existing = all.get(file);
    if (existing === undefined) {
      if (frozen) {
        issues.push({
          item: item.name,
          file: `snapshots/${file}`,
          message:
            'No snapshot for this version. Run ndop build without frozen snapshots and commit it.',
        });
      }
      created.set(file, content);
      all.set(file, content);
      status.set(item.name, 'created');
    } else if (json(JSON.parse(existing)) !== content) {
      issues.push({
        item: item.name,
        file: `snapshots/${file}`,
        message: `The item changed but its version is still ${item.version}. Bump the version.`,
      });
    } else {
      status.set(item.name, 'unchanged');
    }
  }
  return { status, created, all };
}

/**
 * Builds every item's changelog from its snapshots and
 * `<root>/changelog/<name>.md`, and checks the notes: a section per
 * version for items with docs pages, and no section for a version that
 * doesn't exist.
 *
 * @param built - Built items.
 * @param root - Registry root.
 * @param snapshots - Every snapshot, existing and new, by file name.
 * @param issues - Receives problems.
 * @returns Each changelog's JSON, by item name.
 */
async function checkChangelogs(
  built: readonly RegistryItem[],
  root: string,
  snapshots: ReadonlyMap<string, string>,
  issues: BuildIssue[],
): Promise<Map<string, string>> {
  const versions = new Map<string, RegistryItem[]>();
  for (const [file, content] of snapshots) {
    const name = file.slice(0, file.indexOf('@'));
    versions.set(name, [
      ...(versions.get(name) ?? []),
      JSON.parse(content) as RegistryItem,
    ]);
  }
  const changelogs = new Map<string, string>();
  for (const item of built) {
    const file = `changelog/${item.name}.md`;
    const report = (message: string) =>
      issues.push({ item: item.name, file, message });
    const documented = DOCUMENTED_TYPES.includes(item.type);
    let markdown: string | undefined;
    try {
      markdown = await readFile(join(root, file), 'utf-8');
    } catch {
      if (documented) {
        report(
          'No changelog. Write one with a "## <version>" section for each version.',
        );
      }
    }
    const { sections, problems } = parseChangelog(markdown ?? '');
    problems.forEach(report);
    const itemVersions = versions.get(item.name) ?? [];
    const known = new Set(itemVersions.map((version) => version.version));
    for (const version of sections.keys()) {
      if (!known.has(version)) {
        report(`There's no version ${version} of ${item.name}.`);
      }
    }
    if (documented && markdown !== undefined) {
      for (const version of known) {
        if (!sections.has(version)) {
          report(
            `No section for ${version}. Add "## ${version}" with what changed.`,
          );
        }
      }
    }
    const changelog = itemChangelog(item.name, itemVersions, sections);
    const checked = validate('changelog', changelog);
    if (!checked.valid) {
      checked.issues.forEach((issue) =>
        report(`${issue.path || '/'} ${issue.message}`),
      );
    }
    changelogs.set(item.name, json(changelog));
  }
  return changelogs;
}

/**
 * An item as listed in `index.json`: everything but file contents.
 *
 * @param item - A built item.
 * @returns A copy without `files[].content`.
 */
function withoutContent(item: RegistryItem): RegistryItem {
  const listed = structuredClone(item);
  delete listed.$schema;
  for (const file of listed.files ?? []) {
    delete file.content;
  }
  return listed;
}

/**
 * Serializes JSON the way every registry file is written.
 *
 * @param value - Any JSON value.
 * @returns Two-space-indented JSON with a trailing newline.
 */
function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/**
 * Writes a file, creating its folder.
 *
 * @param path - Absolute or cwd-relative path.
 * @param content - File text.
 */
async function write(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}

/**
 * Reads a text file that may not exist.
 *
 * @param path - Absolute path.
 * @returns Its content, or `undefined` when there is no such file.
 */
async function readOptional(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw error;
  }
}
