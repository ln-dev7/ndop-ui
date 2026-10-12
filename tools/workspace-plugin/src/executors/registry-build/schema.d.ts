/**
 * Options of the `registry-build` executor; see `schema.json`.
 */
export interface RegistryBuildExecutorSchema {
  /** Folder holding `registry.json`, relative to the workspace root. */
  registryRoot?: string;
  /** Output folder, relative to the workspace root. */
  outputPath: string;
  /** tsconfig the compile check extends, relative to the workspace root. */
  tsconfig?: string;
  /** Fail when an item version has no committed snapshot. */
  frozenSnapshots?: boolean;
  /** Extract component metadata and fail on incomplete docs. */
  metadata?: boolean;
  /** Type-check items with ngc. */
  compile?: boolean;
  /** Also write shadcn-compatible items under `r/compat/` (ADR-0025). */
  compat?: 'shadcn';
  /**
   * Ndop's registry for `@ndop/<name>` dependencies: a URL template, or a
   * path template relative to the workspace root.
   */
  registry?: string;
  /** Absolute URL `r/compat/` is served from. */
  compatBaseUrl?: string;
}
