/** Options of the `example` generator; see `schema.json`. */
export interface ExampleGeneratorSchema {
  /** The item it shows. */
  item: string;
  /** What the example shows, in kebab-case. */
  case: string;
  /** One sentence on what it shows. */
  description: string;
  /** Skip formatting the generated files. */
  skipFormat?: boolean;
}
