import type { Metadata } from '@ndop/metadata';

/** What search reads about one component. */
export interface SearchDocument {
  /** Registry item name. */
  name: string;
  /** Display title. */
  title: string;
  /** One sentence. */
  description: string;
  /** Its metadata, when the registry has it. */
  metadata?: Metadata;
  /** Titles of its examples. */
  exampleTitles?: string[];
}

/** One ranked result. */
export interface SearchHit {
  /** Registry item name, for `get_component`. */
  name: string;
  /** Display title. */
  title: string;
  /** One sentence. */
  description: string;
  /** Relevance; higher is better. */
  score: number;
}

/**
 * Other words for components, for registries whose metadata has no
 * `keywords`. Ndop's own components list theirs in `docs.md`.
 */
export const SYNONYMS: Readonly<Record<string, readonly string[]>> = {
  modal: ['dialog', 'alert-dialog', 'sheet', 'drawer'],
  lightbox: ['dialog'],
  confirm: ['alert-dialog', 'dialog'],
  popup: ['popover', 'dialog', 'dropdown-menu'],
  flyout: ['popover', 'dropdown-menu'],
  hint: ['tooltip'],
  tip: ['tooltip'],
  divider: ['separator'],
  hr: ['separator'],
  textbox: ['input', 'textarea'],
  field: ['input', 'form-field'],
  chip: ['badge'],
  tag: ['badge'],
  pill: ['badge'],
  toggle: ['switch', 'toggle', 'checkbox'],
  dropdown: ['select', 'dropdown-menu', 'combobox'],
  notification: ['toast', 'alert'],
  spinner: ['spinner', 'progress'],
};

/** Words that say nothing about which component is wanted. */
const STOP_WORDS = new Set(
  'a an and are as at be before after by can for from how i in into is it its me my of on or our should that the their them this to use used using want we when where which while with you your'.split(
    ' ',
  ),
);

/**
 * Ranks components for a query (ADR-0009). Each word of the query scores
 * where it matches best: the name or title (exact 100, prefix 60, start of
 * a word 40, anywhere 20), a keyword or synonym (30), or the intro, agent
 * notes, part names and example titles (10). Words that match nothing are
 * ignored, so a loosely phrased request still finds what it names.
 *
 * @param documents - The components.
 * @param query - What the agent is looking for.
 * @param limit - At most this many results.
 * @returns Matching components, best first; empty when nothing matches.
 *
 * @example
 * ```ts
 * searchComponents(documents, 'confirm before deleting', 8);
 * // [{ name: 'dialog', score: 30, … }]
 * ```
 */
export function searchComponents(
  documents: readonly SearchDocument[],
  query: string,
  limit: number,
): SearchHit[] {
  const words = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}-]+/u)
    .filter((word) => word && !STOP_WORDS.has(word));
  return documents
    .map((document) => ({
      name: document.name,
      title: document.title,
      description: document.description,
      score: words.reduce((total, word) => total + score(document, word), 0),
    }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);
}

/**
 * How well one word matches a component.
 *
 * @param document - The component.
 * @param word - A lowercase query word.
 * @returns Its best score, or 0.
 */
function score(document: SearchDocument, word: string): number {
  const startOfWord = new RegExp(`\\b${escape(word)}`);
  let best = 0;
  for (const name of [document.name, document.title.toLowerCase()]) {
    if (name === word) best = Math.max(best, 100);
    else if (name.startsWith(word)) best = Math.max(best, 60);
    else if (startOfWord.test(name)) best = Math.max(best, 40);
    else if (name.includes(word)) best = Math.max(best, 20);
  }
  if (best) return best;
  const keywords = document.metadata?.keywords ?? [];
  if (
    keywords.some((keyword) => startOfWord.test(keyword.toLowerCase())) ||
    SYNONYMS[word]?.includes(document.name)
  ) {
    return 30;
  }
  const metadata = document.metadata;
  const text = [
    document.description,
    metadata?.intro,
    ...(metadata?.agentNotes.do ?? []),
    ...(metadata?.agentNotes.dont ?? []),
    ...(metadata?.parts.map((part) => part.name) ?? []),
    ...(document.exampleTitles ?? []),
  ]
    .join('\n')
    .toLowerCase();
  return startOfWord.test(text) ? 10 : 0;
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
