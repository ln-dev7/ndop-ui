import { x } from 'tinyexec';

/**
 * Finds files with uncommitted changes, so `ndop update` writes only over
 * committed files and `git checkout` undoes it (ADR-0010, rule 2).
 *
 * @param root - Absolute project root.
 * @param paths - Project-relative paths the update writes.
 * @returns The ones with uncommitted changes, untracked files included;
 *   `undefined` when the project isn't in a git repository, or git isn't
 *   installed.
 */
export type DirtyFiles = (
  root: string,
  paths: readonly string[],
) => Promise<string[] | undefined>;

/**
 * {@link DirtyFiles} with the `git` command.
 *
 * @param root - Absolute project root.
 * @param paths - Project-relative paths.
 * @returns Paths with uncommitted changes, or `undefined` outside a repo.
 *
 * @example
 * ```ts
 * const dirty = await gitDirtyFiles(root, ['src/app/ui/button/button.ts']);
 * ```
 */
export const gitDirtyFiles: DirtyFiles = async (root, paths) => {
  const git = async (...args: string[]) => {
    try {
      return await x('git', args, {
        nodeOptions: { cwd: root },
        throwOnError: false,
      });
    } catch {
      return undefined;
    }
  };
  const prefix = await git('rev-parse', '--show-prefix');
  if (!prefix || prefix.exitCode !== 0) return undefined;
  if (paths.length === 0) return [];
  const status = await git(
    'status',
    '--porcelain=v1',
    '-z',
    '--untracked-files=all',
    '--',
    ...paths,
  );
  if (!status || status.exitCode !== 0) return undefined;
  const inRepo = prefix.stdout.trim();
  const dirty = new Set<string>();
  const entries = status.stdout.split('\0');
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index] ?? '';
    if (entry.length < 4) continue;
    // A rename's entry is followed by its old path, which isn't written.
    if (entry[0] === 'R' || entry[0] === 'C') index++;
    const path = entry.slice(3);
    dirty.add(path.startsWith(inRepo) ? path.slice(inRepo.length) : path);
  }
  return paths.filter((path) => dirty.has(path));
};
