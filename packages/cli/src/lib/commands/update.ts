import type { Command } from 'commander';
import { pc } from '../colors';
import { CliError } from '../errors';
import type { UpstreamHunk } from '@ndop/merge';
import type { Plan } from '../plan/plan';
import {
  NEEDS_ATTENTION,
  planUpdate,
  type FileStatus,
  type ItemUpdate,
} from '../update/update';
import type { CommandEnvironment } from './environment';
import { withWriteOptions } from './init';
import {
  dryRunReport,
  executeWriteCommand,
  outputOf,
  summary,
  type CommandResult,
  type WriteOptions,
} from './run';

/** Options `ndop update` accepts. */
interface UpdateCommandOptions extends WriteOptions {
  force?: boolean;
  continue?: boolean;
  interactive?: boolean;
}

/**
 * Registers `ndop update [items...]`: brings installed items to their
 * latest version, or the one asked for, keeping the user's edits through a
 * three-way merge (RFC-0001, ADR-0003, ADR-0010, ADR-0020). Files the user
 * never edited are replaced; edited ones are merged, and where both sides
 * changed the same lines, written with conflict markers.
 *
 * The files it writes must be committed first, so `git checkout` undoes
 * it; `--force` skips that check. It exits with code 2 when conflicts are
 * left to resolve, and `--continue` records them once resolved.
 *
 * @param program - The root `ndop` program.
 * @param environment - Injected outside world.
 * @returns The program, for chaining.
 *
 * @example
 * ```sh
 * npx ndop update
 * npx ndop update button@0.2.0 --dry-run
 * npx ndop update --continue
 * ```
 */
export function registerUpdateCommand(
  program: Command,
  environment: CommandEnvironment,
): Command {
  withWriteOptions(
    program
      .command('update')
      .description(
        'Update installed items, merging upstream changes into your edits.',
      )
      .argument(
        '[items...]',
        'installed items, with @<version> for a specific version; all of them when left out',
      )
      .option('--force', 'update files with uncommitted changes')
      .option('--continue', 'record conflicts you resolved by hand')
      .option(
        '-i, --interactive',
        "pick which of upstream's changes to apply, one at a time",
      ),
  ).action(async function (
    this: Command,
    names: string[],
    options: UpdateCommandOptions,
  ) {
    const output = outputOf(this);
    if (options.interactive && !environment.interactive) {
      process.exitCode = 1;
      const message = '--interactive asks questions, so it needs a terminal.';
      if (options.json) {
        output.out(
          `${JSON.stringify(
            {
              ok: false,
              command: 'update',
              dryRun: Boolean(options.dryRun),
              applied: false,
              items: [],
              files: [],
              dependencies: [],
              devDependencies: [],
              skipped: [],
              warnings: [],
              errors: [{ message }],
            } satisfies CommandResult,
            null,
            2,
          )}\n`,
        );
      } else {
        output.err(`${pc.red('✗')} ${message}\n`);
      }
      return;
    }
    let updates: ItemUpdate[] = [];
    const outcome = await executeWriteCommand(
      'update',
      options,
      environment,
      async ({ builder, client }) => {
        const planned = await planUpdate(builder, client, names, {
          continue: Boolean(options.continue),
          angularCompiler: () => environment.angularCompiler(builder.fs.root),
          ...(options.interactive
            ? {
                chooseHunks: (path, hunks) =>
                  chooseHunks(environment, output.out, path, hunks),
              }
            : {}),
        });
        updates = planned.updates;
        return planned.items;
      },
      !options.yes && !options.json && environment.interactive
        ? async (plan) => {
            output.out(table(updates) + summary(plan));
            return environment.confirm('Apply these changes?');
          }
        : undefined,
      options.force || options.continue
        ? undefined
        : (plan, root) => checkClean(environment, plan, root),
    );
    const { result, plan } = outcome;
    result.updates = updates;
    if (outcome.cancelled) {
      output.out('Cancelled; nothing was written.\n');
      return;
    }
    if (!result.ok) {
      process.exitCode = 1;
    } else if (needsAttention(updates)) {
      process.exitCode = 2;
    }

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
    } else if (plan) {
      output.out(report(updates, plan, result.warnings, options));
    }
  });
  return program;
}

/**
 * Asks, hunk by hunk, which of upstream's changes to a file to apply.
 *
 * @param environment - Injected outside world, for the prompt.
 * @param out - Prints the hunks.
 * @param path - Project path of the file.
 * @param hunks - Upstream's changes to it.
 * @returns Indexes of the accepted hunks.
 */
async function chooseHunks(
  environment: CommandEnvironment,
  out: (text: string) => void,
  path: string,
  hunks: readonly UpstreamHunk[],
): Promise<number[]> {
  const accepted: number[] = [];
  for (const [index, hunk] of hunks.entries()) {
    out(
      `${pc.bold(path)} ${pc.dim(`change ${index + 1} of ${hunks.length}, at line ${hunk.baseLine}`)}\n${[
        ...hunk.removed.map((line) => pc.red(`-${line}`)),
        ...hunk.added.map((line) => pc.green(`+${line}`)),
      ].join('\n')}\n`,
    );
    if (await environment.confirm('Apply this change?')) accepted.push(index);
  }
  return accepted;
}

