/** Which part of a version a release raises. */
export type ReleaseBump = 'major' | 'minor' | 'patch';

/** Options of the `item-release` generator; see `schema.json`. */
export interface ItemReleaseGeneratorSchema {
  /** Items to release, by name. */
  names?: string[];
  /** Release every item. */
  all?: boolean;
  /** The new version of every item named. */
  to?: string;
  /** Raise each item's own version. */
  bump?: ReleaseBump;
  /** The changelog section's text; `{previous}` is the old version. */
  notes: string;
  /** Skip formatting the changed files. */
  skipFormat?: boolean;
}
