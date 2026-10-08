/**
 * Data of one component's changelog page, generated at build time from
 * the registry's changelog and snapshots (ADR-0020).
 */
export interface ChangelogPageData {
  /** Registry item name. */
  name: string;
  /** Display name. */
  title: string;
  /** Newest version. */
  latest: string;
  /** Targets of the newest version's files, such as `{ui}/button/button.ts`. */
  files: string[];
  /** Every version, newest first. */
  versions: ChangelogVersion[];
}

/** One version on a changelog page. */
export interface ChangelogVersion {
  /** The version. */
  version: string;
  /** The version before it, when there is one. */
  previous?: string;
  /** The author's notes, as HTML; empty when there are none. */
  notesHtml: string;
  /** What `ndop update` does for this version, as inline HTML sentences. */
  changes: string[];
  /** Each file that changed since the version before, as a highlighted diff. */
  diffs: { target: string; html: string }[];
}

/**
 * Every version's files of a component, which the update preview merges
 * against in the browser. Loaded only when the preview runs.
 */
export interface PreviewSnapshots {
  /** Each version, newest first. */
  versions: {
    version: string;
    files: { target: string; content: string }[];
  }[];
}
