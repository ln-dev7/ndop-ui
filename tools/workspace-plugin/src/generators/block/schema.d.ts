/** Options of the `block` generator; see `schema.json`. */
export interface BlockGeneratorSchema {
  /** Block name, such as `login-01`. */
  name: string;
  /** Gallery category. */
  category:
    | 'auth'
    | 'dashboard'
    | 'settings'
    | 'data-table'
    | 'sidebar'
    | 'marketing';
  /** One sentence on what the block is. */
  description: string;
  /** Skip formatting the generated files. */
  skipFormat?: boolean;
}
