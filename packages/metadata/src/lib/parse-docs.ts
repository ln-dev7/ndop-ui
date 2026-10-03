/**
 * The hand-written parts of a component page, from an item's `docs.md`
 * (ADR-0007).
 */
export interface ParsedDocs {
  /** Markdown before the first `##` heading. */
  intro: string;
  /** Bullets under `## Do`. */
  do: string[];
  /** Bullets under `## Don't`. */
  dont: string[];
}

/**
 * Parses an item's `docs.md`: a short Markdown introduction, then `## Do`
 * and `## Don't` bullet lists, the agent notes. Prose only; code samples
 * come from compiled examples.
 *
 * @param markdown - Contents of `docs.md`.
 * @returns The intro and notes; missing parts are empty, for the caller to
 *   report.
 *
 * @example
 * ```ts
 * parseDocs('Intro.\n\n## Do\n\n- Title it.\n\n## Don\'t\n\n- Nest it.\n');
 * // { intro: 'Intro.', do: ['Title it.'], dont: ['Nest it.'] }
 * ```
 */
export function parseDocs(markdown: string): ParsedDocs {
  const chunks = markdown.split(/^(?=## )/m);
  const intro = chunks[0]?.startsWith('## ') ? '' : (chunks.shift() ?? '');
  const sections = new Map<string, string>();
  for (const section of chunks) {
    const [heading = '', ...body] = section.split('\n');
    sections.set(heading.replace(/^##\s+/, '').trim(), body.join('\n'));
  }
  return {
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
