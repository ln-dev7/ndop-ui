import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

/** One route's category scores, 0 to 100. */
export interface RouteScores {
  /** The route. */
  route: string;
  /** Scores by category title, such as `Performance`. */
  scores: Record<string, number>;
}

/** What {@link categoryScores} reads of a Lighthouse result. */
export interface LighthouseResult {
  /** Categories by id. */
  categories: Record<string, { title: string; score: number | null }>;
  /** Audits by id. */
  audits: Record<string, { score: number | null } | undefined>;
}

/**
 * A route's category scores, 0 to 100. A page that asks search engines
 * not to index it, such as a block's preview (ADR-0022), has no SEO score:
 * Lighthouse's SEO category fails that request by design.
 *
 * @param result - The Lighthouse result.
 * @returns Scores by category title.
 */
export function categoryScores(
  result: LighthouseResult,
): Record<string, number> {
  const unlisted = result.audits['is-crawlable']?.score === 0;
  return Object.fromEntries(
    Object.entries(result.categories)
      .filter(([id]) => !(unlisted && id === 'seo'))
      .map(([, category]) => [
        category.title,
        Math.round((category.score ?? 0) * 100),
      ]),
  );
}

/**
 * Every prerendered route of a built site: each HTML file outside
 * `assets/` and `r/`. Pages are prerendered as `<route>.html`, so Cloudflare
 * Pages serves them without a trailing-slash redirect (ADR-0016,
 * "Hosting"); the home page is `index.html`.
 *
 * @param dir - The built site.
 * @returns Routes, sorted, such as `/` and `/docs/components/dialog`.
 */
export async function prerenderedRoutes(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) =>
      relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/'),
    )
    .filter((file) => !/^(?:assets|r)\//.test(file))
    .map((file) => `/${file.replace(/(?:^|\/)index\.html$|\.html$/, '')}`)
    .sort();
}

/**
 * One shard's share of the routes, for auditing them on parallel runners.
 * Routes are dealt out in turn, so every shard gets a similar mix of
 * pages.
 *
 * @param routes - Every route, sorted.
 * @param shard - Which shard and of how many, such as `2/3`.
 * @returns This shard's routes.
 * @throws When `shard` isn't `<index>/<total>` with 1 ≤ index ≤ total.
 */
export function shardRoutes(routes: string[], shard: string): string[] {
  const match = /^(\d+)\/(\d+)$/.exec(shard);
  const index = Number(match?.[1]);
  const total = Number(match?.[2]);
  if (!match || index < 1 || index > total) {
    throw new Error(`Expected a shard like 1/3, got "${shard}".`);
  }
  return routes.filter((_, position) => position % total === index - 1);
}

/**
 * The scores that fail the gate: any category under the minimum, except
 * performance, which fails only under its floor (ADR-0016, amendments 10
 * and 14).
 *
 * @param results - Every route's scores.
 * @param minScore - Lowest passing score, and performance's target.
 * @param performanceFloor - Lowest passing performance score.
 * @returns One line per failing score, such as `/ Performance 89`.
 */
export function failures(
  results: RouteScores[],
  minScore: number,
  performanceFloor = minScore,
): string[] {
  return results.flatMap(({ route, scores }) =>
    Object.entries(scores)
      .filter(([category, score]) =>
        category === 'Performance'
          ? score < performanceFloor
          : score < minScore,
      )
      .map(([category, score]) => `${route} ${category} ${score}`),
  );
}

/**
 * Performance scores between the floor and the target, which warn without
 * failing (ADR-0016, amendments 10 and 14).
 *
 * @param results - Every route's scores.
 * @param minScore - The target score.
 * @param performanceFloor - Lowest passing performance score.
 * @returns One line per such score, such as `/ Performance 94`.
 */
export function warnings(
  results: RouteScores[],
  minScore: number,
  performanceFloor: number,
): string[] {
  return results.flatMap(({ route, scores }) => {
    const score = scores['Performance'];
    return score !== undefined && score >= performanceFloor && score < minScore
      ? [`${route} Performance ${score}`]
      : [];
  });
}

/**
 * A file name for a route's report.
 *
 * @param route - The route.
 * @returns Such as `docs-components-dialog.html`, or `index.html` for `/`.
 */
export function reportName(route: string): string {
  return `${route.replace(/^\/|\/$/g, '').replace(/\//g, '-') || 'index'}.html`;
}

/**
 * The run that represents a route, as Lighthouse CI picks it: the one with
 * the median performance score, so one slow or lucky run doesn't decide.
 *
 * @param runs - The runs' performance scores, in run order.
 * @returns The index of the median run.
 */
export function medianRun(runs: number[]): number {
  const order = runs
    .map((score, index) => ({ score, index }))
    .sort((a, b) => a.score - b.score);
  return order[Math.floor((order.length - 1) / 2)]?.index ?? 0;
}

/**
 * The benchmark of the CI run that accepted Phase 3 with Lighthouse's
 * default 4× CPU slowdown (ADR-0016, amendment 8): the device every run
 * emulates.
 */
export const REFERENCE_BENCHMARK = 3200;

/**
 * The CPU slowdown that makes a host emulate the reference device
 * (ADR-0016, amendment 8): 4 × benchmark ÷ {@link REFERENCE_BENCHMARK},
 * rounded to one decimal, between 1 and 8.
 *
 * @param benchmark - The host's median `benchmarkIndex`.
 * @returns The `cpuSlowdownMultiplier`.
 */
export function cpuMultiplier(benchmark: number): number {
  const multiplier = Math.round((40 * benchmark) / REFERENCE_BENCHMARK) / 10;
  return Math.min(8, Math.max(1, multiplier));
}

/**
 * The median of some numbers.
 *
 * @param values - At least one number.
 * @returns The middle value, or the lower of the two middle ones.
 */
export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)] ?? 0;
}
