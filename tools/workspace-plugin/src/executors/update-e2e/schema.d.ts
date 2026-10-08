/** Options of the `update-e2e` executor. */
export interface UpdateE2eExecutorSchema {
  /** The fixture scenarios, relative to the workspace root. */
  fixtures?: string;
  /** The app each case starts from, relative to the workspace root. */
  template?: string;
  /** Scratch folder inside the workspace. */
  workDir?: string;
  /** Lowest share of merge cases that must merge cleanly. */
  minCleanRate?: number;
  /** Run only cases whose id contains one of these. */
  cases?: string[];
  /** Where to write the Markdown results table. */
  report?: string;
}
