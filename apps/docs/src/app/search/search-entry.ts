/** What a search result is. */
export type SearchKind = 'page' | 'heading' | 'component' | 'prop' | 'shortcut';

/**
 * One entry of the docs' search index, built at build time from the guides
 * and the components' metadata (ADR-0008).
 */
export interface SearchEntry {
  /** What it is. */
  kind: SearchKind;
  /** What it's called, such as `Dialog`, `closeOnEscape` or `Shift + Tab`. */
  title: string;
  /** Where it belongs, such as the page or `Dialog · NdDialog`. */
  context: string;
  /** One line of plain text. */
  description: string;
  /** Route, with a fragment for a section. */
  url: string;
}
