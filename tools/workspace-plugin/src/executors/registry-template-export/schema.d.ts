/** Options of the `registry-template-export` executor; see `schema.json`. */
export interface RegistryTemplateExportExecutorSchema {
  /** The registry template folder. */
  source?: string;
  /** Folder to write the copy to; emptied first. */
  outputPath?: string;
  /** License file to ship as `LICENSE`. */
  license?: string;
  /** Base URL of the Ndop repository's files on GitHub. */
  sourceUrl?: string;
}
