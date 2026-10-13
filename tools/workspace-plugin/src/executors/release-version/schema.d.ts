/** Options of the `release-version` executor; see `schema.json`. */
export interface ReleaseVersionExecutorSchema {
  /** `package.json` of a package in the fixed group. */
  versionSource?: string;
  /** The registry template's `package.json`. */
  template?: string;
}
