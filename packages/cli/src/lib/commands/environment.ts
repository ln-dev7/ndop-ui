import { confirm, isCancel } from '@clack/prompts';
import { packageManagerInstaller, type Installer } from '../plan/apply';
import { nodeFs, type ProjectFs } from '../project/fs';
import { projectFormatter, type Formatter } from '../project/format';
import { defaultFetcher, type Fetcher } from '../registry/client';

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
   * @returns Whether they agreed.
   */
  confirm(message: string): Promise<boolean>;
  /** Whether the user can answer prompts. */
  interactive: boolean;
  /** Environment variables. */
  env: Record<string, string | undefined>;
}

/**
 * The real environment: disk, the project's Prettier, `fetch`, the
 * project's package manager and terminal prompts.
 *
 * @returns The environment.
 */
export function nodeEnvironment(): CommandEnvironment {
  return {
    fs: nodeFs,
    formatter: projectFormatter,
    fetcher: defaultFetcher,
    installer: packageManagerInstaller,
    async confirm(message) {
      const answer = await confirm({ message });
      return !isCancel(answer) && answer;
    },
    interactive: Boolean(process.stdin.isTTY && process.stdout.isTTY),
    env: process.env,
  };
}
