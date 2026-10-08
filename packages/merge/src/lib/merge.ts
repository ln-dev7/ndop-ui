import { diffPatch, patch } from 'node-diff3';
import {
  CONFLICT_SEPARATOR,
  CONFLICT_START,
  conflictEnd,
  mergeLines,
  normalizeText,
  toLines,
} from './lines';
import { structuralMerge } from './structure';

export { CONFLICT_SEPARATOR, CONFLICT_START, conflictEnd, normalizeText };

/** Inputs to {@link threeWayMerge}. */
export interface MergeInput {
  /**
   * The file as the user received it: the pristine file at the installed
   * version (ADR-0010).
   */
  base: string;
  /** The file on disk. */
  local: string;
  /** The pristine file at the target version. */
  remote: string;
  /** The target version, written in the closing conflict marker. */
  remoteVersion: string;
  /**
   * Whether to merge by top-level declaration first, for TypeScript
   * (ADR-0003, amendment 2). Off by default; line merge alone runs when
   * it's off or a side can't be split.
   */
  structural?: boolean;
  /**
   * Whether a conflict where both sides only inserted lines at the same
   * point keeps both, upstream's first (ADR-0003, amendment 1). On by
   * default; `false` turns those regions into conflicts, which `ndop update`
   * does when a union leaves a `.ts` file that no longer type-checks.
   */
  union?: boolean;
}

/** How {@link threeWayMerge} produced its result. */
export type MergeStatus = 'replaced' | 'unchanged' | 'merged' | 'conflict';

/** Result of {@link threeWayMerge}. */
export interface MergeOutcome {
  /**
   * `replaced`: the user never edited the file, so it becomes `remote`.
   * `unchanged`: there is nothing to apply, because upstream didn't change
   * or the user already has upstream's version. `merged`: both sides
   * combined cleanly. `conflict`: markers were written.
   */
  status: MergeStatus;
  /** The file to write, with the user's line endings. */
  content: string;
  /** 1-based line numbers of each opening marker. */
  conflictLines: number[];
  /** Whether any region was merged by keeping both sides' insertions. */
  unioned: boolean;
}

/**
 * Three-way merges one file the way `ndop update` does (ADR-0003): line
 * endings and the final newline are normalized, a side that didn't change
 * takes a fast path, and everything else goes through a diff3 line merge
 * with `git merge-file` semantics and two-way conflict markers.
 *
 * Formatting `base` and `remote` with the project's Prettier config is the
 * caller's job, so this runs the same in Node and in the browser.
 *
 * @param input - Base, local and remote contents, the target version, and
 *   whether to keep both sides of pure insertions.
 * @returns The merged content and how it was produced.
 *
 * @example
 * ```ts
 * const outcome = threeWayMerge({ base, local, remote, remoteVersion: '0.2.0' });
 * if (outcome.status === 'conflict') {
 *   console.log(`Conflicts at lines ${outcome.conflictLines.join(', ')}`);
 * }
 * ```
 */
export function threeWayMerge(input: MergeInput): MergeOutcome {
  const eol = input.local.includes('\r\n') ? '\r\n' : '\n';
  const local = normalizeText(input.local);
  const base = normalizeText(input.base);
  const remote = normalizeText(input.remote);
  const done = (
    status: MergeStatus,
    text: string,
    conflictLines: number[] = [],
    unioned = false,
  ): MergeOutcome => ({
    status,
    content: eol === '\n' ? text : text.replace(/\n/g, eol),
    conflictLines,
    unioned,
  });

  if (local === base) return done('replaced', remote);
  if (base === remote || local === remote) return done('unchanged', local);

  const union = input.union !== false;
  const structured = input.structural
    ? structuralMerge(base, local, remote, input.remoteVersion, union)
    : undefined;
  const merged =
    structured ??
    (() => {
      const result = mergeLines(
        toLines(base),
        toLines(local),
        toLines(remote),
        input.remoteVersion,
        union,
      );
      return { ...result, text: `${result.lines.join('\n')}\n` };
    })();
  if (merged.text === local) return done('unchanged', local);
  const conflictLines = merged.conflicted
    ? conflictMarkers(merged.text).lines
    : [];
  return merged.conflicted
    ? done('conflict', merged.text, conflictLines, merged.unioned)
    : done('merged', merged.text, [], merged.unioned);
}

