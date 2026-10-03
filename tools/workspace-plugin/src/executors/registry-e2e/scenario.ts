import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

/**
 * Package managers the install test covers (ADR-0015).
 */
export type PackageManager = 'npm' | 'pnpm' | 'bun';

/**
 * One install-test run: a package manager and the Angular CLI version that
 * creates the app.
 */
export interface InstallCase {
  /** Package manager for `ng new`, `ndop` and the build. */
  packageManager: PackageManager;
  /** Exact `@angular/cli` version for `ng new`. */
  angular: string;
}

/**
 * Short, stable name of a case, such as `pnpm-ng21`.
 *
 * @param installCase - The case.
 * @returns Its name, also used as its folder.
 */
export function caseId(installCase: InstallCase): string {
  return `${installCase.packageManager}-ng${installCase.angular.split('.')[0]}`;
}

/**
 * A command and its arguments.
 */
export type CommandLine = [command: string, args: string[]];

/**
 * How a user of each package manager runs a package's bin without
 * installing it, as `npx ndop init` does for npm.
 *
 * @param packageManager - The package manager.
 * @param spec - Package spec, such as `ndop@1.0.0`.
 * @param args - Arguments for the bin.
 * @returns The command line.
 */
export function execCommand(
  packageManager: PackageManager,
  spec: string,
  args: string[],
): CommandLine {
  switch (packageManager) {
    case 'npm':
      return ['npx', ['--yes', spec, ...args]];
    case 'pnpm':
      return ['pnpm', ['dlx', spec, ...args]];
    case 'bun':
      return ['bunx', [spec, ...args]];
  }
}

/**
 * Runs a `package.json` script with a package manager.
 *
 * @param packageManager - The package manager.
 * @param script - Script name, such as `build`.
 * @returns The command line.
 */
export function runScriptCommand(
  packageManager: PackageManager,
  script: string,
): CommandLine {
  return [packageManager, ['run', script]];
}

/**
 * Pulls the JSON result out of a command's output: package-manager runners
 * may print progress before the bin's own output.
 *
 * @param output - Standard output.
 * @returns The parsed object.
 * @throws When no JSON object is found.
 */
export function lastJsonObject(output: string): unknown {
  const start = output.search(/^\{/m);
  const end = output.lastIndexOf('}');
  if (start === -1 || end < start) {
    throw new Error(`No JSON in the output:\n${output}`);
  }
  return JSON.parse(output.slice(start, end + 1));
}

/** Folders that tools write into and the no-op check ignores. */
const IGNORED = new Set(['node_modules', 'dist', '.angular', '.git']);

/**
 * Hashes every file of a project except installed and built output, so a
 * second `ndop add` can be shown to have changed nothing.
 *
 * @param root - Project folder.
 * @returns SHA-256 of each file, by project-relative path.
 */
export async function hashTree(root: string): Promise<Map<string, string>> {
  const hashes = new Map<string, string>();
  const walk = async (folder: string): Promise<void> => {
    for (const entry of await readdir(folder, { withFileTypes: true })) {
      if (IGNORED.has(entry.name)) {
        continue;
      }
      const path = join(folder, entry.name);
      if (entry.isDirectory()) {
        await walk(path);
      } else if (entry.isFile()) {
        hashes.set(
          relative(root, path),
          createHash('sha256')
            .update(await readFile(path))
            .digest('hex'),
        );
      }
    }
  };
  await walk(root);
  return hashes;
}

/**
 * Paths whose content differs between two {@link hashTree} results.
 *
 * @param before - Earlier hashes.
 * @param after - Later hashes.
 * @returns Added, removed or changed paths, sorted.
 */
export function changedPaths(
  before: ReadonlyMap<string, string>,
  after: ReadonlyMap<string, string>,
): string[] {
  const paths = new Set([...before.keys(), ...after.keys()]);
  return [...paths]
    .filter((path) => before.get(path) !== after.get(path))
    .sort();
}

/**
 * Where and how {@link run} runs a command.
 */
export interface RunOptions {
  /** Working folder. */
  cwd: string;
  /** Environment variables. */
  env: NodeJS.ProcessEnv;
  /** Log file the output is appended to. */
  log: string;
}

/**
 * Runs a command, appending its output to a log file.
 *
 * @param commandLine - Command and arguments.
 * @param options - Where and how to run it.
 * @returns Its standard output.
 * @throws When it exits with a non-zero code, with the end of its output.
 */
export function run(
  commandLine: CommandLine,
  options: RunOptions,
): Promise<string> {
  const [command, args] = commandLine;
  return new Promise((resolve, reject) => {
    const log = createWriteStream(options.log, { flags: 'a' });
    log.write(`\n$ ${command} ${args.join(' ')}\n`);
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let tail = '';
    const record = (chunk: Buffer, isStdout: boolean) => {
      const text = chunk.toString();
      if (isStdout) {
        stdout += text;
      }
      tail = (tail + text).slice(-4000);
      log.write(text);
    };
    child.stdout.on('data', (chunk: Buffer) => record(chunk, true));
    child.stderr.on('data', (chunk: Buffer) => record(chunk, false));
    child.on('error', (error) => {
      log.end();
      reject(error);
    });
    child.on('close', (code) => {
      log.end();
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(
          new Error(
            `${command} ${args.join(' ')} exited with ${code}:\n${tail}`,
          ),
        );
      }
    });
  });
}
