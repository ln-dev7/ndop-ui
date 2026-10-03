import { parseRawContentFile } from '@analogjs/content';

/**
 * Front matter every guide declares.
 */
export interface PageAttributes {
  /** Page title, also the `<title>` and the nav label. */
  title: string;
  /** One sentence, used as the meta description. */
  description: string;
  /** Position within its section. */
  order: number;
}

/**
 * A guide's rendered content.
 */
export interface Guide {
  /** Its front matter. */
  attributes: PageAttributes;
  /** HTML rendered and highlighted at build time. */
  html: string;
}

// Guides live in src/guides rather than src/content, which Analog's router
// would turn into routes of its own. These query strings run them through
// Analog's content plugin all the same: front matter only for the list,
// Markdown rendered and highlighted with Shiki for each page.
const ATTRIBUTES = import.meta.glob<PageAttributes>('../../guides/**/*.md', {
  query: { 'analog-content-list': 'true' },
  import: 'default',
  eager: true,
});
const CONTENT = import.meta.glob<string>('../../guides/**/*.md', {
  query: { 'analog-content-file': 'true' },
  import: 'default',
});

/**
 * A guide's address within its section.
 */
export interface GuideEntry {
  /** Section folder, such as `getting-started`. */
  section: string;
  /** File name without `.md`, such as `installation`. */
  page: string;
  /** Front matter. */
  attributes: PageAttributes;
}

/**
 * Every guide's front matter, from `src/guides/<section>/<page>.md`.
 *
 * @returns The guides, unordered.
 */
export function guideEntries(): GuideEntry[] {
  return Object.entries(ATTRIBUTES).map(([path, attributes]) => {
    const [, section = '', page = ''] =
      /guides\/([^/]+)\/([^/]+)\.md$/.exec(path) ?? [];
    return { section, page, attributes };
  });
}

/**
 * Loads one guide.
 *
 * @param section - Section folder.
 * @param page - Page file name without `.md`.
 * @returns The guide, or `undefined` when it doesn't exist.
 */
export async function loadGuide(
  section: string,
  page: string,
): Promise<Guide | undefined> {
  const load = CONTENT[`../../guides/${section}/${page}.md`];
  if (!load) return undefined;
  const { attributes, content } = parseRawContentFile<PageAttributes>(
    await load(),
  );
  return { attributes, html: content };
}
