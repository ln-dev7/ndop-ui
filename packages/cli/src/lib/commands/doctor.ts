import { resolve } from 'node:path';
import type { Command } from 'commander';
import { pc } from '../colors';
import { CliError } from '../errors';
import {
  diagnose,
  refreshAgentFiles,
  reportedCheck,
  type DoctorCheck,
  type Finding,
} from '../doctor/doctor';
import { readConfig } from '../install/project-files';
import { PlanBuilder, type Plan } from '../plan/plan';
import { RegistryClient, registrySources } from '../registry/client';
import type { CommandEnvironment } from './environment';
import {
  dryRunReport,
  executeWriteCommand,
  outputOf,
  summary,
  type CommandResult,
} from './run';

/** Options `ndop doctor` accepts. */
export interface DoctorOptions {
  /** Project root. */
  cwd: string;
  /** Angular project, when `angular.json` has several. */
  project?: string;
  /** Registry URL template for this run. */
  registry?: string;
  /** Skip the checks that need the registry. */
  offline?: boolean;
  /** Apply the safe fixes. */
  fix?: boolean;
  /** With `fix`: print the fixes as diffs, write nothing. */
  dryRun?: boolean;
  /** Print one JSON result and nothing else. */
  json?: boolean;
  /** With `fix`: apply without asking. */
  yes?: boolean;
  /** The Node version to check; the running one by default. */
  nodeVersion?: string;
  /**
   * The running CLI's version, which `--fix` pins a missing `@ndop/cli` to;
   * the latest when it's unknown.
   */
  cliVersion?: string;
}

/** The machine-readable outcome of `ndop doctor`, printed with `--json`. */
export interface DoctorResult {
  /** Whether no error remains. */
  ok: boolean;
  /** Always `doctor`. */
  command: 'doctor';
  /** Whether the registry checks were skipped. */
  offline: boolean;
  /**
   * Every check, in a fixed order: after `--fix`, as the project is now;
   * on a dry run, as it was.
   */
  checks: DoctorCheck[];
  /** What `--fix` changed or, on a dry run, would change. */
  fix?: Pick<
    CommandResult,
    | 'dryRun'
    | 'applied'
    | 'files'
    | 'dependencies'
    | 'devDependencies'
    | 'skipped'
    | 'warnings'
  >;
  /** What stopped the command, when something did. */
  errors: { message: string; file?: string }[];
}

/** A doctor run's outcome, with the fix plan when there was one. */
export interface DoctorOutcome {
  /** The machine-readable result. */
  result: DoctorResult;
  /** The fix plan, for printing. */
  plan?: Plan;
  /** Whether the user declined the fixes. */
  cancelled?: boolean;
}

/**
 * Runs `ndop doctor` without printing anything (ADR-0024): every check,
 * read-only, or with `fix` the safe fixes, staged through one plan as
 * `init` and `add` stage theirs, then the checks again.
 *
 * @param options - Command options.
 * @param environment - Injected outside world.
 * @param approve - Asked before applying fixes; applies when left out.
 * @returns The result, and the fix plan.
 */
export async function runDoctor(
  options: DoctorOptions,
  environment: CommandEnvironment,
  approve?: (plan: Plan) => Promise<boolean>,
): Promise<DoctorOutcome> {
  const root = resolve(options.cwd);
  const offline = Boolean(options.offline);
  const result: DoctorResult = {
    ok: true,
    command: 'doctor',
    offline,
    checks: [],
    errors: [],
  };
  const check = async (builder: PlanBuilder, client: RegistryClient) =>
    diagnose({
      builder,
      format: await environment.formatter(root),
      client: offline ? undefined : client,
      ...(options.project ? { project: options.project } : {}),
      nodeVersion: options.nodeVersion ?? process.versions.node,
      ...(options.cliVersion ? { cliVersion: options.cliVersion } : {}),
    });
  const fresh = async () => {
    const fs = environment.fs(root);
    let config;
    try {
      config = await readConfig(fs);
    } catch {
      // The ndop.json check reports it.
    }
    return check(
      new PlanBuilder(fs, await environment.formatter(root)),
      new RegistryClient(
        registrySources(config, options.registry, environment.env),
        environment.fetcher(root),
      ),
    );
  };

  let findings: Finding[] = [];
  let outcome: DoctorOutcome = { result };
  try {
    if (!options.fix) {
      findings = await fresh();
    } else {
      const written = await executeWriteCommand(
        'doctor',
        {
          cwd: root,
          dryRun: Boolean(options.dryRun),
          ...(options.registry ? { registry: options.registry } : {}),
        },
        environment,
        async ({ builder, client }) => {
          findings = await check(builder, client);
          for (const finding of findings) {
            if (finding.apply && finding.id !== 'agent-files') {
              await finding.apply(builder);
            }
          }
          await refreshAgentFiles(builder);
          return [];
        },
        approve,
      );
      const done = written.result;
      result.fix = {
        dryRun: done.dryRun,
        applied: done.applied,
        files: done.files,
        dependencies: done.dependencies,
        devDependencies: done.devDependencies,
        skipped: done.skipped,
        warnings: done.warnings,
      };
      result.errors.push(...done.errors);
      if (written.result.applied) findings = await fresh();
      outcome = {
        result,
        ...(written.plan ? { plan: written.plan } : {}),
        ...(written.cancelled ? { cancelled: true } : {}),
      };
    }
  } catch (error) {
    if (!(error instanceof CliError)) throw error;
    result.errors.push({
      message: error.message,
      ...(error.file ? { file: error.file } : {}),
    });
  }
  result.checks = findings.map(reportedCheck);
  result.ok =
    result.errors.length === 0 &&
    result.checks.every((finding) => finding.status !== 'error');
  return outcome;
}

