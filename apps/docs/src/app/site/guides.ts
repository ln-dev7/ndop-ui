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
  return splitGuide(await load());
}

/**
 * Splits a guide, as Analog's content plugin outputs it, into its front
 * matter and its rendered HTML. Guides' front matter is plain `key: value`
 * lines, so this replaces `@analogjs/content`'s YAML parser, which put
 * 58 KB of gzipped JavaScript on every page.
 *
 * @param file - Front matter between `---` lines, then HTML.
 * @returns The guide.
 */
export function splitGuide(file: string): Guide {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(file);
  const fields = Object.fromEntries(
    (match?.[1] ?? '').split(/\r?\n/).flatMap((line) => {
      const separator = line.indexOf(':');
      return separator > 0
        ? [[line.slice(0, separator).trim(), line.slice(separator + 1).trim()]]
        : [];
    }),
  );
  return {
    attributes: {
      title: fields['title'] ?? '',
      description: fields['description'] ?? '',
      order: Number(fields['order']) || 0,
    },
    html: file.slice(match?.[0].length ?? 0),
  };
}
