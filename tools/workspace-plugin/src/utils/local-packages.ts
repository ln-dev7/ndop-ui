import { join } from 'node:path';
import { startLocalRegistry } from '@nx/js/plugins/jest/local-registry';
import { releasePublish, releaseVersion } from 'nx/release';
import { serveSite } from './serve-site';

/** What {@link withLocalPackages} gives the code it runs. */
export interface LocalPackages {
  /** The version every `@ndop/*` package was published under. */
  version: string;
  /** Environment pointing npm, pnpm, bun and ndop at the local registries. */
  env: NodeJS.ProcessEnv;
  /** URL template of the served Ndop registry, with `{name}`. */
  registryUrl: string;
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
}

/**
 * Runs code against unpublished Ndop (ADR-0015): versions every `@ndop/*`
 * dist package with a unique prerelease, so no package-manager cache can
 * serve an older build, publishes them to a local Verdaccio, and serves
 * the built registry over HTTP, stopping both afterwards. Dist manifests
 * keep the version; the next build restores them.
 *
 * @param options - Workspace root, prerelease tag and paths.
 * @param run - The code, given the version and environment.
 * @returns What the code returns.
 */
export async function withLocalPackages<T>(
  options: LocalPackagesOptions,
  run: (packages: LocalPackages) => Promise<T>,
): Promise<T> {
  const version = `0.0.0-${options.tag}.${Date.now()}`;
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
  const stopRegistry = await startLocalRegistry({
    localRegistryTarget:
      options.localRegistryTarget ?? '@ndop/source:local-registry',
    storage: join(options.root, 'tmp/local-registry/storage'),
    clearStorage: true,
  });
  const server = await serveSite(
    join(options.root, options.registryPath ?? 'dist/registry'),
  );
  try {
    await releasePublish({ firstRelease: true, outputStyle: 'static' });
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
    return await run({ version, env, registryUrl });
  } finally {
    await server.close();
    stopRegistry();
  }
}
