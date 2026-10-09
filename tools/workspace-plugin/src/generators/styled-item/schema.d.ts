/** Options of the `styled-item` generator; see `schema.json`. */
export interface StyledItemGeneratorSchema {
  /** Item name in kebab-case. */
  name: string;
  /** Display name, when it isn't the name in title case. */
  title?: string;
  /** One sentence on what the item is. */
  description: string;
  /** Docs group, the item's first category. */
  category:
    | 'inputs'
    | 'overlays'
    | 'navigation'
    | 'data-display'
    | 'feedback'
    | 'layout';
  /** Compose the primitive of the same name. */
  primitive?: boolean;
  /** Skip formatting the generated files. */
  skipFormat?: boolean;
}
