import { diff3Merge } from 'node-diff3';

/** Opening line of a conflict, above the user's side. */
export const CONFLICT_START = '<<<<<<< local';

/** Line between the user's side and upstream's in a conflict. */
export const CONFLICT_SEPARATOR = '=======';

/**
 * Closing line of a conflict, below upstream's side.
 *
 * @param version - The version being merged in.
 * @returns The marker, `>>>>>>> ndop@<version>`.
 *
 * @example
 * ```ts
 * conflictEnd('0.2.0'); // '>>>>>>> ndop@0.2.0'
 * ```
 */
export function conflictEnd(version: string): string {
  return `>>>>>>> ndop@${version}`;
}

/**
 * Converts CRLF to LF and ends the text with exactly one newline, so line
 * endings and a missing final newline never show up as changes.
 *
 * @param text - File content.
 * @returns The normalized content.
 *
 * @example
 * ```ts
 * normalizeText('a\r\nb'); // 'a\nb\n'
 * ```
 */
export function normalizeText(text: string): string {
  return `${text.replace(/\r\n/g, '\n').replace(/\n+$/, '')}\n`;
}

/**
 * Splits normalized text into lines, without the empty string after the
 * final newline.
 *
 * @param text - Normalized content.
 * @returns The lines.
 */
export function toLines(text: string): string[] {
  return text.slice(0, -1).split('\n');
}

/** What {@link mergeLines} produced. */
export interface LineMerge {
  /** The merged lines. */
  lines: string[];
  /** Whether any conflict was written. */
  conflicted: boolean;
  /** Whether any region kept both sides' insertions. */
  unioned: boolean;
}

/**
 * The diff3 line merge (ADR-0003, step 4, with amendment 1's union of pure
 * insertions), on lines.
 *
 * @param base - Base lines.
 * @param local - Local lines.
 * @param remote - Remote lines.
 * @param version - Target version, for the closing marker.
 * @param union - Whether pure insertions on both sides are both kept.
 * @returns The merged lines.
 */
export function mergeLines(
  base: string[],
  local: string[],
  remote: string[],
  version: string,
  union: boolean,
): LineMerge {
  const lines: string[] = [];
  let conflicted = false;
  let unioned = false;
  const regions = diff3Merge(local, base, remote, {
    excludeFalseConflicts: true,
  });
  for (const region of regions) {
    if (region.ok) {
      lines.push(...region.ok);
    } else if (region.conflict) {
      const { a: ours, o: original, b: theirs } = region.conflict;
      if (union && original.length === 0) {
        lines.push(...theirs, ...ours);
        unioned = true;
      } else {
        conflicted = true;
        lines.push(...conflictLines(ours, theirs, version));
      }
    }
  }
  return { lines, conflicted, unioned };
}

/**
 * A conflict between two sides, as markers and lines.
 *
 * @param ours - The user's lines.
 * @param theirs - Upstream's lines.
 * @param version - Target version, for the closing marker.
 * @returns The lines to write.
 */
export function conflictLines(
  ours: readonly string[],
  theirs: readonly string[],
  version: string,
): string[] {
  return [
    CONFLICT_START,
    ...ours,
    CONFLICT_SEPARATOR,
    ...theirs,
    conflictEnd(version),
  ];
}
