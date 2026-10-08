import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Command } from 'commander';
import { detect, resolveCommand } from 'package-manager-detector';
import { registryMetadata } from '../../api';
import { pc } from '../colors';
import { CliError } from '../errors';

/** Steps `--skip` accepts (ADR-0018). */
const STEPS = ['usage', 'build', 'lint', 'render'] as const;

/** Options `ndop verify` accepts. */
interface VerifyCommandOptions {
  cwd: string;
  json?: boolean;
  skip: string[];
  project?: string;
}

/** What `@ndop/verify` exports that the command uses. */
interface VerifyModule {
  verify(options: {
    cwd: string;
    paths: string[];
    metadata: Awaited<ReturnType<typeof registryMetadata>>;
    skip?: (typeof STEPS)[number][];
    project?: string;
    addCommand?: (name: string) => string;
  }): Promise<{
    ok: boolean;
    steps: {
      name: string;
      ok: boolean;
      skipped?: string;
      durationMs: number;
    }[];
    problems: {
      file: string;
      line: number;
      column: number;
      rule: string;
      severity: string;
      message: string;
      fix?: string;
    }[];
    screenshots: string[];
  }>;
}

/**
 * Loads `@ndop/verify` from the project first: run through `npx` or
 * `pnpm dlx`, the CLI lives in a cache folder that can't see the project's
 * dependencies.
 *
 * @param cwd - Project folder.
 * @returns The module.
 */
async function loadVerify(cwd: string): Promise<VerifyModule> {
  let entry: string | undefined;
  try {
    entry = createRequire(join(resolve(cwd), 'package.json')).resolve(
      '@ndop/verify',
    );
  } catch {
    // Not in the project; the CLI's own dependencies may still have it.
  }
  return (await (entry
    ? import(pathToFileURL(entry).href)
    : import(VERIFY_PACKAGE))) as unknown as VerifyModule;
}

// A constant rather than a literal, so type-checking tools that import the
// CLI's source, such as the workspace's CommonJS executors, doesn't pull
// in @ndop/verify's ESM sources; VerifyModule types what's used.
const VERIFY_PACKAGE = '@ndop/verify' as string;

/**
 * The command that adds a dev dependency with the project's package
 * manager.
 *
 * @param cwd - Project folder.
 * @param name - Package name.
 * @returns Such as `pnpm add -D @ndop/verify`.
 */
async function addDevCommand(cwd: string, name: string): Promise<string> {
  const agent = (await detect({ cwd }))?.agent ?? 'npm';
  const command = resolveCommand(agent, 'add', ['-D', name]);
  return command
    ? [command.command, ...command.args].join(' ')
    : `npm install -D ${name}`;
}

/**
 * Registers `ndop verify [paths...]` (RFC-0001, ADR-0018): checks files'
 * templates against component metadata, builds them through the app's
 * build target, lints them with Ndop's rules, and renders them in Chromium
 * for axe and screenshots. The checks live in `@ndop/verify`, loaded on
 * demand so other commands don't install a linter and a browser driver.
 * Exits with 1 when any error remains.
 *
 * @param program - The root `ndop` program.
 * @returns The program, for chaining.
 *
 * @example
 * ```sh
 * npx ndop verify src/app/settings --json
 * npx ndop verify src/app --skip render
 * ```
 */
export function registerVerifyCommand(program: Command): Command {
  program
    .command('verify')
    .description('Check components and pages that use Ndop UI.')
    .argument('[paths...]', 'files or folders to check', ['src/app'])
    .option('--cwd <path>', 'project folder', '.')
    .option('--json', 'print one JSON result and nothing else')
    .option(
      '--skip <steps>',
      `steps to skip: ${STEPS.join(', ')}; repeatable or comma-separated`,
      (value: string, previous: string[]) => [...previous, value],
      [],
    )
    .option(
      '--project <name>',
      'Angular project, when angular.json has several',
    )
    .action(async function (
      this: Command,
      paths: string[],
      options: VerifyCommandOptions,
    ) {
      const out = (text: string) => process.stdout.write(text);
      try {
        const skip = options.skip
          .flatMap((value) => value.split(','))
          .map((step) => step.trim())
          .filter(Boolean);
        for (const step of skip) {
          if (!(STEPS as readonly string[]).includes(step)) {
            throw new CliError(
              `Unknown step "${step}". Use ${STEPS.join(', ')}.`,
            );
          }
        }
        let module: VerifyModule;
        try {
          module = await loadVerify(options.cwd);
        } catch (error) {
          const missing =
            (error as NodeJS.ErrnoException).code === 'ERR_MODULE_NOT_FOUND' &&
            (error as Error).message.includes("'@ndop/verify'");
          if (!missing) throw error;
          throw new CliError(
            `ndop verify needs @ndop/verify. Install it: ${await addDevCommand(options.cwd, '@ndop/verify')}`,
          );
        }
        const result = await module.verify({
          cwd: options.cwd,
          paths,
          metadata: await registryMetadata(options.cwd),
          skip: skip as (typeof STEPS)[number][],
          ...(options.project ? { project: options.project } : {}),
        });
        if (!result.ok) process.exitCode = 1;
        if (options.json) {
          out(`${JSON.stringify(result, null, 2)}\n`);
          return;
        }
        for (const problem of result.problems) {
          const mark =
            problem.severity === 'error' ? pc.red('✗') : pc.yellow('!');
          out(
            `${mark} ${problem.file}:${problem.line}:${problem.column} ${pc.dim(problem.rule)} ${problem.message}\n${problem.fix ? `  ${pc.dim(`fix: ${problem.fix}`)}\n` : ''}`,
          );
        }
        for (const step of result.steps) {
          out(
            `${step.skipped ? pc.dim('-') : step.ok ? pc.green('✓') : pc.red('✗')} ${step.name}${step.skipped ? pc.dim(` (${step.skipped})`) : ''} ${pc.dim(`${step.durationMs}ms`)}\n`,
          );
        }
        if (result.screenshots.length) {
          out(`Screenshots: ${result.screenshots.join(', ')}\n`);
        }
        out(
          result.ok
            ? 'Verified.\n'
            : `${result.problems.filter((problem) => problem.severity === 'error').length} errors.\n`,
        );
      } catch (error) {
        process.exitCode = 1;
        const message = (error as Error).message;
        if (options.json) {
          out(
            `${JSON.stringify({ ok: false, steps: [], problems: [], screenshots: [], errors: [{ message }] }, null, 2)}\n`,
          );
        } else {
          process.stderr.write(`${pc.red('✗')} ${message}\n`);
        }
      }
    });
  return program;
}
