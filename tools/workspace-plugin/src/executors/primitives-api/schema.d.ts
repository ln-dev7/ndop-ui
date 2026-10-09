/** Options of the `primitives-api` executor; see `schema.json`. */
export interface PrimitivesApiExecutorSchema {
  /** Folder holding one folder per primitive. */
  primitivesRoot?: string;
  /** Tsconfig whose program covers every primitive. */
  tsconfig?: string;
  /** Package name of the entry points. */
  importPrefix?: string;
  /** Output folder. */
  outputPath?: string;
}
