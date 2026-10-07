/** Options of the `docs-lighthouse` executor. */
export interface DocsLighthouseExecutorSchema {
  /** The built site, relative to the workspace root. */
  dir: string;
  /** Lowest passing score, 0 to 100, in every category. */
  minScore?: number;
  /** Where the HTML reports go, relative to the workspace root. */
  outputDir?: string;
  /**
   * Runs per route; the run with the median performance score counts, as
   * in Lighthouse CI.
   */
  runs?: number;
  /** Routes to audit; every prerendered route by default. */
  routes?: string[];
  /**
   * CPU slowdown to use instead of calibrating it to the host's benchmark
   * (ADR-0016, amendment 8).
   */
  cpuSlowdownMultiplier?: number;
}
