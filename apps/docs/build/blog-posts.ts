import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pageUrl } from '../src/app/site/og-image';
import { plainMarkdown } from './markdown-twins';

/** A blog post, read from `blog/<slug>.md`. */
export interface BlogPost {
  /** Its route, `/blog/<slug>`. */
  url: string;
  /** From the front matter. */
  title: string;
  /** From the front matter. */
  description: string;
  /** From the front matter, `YYYY-MM-DD`. */
  date: string;
  /** From the front matter. */
  author: string;
  /** The Markdown after the front matter. */
  body: string;
}

/**
 * Reads a post's front matter and body. Values may be quoted, as YAML
 * needs for a title with a colon.
 *
 * @param markdown - The file.
 * @param url - Its route.
 * @returns The post.
 */
export function parsePost(markdown: string, url: string): BlogPost {
  const front = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(markdown);
  const field = (name: string) => {
    const value =
      new RegExp(`^${name}:\\s*(.*)$`, 'm')
        .exec(front?.[1] ?? '')?.[1]
        ?.trim() ?? '';
    const quoted = /^(['"])(.*)\1$/.exec(value);
    if (!quoted) return value;
    // YAML's single-quoted strings escape a quote by doubling it.
    return quoted[1] === "'"
      ? (quoted[2] ?? '').replace(/''/g, "'")
      : (quoted[2] ?? '').replace(/\\"/g, '"');
  };
  return {
    url,
    title: field('title'),
    description: field('description'),
    date: field('date'),
    author: field('author'),
    body: markdown.slice(front?.[0].length ?? 0).trim(),
  };
}

/**
 * Every post, newest first; posts of the same day by title.
 *
 * @param folder - Absolute path of the posts' folder.
 * @returns The posts, none when the folder doesn't exist.
 */
export function readPosts(folder: string): BlogPost[] {
  if (!existsSync(folder)) return [];
  return readdirSync(folder)
    .filter((file) => file.endsWith('.md'))
    .map((file) =>
      parsePost(
        readFileSync(join(folder, file), 'utf-8'),
        `/blog/${file.slice(0, -'.md'.length)}`,
      ),
    )
    .sort(
      (a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title),
    );
}

/**
 * A post's `.md` twin (ADR-0016, amendment 6), with its byline.
 *
 * @param post - The post.
 * @returns Its Markdown.
 */
export function postMarkdown(post: BlogPost): string {
  return `# ${post.title}\n\n> ${post.description}\n\nBy ${post.author}, ${post.date}.\n\n${plainMarkdown(post.body)}\n`;
}

/**
 * Escapes text for XML.
 *
 * @param text - The text.
 * @returns It, safe in an element.
 */
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&apos;',
      })[char] ?? char,
  );

/**
 * A date as RSS 2.0's `pubDate` writes it (RFC 822), at midnight UTC,
 * since posts give a day and no time.
 *
 * @param date - `YYYY-MM-DD`.
 * @returns Such as `Thu, 15 Oct 2026 00:00:00 GMT`.
 */
export function rssDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toUTCString();
}

/**
 * The blog's RSS 2.0 feed (`/blog/rss.xml`): the channel, with its own
 * address as `atom:link`, as the RSS Advisory Board recommends, and one
 * `<item>` per post, newest first, with its title, link, permalink
 * `guid`, date, description and author (`dc:creator`, since RSS's own
 * `<author>` must be an email address).
 *
 * @param posts - The posts, newest first.
 * @returns The feed, UTF-8 XML ending in a newline.
 *
 * @example
 * ```ts
 * rssXml(readPosts('apps/docs/src/blog'));
 * ```
 */
export function rssXml(posts: readonly BlogPost[]): string {
  const items = posts.map((post) =>
    [
      '    <item>',
      `      <title>${escape(post.title)}</title>`,
      `      <link>${escape(pageUrl(post.url))}</link>`,
      `      <guid isPermaLink="true">${escape(pageUrl(post.url))}</guid>`,
      `      <pubDate>${rssDate(post.date)}</pubDate>`,
      `      <dc:creator>${escape(post.author)}</dc:creator>`,
      `      <description>${escape(post.description)}</description>`,
      '    </item>',
    ].join('\n'),
  );
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    '  <channel>',
    '    <title>Ndop UI blog</title>',
    `    <link>${pageUrl('/blog')}</link>`,
    `    <atom:link href="${pageUrl('/blog/rss.xml')}" rel="self" type="application/rss+xml"/>`,
    '    <description>Write-ups on how Ndop UI works and the decisions behind it.</description>',
    '    <language>en</language>',
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}
