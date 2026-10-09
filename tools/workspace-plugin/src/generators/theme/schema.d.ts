/** Options of the `theme` generator; see `schema.json`. */
export interface ThemeGeneratorSchema {
  /** Theme name in kebab-case. */
  name: string;
  /** One sentence on the theme's look. */
  description: string;
  /** Who made it. */
  author?: string;
  /** Skip formatting the generated files. */
  skipFormat?: boolean;
}
