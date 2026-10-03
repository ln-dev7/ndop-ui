import { Command } from 'commander';

/**
 * Builds the `ndop` command-line program. Commands are registered on it by
 * their own modules; the program itself only carries the name, version and
 * help.
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
  return new Command()
    .name('ndop')
    .description(
      'Add Ndop UI components to an Angular app, and build Ndop registries.',
    )
    .version(version);
}
