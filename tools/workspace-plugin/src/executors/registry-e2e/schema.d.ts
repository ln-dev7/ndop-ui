import type { InstallCase } from './scenario';

/**
 * Options of the `registry-e2e` executor; see `schema.json`.
 */
export interface RegistryE2eExecutorSchema {
  /** Package manager and Angular CLI version of each run. */
  cases: InstallCase[];
  /** Run only these cases, by name. */
  only?: string[];
  /** Item to add. */
  item?: string;
  /** Longest allowed time from `ndop init` to the end of the build. */
  budgetSeconds?: number;
  /** Built registry to serve, relative to the workspace root. */
  registryPath?: string;
  /** Folder the apps and logs go in, relative to the workspace root. */
  workDir?: string;
  /** Target that starts Verdaccio. */
  localRegistryTarget?: string;
  /** Output of `changeset pack` whose tarballs to test, instead of dist. */
  packDir?: string;
}
