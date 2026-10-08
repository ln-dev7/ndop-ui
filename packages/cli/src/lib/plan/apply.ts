import { detect, getUserAgent, resolveCommand } from 'package-manager-detector';
import { x } from 'tinyexec';
import { CliError } from '../errors';
import type { ProjectFs } from '../project/fs';
import type { Plan } from './plan';

/**
 * Adds npm packages to the project. Injected so tests needn't install.
 */
export type Installer = (
  specs: readonly string[],
  dev: boolean,
) => Promise<void>;

/**
 * Installs with the project's package manager, detected from its lockfile
 * or `packageManager` field, then from the package manager running the
 * CLI, then npm.
 *
 * @param root - Absolute project root.
 * @returns The installer.
 */
export function packageManagerInstaller(root: string): Installer {
  return async (specs, dev) => {
    const detected = await detect({ cwd: root });
    const agent = detected?.agent ?? getUserAgent() ?? 'npm';
    const args = dev ? ['-D', ...specs] : [...specs];
    if (agent.startsWith('pnpm')) {
      // pnpm 11+ fails any add while some installed dependency has build
      // scripts nobody approved, as `ng new` leaves esbuild and lmdb. The
      // scripts still don't run; only the unrelated failure is turned off.
      args.push('--config.strict-dep-builds=false');
    }
    const command = resolveCommand(agent, 'add', args);
    if (!command) {
      throw new CliError(`Don't know how to add packages with ${agent}.`);
    }
    const result = await x(command.command, command.args, {
      nodeOptions: { cwd: root },
    });
    if (result.exitCode !== 0) {
      throw new CliError(
        `${command.command} ${command.args.join(' ')} failed:\n${result.stderr || result.stdout}`,
      );
    }
  };
}

/**
 * Applies a plan: writes every file, then installs dependencies (ADR-0011).
 * Files are already formatted when the plan is built.
 *
 * @param fs - The project.
 * @param plan - A finished plan.
 * @param install - Package installer.
 */
export async function applyPlan(
  fs: ProjectFs,
  plan: Plan,
  install: Installer,
): Promise<void> {
  for (const file of plan.files) {
    if (file.action === 'delete') await fs.remove(file.path);
    else await fs.write(file.path, file.after);
  }
  if (plan.dependencies.length > 0) {
    await install(plan.dependencies, false);
  }
  if (plan.devDependencies.length > 0) {
    await install(plan.devDependencies, true);
  }
}
