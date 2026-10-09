/** Options of the `visual` executor; see `schema.json`. */
export interface VisualExecutorSchema {
  /** Workspace-relative Playwright config of the visual tests. */
  config: string;
  /** Rewrite the baselines. */
  update?: boolean;
  /** Playwright Docker image. */
  image?: string;
  /** Host port of the browser server. */
  port?: number;
}
