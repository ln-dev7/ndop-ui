import type { Command } from 'commander';
import { planInit } from '../install/init';
import type { CommandEnvironment } from './environment';
import { runWriteCommand, type WriteOptions } from './run';

/**
 * Options `ndop init` accepts.
 */
interface InitCommandOptions extends WriteOptions {
  theme: string;
  project?: string;
}

/**
 * Registers `ndop init`: sets an Angular app up for Ndop UI (RFC-0001,
 * ADR-0011). It writes `ndop.json`, adds the `@/` path alias, sets up
 * Tailwind v4 if needed, imports `@ndop/core/styles.css`, installs the
 * theme, `utils` and `icons` items, and registers `provideNdop()` and
 * `provideIcons()`. Running it again changes nothing.
 *
 * @param program - The root `ndop` program.
 * @param environment - Injected outside world.
 * @returns The program, for chaining.
 *
 * @example
 * ```sh
 * npx ndop init --yes
 * npx ndop init --dry-run --json
 * ```
 */
export function registerInitCommand(
  program: Command,
  environment: CommandEnvironment,
): Command {
  withWriteOptions(
    program
      .command('init')
      .description('Set up an Angular app for Ndop UI.')
      .option('--theme <name>', 'theme item to install', 'default')
      .option(
        '--project <name>',
        'Angular project, when angular.json has several',
      ),
  ).action(async function (this: Command, options: InitCommandOptions) {
    await runWriteCommand(
      this,
      'init',
      options,
      environment,
      async ({ builder, client }) => {
        const { items } = await planInit(builder, client, {
          theme: options.theme,
          ...(options.project ? { project: options.project } : {}),
          ...(options.registry ? { registry: options.registry } : {}),
        });
        return items;
      },
    );
  });
  return program;
}

/**
 * Adds the options every write command takes.
 *
 * @param command - A write command.
 * @returns The same command.
 */
export function withWriteOptions(command: Command): Command {
  return command
    .option('--cwd <path>', 'project root', '.')
    .option('--registry <url>', 'registry URL template containing {name}')
    .option('--dry-run', 'print the changes as diffs, write nothing')
    .option('--json', 'print one JSON result and nothing else')
    .option('-y, --yes', 'apply without asking');
}