/**
 * Registers `ndop doctor` (RFC-0001, ADR-0024): checks the Node and
 * Angular versions, packages, `ndop.json`, aliases, Tailwind, tokens,
 * providers, the lockfile, zoneless and SSR support, and the agent files,
 * and prints each problem with its fix. `--fix` applies the safe fixes,
 * the same edits `init` and `add` make; it never touches your component
 * files or resolves conflicts. Exits with 1 when any error remains.
 *
 * @param program - The root `ndop` program.
 * @param environment - Injected outside world.
 * @returns The program, for chaining.
 *
 * @example
 * ```sh
 * npx @ndop/cli doctor
 * npx @ndop/cli doctor --fix --dry-run
 * npx @ndop/cli doctor --offline --json
 * ```
 */
export function registerDoctorCommand(
  program: Command,
  environment: CommandEnvironment,
): Command {
  program
    .command('doctor')
    .description('Check the project setup, and fix what is safe to fix.')
    .option('--cwd <path>', 'project root', '.')
    .option('--registry <url>', 'registry URL template containing {name}')
    .option(
      '--project <name>',
      'Angular project, when angular.json has several',
    )
    .option('--offline', 'skip the checks that need the registry')
    .option('--fix', 'apply the safe fixes')
    .option('--dry-run', 'with --fix, print the fixes as diffs, write nothing')
    .option('--json', 'print one JSON result and nothing else')
    .option('-y, --yes', 'with --fix, apply without asking')
    .action(async function (this: Command, options: DoctorOptions) {
      const output = outputOf(this);
      const version = program.version();
      const { result, plan, cancelled } = await runDoctor(
        version ? { ...options, cliVersion: version } : options,
        environment,
        !options.yes && !options.json && environment.interactive
          ? async (planned) => {
              output.out(summary(planned));
              return environment.confirm('Apply these fixes?');
            }
          : undefined,
      );
      if (!result.ok) process.exitCode = 1;
      if (options.json) {
        output.out(`${JSON.stringify(result, null, 2)}\n`);
        return;
      }
      if (cancelled) {
        output.out('Cancelled; nothing was written.\n');
      } else if (plan && options.dryRun) {
        output.out(dryRunReport(plan));
      } else if (plan && result.fix?.applied) {
        output.out(`${summary(plan)}Fixed.\n\n`);
      }
      if (result.errors.length) {
        output.err(
          result.errors
            .map(
              (error) =>
                `${pc.red('✗')} ${error.file ? `${error.file}: ` : ''}${error.message}\n`,
            )
            .join(''),
        );
      }
      output.out(report(result, Boolean(options.fix)));
    });
  return program;
}

/** Marks for each status. */
const MARKS = {
  ok: pc.green('✓'),
  warning: pc.yellow('!'),
  error: pc.red('✗'),
} as const;

/**
 * Prints the checks, one line each with their details and fix, then a
 * count.
 *
 * @param result - The doctor result.
 * @param fixed - Whether `--fix` ran.
 * @returns Text to print.
 */
function report(result: DoctorResult, fixed: boolean): string {
  if (result.checks.length === 0) return '';
  const width = Math.max(...result.checks.map((check) => check.title.length));
  const lines: string[] = [];
  for (const check of result.checks) {
    lines.push(
      `${MARKS[check.status]} ${pc.bold(check.title.padEnd(width))}  ${check.message}`,
    );
    for (const detail of check.details ?? []) {
      lines.push(`  ${' '.repeat(width)}  ${pc.dim('·')} ${detail}`);
    }
    if (check.fix && check.status !== 'ok') {
      lines.push(`  ${' '.repeat(width)}  ${pc.dim(`fix: ${check.fix}`)}`);
    }
  }
  const count = (status: DoctorCheck['status'], noun: string) => {
    const total = result.checks.filter(
      (check) => check.status === status,
    ).length;
    return total ? [`${total} ${noun}${total === 1 ? '' : 's'}`] : [];
  };
  const counts = [...count('error', 'error'), ...count('warning', 'warning')];
  const fixable = result.checks.some(
    (check) => check.fixable && check.status !== 'ok',
  );
  lines.push(
    '',
    counts.length === 0
      ? 'No problems found.'
      : `${counts.join(', ')}.${fixable && !fixed ? ' Run ndop doctor --fix to apply the safe fixes.' : ''}`,
  );
  return `${lines.join('\n')}\n`;
}
