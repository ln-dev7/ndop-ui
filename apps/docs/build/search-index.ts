import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SearchEntry } from '../src/app/search/search-entry';
import { headingId, plainText } from '../src/markdown/heading-ids';
import type { BlogPost } from './blog-posts';

/** The metadata fields the index reads. */
export interface IndexedComponent {
  name: string;
  title: string;
  description: string;
  keywords?: string[];
  keyboard: { keys: string[]; action: string }[];
  parts: {
    name: string;
    inputs: { name: string; type: string; description: string }[];
    models: { name: string; type: string; description: string }[];
    outputs: { name: string; type: string; description: string }[];
  }[];
}

/**
 * Index entries for one guide: the page, then its `##` and `###` sections.
 * Headings in code blocks and step titles inside `:::steps`, which get no
 * `id`, are left out.
 *
 * @param markdown - The guide's file, front matter included.
 * @param url - Its route.
 * @returns The entries.
 */
export function guideEntries(markdown: string, url: string): SearchEntry[] {
  const front = /^---\n([\s\S]*?)\n---\n/.exec(markdown);
  const field = (name: string) =>
    new RegExp(`^${name}:\\s*(.*)$`, 'm').exec(front?.[1] ?? '')?.[1]?.trim() ??
    '';
  const title = field('title');
  const body = markdown
    .slice(front?.[0].length ?? 0)
    .replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, '')
    .replace(/^:::steps[ \t]*\n[\s\S]*?\n:::[ \t]*$/gm, '');
  const seen = new Map<string, number>();
  const entries: SearchEntry[] = [
    {
      kind: 'page',
      title,
      context: 'Guide',
      description: field('description'),
      url,
    },
  ];
  // Every level numbers repeats on the page, so every level counts here
  // too, though only `##` and `###` are indexed.
  for (const match of body.matchAll(/^(#{1,6})\s+(.+?)\s*#*$/gm)) {
    const text = match[2] ?? '';
    const id = headingId(text, seen);
    if (match[1] !== '##' && match[1] !== '###') continue;
    entries.push({
      kind: 'heading',
      title: plainText(text),
      context: title,
      description: '',
      url: `${url}#${id}`,
    });
  }
  return entries;
}

/**
 * Index entries for one component: the component, every binding of every
 * part, and its keyboard map.
 *
 * @param component - Its metadata.
 * @param url - Styled component or primitive page route.
 * @param context - Page category shown in search results.
 * @returns The entries.
 */
export function componentEntries(
  component: IndexedComponent,
  url = `/docs/components/${component.name}`,
  context = 'Component',
): SearchEntry[] {
  return [
    {
      kind: 'component',
      title: component.title,
      context,
      description: plainText(component.description),
      ...(component.keywords?.length
        ? {
            keywords: component.keywords.map((keyword) =>
              keyword.toLowerCase(),
            ),
          }
        : {}),
      url,
    },
    ...component.parts.flatMap((part) =>
      [...part.inputs, ...part.models, ...part.outputs]
        .filter((member) => member.name !== 'class')
        .map(
          (member): SearchEntry => ({
            kind: 'prop',
            title: member.name,
            context: `${component.title} · ${part.name}`,
            description: plainText(member.description),
            url: `${url}#api-${part.name}`,
          }),
        ),
    ),
    ...component.keyboard.map(
      (row): SearchEntry => ({
        kind: 'shortcut',
        title: row.keys.join(' / '),
        context: component.title,
        description: plainText(row.action),
        url: `${url}#keyboard`,
      }),
    ),
  ];
}

/** What the index needs of a block (ADR-0022). */
export interface IndexedBlock {
  name: string;
  title: string;
  description: string;
  /** Its gallery category's title, such as `Authentication`. */
  category: string;
}

/**
 * A block's entry: found by its name, its words and its category.
 *
 * @param block - The block.
 * @returns Its entry.
 */
export function blockEntry(block: IndexedBlock): SearchEntry {
  return {
    kind: 'block',
    title: block.title,
    context: `Block · ${block.category}`,
    description: plainText(block.description),
    keywords: [block.name, block.category.toLowerCase()],
    url: `/blocks/${block.name}`,
  };
}

/**
 * Index entries for one blog post: the post, then its `##` and `###`
 * sections, as a guide's.
 *
 * @param post - The post.
 * @returns The entries.
 */
export function postEntries(post: BlogPost): SearchEntry[] {
  // The guide reader finds the sections; the post's own entry replaces
  // the page entry it makes.
  const [, ...headings] = guideEntries(`---\n\n---\n${post.body}`, post.url);
  return [
    {
      kind: 'page',
      title: post.title,
      context: 'Blog',
      description: post.description,
      url: post.url,
    },
    ...headings.map((heading) => ({ ...heading, context: post.title })),
  ];
}

/**
 * The whole index: every guide under `guides/<section>/<page>.md`, then
 * every component, then every block, then every blog post.
 *
 * @param guides - Absolute path of the guides folder.
 * @param components - Every component's metadata.
 * @param blocks - Every block.
 * @param posts - Every blog post.
 * @param primitives - Extracted headless APIs, including behavior-only parts.
 * @returns The entries.
 */
export function searchIndex(
  guides: string,
  components: IndexedComponent[],
  blocks: IndexedBlock[] = [],
  posts: BlogPost[] = [],
  primitives: IndexedComponent[] = [],
): SearchEntry[] {
  const pages = readdirSync(guides, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((section) =>
      readdirSync(join(guides, section.name))
        .filter((file) => file.endsWith('.md'))
        .map((file) => ({
          file: join(guides, section.name, file),
          url: `/docs/${section.name}/${file.slice(0, -'.md'.length)}`,
        })),
    );
  return [
    ...pages.flatMap((page) =>
      guideEntries(readFileSync(page.file, 'utf-8'), page.url),
    ),
    ...[...components]
      .sort((a, b) => a.title.localeCompare(b.title))
      .flatMap((component) => componentEntries(component)),
    ...[...primitives]
      .sort((a, b) => a.title.localeCompare(b.title))
      .flatMap((primitive) =>
        componentEntries(
          { ...primitive, title: `${primitive.title} primitive` },
          `/docs/primitives/${primitive.name}`,
          'Primitive',
        ),
      ),
    ...blocks.map(blockEntry),
    ...posts.flatMap(postEntries),
  ];
}