/**
 * Refuses to write over uncommitted changes (ADR-0010, rule 2).
 *
 * @param environment - Injected outside world.
 * @param plan - The finished plan.
 * @param root - Absolute project root.
 * @returns A warning when the project isn't in a git repository.
 * @throws {@link CliError} listing files with uncommitted changes.
 */
async function checkClean(
  environment: CommandEnvironment,
  plan: Plan,
  root: string,
): Promise<string[]> {
  const dirty = await environment.dirtyFiles(
    root,
    plan.files.map((file) => file.path),
  );
  if (dirty === undefined) {
    return [
      "This project isn't in a git repository, so nothing can undo this update. Keep a copy, or use git.",
    ];
  }
  if (dirty.length > 0) {
    throw new CliError(
      `These files have uncommitted changes: ${dirty.join(', ')}. Commit or stash them first, so git can undo the update, or run with --force.`,
    );
  }
  return [];
}

/**
 * Whether any file is left for the user to resolve.
 *
 * @param updates - What happened.
 * @returns True for conflicts, unresolved and pending files.
 */
function needsAttention(updates: readonly ItemUpdate[]): boolean {
  return updates.some((update) =>
    update.files.some((file) => NEEDS_ATTENTION.includes(file.status)),
  );
}

/**
 * Prints the outcome: the table, the files that need a word, the plan's
 * summary or diffs, and what to do next.
 *
 * @param updates - What happened.
 * @param plan - The plan.
 * @param warnings - Warnings beyond the plan's.
 * @param options - Command options.
 * @returns Text to print.
 */
function report(
  updates: readonly ItemUpdate[],
  plan: Plan,
  warnings: readonly string[],
  options: UpdateCommandOptions,
): string {
  if (updates.length === 0) {
    return options.continue
      ? 'No conflicts to record.\n'
      : 'Everything is up to date.\n';
  }
  const extra = warnings
    .filter((warning) => !plan.warnings.includes(warning))
    .map((warning) => `${pc.yellow('!')} ${warning}\n`)
    .join('');
  const body = options.dryRun ? dryRunReport(plan) : summary(plan);
  const next = needsAttention(updates)
    ? 'Resolve the conflicts, then run ndop update --continue.\n'
    : options.dryRun
      ? ''
      : options.continue
        ? 'Recorded.\n'
        : 'Done.\n';
  return `${table(updates)}${details(updates)}${body}${extra}${next}`;
}

/**
 * The RFC's result table: item, versions, and files clean, merged and in
 * conflict.
 *
 * @param updates - What happened.
 * @returns The table.
 */
function table(updates: readonly ItemUpdate[]): string {
  const count = (update: ItemUpdate, statuses: readonly FileStatus[]) =>
    String(
      update.files.filter((file) => statuses.includes(file.status)).length,
    );
  const rows = [
    ['Item', 'From', 'To', 'Clean', 'Merged', 'Conflicts'],
    ...updates.map((update) => [
      `${update.registry}/${update.name}`,
      update.from,
      update.to,
      count(update, [
        'replaced',
        'unchanged',
        'created',
        'resolved',
        'renamed',
        'deleted',
      ]),
      count(update, ['merged']),
      count(update, NEEDS_ATTENTION),
    ]),
  ];
  const widths = rows[0]?.map((_, column) =>
    Math.max(...rows.map((row) => row[column]?.length ?? 0)),
  );
  return `${rows
    .map((row, index) => {
      const line = row
        .map((cell, column) => cell.padEnd(widths?.[column] ?? 0))
        .join('  ')
        .trimEnd();
      return index === 0 ? pc.bold(line) : line;
    })
    .join('\n')}\n`;
}

/**
 * One line for each file whose status needs explaining.
 *
 * @param updates - What happened.
 * @returns The lines.
 */
function details(updates: readonly ItemUpdate[]): string {
  const label: Partial<Record<FileStatus, string>> = {
    conflict: pc.red('conflict'),
    unresolved: pc.red('unresolved'),
    pending: pc.yellow('pending'),
    kept: pc.yellow('kept'),
    missing: pc.yellow('missing'),
    merged: pc.green('merged'),
    resolved: pc.green('resolved'),
    renamed: pc.green('renamed'),
    deleted: pc.red('deleted'),
  };
  const files = updates
    .flatMap((update) => update.files)
    .filter((file) => label[file.status])
    .map((file) => {
      const lines = file.conflictLines?.length
        ? `:${file.conflictLines.join(',')}`
        : '';
      const note = file.note ? ` ${pc.dim(file.note)}` : '';
      const from = file.from ? `${file.from} → ` : '';
      return `${label[file.status]} ${from}${file.path}${lines}${note}\n`;
    })
    .join('');
  const codemods = updates
    .flatMap((update) => update.codemods ?? [])
    .map(
      (codemod) =>
        `${pc.cyan('codemod')} ${codemod.kind} ${codemod.from} → ${codemod.to}: ${codemod.files.length ? codemod.files.join(', ') : 'nothing to change'}\n`,
    )
    .join('');
  return files + codemods;
}
