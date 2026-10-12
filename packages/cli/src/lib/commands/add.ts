import type { Command } from 'commander';
import { planAdd } from '../install/add';
import type { CommandEnvironment } from './environment';
import { withWriteOptions } from './init';
import { runWriteCommand, type WriteOptions } from './run';

/**
 * Options `ndop add` accepts.
 */
interface AddCommandOptions extends WriteOptions {
  overwrite?: boolean;
}

/**
 * Registers `ndop add <items...>`: installs registry items and their
 * registry dependencies (RFC-0001). It writes their files through the
 * project's aliases, rewrites their `@/` imports when the aliases differ,
 * adds their styles and npm dependencies, and records versions and hashes
 * in `ndop.lock.json`. Running it again changes nothing. `name@version`
 * installs that version instead of the latest (ADR-0010). An item can
 * also come from the URL of its JSON (ADR-0025), and `theme:<item>`
 * checks that it's a theme (ADR-0023).
 *
 * @param program - The root `ndop` program.
 * @param environment - Injected outside world.
 * @returns The program, for chaining.
 *
 * @example
 * ```sh
 * npx ndop add dialog --yes
 * npx ndop add @acme/data-table --dry-run
 * npx ndop add button@0.1.0
 * npx ndop add theme:https://ndop.dev/r/themes/custom.json?t=…
 * ```
 */
export function registerAddCommand(
  program: Command,
  environment: CommandEnvironment,
): Command {
  withWriteOptions(
    program
      .command('add')
      .description('Add registry items to the project.')
      .argument(
        '<items...>',
        'item names, bare or @namespace/name, with @<version> for a specific version, or item URLs; theme:<item> checks the item is a theme',
      )
      .option(
        '--overwrite',
        'replace files you changed since they were installed',
      ),
  ).action(async function (
    this: Command,
    names: string[],
    options: AddCommandOptions,
  ) {
    await runWriteCommand(
      this,
      'add',
      options,
      environment,
      ({ builder, client }) =>
        planAdd(builder, client, names, {
          overwrite: Boolean(options.overwrite),
        }),
    );
  });
  return program;
}
