/** What a search result is. */
export type SearchKind =
  | 'page'
  | 'heading'
  | 'component'
  | 'block'
  | 'prop'
  | 'shortcut';

/**
 * One entry of the docs' search index, built at build time from the guides
 * the components' metadata and the blocks (ADR-0008, ADR-0022).
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
  /** Other words for it, lowercase, such as `modal` for Dialog. */
  keywords?: string[];
  /** Route, with a fragment for a section. */
  url: string;
}
