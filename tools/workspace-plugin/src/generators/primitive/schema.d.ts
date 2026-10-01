/**
 * Options for the `primitive` generator. Mirrors `schema.json`.
 */
export interface PrimitiveGeneratorSchema {
  /** Primitive name in kebab-case, for example `dialog` or `radio-group`. */
  name: string;
  /** Slug of the WAI-ARIA APG pattern it implements, for example `dialog-modal`. */
  pattern?: string;
  /** Project that hosts the primitive. Defaults to `primitives`. */
  project?: string;
  /** Skip formatting the generated files. */
  skipFormat?: boolean;
}
