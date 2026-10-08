import {
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, relative, sep } from 'node:path';

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
   * Whether a file or folder exists.
   *
   * @param path - Project-relative path.
   * @returns True when it exists.
   */
  exists(path: string): Promise<boolean>;
  /**
   * Writes a file, creating its folders.
   *
   * @param path - Project-relative path.
   * @param content - New text.
   */
  write(path: string, content: string): Promise<void>;
  /**
   * Deletes a file; nothing happens when it doesn't exist.
   *
   * @param path - Project-relative path.
   */
  remove(path: string): Promise<void>;
  /**
   * Lists the files under a folder, recursively, skipping `node_modules`
   * and folders whose names start with a dot.
   *
   * @param folder - Project-relative folder.
   * @returns Project-relative file paths, sorted; none when the folder
   *   doesn't exist.
   */
  list(folder: string): Promise<string[]>;
}

/**
 * Whether a folder is skipped when listing files.
 *
 * @param name - Folder name.
 * @returns True for `node_modules` and dot-folders.
 */
function skipped(name: string): boolean {
  return name === 'node_modules' || name.startsWith('.');
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
    async exists(path) {
      return stat(join(root, path)).then(
        () => true,
        () => false,
      );
    },
    async write(path, content) {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), content);
    },
    async remove(path) {
      await rm(join(root, path), { force: true });
    },
    async list(folder) {
      const files: string[] = [];
      const walk = async (absolute: string): Promise<void> => {
        let entries;
        try {
          entries = await readdir(absolute, { withFileTypes: true });
        } catch {
          return;
        }
        for (const entry of entries) {
          const path = join(absolute, entry.name);
          if (entry.isDirectory()) {
            if (!skipped(entry.name)) await walk(path);
          } else if (entry.isFile()) {
            files.push(relative(root, path).split(sep).join('/'));
          }
        }
      };
      await walk(join(root, folder));
      return files.sort();
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
    async exists(path) {
      const folder = `${path.replace(/\/$/, '')}/`;
      return (
        map.has(path) || [...map.keys()].some((file) => file.startsWith(folder))
      );
    },
    async write(path, content) {
      map.set(path, content);
    },
    async remove(path) {
      map.delete(path);
    },
    async list(folder) {
      const prefix = folder ? `${folder.replace(/\/$/, '')}/` : '';
      return [...map.keys()]
        .filter(
          (path) =>
            path.startsWith(prefix) &&
            !path.slice(prefix.length).split('/').slice(0, -1).some(skipped),
        )
        .sort();
    },
  };
}
