/** Options of the `release-bootstrap` executor; see `schema.json`. */
export interface ReleaseBootstrapExecutorSchema {
  /** Publish the placeholders. */
  publish?: boolean;
  /** Add each package's trusted publisher. */
  trust?: boolean;
  /** The placeholders' version. */
  version?: string;
  /** Folder for the placeholders and their tarballs. */
  outputPath?: string;
  /** Folder holding the packages. */
  packagesDir?: string;
  /** GitHub `owner/name` allowed to publish. */
  repository?: string;
  /** Workflow file allowed to publish. */
  workflow?: string;
  /** GitHub environment of the publishing job; empty for any. */
  environment?: string;
}
