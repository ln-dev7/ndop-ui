import { diff3Merge } from 'node-diff3';
import { format, type Options as PrettierOptions } from 'prettier';

/**
 * How conflicting regions are resolved.
 *
 * - `line`: diff3 line merge with `git merge-file` semantics; every
 *   overlapping change is a conflict.
 * - `line+union`: as `line`, but when both sides only inserted lines at the
 *   same point (the base region is empty), keep both: upstream's lines first,
 *   then the user's. This approximates the structural merge of list-like
 *   code (variants, host bindings, class members) that ADR-0003 defers.
 */
export type MergeStrategy = 'line' | 'line+union';

/**
 * Inputs to {@link threeWayMerge}.
 */
export interface MergeInput {
  /** The file at the version recorded in the lockfile. */
  base: string;
  /** The file on disk. */
  local: string;
  /** The file at the target version. */
  remote: string;
  /** Version written in the closing conflict marker, as `ndop@<version>`. */
  remoteVersion: string;
  /** Conflict resolution strategy. */
  strategy: MergeStrategy;
  /**
   * The project's Prettier options. When set, `base` and `remote` are
   * formatted with them before merging (ADR-0003, step 2); `false` skips
   * normalization.
   */
  prettier: PrettierOptions | false;
}

/**
 * Result of {@link threeWayMerge}.
 */
export interface MergeOutcome {
  /**
   * `replaced`: the user never edited the file, so it becomes `remote`.
   * `unchanged`: nothing to apply. `merged`: both sides combined cleanly.
   * `conflict`: markers were written.
   */
  status: 'replaced' | 'unchanged' | 'merged' | 'conflict';
  /** The file to write, with the user's line endings. */
  content: string;
  /** 1-based line numbers of each `<<<<<<<` marker. */
  conflictLines: number[];
}

/**
 * Three-way merges one file as `ndop update` will: normalize, take a fast
 * path when one side is unchanged, otherwise diff3 line merge with standard
 * conflict markers.
 *
 * @param input - Base, local and remote contents plus merge options.
 * @returns The merged content and how it was produced.
 *
 * @example
 * ```ts
 * const outcome = await threeWayMerge({ base, local, remote, remoteVersion: '1.1.0', strategy: 'line', prettier: { singleQuote: true } });
 * if (outcome.status === 'conflict') process.exitCode = 1;
 * ```
 */
export async function threeWayMerge(input: MergeInput): Promise<MergeOutcome> {
  const eol = input.local.includes('\r\n') ? '\r\n' : '\n';
  const local = normalizeText(input.local);
  let base = normalizeText(input.base);
  let remote = normalizeText(input.remote);

  if (input.prettier) {
    const options = { parser: 'typescript', ...input.prettier };
    base = normalizeText(await format(base, options));
    remote = normalizeText(await format(remote, options));
  }

  const done = (
    status: MergeOutcome['status'],
    text: string,
    conflictLines: number[] = [],
  ): MergeOutcome => ({
    status,
    content: eol === '\n' ? text : text.replace(/\n/g, eol),
    conflictLines,
  });

  if (local === base) {
    return done('replaced', remote);
  }
  if (base === remote || local === remote) {
    return done('unchanged', local);
  }

  const lines: string[] = [];
  const conflictLines: number[] = [];
  const regions = diff3Merge(toLines(local), toLines(base), toLines(remote), {
    excludeFalseConflicts: true,
  });

  for (const region of regions) {
    if (region.ok) {
      lines.push(...region.ok);
    } else if (region.conflict) {
      const { a: ours, o: original, b: theirs } = region.conflict;
      if (input.strategy === 'line+union' && original.length === 0) {
        lines.push(...theirs, ...ours);
      } else {
        conflictLines.push(lines.length + 1);
        lines.push(
          '<<<<<<< local',
          ...ours,
          '=======',
          ...theirs,
          `>>>>>>> ndop@${input.remoteVersion}`,
        );
      }
    }
  }

  const merged = `${lines.join('\n')}\n`;
  return conflictLines.length > 0
    ? done('conflict', merged, conflictLines)
    : done('merged', merged);
}

/**
 * Converts CRLF to LF and ends the text with exactly one newline, so line
 * endings and a missing final newline never show up as changes.
 *
 * @param text - File content.
 * @returns Normalized content.
 */
function normalizeText(text: string): string {
  return `${text.replace(/\r\n/g, '\n').replace(/\n+$/, '')}\n`;
}

/**
 * Splits normalized text into lines, without the empty string after the
 * final newline.
 *
 * @param text - Normalized content.
 * @returns The lines.
 */
function toLines(text: string): string[] {
  return text.slice(0, -1).split('\n');
}
