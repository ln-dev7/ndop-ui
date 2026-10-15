import { createRequire } from 'node:module';
import { join } from 'node:path';
import { confirm, isCancel, multiselect } from '@clack/prompts';
import { packageManagerInstaller, type Installer } from '../plan/apply';
import { nodeFs, type ProjectFs } from '../project/fs';
import { gitDirtyFiles, type DirtyFiles } from '../project/git';
import {
  importModule,
  projectFormatter,
  type Formatter,
  type ImportModule,
} from '../project/format';
import { defaultFetcher, type Fetcher } from '../registry/client';
import { canPrompt } from '../terminal';
import type { AngularCompiler } from '../update/codemods';

/**
 * Everything a write command needs from the outside world. Commands get it
 * injected, so tests run them on an in-memory project with a fake registry
 * and installer.
 */
export interface CommandEnvironment {
  /**
   * Opens a project.
   *
   * @param root - Absolute project root.
   * @returns Its file system.
   */
  fs(root: string): ProjectFs;
  /**
   * Loads the project's formatter.
   *
   * @param root - Absolute project root.
   * @returns The formatter.
   */
  formatter(root: string): Promise<Formatter>;
  /**
   * Creates the registry fetcher.
   *
   * @param root - Absolute project root, which local registry paths resolve
   *   from.
   * @returns The fetcher.
   */
  fetcher(root: string): Fetcher;
  /**
   * Creates the package installer.
   *
   * @param root - Absolute project root.
   * @returns The installer.
   */
  installer(root: string): Installer;
  /**
   * Asks the user to confirm.
   *
   * @param message - The question.
   * @param initial - The preselected answer; yes by default.
   * @returns Whether they agreed.
   */
  confirm(message: string, initial?: boolean): Promise<boolean>;
  /**
   * Asks the user to pick any number of options.
   *
   * @param message - The question.
   * @param options - The choices, with labels.
   * @param initial - The preselected values.
   * @returns The values picked, or `undefined` when the user cancelled.
   */
  multiselect<T extends string>(
    message: string,
    options: { value: T; label: string }[],
    initial: T[],
  ): Promise<T[] | undefined>;
  /**
   * Finds files with uncommitted changes, for `ndop update`'s clean-tree
   * check (ADR-0010).
   */
  dirtyFiles: DirtyFiles;
  /**
   * Loads the project's own `@angular/compiler`, which `rename-input`
   * codemods parse templates with.
   *
   * @param root - Absolute project root.
   * @returns The compiler, or `undefined` when the project has none.
   */
  angularCompiler(root: string): Promise<AngularCompiler | undefined>;
  /** Whether the user can answer prompts; see {@link canPrompt}. */
  interactive: boolean;
  /**
   * The terminal's width, which `ndop list` and `ndop view` fit their
   * output to; unknown when output goes to a file or another program.
   */
  columns?: number | undefined;
  /** Environment variables. */
  env: Record<string, string | undefined>;
}

/**
 * The real environment: disk, the project's Prettier, `fetch`, the
 * project's package manager and terminal prompts.
 *
 * @param load - Loads the project's Prettier and Angular compiler once
 *   resolved; `import()` by default. Tooling that runs as CommonJS, such
 *   as Nx executors, passes `require`, since there `import()` is compiled
 *   to `require()` of a URL.
 * @returns The environment.
 */
export function nodeEnvironment(
  load: ImportModule = importModule,
): CommandEnvironment {
  return {
    fs: nodeFs,
    formatter: (root) => projectFormatter(root, load),
    fetcher: defaultFetcher,
    installer: packageManagerInstaller,
    async confirm(message, initial = true) {
      const answer = await confirm({ message, initialValue: initial });
      return !isCancel(answer) && answer;
    },
    async multiselect(message, options, initial) {
      const answer = await multiselect({
        message,
        options: options as never,
        initialValues: initial,
        required: false,
      });
      return isCancel(answer) ? undefined : (answer as typeof initial);
    },
    dirtyFiles: gitDirtyFiles,
    async angularCompiler(root) {
      try {
        const entry = createRequire(join(root, 'package.json')).resolve(
          '@angular/compiler',
        );
        return (await load(entry)) as AngularCompiler;
      } catch {
        return undefined;
      }
    },
    interactive: canPrompt(
      process.stdin.isTTY,
      process.stdout.isTTY,
      process.env,
    ),
    columns: process.stdout.isTTY ? process.stdout.columns : undefined,
    env: process.env,
  };
}
