import { Command } from 'commander';
import { registerBuildCommand } from './build/command';

/**
 * Builds the `ndop` command-line program with every command registered.
 *
 * @param version - Version printed by `ndop --version`.
 * @returns The configured commander program.
 *
 * @example
 * ```ts
 * await createProgram('0.1.0').parseAsync(process.argv);
 * ```
 */
export function createProgram(version: string): Command {
  const program = new Command()
    .name('ndop')
    .description(
      'Add Ndop UI components to an Angular app, and build Ndop registries.',
    )
    .version(version);
  registerBuildCommand(program);
  return program;
}
