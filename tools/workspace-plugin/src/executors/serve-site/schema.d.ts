/** Options of the `serve-site` executor. */
export interface ServeSiteExecutorSchema {
  /** Folder to serve, relative to the workspace root. */
  dir: string;
  /** Port to listen on. */
  port?: number;
}
