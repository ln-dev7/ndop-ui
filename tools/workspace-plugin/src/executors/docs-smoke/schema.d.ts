/** Options of the `docs-smoke` executor. */
export interface DocsSmokeExecutorSchema {
  /** The deployment's origin, such as `https://ndop.dev` or a preview URL. */
  url: string;
  /** Also check the service worker in Playwright's Chromium; on by default. */
  browser?: boolean;
  /**
   * Seconds to wait for the site to answer, for failed checks to pass as
   * the deployment settles, and for the service worker to take control; 60
   * by default.
   */
  timeout?: number;
}
