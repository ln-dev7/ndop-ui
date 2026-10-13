import { resolve } from 'node:path';
import type { Command } from 'commander';
import { pc } from '../colors';
import { CliError } from '../errors';
import { readAliasBase, readConfig, readLock } from '../install/project-files';
import { RegistryClient, registrySources } from '../registry/client';
import { diffItems, type FileDiff, type ItemDiff } from '../update/diff';
import type { CommandEnvironment } from './environment';
import { outputOf } from './run';

/** Options `ndop diff` accepts. */
interface DiffOptions {
  cwd: string;
  registry?: string;
  json?: boolean;
  to?: string;
}

/** The machine-readable outcome of `ndop diff`, printed with `--json`. */
export interface DiffResult {
  /** Whether the comparison ran. */
  ok: boolean;
  /** Always `diff`. */
  command: 'diff';
  /** Each item compared. */
  items: ItemDiff[];
  /** What went wrong, when `ok` is false. */
  errors: { message: string; file?: string }[];
}

/**
 * Registers `ndop diff [items...]`: for each installed item, your changes
 * to its files (the version you installed against the files on disk) and
 * upstream's changes (that version against the latest, or `--to`), side
 * by side (RFC-0001, ADR-0020). It writes nothing; `ndop update` applies
 * upstream's changes.
 *
 * @param program - The root `ndop` program.
 * @param environment - Injected outside world.
 * @returns The program, for chaining.
 *
 * @example
 * ```sh
 * npx @ndop/cli diff
 * npx @ndop/cli diff button --to 0.2.0 --json
 * ```
 */
export function registerDiffCommand(
  program: Command,
  environment: CommandEnvironment,
): Command {
  program
    .command('diff')
    .description(
      'Show your changes to installed items and what upstream changed.',
    )
    .argument('[items...]', 'installed items; all of them when left out')
    .option('--cwd <path>', 'project root', '.')
    .option('--registry <url>', 'registry URL template containing {name}')
    .option('--to <version>', 'compare with this version, not the latest')
    .option('--json', 'print one JSON result and nothing else')
    .action(async function (
      this: Command,
      names: string[],
      options: DiffOptions,
    ) {
      const output = outputOf(this);
      const result = await runDiff(names, options, environment);
      if (!result.ok) process.exitCode = 1;
      if (options.json) {
        output.out(`${JSON.stringify(result, null, 2)}\n`);
      } else if (!result.ok) {
        output.err(
          result.errors
            .map(
              (error) =>
                `${pc.red('✗')} ${error.file ? `${error.file}: ` : ''}${error.message}\n`,
            )
            .join(''),
        );
      } else {
        output.out(report(result.items));
      }
    });
  return program;
}

/**
 * Runs `ndop diff` without printing anything.
 *
 * @param names - Items asked for.
 * @param options - Command options.
 * @param environment - Injected outside world.
 * @returns The result; expected failures are errors in it.
 */
async function runDiff(
  names: readonly string[],
  options: DiffOptions,
  environment: CommandEnvironment,
): Promise<DiffResult> {
  const root = resolve(options.cwd);
  const result: DiffResult = {
    ok: true,
    command: 'diff',
    items: [],
    errors: [],
  };
  try {
    const fs = environment.fs(root);
    const config = await readConfig(fs);
    if (!config) {
      throw new CliError('No ndop.json here. Run ndop init first.');
    }
    const format = await environment.formatter(root);
    result.items = await diffItems({
      reader: fs,
      format,
      context: {
        config,
        aliasBase: await readAliasBase(fs, config.importAlias ?? '@/'),
      },
      lock: await readLock(fs),
      client: new RegistryClient(
        registrySources(config, options.registry, environment.env),
        environment.fetcher(root),
      ),
      names,
      ...(options.to ? { to: options.to } : {}),
    });
  } catch (error) {
    if (!(error instanceof CliError)) throw error;
    result.ok = false;
    result.errors.push({
      message: error.message,
      ...(error.file ? { file: error.file } : {}),
    });
  }
  return result;
}

/**
 * Prints the comparison: per item its versions, then per file its state
 * and both diffs.
 *
 * @param items - Compared items.
 * @returns Text to print.
 */
function report(items: readonly ItemDiff[]): string {
  if (items.length === 0) {
    return 'Nothing installed yet; add items with ndop add.\n';
  }
  const lines: string[] = [];
  for (const item of items) {
    const key = item.source ?? `${item.registry}/${item.name}`;
    lines.push(
      item.target === item.version
        ? `${pc.bold(key)} ${item.version}, up to date`
        : `${pc.bold(key)} ${item.version} → ${pc.green(item.target)}`,
    );
    for (const file of item.files) {
      lines.push(`  ${describe(file, item.version)}  ${file.path}`);
      if (file.localPatch) {
        lines.push(pc.dim('  Your changes:'), colorPatch(file.localPatch));
      }
      if (file.upstreamPatch) {
        lines.push(
          pc.dim('  Upstream changes:'),
          colorPatch(file.upstreamPatch),
        );
      }
    }
    for (const path of item.added) {
      lines.push(`  ${pc.green('added upstream')}  ${path}`);
    }
    for (const codemod of item.codemods) {
      lines.push(
        `  ${pc.cyan('codemod')} ${codemod.since}: ${codemod.kind} ${codemod.from} → ${codemod.to}`,
      );
    }
    for (const warning of item.warnings) {
      lines.push(`  ${pc.yellow('!')} ${warning}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

/**
 * A file's state in words.
 *
 * @param file - A compared file.
 * @param version - Its item's installed version.
 * @returns For example `edited, changed upstream`.
 */
function describe(file: FileDiff, version: string): string {
  const local = {
    unchanged: pc.dim('unchanged'),
    edited: pc.yellow('edited'),
    conflicted: pc.red('conflicted'),
    missing: pc.red('missing'),
  }[file.local];
  const upstream = {
    unchanged: '',
    changed: ', changed upstream',
    renamed: `, moved upstream to ${file.renamedTo ?? '?'}`,
    removed: ', removed upstream',
  }[file.upstream];
  const pending =
    file.baseVersion === version
      ? ''
      : pc.dim(` (still at ${file.baseVersion})`);
  return `${local}${upstream}${pending}`;
}

/**
 * Colors a unified diff's added and removed lines.
 *
 * @param patch - The diff.
 * @returns The colored diff, without its `Index:` and `===` lines.
 */
function colorPatch(patch: string): string {
  return patch
    .split('\n')
    .filter((line) => !line.startsWith('Index:') && !/^=+$/.test(line))
    .map((line) =>
      line.startsWith('+') && !line.startsWith('+++')
        ? pc.green(line)
        : line.startsWith('-') && !line.startsWith('---')
          ? pc.red(line)
          : line.startsWith('@@')
            ? pc.cyan(line)
            : line,
    )
    .join('\n')
    .trimEnd();
}
