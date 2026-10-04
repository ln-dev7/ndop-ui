import { join } from 'node:path';
import { logger, type PromiseExecutor } from '@nx/devkit';
import { serveSite } from '../../utils/serve-site';
import type { ServeSiteExecutorSchema } from './schema';

/**
 * Serves a built static site the way Cloudflare Pages serves the docs
 * (ADR-0016), so end-to-end tests run against the production build. It
 * runs until stopped, as an Nx continuous task.
 *
 * @param options - The folder and port.
 * @param context - Nx executor context.
 * @returns Success, once the server has stopped.
 *
 * @example
 * ```json
 * "serve-static": {
 *   "executor": "@ndop/workspace-plugin:serve-site",
 *   "continuous": true,
 *   "dependsOn": ["build"],
 *   "options": { "dir": "dist/apps/docs/analog/public", "port": 4400 }
 * }
 * ```
 */
const serveSiteExecutor: PromiseExecutor<ServeSiteExecutorSchema> = async (
  options,
  context,
) => {
  const site = await serveSite(
    join(context.root, options.dir),
    options.port ?? 4400,
  );
  logger.info(`Serving ${options.dir} at ${site.url}`);
  await new Promise<void>((resolve) => {
    process.once('SIGINT', resolve);
    process.once('SIGTERM', resolve);
  });
  await site.close();
  return { success: true };
};

export default serveSiteExecutor;
