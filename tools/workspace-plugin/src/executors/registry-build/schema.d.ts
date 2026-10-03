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
  /** Type-check items with ngc. */
  compile?: boolean;
}
