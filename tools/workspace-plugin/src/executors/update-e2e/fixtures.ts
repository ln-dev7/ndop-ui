import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { RegistryItem } from '@ndop/schema';

/** Items `ndop init` installs, which every scenario serves. */
const INIT_ITEMS = ['default', 'utils', 'icons'];

/** An item a scenario serves, written by hand. */
export interface ScenarioItem
  extends Omit<RegistryItem, 'version' | 'files' | '$schema'> {
  /** Files of every version, unless a version overrides them. */
  files: Omit<NonNullable<RegistryItem['files']>[number], 'content'>[];
  /**
   * Each version, with the fields it changes. File contents come from
   * `versions/<version>/<path>` in the scenario.
   */
  versions: Record<string, Partial<Omit<ScenarioItem, 'versions'>>>;
}

/** `scenario.json`: the registry a scenario's cases update against. */
export interface ScenarioFile {
  /** What the scenario models. */
  description: string;
  /** Items written by hand, in `versions/`. */
  items?: ScenarioItem[];
  /**
   * Items taken from the registry's committed snapshots, at every version,
   * with the items they depend on.
   */
  snapshots?: string[];
}

/** What a case expects from one `ndop update` run. */
export interface Expectation {
  /** Exit code; 0, or 2 when `conflict` is set, by default. */
  exit?: number;
  /** Whether the case is a true conflict. */
  conflict?: boolean;
  /** Status of each listed file, by project path. */
  statuses?: Record<string, string>;
  /** Files that must not exist afterwards. */
  absent?: string[];
  /** Text each of which a warning must contain. */
  warnings?: string[];
  /** npm packages the update must install. */
  dependencies?: string[];
  /** Lockfile keys that must be installed afterwards. */
  installed?: string[];
  /** Text the error must contain, for a refused update. */
  error?: string;
  /** Text each listed file must contain, by project path. */
  contains?: Record<string, string[]>;
}

/** One `ndop update` run of a case. */
export interface CaseRun {
  /** Extra arguments. */
  args?: string[];
  /** A folder of the case laid over the project before the run. */
  overlay?: string;
  /** Commit the overlay, so the tree is clean. */
  commit?: boolean;
  /** A folder of expected project files after the run. */
  expected?: string;
  /** What the run must do. */
  expect?: Expectation;
}

/** `case.json`. */
export interface CaseFile {
  /** What the user's edit is, and where upstream overlaps it. */
  description: string;
  /** Merge cases count toward the clean rate; behavior cases must pass. */
  kind: 'merge' | 'behavior';
  /** The item updated. */
  item: string;
  /** Version installed. */
  from: string;
  /** Version updated to. */
  to: string;
  /** Overrides of the project's Prettier config. */
  prettier?: Record<string, unknown>;
  /** More items to install first, as `name@version`. */
  add?: string[];
  /** Project files the user deleted. */
  remove?: string[];
  /** Edits to project files, for files too large to overlay whole. */
  replace?: { path: string; find: string; with: string }[];
  /** Files whose local and expected copies use CRLF line endings. */
  crlf?: string[];
  /** Leave the edits uncommitted. */
  dirty?: boolean;
  /** Whether the project is a git repository; true by default. */
  git?: boolean;
  /** The runs; one plain run with `expect` by default. */
  runs?: CaseRun[];
  /** What the single run must do. */
  expect?: Expectation;
}

/** A case, with where it lives. */
export interface FixtureCase extends CaseFile {
  /** `<scenario>/<case folder>`. */
  id: string;
  /** The scenario's folder. */
  scenarioDir: string;
  /** The case's folder. */
  dir: string;
}

/**
 * Reads every case of every scenario under the fixtures folder.
 *
 * @param fixtures - Absolute fixtures folder.
 * @param only - Substrings of case ids to keep; all when empty.
 * @returns The cases, by scenario then folder name.
 */
export async function readCases(
  fixtures: string,
  only: readonly string[] = [],
): Promise<FixtureCase[]> {
  const cases: FixtureCase[] = [];
  for (const scenario of (await folders(fixtures)).sort()) {
    const scenarioDir = join(fixtures, scenario);
    for (const folder of (await folders(join(scenarioDir, 'cases'))).sort()) {
      const id = `${scenario}/${folder}`;
      if (only.length && !only.some((part) => id.includes(part))) continue;
      const dir = join(scenarioDir, 'cases', folder);
      const data = JSON.parse(
        await readFile(join(dir, 'case.json'), 'utf-8'),
      ) as CaseFile;
      cases.push({ ...data, id, scenarioDir, dir });
    }
  }
  return cases;
}

/**
 * Writes a scenario's registry as `ndop build` would serve it: every
 * version at `<name>@<version>.json` and the newest at `<name>.json`.
 *
 * @param workspace - Workspace root, for the committed snapshots.
 * @param scenarioDir - The scenario's folder.
 * @param out - Folder to write into.
 */
export async function writeScenarioRegistry(
  workspace: string,
  scenarioDir: string,
  out: string,
): Promise<void> {
  const scenario = JSON.parse(
    await readFile(join(scenarioDir, 'scenario.json'), 'utf-8'),
  ) as ScenarioFile;
  await mkdir(out, { recursive: true });
  const write = async (versions: RegistryItem[]) => {
    const ordered = [...versions].sort((a, b) =>
      compareVersions(a.version, b.version),
    );
    for (const item of ordered) {
      await writeFile(
        join(out, `${item.name}@${item.version}.json`),
        JSON.stringify(item),
      );
    }
    const latest = ordered.at(-1);
    if (latest) {
      await writeFile(join(out, `${latest.name}.json`), JSON.stringify(latest));
    }
  };

  for (const item of scenario.items ?? []) {
    const { versions, ...shared } = item;
    const built: RegistryItem[] = [];
    for (const [version, changes] of Object.entries(versions)) {
      const fields = { ...shared, ...changes };
      const files = [];
      for (const file of fields.files ?? []) {
        files.push({
          ...file,
          content: await readFile(
            join(scenarioDir, 'versions', version, file.path),
            'utf-8',
          ),
        });
      }
      built.push({ ...fields, version, files } as RegistryItem);
    }
    await write(built);
  }

  const snapshots = join(workspace, 'registry/snapshots');
  const available = await readdir(snapshots);
  // ndop init installs the default theme and base items in every case.
  const queue = [...INIT_ITEMS, ...(scenario.snapshots ?? [])];
  const seen = new Set<string>();
  while (queue.length) {
    const name = queue.shift() ?? '';
    if (seen.has(name)) continue;
    seen.add(name);
    const versions: RegistryItem[] = [];
    for (const file of available.filter((file) =>
      file.startsWith(`${name}@`),
    )) {
      versions.push(
        JSON.parse(
          await readFile(join(snapshots, file), 'utf-8'),
        ) as RegistryItem,
      );
    }
    await write(versions);
    for (const version of versions) {
      queue.push(...(version.registryDependencies ?? []));
    }
  }
}

/**
 * Orders plain `major.minor.patch` versions, which is all fixtures use.
 *
 * @param a - A version.
 * @param b - Another.
 * @returns A sort order.
 */
export function compareVersions(a: string, b: string): number {
  const parts = (version: string) => version.split('.').map(Number);
  const [x, y] = [parts(a), parts(b)];
  for (let index = 0; index < 3; index++) {
    const difference = (x[index] ?? 0) - (y[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}

/**
 * Folders directly inside a folder.
 *
 * @param path - Absolute folder.
 * @returns Their names; none when the folder doesn't exist.
 */
async function folders(path: string): Promise<string[]> {
  try {
    return (await readdir(path, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}
