import { readdir } from 'node:fs/promises';
import { relative, sep } from 'node:path';

/** One route's category scores, 0 to 100. */
export interface RouteScores {
  /** The route. */
  route: string;
  /** Scores by category title, such as `Performance`. */
  scores: Record<string, number>;
}

/**
 * Every prerendered route of a built site: each folder holding an
 * `index.html`.
 *
 * @param dir - The built site.
 * @returns Routes, sorted, such as `/` and `/docs/components/dialog`.
 */
export async function prerenderedRoutes(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name === 'index.html')
    .map((entry) => {
      const folder = relative(dir, entry.parentPath).split(sep).join('/');
      return folder ? `/${folder}` : '/';
    })
    .sort();
}

/**
 * The scores under the minimum.
 *
 * @param results - Every route's scores.
 * @param minScore - Lowest passing score.
 * @returns One line per failing score, such as `/ Performance 91`.
 */
export function failures(results: RouteScores[], minScore: number): string[] {
  return results.flatMap(({ route, scores }) =>
    Object.entries(scores)
      .filter(([, score]) => score < minScore)
      .map(([category, score]) => `${route} ${category} ${score}`),
  );
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
