import { resolve } from 'node:path';
import type { Command } from 'commander';
import { createTwoFilesPatch } from 'diff';
import { pc } from '../colors';
import { CliError } from '../errors';
import { applyPlan } from '../plan/apply';
import { isEmptyPlan, PlanBuilder, type Plan } from '../plan/plan';
import {
  RegistryClient,
  registrySources,
  type ResolvedItem,
} from '../registry/client';
import type { NdopConfig } from '@ndop/schema';
import { readConfig } from '../install/project-files';
import type { CommandEnvironment } from './environment';

/**
 * Options every write command accepts (RFC-0001, "Code modification").
 */
export interface WriteOptions {
  /** Project root. */
  cwd: string;
  /** Print the plan, write nothing. */
  dryRun?: boolean;
  /** Print one JSON result and nothing else. */
  json?: boolean;
  /** Skip confirmation. */
  yes?: boolean;
  /** Registry URL template for this run. */
  registry?: string;
}

/**
 * The machine-readable outcome of a write command, printed with `--json`.
 */
export interface CommandResult {
  /** Whether the command succeeded. */
  ok: boolean;
  /** `init` or `add`. */
  command: string;
  /** Whether this was a dry run. */
  dryRun: boolean;
  /** Whether changes were written and installed. */
  applied: boolean;
  /** Items installed or planned, dependencies first. */
  items: { registry: string; name: string; version: string }[];
  /** Files created or updated. */
  files: { path: string; action: 'create' | 'update' }[];
  /** npm packages added. */
  dependencies: string[];
  /** npm dev packages added. */
  devDependencies: string[];
  /** Files deliberately left alone. */
  skipped: Plan['skipped'];
  /** Things the user should know. */
  warnings: string[];
  /** What went wrong, when `ok` is false. */
  errors: { message: string; file?: string }[];
}

/**
 * What a command's planning step receives.
 */
export interface PlanningInput {
  /** The plan being built. */
  builder: PlanBuilder;
  /** Registry client for this run. */
  client: RegistryClient;
}

/**
 * Runs a write command the ADR-0011 way: build a plan, then print it
 * (`--dry-run`) or confirm and apply it, and report the outcome as text or
 * JSON. Expected failures set exit code 1 instead of throwing.
 *
 * @param command - The commander command, for output settings.
 * @param name - Command name, for the JSON result.
 * @param options - Shared write options.
 * @param environment - Injected outside world.
 * @param plan - Stages the command's changes.
 */
export async function runWriteCommand(
  command: Command,
  name: string,
  options: WriteOptions,
  environment: CommandEnvironment,
  plan: (input: PlanningInput) => Promise<ResolvedItem[]>,
): Promise<void> {
  const root = resolve(options.cwd);
  const output = outputOf(command);
  const result: CommandResult = {
    ok: true,
    command: name,
    dryRun: Boolean(options.dryRun),
    applied: false,
    items: [],
    files: [],
    dependencies: [],
    devDependencies: [],
    skipped: [],
    warnings: [],
    errors: [],
  };
  let finished: Plan | undefined;
  try {
    const fs = environment.fs(root);
    const builder = new PlanBuilder(fs, await environment.formatter(root));
    let config: NdopConfig | undefined;
    try {
      config = await readConfig(fs);
    } catch {
      // init rewrites a broken ndop.json; add reports it while planning.
    }
    const client = new RegistryClient(
      registrySources(config, options.registry, environment.env),
      environment.fetcher(root),
    );
    const items = await plan({ builder, client });
    finished = await builder.finish();
    Object.assign(result, {
      items: items.map(({ ref, item }) => ({
        registry: ref.registry,
        name: ref.name,
        version: item.version,
      })),
      files: finished.files.map(({ path, action }) => ({ path, action })),
      dependencies: finished.dependencies,
      devDependencies: finished.devDependencies,
      skipped: finished.skipped,
      warnings: finished.warnings,
    });

    if (!options.dryRun && !isEmptyPlan(finished)) {
      if (!options.yes && !options.json && environment.interactive) {
        output.out(summary(finished));
        if (!(await environment.confirm('Apply these changes?'))) {
          output.out('Cancelled; nothing was written.\n');
          return;
        }
      }
      await applyPlan(fs, finished, environment.installer(root));
      result.applied = true;
    }
  } catch (error) {
    if (!(error instanceof CliError)) {
      throw error;
    }
    result.ok = false;
    result.errors.push({
      message: error.message,
      ...(error.file ? { file: error.file } : {}),
    });
    process.exitCode = 1;
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
  } else if (finished) {
    output.out(
      options.dryRun ? dryRunReport(finished) : appliedReport(finished),
    );
  }
}

/**
 * Where a command prints, honoring the program's output configuration.
 *
 * @param command - Any command of the program.
 * @returns Writers for standard output and error.
 */
function outputOf(command: Command): {
  out: (text: string) => void;
  err: (text: string) => void;
} {
  let root = command;
  while (root.parent) {
    root = root.parent;
  }
  const config = root.configureOutput();
  return {
    out: config.writeOut ?? ((text) => process.stdout.write(text)),
    err: config.writeErr ?? ((text) => process.stderr.write(text)),
  };
}

/**
 * Lists a plan's changes, one line each.
 *
 * @param plan - A finished plan.
 * @returns Text to print.
 */
function summary(plan: Plan): string {
  const lines = [
    ...plan.files.map(
      (file) =>
        `${file.action === 'create' ? pc.green('create') : pc.yellow('update')} ${file.path}`,
    ),
    ...plan.dependencies.map((spec) => `${pc.cyan('install')} ${spec}`),
    ...plan.devDependencies.map(
      (spec) => `${pc.cyan('install')} ${spec} ${pc.dim('(dev)')}`,
    ),
    ...plan.skipped.map(
      (file) => `${pc.dim('skip')} ${file.path}: ${file.reason}`,
    ),
    ...plan.warnings.map((warning) => `${pc.yellow('!')} ${warning}`),
  ];
  return lines.length > 0 ? `${lines.join('\n')}\n` : '';
}

/**
 * Prints a dry run: a unified diff per file, then the summary.
 *
 * @param plan - A finished plan.
 * @returns Text to print.
 */
function dryRunReport(plan: Plan): string {
  if (isEmptyPlan(plan) && plan.skipped.length === 0) {
    return 'Already up to date; nothing would change.\n';
  }
  const diffs = plan.files.map((file) =>
    createTwoFilesPatch(
      file.action === 'create' ? '/dev/null' : `a/${file.path}`,
      `b/${file.path}`,
      file.before ?? '',
      file.after,
    ),
  );
  return `${diffs.join('\n')}\n${summary(plan)}Dry run: nothing was written.\n`;
}

/**
 * Prints what an applied plan did.
 *
 * @param plan - The applied plan.
 * @returns Text to print.
 */
function appliedReport(plan: Plan): string {
  if (isEmptyPlan(plan)) {
    return `${summary(plan)}Already up to date; nothing changed.\n`;
  }
  return `${summary(plan)}Done.\n`;
}
