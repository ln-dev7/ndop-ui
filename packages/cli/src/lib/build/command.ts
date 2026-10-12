import { resolve } from 'node:path';
import { Option, type Command } from 'commander';
import { DEFAULT_COMPAT_BASE_URL } from '@ndop/schema';
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
  metadata: boolean;
  tsconfig?: string;
  dryRun?: boolean;
  compat?: 'shadcn';
  compatBaseUrl: string;
  registry?: string;
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
 * ndop build --compat shadcn --compat-base-url https://ui.acme.dev/r/compat/
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
      '--no-metadata',
      'skip extracting component metadata and its completeness checks',
    )
    .option(
      '--tsconfig <path>',
      'tsconfig the compile check extends, keeping its paths (relative to --cwd)',
    )
    .addOption(
      new Option(
        '--compat <format>',
        'also write r/compat/<name>.json, items another CLI installs',
      ).choices(['shadcn']),
    )
    .option(
      '--compat-base-url <url>',
      'absolute URL r/compat/ is served from, for registryDependencies',
      DEFAULT_COMPAT_BASE_URL,
    )
    .option(
      '--registry <url>',
      "Ndop's registry for @ndop/… registryDependencies, a URL or path template containing {name}, paths relative to --cwd (default: NDOP_REGISTRY, then ndop.dev)",
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
        metadata: options.metadata,
        ...(options.tsconfig
          ? { tsconfig: resolve(root, options.tsconfig) }
          : {}),
        dryRun: Boolean(options.dryRun),
        ...(options.compat
          ? { compat: options.compat, compatBaseUrl: options.compatBaseUrl }
          : {}),
        ...(options.registry ? { registry: options.registry } : {}),
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
