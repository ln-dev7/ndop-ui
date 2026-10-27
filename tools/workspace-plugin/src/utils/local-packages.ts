import { spawn } from 'node:child_process';
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { startLocalRegistry } from '@nx/js/plugins/jest/local-registry';
import { releaseVersion } from 'nx/release';
import { releasePackages } from './release-packages';
import { serveSite } from './serve-site';

/** What {@link withLocalPackages} gives the code it runs. */
export interface LocalPackages {
  /** The version every `@ndop/*` package was published under. */
  version: string;
  /** Environment pointing npm, pnpm, bun and ndop at the local registries. */
  env: NodeJS.ProcessEnv;
  /** URL template of the served Ndop registry, with `{name}`. */
  registryUrl: string;
  /** Absolute registry folder, including test-only dependency pins. */
  registryPath: string;
}

/** Options of {@link withLocalPackages}. */
export interface LocalPackagesOptions {
  /** Workspace root. */
  root: string;
  /** Prefix of the unique prerelease, such as `e2e` or `eval`. */
  tag: string;
  /** Nx target that runs Verdaccio. */
  localRegistryTarget?: string;
  /** Built registry folder, relative to the root. */
  registryPath?: string;
  /**
   * Output of `changeset pack` (its `publish-plan.json` and `packages/`),
   * relative to the root or absolute. When set, these exact tarballs are
   * published, at their own version, instead of the dist packages at a
   * unique prerelease: the Release workflow tests what it then publishes
   * (ADR-0028).
   */
  packDir?: string;
}

/** A packed package. */
export interface PackedRelease {
  /** Package name. */
  name: string;
  /** Its version. */
  version: string;
  /** Path of the tarball: relative to the pack folder in a publish plan. */
  tarball: string;
}

/**
 * Lists the tarballs of a `changeset pack` output, from its
 * `publish-plan.json`: a list of chunks, each a list of releases, of which
 * those of kind `publish` carry a tarball.
 *
 * @param plan - The text of `publish-plan.json`.
 * @returns Each tarball, in publishing order.
 * @throws If the plan isn't version 1, or a release has no tarball.
 */
export function packedReleases(plan: string): PackedRelease[] {
  const parsed = JSON.parse(plan) as {
    version?: number;
    plan?: {
      kind: string;
      name: string;
      version: string;
      tarball?: { path: string };
    }[][];
  };
  if (parsed.version !== 1 || !Array.isArray(parsed.plan)) {
    throw new Error('Expected a version 1 Changesets publish plan.');
  }
  return parsed.plan
    .flat()
    .filter((release) => release.kind === 'publish')
    .map((release) => {
      if (!release.tarball) {
        throw new Error(
          `${release.name}@${release.version} has no tarball; pass the output of changeset pack.`,
        );
      }
      return {
        name: release.name,
        version: release.version,
        tarball: release.tarball.path,
      };
    });
}

/**
 * Runs code against unpublished Ndop (ADR-0015). By default it versions
 * every `@ndop/*` dist package with a unique prerelease, so no
 * package-manager cache can serve an older build, and packs each one as
 * the release does, with `pnpm pack` from its source folder
 * (`publishConfig.directory` points at dist); dist manifests keep the
 * version, and the next build restores them. With `packDir`, it takes
 * those tarballs instead. Either way it publishes the tarballs to a local
 * Verdaccio and serves the built registry over HTTP, stopping both
 * afterwards.
 *
 * @param options - Workspace root, prerelease tag, paths and tarballs.
 * @param run - The code, given the version and environment.
 * @returns What the code returns.
 */
export async function withLocalPackages<T>(
  options: LocalPackagesOptions,
  run: (packages: LocalPackages) => Promise<T>,
): Promise<T> {
  const packed = options.packDir
    ? await packedOutput(resolve(options.root, options.packDir))
    : await packDist(options.root, options.tag);
  const versions = [...new Set(packed.map((release) => release.version))];
  const [version] = versions;
  if (version === undefined || versions.length !== 1) {
    throw new Error(
      `Expected one version across the packed packages, found ${versions.length}.`,
    );
  }
  const stopRegistry = await startLocalRegistry({
    localRegistryTarget:
      options.localRegistryTarget ?? '@ndop/source:local-registry',
    storage: join(options.root, 'tmp/local-registry/storage'),
    clearStorage: true,
  });
  const sourceRegistry = join(
    options.root,
    options.registryPath ?? 'dist/registry',
  );
  let servedRegistry = sourceRegistry;
  if (!options.packDir) {
    // Unique test prereleases cannot satisfy stable item ranges such as ^2.0.0.
    // Pin only a scratch registry copy; exact release-pack tests keep real ranges.
    servedRegistry = join(options.root, 'tmp/local-packages/registry');
    await cp(sourceRegistry, servedRegistry, { recursive: true });
    await pinRegistryFiles(
      servedRegistry,
      new Map(packed.map((release) => [release.name, release.version])),
    );
  }
  const server = await serveSite(servedRegistry);
  try {
    for (const release of packed) {
      await publishTarball(release.tarball, options.root);
    }
    const registryUrl = `${server.url}/r/{name}.json`;
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      NDOP_REGISTRY: registryUrl,
      NG_CLI_ANALYTICS: 'false',
      npm_config_update_notifier: 'false',
      // pnpm holds back releases younger than a day by default; these
      // packages were published seconds ago.
      pnpm_config_minimum_release_age: '0',
    };
    // Run the apps as on a developer's machine: package managers change
    // install behavior when CI is set, and users don't run ng new in CI.
    delete env['CI'];
    return await run({
      version,
      env,
      registryUrl,
      registryPath: servedRegistry,
    });
  } finally {
    await server.close();
    stopRegistry();
  }
}

