import { resolve } from 'node:path';
import type { Command } from 'commander';
import { buildRegistry } from './build';
import { formatBuildResult } from './report';

/**
 * Options `ndop build` accepts.
 */
interface BuildCommandOptions {
  cwd: string;
  output: string;
  frozenSnapshots?: boolean;
  compile: boolean;
  tsconfig?: string;
  dryRun?: boolean;
  json?: boolean;
  yes?: boolean;
}

/**
 * Registers `ndop build` on the program: builds the registry whose
 * `registry.json` is in `--cwd` into `--output` (ADR-0012). Exits with code
 * 1 when any check fails.
 *
 * @param program - The root `ndop` program.
 * @returns The program, for chaining.
 *
 * @example
 * ```sh
 * ndop build --cwd registry --output dist/registry
 * ndop build --dry-run --json
 * ```
 */
export function registerBuildCommand(program: Command): Command {
  program
    .command('build')
    .description(
      'Validate registry items and write the static registry: index, items and version snapshots.',
    )
    .option('--cwd <path>', 'registry root, holding registry.json', '.')
    .option(
      '-o, --output <path>',
      'folder to write the registry to, under r/ (relative to --cwd)',
      'dist/registry',
    )
    .option(
      '--frozen-snapshots',
      'fail when a version has no snapshot yet (default in CI)',
    )
    .option('--no-compile', 'skip type-checking items with ngc')
    .option(
      '--tsconfig <path>',
      'tsconfig the compile check extends, keeping its paths (relative to --cwd)',
    )
    .option('--dry-run', 'check everything, write nothing')
    .option('--json', 'print the result as JSON')
    .option('-y, --yes', 'accepted for consistency; build never prompts')
    .action(async function (this: Command, options: BuildCommandOptions) {
      const root = resolve(options.cwd);
      const result = await buildRegistry({
        root,
        output: resolve(root, options.output),
        ...(options.frozenSnapshots ? { frozenSnapshots: true } : {}),
        compile: options.compile,
        ...(options.tsconfig
          ? { tsconfig: resolve(root, options.tsconfig) }
          : {}),
        dryRun: Boolean(options.dryRun),
      });
      const { writeOut = (text: string) => process.stdout.write(text) } =
        program.configureOutput();
      writeOut(
        options.json
          ? `${JSON.stringify(result, null, 2)}\n`
          : formatBuildResult(result, Boolean(options.dryRun)),
      );
      if (!result.ok) {
        process.exitCode = 1;
      }
    });
  return program;
}
