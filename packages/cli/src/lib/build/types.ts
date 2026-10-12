import type { Fetcher } from '../registry/client';

/**
 * A problem `ndop build` found. Any issue fails the build.
 */
export interface BuildIssue {
  /** Item the issue belongs to; absent for manifest-level issues. */
  item?: string;
  /** Registry-relative file the issue is in, when there is one. */
  file?: string;
  /** What is wrong, written for the registry author. */
  message: string;
}

/**
 * Options for {@link buildRegistry}.
 */
export interface BuildOptions {
  /** Registry root: the folder holding `registry.json`. */
  root: string;
  /**
   * Folder the static registry is written to; files land under its `r/`
   * subfolder.
   */
  output: string;
  /**
   * Fail instead of writing a snapshot for a version that has none yet.
   * Defaults to `true` when the `CI` environment variable is set, as pnpm
   * does for `--frozen-lockfile`, so CI catches snapshots nobody committed.
   */
  frozenSnapshots?: boolean;
  /**
   * Type-check every item with `ngc` (ADR-0012). Defaults to `true`; skipped
   * with a warning when `@angular/compiler-cli` can't be resolved from the
   * registry root.
   */
  compile?: boolean;
  /**
   * Extract `r/metadata/<name>.json` for each `registry:ui` item and fail
   * on incomplete docs (ADR-0007). Defaults to `true`.
   */
  metadata?: boolean;
  /**
   * A tsconfig the compile check extends, for registries whose packages
   * resolve through `paths` rather than `node_modules`, such as a monorepo.
   * Its `paths` are kept, with `@/*` added.
   */
  tsconfig?: string;
  /** Check everything but write nothing. */
  dryRun?: boolean;
  /**
   * Also write `r/compat/<name>.json`, items the shadcn CLI installs
   * (ADR-0025). Only `shadcn` is supported.
   */
  compat?: 'shadcn';
  /**
   * Absolute URL the compat items are served from, which their
   * `registryDependencies` point under. Defaults to
   * `https://ndop.dev/r/compat/`.
   */
  compatBaseUrl?: string;
  /**
   * URL or path template, with `{name}`, of the default registry that
   * `@ndop/<name>` registry dependencies are fetched from, so items can
   * import their files (ADR-0025). Relative paths resolve from `root`.
   * Defaults to the `NDOP_REGISTRY` environment variable, then
   * `https://ndop.dev/r/{name}.json`, as for `ndop add`.
   */
  registry?: string;
  /** Environment variables; `process.env` by default. */
  env?: Record<string, string | undefined>;
  /** Reads `@ndop` items; fetches URLs and reads paths by default. */
  fetcher?: Fetcher;
}

/**
 * What happened to one item's version snapshot.
 *
 * - `created`: first build of this version; the snapshot was written.
 * - `unchanged`: the snapshot exists and matches the built item.
 */
export type SnapshotStatus = 'created' | 'unchanged';

/**
 * Outcome of {@link buildRegistry}.
 */
export interface BuildResult {
  /** Whether the build passed: no issues. */
  ok: boolean;
  /** Every item built, in manifest order. */
  items: { name: string; version: string; snapshot?: SnapshotStatus }[];
  /** Files written, or that would be with `dryRun`, relative to `output`. */
  files: string[];
  /** Problems found; the build writes nothing when there are any. */
  issues: BuildIssue[];
  /** Non-fatal notes, such as a skipped compile check. */
  warnings: string[];
}
