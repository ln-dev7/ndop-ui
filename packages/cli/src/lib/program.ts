import { Command } from 'commander';
import { registerBuildCommand } from './build/command';
import { registerAddCommand } from './commands/add';
import { registerDiffCommand } from './commands/diff';
import { registerDoctorCommand } from './commands/doctor';
import {
  nodeEnvironment,
  type CommandEnvironment,
} from './commands/environment';
import { registerInitCommand } from './commands/init';
import { registerListCommand } from './commands/list';
import { registerUpdateCommand } from './commands/update';
import { registerVerifyCommand } from './commands/verify';
import { registerViewCommand } from './commands/view';

/**
 * Builds the `ndop` command-line program with every command registered.
 *
 * @param version - Version printed by `ndop --version`.
 * @param environment - Outside world for the write commands; tests pass
 *   an in-memory one.
 * @returns The configured commander program.
 *
 * @example
 * ```ts
 * await createProgram('0.1.0').parseAsync(process.argv);
 * ```
 */
export function createProgram(
  version: string,
  environment: CommandEnvironment = nodeEnvironment(),
): Command {
  const program = new Command()
    .name('ndop')
    .description(
      'Add Ndop UI components to an Angular app, and build Ndop registries.',
    )
    .version(version);
  registerInitCommand(program, environment);
  registerAddCommand(program, environment);
  registerListCommand(program, environment);
  registerViewCommand(program, environment);
  registerDiffCommand(program, environment);
  registerUpdateCommand(program, environment);
  registerDoctorCommand(program, environment);
  registerBuildCommand(program);
  registerVerifyCommand(program);
  return program;
}