/**
 * The tarballs of a `changeset pack` output.
 *
 * @param packDir - Absolute path of the output.
 * @returns Each tarball, with an absolute path.
 */
async function packedOutput(packDir: string): Promise<PackedRelease[]> {
  return packedReleases(
    await readFile(join(packDir, 'publish-plan.json'), 'utf-8'),
  ).map((release) => ({
    ...release,
    tarball: join(packDir, release.tarball),
  }));
}

/**
 * Versions the release's dist packages with a unique prerelease, then packs
 * each into `tmp/local-packages`.
 *
 * @param root - Workspace root.
 * @param tag - Prefix of the prerelease.
 * @returns Each tarball, with an absolute path.
 */
async function packDist(root: string, tag: string): Promise<PackedRelease[]> {
  const version = `0.0.0-${tag}.${Date.now()}`;
  // Before the registry starts: the configured pre-version build would
  // otherwise resolve its tools through Verdaccio.
  await releaseVersion({
    specifier: version,
    stageChanges: false,
    gitCommit: false,
    gitTag: false,
    firstRelease: true,
    versionActionsOptionsOverrides: { skipLockFileUpdate: true },
  });
  const out = join(root, 'tmp/local-packages');
  await rm(out, { recursive: true, force: true });
  await mkdir(out, { recursive: true });
  const packed: PackedRelease[] = [];
  for (const { name, dir } of await releasePackages(root)) {
    const tarball = join(
      out,
      `${name.replace(/^@/, '').replace('/', '-')}-${version}.tgz`,
    );
    await runPnpm(['pack', '--out', tarball], join(root, dir));
    packed.push({ name, version, tarball });
  }
  return packed;
}

/**
 * Publishes a tarball to the local registry with pnpm, the tool
 * `changeset publish` uses in this workspace, so the test publishes the way
 * the release does.
 *
 * @param tarball - Absolute path of the tarball.
 * @param cwd - Working folder.
 * @returns Resolves once published.
 * @throws With pnpm's output, if it fails.
 */
function publishTarball(tarball: string, cwd: string): Promise<void> {
  return runPnpm(
    ['publish', tarball, '--access', 'public', '--no-git-checks'],
    cwd,
  );
}

/**
 * Runs pnpm with the current environment, which points it at the local
 * registry once that has started.
 *
 * @param args - pnpm's arguments.
 * @param cwd - Working folder.
 * @returns Resolves when it succeeds.
 * @throws With pnpm's output, if it fails.
 */
function runPnpm(args: string[], cwd: string): Promise<void> {
  return new Promise((done, fail) => {
    const child = spawn('pnpm', args, {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString()));
    child.on('error', fail);
    child.on('close', (code) =>
      code === 0
        ? done()
        : fail(new Error(`pnpm ${args.join(' ')} failed:\n${output}`)),
    );
  });
}

/**
 * Pins published test packages in a registry item to the exact local versions.
 * Metadata, other packages and source contents remain unchanged. Used only on
 * scratch copies for unique prereleases, never on real release-pack registries.
 *
 * @param text - Registry JSON text.
 * @param versions - Package names and their exact local test versions.
 * @returns Item JSON with matching npm dependency specs pinned.
 */
export function pinTestDependencies(
  text: string,
  versions: ReadonlyMap<string, string>,
): string {
  const item = JSON.parse(text) as {
    type?: string;
    dependencies?: string[];
    devDependencies?: string[];
  };
  if (!item.type?.startsWith('registry:')) return text;
  let changed = false;
  for (const field of ['dependencies', 'devDependencies'] as const) {
    if (!item[field]) continue;
    item[field] = item[field].map((spec) => {
      const entry = [...versions].find(
        ([name]) => spec === name || spec.startsWith(`${name}@`),
      );
      if (!entry) return spec;
      const next = `${entry[0]}@${entry[1]}`;
      changed ||= next !== spec;
      return next;
    });
  }
  return changed ? `${JSON.stringify(item, null, 2)}\n` : text;
}

/**
 * Updates only generated JSON in the test registry copy.
 *
 * @param folder - Scratch registry directory.
 * @param versions - Locally published versions.
 */
async function pinRegistryFiles(
  folder: string,
  versions: ReadonlyMap<string, string>,
): Promise<void> {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) await pinRegistryFiles(path, versions);
    else if (entry.name.endsWith('.json')) {
      const before = await readFile(path, 'utf-8');
      const after = pinTestDependencies(before, versions);
      if (after !== before) await writeFile(path, after);
    }
  }
}
