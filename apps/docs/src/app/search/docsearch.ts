import type { LiteClient } from 'algoliasearch/lite';

/**
 * Where the docs' DocSearch index lives (ADR-0008), from build-time
 * environment variables: GitHub Actions variables on deploy, or
 * `apps/docs/.env.local` locally. Without them the palette searches the
 * local index alone.
 */
export interface DocSearchConfig {
  /** The Algolia application. */
  appId: string;
  /** A search-only key; it ships to every reader. */
  apiKey: string;
  /** The crawled index. */
  indexName: string;
}

/** One page that matches a query anywhere in its text. */
export interface FullTextHit {
  /** The page's title, without the site name. */
  title: string;
  /** Its route. */
  path: string;
  /** The part of the site it's in, such as `Components` or `Blog`. */
  section: string;
}

/** One record of the crawled index: a page. */
interface PageRecord {
  title?: string;
  path?: string;
}

/** The client, created with the first search. */
let client: Promise<LiteClient> | undefined;

/** The site name the crawler finds at the end of every page title. */
const SITE_SUFFIX = / · Ndop UI$/;

/**
 * The DocSearch settings this build was made with.
 *
 * @returns The settings, or `null` when any is missing.
 */
export function docSearchConfig(): DocSearchConfig | null {
  const appId = import.meta.env.DOCSEARCH_APP_ID;
  const apiKey = import.meta.env.DOCSEARCH_API_KEY;
  const indexName = import.meta.env.DOCSEARCH_INDEX_NAME;
  return appId && apiKey && indexName ? { appId, apiKey, indexName } : null;
}

/**
 * The part of the site a route is in: its section's folder for docs
 * pages, its first segment elsewhere, in sentence case.
 *
 * @param path - A route, such as `/docs/getting-started/cli`.
 * @returns Such as `Getting started`.
 */
export function sectionOf(path: string): string {
  const segments = path.split('/').filter(Boolean);
  const segment =
    (segments[0] === 'docs' ? segments[1] : segments[0]) ?? 'home';
  const words = segment.replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * The pages of a search response the palette can open: routes of the
 * site, not its Markdown twins, feeds or registry files, each once.
 *
 * @param records - The hits, in Algolia's order.
 * @returns The pages, in the same order.
 */
export function pagesOf(records: PageRecord[]): FullTextHit[] {
  const seen = new Set<string>();
  const pages: FullTextHit[] = [];
  for (const record of records) {
    const path = record.path;
    if (!path?.startsWith('/') || /\.\w+$/.test(path) || path.startsWith('/r/'))
      continue;
    if (seen.has(path)) continue;
    seen.add(path);
    pages.push({
      title: (record.title ?? path).replace(SITE_SUFFIX, ''),
      path,
      section: sectionOf(path),
    });
  }
  return pages;
}

/**
 * Searches the full text of every page through Algolia's lite client,
 * loaded the first time it's needed.
 *
 * @param config - Where the index lives.
 * @param query - What the reader typed.
 * @returns Up to six pages, best first.
 */
export async function searchFullText(
  config: DocSearchConfig,
  query: string,
): Promise<FullTextHit[]> {
  client ??= import('algoliasearch/lite').then(({ liteClient }) =>
    liteClient(config.appId, config.apiKey),
  );
  const { results } = await (
    await client
  ).searchForHits<PageRecord>({
    requests: [
      {
        indexName: config.indexName,
        query,
        hitsPerPage: 8,
        attributesToRetrieve: ['title', 'path'],
        attributesToHighlight: [],
      },
    ],
  });
  return pagesOf(results[0]?.hits ?? []).slice(0, 6);
}
