import { splitGuide } from '../site/guides';
import { ogImagePath, pageUrl, SITE } from '../site/og-image';

/**
 * Front matter every blog post declares, in `src/blog/<slug>.md`.
 */
export interface PostAttributes {
  /** The post's title, also its `<title>` and its `headline`. */
  title: string;
  /** One or two sentences, used as the meta description and in the feed. */
  description: string;
  /** Publication date, `YYYY-MM-DD`. */
  date: string;
  /** The author's name, a key of {@link AUTHORS}. */
  author: string;
}

/** A post's address and front matter. */
export interface PostEntry {
  /** File name without `.md`, such as `updating-code-you-own`. */
  slug: string;
  /** Its route, `/blog/<slug>`. */
  url: string;
  /** Front matter. */
  attributes: PostAttributes;
}

/** A post's rendered content. */
export interface Post extends PostEntry {
  /** HTML rendered and highlighted at build time, as guides are. */
  html: string;
}

/**
 * Each author's profile link, by the name posts give in `author`, for the
 * byline and the `BlogPosting`'s `author.url`.
 */
export const AUTHORS: Record<string, string> = {
  'Valery Melou': 'https://x.com/valerymelou',
};

// Posts go through Analog's content plugin as guides do (see guides.ts):
// the front matter of every post for the index, and each post's Markdown
// rendered and highlighted with Shiki when its page loads.
const ATTRIBUTES = import.meta.glob<Record<string, unknown>>(
  '../../blog/*.md',
  {
    query: { 'analog-content-list': 'true' },
    import: 'default',
    eager: true,
  },
);
const CONTENT = import.meta.glob<string>('../../blog/*.md', {
  query: { 'analog-content-file': 'true' },
  import: 'default',
});

/**
 * Reads a post's front matter as the content plugin parses it. Its YAML
 * parser turns an unquoted `date` into a timestamp, so only the date part
 * is kept.
 *
 * @param fields - The parsed front matter.
 * @returns The attributes.
 */
export function postAttributes(
  fields: Record<string, unknown>,
): PostAttributes {
  return {
    title: String(fields['title'] ?? ''),
    description: String(fields['description'] ?? ''),
    date: String(fields['date'] ?? '').slice(0, 10),
    author: String(fields['author'] ?? ''),
  };
}

/**
 * Every post, newest first; posts of the same day by title.
 *
 * @returns The posts' addresses and front matter.
 */
export function postEntries(): PostEntry[] {
  return Object.entries(ATTRIBUTES)
    .map(([path, fields]) => {
      const slug = /blog\/([^/]+)\.md$/.exec(path)?.[1] ?? '';
      return { slug, url: `/blog/${slug}`, attributes: postAttributes(fields) };
    })
    .sort(
      (a, b) =>
        b.attributes.date.localeCompare(a.attributes.date) ||
        a.attributes.title.localeCompare(b.attributes.title),
    );
}

/**
 * Loads one post.
 *
 * @param slug - The post's file name without `.md`.
 * @returns The post, or `undefined` when there is none.
 */
export async function loadPost(slug: string): Promise<Post | undefined> {
  const entry = postEntries().find((post) => post.slug === slug);
  const load = CONTENT[`../../blog/${slug}.md`];
  if (!entry || !load) return undefined;
  return { ...entry, html: splitGuide(await load()).html };
}

/**
 * A post's date as readers see it, such as "October 15, 2026", the same
 * on the server and in every browser.
 *
 * @param date - `YYYY-MM-DD`.
 * @returns The date in words.
 *
 * @example
 * ```ts
 * readableDate('2026-10-15'); // 'October 15, 2026'
 * ```
 */
export function readableDate(date: string): string {
  // In UTC, so a reader west of Greenwich doesn't see the day before.
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));
}

/**
 * A post's `BlogPosting` structured data, as Google's Article structured
 * data documentation recommends: its headline, publication date, author
 * as a `Person` with a profile link, and its share image.
 *
 * @param post - The post.
 * @returns The JSON-LD object.
 */
export function blogPosting(post: PostEntry): Record<string, unknown> {
  const url = AUTHORS[post.attributes.author];
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.attributes.title,
    description: post.attributes.description,
    datePublished: post.attributes.date,
    author: [
      {
        '@type': 'Person',
        name: post.attributes.author,
        ...(url ? { url } : {}),
      },
    ],
    image: [SITE + ogImagePath(post.url)],
    url: pageUrl(post.url),
  };
}
