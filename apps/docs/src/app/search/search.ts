import type { SearchEntry, SearchKind } from './search-entry';

/** Result groups, in the order the palette shows them. */
export const GROUPS: readonly { kind: SearchKind; title: string }[] = [
  { kind: 'component', title: 'Components' },
  { kind: 'block', title: 'Blocks' },
  { kind: 'page', title: 'Guides' },
  { kind: 'heading', title: 'Sections' },
  { kind: 'prop', title: 'Props' },
  { kind: 'shortcut', title: 'Keyboard' },
];

/** At most this many results per group. */
const PER_GROUP = 6;

/**
 * How well an entry matches. Every word of the query must appear in its
 * title, keywords or context; matches in the title, at its start or at a
 * word's start, rank higher, then the start of a keyword's word.
 *
 * @param entry - An entry.
 * @param words - The query's words, lowercase.
 * @returns A score, or 0 for no match.
 */
export function score(entry: SearchEntry, words: readonly string[]): number {
  const title = entry.title.toLowerCase();
  const context = entry.context.toLowerCase();
  const keywords = entry.keywords ?? [];
  let total = 0;
  for (const word of words) {
    if (title === word) total += 100;
    else if (title.startsWith(word)) total += 60;
    else if (new RegExp(`\\b${escape(word)}`).test(title)) total += 40;
    else if (title.includes(word)) total += 20;
    else if (
      keywords.some((keyword) => new RegExp(`\\b${escape(word)}`).test(keyword))
    )
      total += 30;
    else if (context.includes(word)) total += 5;
    else return 0;
  }
  return total;
}

/**
 * Escapes a string for use in a regular expression.
 *
 * @param text - Text.
 * @returns It, escaped.
 */
function escape(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Searches the index and groups the results, best first. An empty query
 * lists the components and guides.
 *
 * @param entries - The index.
 * @param query - What the reader typed.
 * @returns Non-empty groups, in {@link GROUPS} order.
 */
export function search(
  entries: readonly SearchEntry[],
  query: string,
): { kind: SearchKind; title: string; entries: SearchEntry[] }[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const scored = words.length
    ? entries
        .map((entry) => ({ entry, score: score(entry, words) }))
        .filter((result) => result.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((result) => result.entry)
    : entries.filter(
        (entry) => entry.kind === 'component' || entry.kind === 'page',
      );
  return GROUPS.map((group) => ({
    ...group,
    entries: scored
      .filter((entry) => entry.kind === group.kind)
      .slice(0, PER_GROUP),
  })).filter((group) => group.entries.length > 0);
}
