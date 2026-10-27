/** Options of the `size` executor; see `schema.json`. */
export interface SizeExecutorSchema {
  /** Budgets JSON. */
  budgets: string;
  /** Whole primitive entry points to measure alongside styled items. */
  primitiveEntries?: string[];
  /** Registry source. */
  registryRoot?: string;
  /** Tsconfig whose `paths` resolve the packages items import. */
  tsconfig?: string;
  /** Output folder. */
  outputPath?: string;
}
