import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SearchEntry } from '../src/app/search/search-entry';

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
 * Markdown or TSDoc as one line of plain text.
 *
 * @param text - Markdown, possibly with `{@link X}`.
 * @returns Plain text.
 */
export function plainText(text: string): string {
  return text
    .replace(
      /\{@link\s+([^}|\s]+)\s*(?:\|\s*([^}]+?)\s*)?\}/g,
      (_m, target: string, label?: string) => label ?? target,
    )
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * The `id` a heading gets on the page: GitHub's slugs, as
 * `marked-gfm-heading-id` makes them, with `-1`, `-2` for repeats.
 *
 * @param text - The heading's Markdown.
 * @param seen - Slugs already used on the page, updated.
 * @returns The slug.
 */
export function headingId(text: string, seen: Map<string, number>): string {
  const base = plainText(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/ /g, '-');
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return count ? `${base}-${count}` : base;
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
  for (const match of body.matchAll(/^#{2,3}\s+(.+?)\s*#*$/gm)) {
    const text = match[1] ?? '';
    entries.push({
      kind: 'heading',
      title: plainText(text),
      context: title,
      description: '',
      url: `${url}#${headingId(text, seen)}`,
    });
  }
  return entries;
}

/**
 * Index entries for one component: the component, every binding of every
 * part, and its keyboard map.
 *
 * @param component - Its metadata.
 * @returns The entries.
 */
export function componentEntries(component: IndexedComponent): SearchEntry[] {
  const url = `/docs/components/${component.name}`;
  return [
    {
      kind: 'component',
      title: component.title,
      context: 'Component',
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

/**
 * The whole index: every guide under `guides/<section>/<page>.md`, then
 * every component.
 *
 * @param guides - Absolute path of the guides folder.
 * @param components - Every component's metadata.
 * @returns The entries.
 */
export function searchIndex(
  guides: string,
  components: IndexedComponent[],
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
      .flatMap(componentEntries),
  ];
}