/** What {@link conflictMarkers} found in a file. */
export interface ConflictMarkers {
  /** Complete conflicts: opening, separator and closing marker in order. */
  count: number;
  /** 1-based line of each opening marker. */
  lines: number[];
  /**
   * Whether every marker belongs to a complete conflict. A stray or
   * out-of-order marker, as a half-finished resolution leaves, makes this
   * `false`.
   */
  wellFormed: boolean;
}

/**
 * Finds the conflict markers {@link threeWayMerge} writes. `ndop update`
 * won't merge a file that still has any (ADR-0010), and the update fixture
 * suite checks that conflicts are well formed.
 *
 * @param text - File content.
 * @returns The conflicts and whether the markers are well formed.
 *
 * @example
 * ```ts
 * const markers = conflictMarkers(text);
 * const unresolved = markers.count > 0 || !markers.wellFormed;
 * ```
 */
export function conflictMarkers(text: string): ConflictMarkers {
  const lines: number[] = [];
  let state: 'outside' | 'ours' | 'theirs' = 'outside';
  let wellFormed = true;
  let count = 0;
  normalizeText(text)
    .split('\n')
    .forEach((line, index) => {
      if (line === CONFLICT_START) {
        if (state !== 'outside') wellFormed = false;
        state = 'ours';
        lines.push(index + 1);
      } else if (line === CONFLICT_SEPARATOR && state !== 'outside') {
        if (state !== 'ours') wellFormed = false;
        state = 'theirs';
      } else if (line.startsWith(conflictEnd(''))) {
        if (state === 'theirs') count++;
        else wellFormed = false;
        state = 'outside';
      }
    });
  if (state !== 'outside') wellFormed = false;
  return { count, lines, wellFormed };
}

/** One change upstream made, as `--interactive` offers it. */
export interface UpstreamHunk {
  /** 1-based first line in the base it replaces, or follows when empty. */
  baseLine: number;
  /** The base lines it removes; empty for a pure insertion. */
  removed: string[];
  /** The lines it adds; empty for a pure deletion. */
  added: string[];
}

/**
 * Splits upstream's change to a file into hunks, in file order, so the user
 * can accept or skip each one.
 *
 * @param base - The pristine file at the installed version.
 * @param remote - The pristine file at the target version.
 * @returns The hunks; their indexes are what {@link partialRemote} takes.
 *
 * @example
 * ```ts
 * const hunks = upstreamHunks(base, remote);
 * console.log(`${hunks.length} upstream changes`);
 * ```
 */
export function upstreamHunks(base: string, remote: string): UpstreamHunk[] {
  return diffPatch(
    toLines(normalizeText(base)),
    toLines(normalizeText(remote)),
  ).map(({ buffer1, buffer2 }) => ({
    baseLine: buffer1.offset + 1,
    removed: buffer1.chunk,
    added: buffer2.chunk,
  }));
}

/**
 * The target version with only some of upstream's hunks applied. Merging
 * it with the local file, in place of the full remote, applies the
 * accepted hunks and leaves the others out (ADR-0020, `--interactive`).
 *
 * @param base - The pristine file at the installed version.
 * @param remote - The pristine file at the target version.
 * @param accepted - Indexes into {@link upstreamHunks}' result.
 * @returns The base with the accepted hunks applied, LF line endings.
 *
 * @example
 * ```ts
 * const partial = partialRemote(base, remote, [0, 2]);
 * const outcome = threeWayMerge({ base, local, remote: partial, remoteVersion: '0.2.0' });
 * ```
 */
export function partialRemote(
  base: string,
  remote: string,
  accepted: readonly number[],
): string {
  const lines = toLines(normalizeText(base));
  const hunks = diffPatch(lines, toLines(normalizeText(remote))).filter(
    (_, index) => accepted.includes(index),
  );
  return normalizeText(patch(lines, hunks).join('\n'));
}
