/** Options of the `docs-guides` executor; see `schema.json`. */
export interface DocsGuidesExecutorSchema {
  /** Guides folder, holding `<section>/<page>.md`. */
  guides: string;
  /** Blog posts folder, holding `<slug>.md`, checked as guides are. */
  posts?: string;
  /** The built registry's JSON folder. */
  registry?: string;
  /** Tsconfig whose `paths` resolve `@/` and the `@ndop` packages. */
  tsconfig?: string;
  /** Folder the blocks are compiled in. */
  workDir?: string;
}
