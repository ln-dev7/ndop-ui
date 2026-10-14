import { logger, type PromiseExecutor } from '@nx/devkit';
import { settledChecks, waitForSite, type SmokeResult } from './checks';
import type { DocsSmokeExecutorSchema } from './schema';
import { serviceWorkerCheck } from './service-worker-check';

/**
 * The post-deploy check of the docs site (ADR-0028, "Docs deployment"):
 * waits for the deployment to answer, then runs every check in
 * `checks.ts`, trying failed ones again until the timeout, and, unless `browser` is off, the service worker check in
 * Chromium, logs each result, and fails when any check fails. The Deploy
 * workflow runs it against the URL Wrangler reports; it also runs against
 * `wrangler pages dev` locally.
 *
 * @param options - The deployment's URL, whether to use a browser, and the
 *   timeout.
 * @returns Whether every check passed.
 *
 * @example
 * ```sh
 * pnpm nx smoke docs --url=https://ndop.dev
 * ```
 */
const docsSmoke: PromiseExecutor<DocsSmokeExecutorSchema> = async (options) => {
  const base = new URL(options.url).origin;
  const timeout = (options.timeout ?? 60) * 1000;
  try {
    await waitForSite(base, timeout);
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
    return { success: false };
  }
  const results: SmokeResult[] = await settledChecks(base, timeout);
  if (options.browser ?? true) {
    results.push(await serviceWorkerCheck(base, timeout));
  }
  logger.info(`Smoke checks of ${base}:`);
  for (const result of results) {
    if (result.ok) logger.info(`  ✓ ${result.name}`);
    else logger.error(`  ✗ ${result.name}: ${result.problem}`);
  }
  const failed = results.filter((result) => !result.ok).length;
  if (failed) logger.error(`${failed} of ${results.length} checks failed.`);
  else logger.info(`All ${results.length} checks passed.`);
  return { success: failed === 0 };
};

export default docsSmoke;
