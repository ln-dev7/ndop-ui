import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import type { RegistryItem } from '@ndop/schema';
import type { CommandEnvironment } from '../lib/commands/environment';
import type { Installer } from '../lib/plan/apply';
import { createProgram } from '../lib/program';
import { memoryFs, type ProjectFs } from '../lib/project/fs';
import { noFormat, type Formatter } from '../lib/project/format';

const workspace = join(import.meta.dirname, '../../../..');

/**
 * Reads a fixture app from `packages/cli/fixtures`.
 *
 * @param name - Fixture folder, such as `ng22`.
 * @returns Its files by project-relative path.
 */
export function fixture(name: string): Record<string, string> {
  const root = join(workspace, 'packages/cli/fixtures', name);
  const files: Record<string, string> = {};
  const walk = (folder: string): void => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const path = join(folder, entry.name);
      if (entry.isDirectory()) {
        walk(path);
      } else {
        files[relative(root, path)] = readFileSync(path, 'utf-8');
      }
    }
  };
  walk(root);
  return files;
}

/**
 * Ndop's registry as committed: the newest snapshot of every item, so CLI
 * tests install the real items without a build or a server.
 *
 * @returns Items by name.
 */
export function snapshotRegistry(): Record<string, RegistryItem> {
  const folder = join(workspace, 'registry/snapshots');
  const items: Record<string, RegistryItem> = {};
  for (const file of readdirSync(folder).sort(byVersion)) {
    const item = JSON.parse(
      readFileSync(join(folder, file), 'utf-8'),
    ) as RegistryItem;
    items[item.name] = item;
  }
  return items;
}

/**
 * Orders snapshot files by name, then version, so later files win.
 *
 * @param a - A snapshot file name.
 * @param b - Another one.
 * @returns A sort order.
 */
function byVersion(a: string, b: string): number {
  const key = (file: string) => {
    const [name = '', version = ''] = file.replace(/\.json$/, '').split('@');
    return [
      name,
      ...version.split('.').map((part) => part.padStart(6, '0')),
    ].join(' ');
  };
  return key(a).localeCompare(key(b));
}

/**
 * Serves `<name>@<version>`: the registry's item when it is at that
 * version, or else the committed snapshot.
 *
 * @param registry - The test registry.
 * @param key - `<name>@<version>`.
 * @returns The item, or `undefined`.
 */
function versionOf(
  registry: Record<string, RegistryItem>,
  key: string,
): RegistryItem | undefined {
  const [name = '', version] = key.split('@');
  if (version === undefined) return undefined;
  if (registry[name]?.version === version) return registry[name];
  try {
    return JSON.parse(
      readFileSync(
        join(workspace, 'registry/snapshots', `${key}.json`),
        'utf-8',
      ),
    ) as RegistryItem;
  } catch {
    return undefined;
  }
}

/**
 * A test double for the write commands' outside world.
 */
export interface TestEnvironment extends CommandEnvironment {
  /** The in-memory project. */
  project: ProjectFs & { files: Map<string, string> };
  /** Every install call, in order. */
  installs: { specs: string[]; dev: boolean }[];
  /**
   * Registry items served at `mem://{name}`, mutable between runs. Keys
   * may be `<name>@<version>`; other versions come from the committed
   * snapshots.
   */
  registry: Record<string, RegistryItem>;
}

/**
 * Options for {@link testEnvironment}.
 */
export interface TestEnvironmentOptions {
  /** Items to serve; the committed snapshots by default. */
  registry?: Record<string, RegistryItem>;
  /** Formatter; none by default. */
  format?: Formatter;
  /** Extra environment variables. */
  env?: Record<string, string | undefined>;
  /**
   * Files git reports as changed, or `false` for a project outside a git
   * repository; a clean repository by default.
   */
  dirty?: string[] | false;
}

/**
 * An in-memory environment: the project is a file map, the registry serves
 * items from a map at `mem://{name}`, and installing adds the packages to
 * `package.json`.
 *
 * @param files - Initial project files.
 * @param options - Registry, formatter and environment.
 * @returns The environment.
 */
export function testEnvironment(
  files: Record<string, string>,
  options: TestEnvironmentOptions = {},
): TestEnvironment {
  const project = memoryFs(files);
  const installs: TestEnvironment['installs'] = [];
  const registry = options.registry ?? snapshotRegistry();
  return {
    project,
    installs,
    registry,
    fs: () => project,
    formatter: async () => options.format ?? noFormat,
    fetcher: () => async (location) => {
      const name = location.replace('mem://', '');
      const item = registry[name] ?? versionOf(registry, name);
      if (!item) {
        throw new Error(`No item ${name} in the test registry.`);
      }
      return JSON.stringify(item);
    },
    installer: () => fakeInstaller(project, installs),
    dirtyFiles: async (_root, paths) => {
      const dirty = options.dirty;
      return dirty === false
        ? undefined
        : paths.filter((path) => (dirty ?? []).includes(path));
    },
    confirm: async () => true,
    multiselect: async (_message, _options, initial) => initial,
    interactive: false,
    env: { NDOP_REGISTRY: 'mem://{name}', ...options.env },
  };
}

/**
 * An installer that records each call and adds the packages to the
 * project's `package.json` with the range `*`, as a real install would add
 * them.
 *
 * @param fs - The project.
 * @param installs - Receives each call.
 * @returns The installer.
 */
export function fakeInstaller(
  fs: ProjectFs,
  installs: TestEnvironment['installs'],
): Installer {
  return async (specs, dev) => {
    installs.push({ specs: [...specs], dev });
    const manifest = JSON.parse((await fs.read('package.json')) ?? '{}');
    const field = dev ? 'devDependencies' : 'dependencies';
    manifest[field] = { ...manifest[field] };
    for (const spec of specs) {
      manifest[field][spec.replace(/(?<=.)@.*$/, '')] = '*';
    }
    await fs.write('package.json', `${JSON.stringify(manifest, null, 2)}\n`);
  };
}

/**
 * Runs `ndop` against a test environment.
 *
 * @param environment - From {@link testEnvironment}.
 * @param args - Arguments after `ndop`.
 * @returns What it printed to standard output and error, without colors.
 */
export async function runNdop(
  environment: CommandEnvironment,
  ...args: string[]
): Promise<{ out: string; err: string }> {
  let out = '';
  let err = '';
  const program = createProgram('0.0.0', environment).configureOutput({
    writeOut: (text) => (out += text),
    writeErr: (text) => (err += text),
  });
  await program.parseAsync(args, { from: 'user' });
  return {
    out: stripVTControlCharacters(out),
    err: stripVTControlCharacters(err),
  };
}
