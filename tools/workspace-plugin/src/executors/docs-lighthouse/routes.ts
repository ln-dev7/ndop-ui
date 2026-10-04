import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

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
