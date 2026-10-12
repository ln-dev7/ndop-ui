/** Options of the `visual` executor; see `schema.json`. */
export interface VisualExecutorSchema {
  /** Workspace-relative Playwright config of the visual tests. */
  config: string;
  /** Rewrite the baselines. */
  update?: boolean;
  /** Only the tests whose title matches this regular expression. */
  grep?: string;
  /** Playwright Docker image. */
  image?: string;
  /** Host port of the browser server. */
  port?: number;
}
