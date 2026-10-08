import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { logger, type PromiseExecutor } from '@nx/devkit';
import { readCases, writeScenarioRegistry } from './fixtures';
import type { UpdateE2eExecutorSchema } from './schema';
import { runCase, type CaseOutcome, type SuiteContext } from './suite';

/**
 * The update fixture suite (ADR-0020). Each case installs an item at an old
 * version into a copy of a template app, applies a user's edits, runs
 * `ndop update` in process and checks the result: files against
 * hand-written expectations, statuses, exit codes, conflict markers, the
 * lockfile against fresh installs, and that a second run changes nothing.
 *
 * It fails when merge cases are under `minCleanRate` clean (expected true
 * conflicts count against it), when any rule every update keeps is broken,
 * or when a behavior case fails, and writes a Markdown table of the
 * results.
 *
 * @param options - Executor options from `project.json`.
 * @param context - Nx executor context.
 * @returns Whether the suite passed.
 *
 * @example
 * ```json
 * "e2e": { "executor": "@ndop/workspace-plugin:update-e2e" }
 * ```
 */
const updateE2e: PromiseExecutor<UpdateE2eExecutorSchema> = async (
  options,
  context,
) => {
  const workspace = context.root;
  const at = (path: string) => join(workspace, path);
  const workDir = at(options.workDir ?? 'tmp/update-e2e');
  const cases = await readCases(
    at(options.fixtures ?? 'tools/update-fixtures'),
    options.cases ?? [],
  );
  if (cases.length === 0) {
    logger.error('No update fixture cases matched.');
    return { success: false };
  }
  await rm(workDir, { recursive: true, force: true });

  const registries = new Map<string, string>();
  for (const scenarioDir of new Set(cases.map((entry) => entry.scenarioDir))) {
    const out = join(workDir, 'registries', String(registries.size));
    await writeScenarioRegistry(workspace, scenarioDir, out);
    registries.set(scenarioDir, join(out, '{name}.json'));
  }
  const suite: SuiteContext = {
    workspace,
    template: at(options.template ?? 'packages/cli/fixtures/ng22'),
    workDir,
    registries,
  };

  const outcomes: CaseOutcome[] = [];
  for (const fixture of cases) {
    const outcome = await runCase(suite, fixture);
    outcomes.push(outcome);
    logger.info(`${outcome.result.padEnd(8)} ${outcome.id}`);
    for (const text of [...outcome.broken, ...outcome.differences]) {
      logger.info(`         ${text}`);
    }
  }

  const merges = outcomes.filter((outcome) => outcome.kind === 'merge');
  const clean = merges.filter((outcome) => outcome.result === 'clean').length;
  const rate = merges.length ? clean / merges.length : 1;
  const minimum = options.minCleanRate ?? 0.9;
  const broken = outcomes.filter((outcome) => outcome.broken.length > 0);
  const behaviorFailures = outcomes.filter(
    (outcome) => outcome.kind === 'behavior' && outcome.result === 'failed',
  );
  const report = table(outcomes, clean, merges.length);
  const reportPath = at(options.report ?? 'dist/update-e2e/report.md');
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, report);
  logger.info(`\n${report}`);

  const failures = [
    ...(rate < minimum
      ? [
          `Clean merges: ${clean}/${merges.length} (${percent(rate)}), under ${percent(minimum)}.`,
        ]
      : []),
    ...broken.map((outcome) => `${outcome.id} broke an update rule.`),
    ...behaviorFailures.map((outcome) => `${outcome.id} failed.`),
  ];
  for (const failure of failures) logger.error(failure);
  return { success: failures.length === 0 };
};

/**
 * The results as a Markdown table, for ADR-0020 and CI logs.
 *
 * @param outcomes - Every case.
 * @param clean - Clean merge cases.
 * @param merges - Merge cases.
 * @returns The table.
 */
function table(
  outcomes: readonly CaseOutcome[],
  clean: number,
  merges: number,
): string {
  const rows = outcomes.map(
    (outcome) =>
      `| ${outcome.id} | ${outcome.kind} | ${outcome.result} | ${[...outcome.broken, ...outcome.differences].join('; ').replace(/\|/g, '\\|')} |`,
  );
  return [
    '| Case | Kind | Result | Notes |',
    '| --- | --- | --- | --- |',
    ...rows,
    '',
    `Clean merges: ${clean}/${merges} (${percent(merges ? clean / merges : 1)}).`,
    '',
  ].join('\n');
}

/**
 * A share as a percentage.
 *
 * @param share - 0 to 1.
 * @returns Such as `92.1%`.
 */
function percent(share: number): string {
  return `${(share * 100).toFixed(1)}%`;
}

export default updateE2e;
