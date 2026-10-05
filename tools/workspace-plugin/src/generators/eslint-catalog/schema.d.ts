/** Options of the `eslint-catalog` generator. */
export interface EslintCatalogGeneratorSchema {
  /** Built registry folder, holding `metadata/<name>.json`. */
  registry?: string;
  /** Built `@ndop/primitives` `package.json`. */
  primitives?: string;
}
