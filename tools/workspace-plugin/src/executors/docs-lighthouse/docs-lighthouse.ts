import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { logger, type PromiseExecutor } from '@nx/devkit';
import { serveSite } from '../../utils/serve-site';
import {
  failures,
  medianRun,
  prerenderedRoutes,
  reportName,
  type RouteScores,
} from './routes';
import type { DocsLighthouseExecutorSchema } from './schema';

/**
 * The docs' Lighthouse gate (ADR-0016, "Quality gates"): serves the built
 * site the way Cloudflare Pages does, runs `lighthouse` on every
 * prerendered route with its default mobile profile in Playwright's
 * Chromium, three times by default, keeps the run with the median
 * performance score as Lighthouse CI does, writes its HTML report, and fails when any category
 * of any route scores under the minimum (RFC-0001: 95).
 *
 * @param options - The site, minimum score, report folder and routes.
 * @param context - Nx executor context.
 * @returns Whether every score passed.
 *
 * @example
 * ```json
 * "lighthouse": {
 *   "executor": "@ndop/workspace-plugin:docs-lighthouse",
 *   "dependsOn": ["build"],
 *   "options": { "dir": "dist/apps/docs/analog/public" }
 * }
 * ```
 */
const docsLighthouse: PromiseExecutor<DocsLighthouseExecutorSchema> = async (
  options,
  context,
) => {
  const dir = join(context.root, options.dir);
  const minScore = options.minScore ?? 95;
  const outputDir = join(
    context.root,
    options.outputDir ?? 'dist/lighthouse/docs',
  );
  const routes = options.routes ?? (await prerenderedRoutes(dir));
  await mkdir(outputDir, { recursive: true });

  // Lighthouse and chrome-launcher are ES modules, loaded when needed.
  const { default: lighthouse } = await import('lighthouse');
  const { launch } = await import('chrome-launcher');
  const { chromium } = await import('@playwright/test');

  const site = await serveSite(dir);
  const chrome = await launch({
    chromePath: chromium.executablePath(),
    // Linux CI runners don't allow Chrome's sandbox; the site is our own.
    chromeFlags: [
      '--headless=new',
      ...(process.platform === 'linux' ? ['--no-sandbox'] : []),
    ],
  });
  const results: RouteScores[] = [];
  try {
    for (const route of routes) {
      const runs = [];
      for (let run = 0; run < (options.runs ?? 3); run++) {
        const result = await lighthouse(`${site.url}${route}`, {
          port: chrome.port,
          output: 'html',
          logLevel: 'error',
        });
        if (!result)
          throw new Error(`Lighthouse returned nothing for ${route}.`);
        runs.push(result);
      }
      const result =
        runs[
          medianRun(
            runs.map((run) => run.lhr.categories['performance']?.score ?? 0),
          )
        ];
      if (!result) throw new Error(`No Lighthouse run for ${route}.`);
      const scores = Object.fromEntries(
        Object.values(result.lhr.categories).map((category) => [
          category.title,
          Math.round((category.score ?? 0) * 100),
        ]),
      );
      results.push({ route, scores });
      await writeFile(
        join(outputDir, reportName(route)),
        String(result.report),
      );
      logger.info(
        `${route}  ${Object.entries(scores)
          .map(([category, score]) => `${category} ${score}`)
          .join(' · ')}`,
      );
    }
  } finally {
    chrome.kill();
    await site.close();
  }

  const failed = failures(results, minScore);
  if (failed.length) {
    logger.error(
      `Under ${minScore}:\n${failed.map((line) => `  ${line}`).join('\n')}`,
    );
  }
  logger.info(`Reports: ${options.outputDir ?? 'dist/lighthouse/docs'}`);
  return { success: failed.length === 0 };
};

export default docsLighthouse;
