/**
 * The hand-written parts of a component page, from an item's `docs.md`
 * (ADR-0007).
 */
export interface ParsedDocs {
  /** Other words for the component, from the front matter's `keywords`. */
  keywords: string[];
  /** Markdown before the first `##` heading. */
  intro: string;
  /** Bullets under `## Do`. */
  do: string[];
  /** Bullets under `## Don't`. */
  dont: string[];
}

/**
 * Parses an item's `docs.md`: optional front matter with `keywords`, a
 * comma-separated list of other words people use for the component; a
 * short Markdown introduction; then `## Do` and `## Don't` bullet lists, the
 * agent notes. Prose only; code samples come from compiled examples.
 *
 * @param markdown - Contents of `docs.md`.
 * @returns The intro and notes; missing parts are empty, for the caller to
 *   report.
 *
 * @example
 * ```ts
 * parseDocs('Intro.\n\n## Do\n\n- Title it.\n\n## Don\'t\n\n- Nest it.\n');
 * // { keywords: [], intro: 'Intro.', do: ['Title it.'], dont: ['Nest it.'] }
 * ```
 */
export function parseDocs(markdown: string): ParsedDocs {
  const front = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(markdown);
  const keywords = (/^keywords:(.*)$/m.exec(front?.[1] ?? '')?.[1] ?? '')
    .split(',')
    .map((keyword) => keyword.trim())
    .filter(Boolean);
  const chunks = markdown.slice(front?.[0].length ?? 0).split(/^(?=## )/m);
  const intro = chunks[0]?.startsWith('## ') ? '' : (chunks.shift() ?? '');
  const sections = new Map<string, string>();
  for (const section of chunks) {
    const [heading = '', ...body] = section.split('\n');
    sections.set(heading.replace(/^##\s+/, '').trim(), body.join('\n'));
  }
  return {
    keywords,
    intro: intro.trim(),
    do: bullets(sections.get('Do')),
    dont: bullets(sections.get("Don't")),
  };
}

/**
 * Reads a Markdown bullet list, joining wrapped lines.
 *
 * @param section - A section body.
 * @returns One string per bullet.
 */
function bullets(section: string | undefined): string[] {
  const items: string[] = [];
  for (const line of (section ?? '').split('\n')) {
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      items.push(bullet[1]?.trim() ?? '');
    } else if (line.trim() && items.length > 0) {
      items[items.length - 1] += ` ${line.trim()}`;
    }
  }
  return items.filter(Boolean);
}
