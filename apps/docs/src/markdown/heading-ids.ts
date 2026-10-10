import type { MarkedExtension } from 'marked';

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
 * A heading's slug before repeats are numbered: GitHub's, lowercase with
 * punctuation dropped and spaces as `-`.
 *
 * @param text - The heading's Markdown.
 * @returns The slug.
 */
export function headingSlug(text: string): string {
  return plainText(text)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/ /g, '-');
}

/**
 * Numbers a slug that's already on the page: `-1`, `-2` for repeats.
 *
 * @param slug - From {@link headingSlug}.
 * @param seen - Slugs already used on the page, updated.
 * @returns The slug, unique on the page.
 */
function uniqueSlug(slug: string, seen: Map<string, number>): string {
  const count = seen.get(slug) ?? 0;
  seen.set(slug, count + 1);
  return count ? `${slug}-${count}` : slug;
}

/**
 * The `id` a heading gets on the page, as {@link headingIdsExtension}
 * assigns it, so the search index links to the same anchors.
 *
 * @param text - The heading's Markdown.
 * @param seen - Slugs already used on the page, updated.
 * @returns The id.
 *
 * @example
 * ```ts
 * const seen = new Map<string, number>();
 * headingId('Options', seen); // 'options'
 * headingId('Options', seen); // 'options-1'
 * ```
 */
export function headingId(text: string, seen: Map<string, number>): string {
  return uniqueSlug(headingSlug(text), seen);
}

/**
 * Gives every Markdown heading an `id` from {@link headingId}, numbering
 * repeats within each document.
 *
 * It replaces `marked-gfm-heading-id`'s ids, which Analog registers on the
 * shared `marked` instance. That extension keeps one slugger for the whole
 * process and resets it before parsing, but Shiki makes parsing async, so
 * guides rendered at the same time number each other's repeats and the
 * client and server builds can disagree on an id. Here the renderer only
 * slugs and the `postprocess` hook, which sees one whole document, numbers
 * the repeats, so no state outlives a parse.
 *
 * @returns The marked extension, for Analog's `markedOptions.extensions`;
 * it must come after `marked-gfm-heading-id` to override its renderer.
 *
 * @example
 * ```ts
 * new Marked(headingIdsExtension()).parse('## Options\n\n## Options');
 * // '<h2 id="options">Options</h2>\n<h2 id="options-1">Options</h2>\n'
 * ```
 */
export function headingIdsExtension(): MarkedExtension {
  return {
    renderer: {
      heading({ tokens, depth, text }) {
        return `<h${depth} id="${headingSlug(text)}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
      },
    },
    hooks: {
      postprocess(html) {
        const seen = new Map<string, number>();
        // Only the renderer above writes this exact shape: step titles
        // carry a class instead, and code is escaped by the highlighter.
        return html.replace(
          /<h([1-6]) id="([^"]*)">/g,
          (_m, depth: string, slug: string) =>
            `<h${depth} id="${uniqueSlug(slug, seen)}">`,
        );
      },
    },
  };
}
