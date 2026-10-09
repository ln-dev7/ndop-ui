/** Options of the `size` executor; see `schema.json`. */
export interface SizeExecutorSchema {
  /** Budgets JSON. */
  budgets: string;
  /** Registry source. */
  registryRoot?: string;
  /** Tsconfig whose `paths` resolve the packages items import. */
  tsconfig?: string;
  /** Output folder. */
  outputPath?: string;
}
