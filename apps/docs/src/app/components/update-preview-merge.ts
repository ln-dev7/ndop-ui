import { threeWayMerge, upstreamHunks } from '@ndop/merge';
import type { Plugin } from 'prettier';
import type { PreviewSnapshots } from './changelog-data';

/** How a project formats files, when it differs from the registry. */
export interface PreviewFormat {
  /** Single quotes, as Ndop's files use, or double. */
  singleQuote: boolean;
  /** Prettier's `printWidth`. */
  printWidth: number;
}

/** What the update preview is asked to merge. */
export interface PreviewRequest {
  /** Every version's files. */
  snapshots: PreviewSnapshots;
  /** The version the user installed. */
  installed: string;
  /** The version to update to. */
  latest: string;
  /** The file's target, such as `{ui}/button/button.ts`. */
  target: string;
  /** The user's copy of the file. */
  local: string;
  /** How the user's project formats, when it differs (amendment 1). */
  format?: PreviewFormat;
}

/** One change the update makes to the user's file. */
export interface PreviewChange {
  /** 1-based line in the user's file. */
  line: number;
  /** Lines it removes. */
  removed: string[];
  /** Lines it adds. */
  added: string[];
}

/** What the update preview shows. */
export type PreviewResult =
  | {
      /** How `ndop update` would treat the file. */
      status: 'replaced' | 'unchanged' | 'merged' | 'conflict';
      /** The file after the update. */
      content: string;
      /** 1-based lines of each conflict. */
      conflictLines: number[];
      /** What changes in the user's file. */
      changes: PreviewChange[];
    }
  | {
      /** Why there's nothing to show. */
      error: string;
    };

/**
 * Merges a pasted file the way `ndop update` would, in the browser
 * (ADR-0020): the installed version is the base, the latest is the remote,
 * and `@ndop/merge` runs with the structural pass for TypeScript. Both
 * versions are compared as the registry has them, unless the user says
 * their project formats differently, which loads Prettier's standalone
 * build (amendment 1), and only then.
 *
 * @param request - Versions, file and the user's copy.
 * @returns The merged file and how it was produced, or why it couldn't.
 *
 * @example
 * ```ts
 * const result = await previewUpdate({ snapshots, installed: '0.1.0', latest: '0.1.2', target, local });
 * ```
 */
export async function previewUpdate(
  request: PreviewRequest,
): Promise<PreviewResult> {
  if (!request.local.trim()) {
    return { error: 'Paste your copy of the file first.' };
  }
  const fileAt = (version: string) =>
    request.snapshots.versions
      .find((entry) => entry.version === version)
      ?.files.find((file) => file.target === request.target)?.content;
  let base = fileAt(request.installed);
  let remote = fileAt(request.latest);
  if (base === undefined) {
    return {
      error: `${request.target} isn't part of ${request.installed}.`,
    };
  }
  if (remote === undefined) {
    return {
      error: `${request.latest} moves or removes ${request.target}; the notes above say what ndop update does with it.`,
    };
  }
  if (request.format) {
    const format = await formatter(request.target, request.format);
    [base, remote] = await Promise.all([format(base), format(remote)]);
  }
  const outcome = threeWayMerge({
    base,
    local: request.local,
    remote,
    remoteVersion: request.latest,
    structural: request.target.endsWith('.ts'),
  });
  return {
    status: outcome.status,
    content: outcome.content,
    conflictLines: outcome.conflictLines,
    changes: upstreamHunks(request.local, outcome.content).map((hunk) => ({
      line: hunk.baseLine,
      removed: hunk.removed,
      added: hunk.added,
    })),
  };
}

/**
 * Formats text with Prettier's standalone build and the user's options,
 * for the files Prettier's browser plugins cover.
 *
 * @param target - The file's target, which picks the parser.
 * @param options - Quotes and print width.
 * @returns The formatter; text it can't parse comes back unchanged.
 */
async function formatter(
  target: string,
  options: PreviewFormat,
): Promise<(text: string) => Promise<string>> {
  if (!target.endsWith('.ts')) return async (text) => text;
  const [prettier, typescript, estree] = await Promise.all([
    import('prettier/standalone'),
    import('prettier/plugins/typescript'),
    import('prettier/plugins/estree'),
  ]);
  return async (text) => {
    try {
      return await prettier.format(text, {
        parser: 'typescript',
        // The estree plugin declares no exports, but its module is one.
        plugins: [typescript, estree as unknown as Plugin],
        singleQuote: options.singleQuote,
        printWidth: options.printWidth,
      });
    } catch {
      return text;
    }
  };
}
