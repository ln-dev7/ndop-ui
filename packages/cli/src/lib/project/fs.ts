import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * The files of the project a command works on, addressed by
 * project-relative POSIX paths. Commands only read and write through it, so
 * tests run them against {@link memoryFs}.
 */
export interface ProjectFs {
  /** Absolute project root. */
  readonly root: string;
  /**
   * Reads a file.
   *
   * @param path - Project-relative path.
   * @returns Its text, or `undefined` when it doesn't exist.
   */
  read(path: string): Promise<string | undefined>;
  /**
   * Writes a file, creating its folders.
   *
   * @param path - Project-relative path.
   * @param content - New text.
   */
  write(path: string, content: string): Promise<void>;
}

/**
 * A {@link ProjectFs} on the real file system.
 *
 * @param root - Absolute project root.
 * @returns The file system.
 */
export function nodeFs(root: string): ProjectFs {
  return {
    root,
    async read(path) {
      try {
        return await readFile(join(root, path), 'utf-8');
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return undefined;
        }
        throw error;
      }
    },
    async write(path, content) {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), content);
    },
  };
}

/**
 * An in-memory {@link ProjectFs}, for tests.
 *
 * @param files - Initial files by project-relative path.
 * @returns The file system, with its file map exposed.
 */
export function memoryFs(
  files: Record<string, string> = {},
): ProjectFs & { files: Map<string, string> } {
  const map = new Map(Object.entries(files));
  return {
    root: '/project',
    files: map,
    async read(path) {
      return map.get(path);
    },
    async write(path, content) {
      map.set(path, content);
    },
  };
}
