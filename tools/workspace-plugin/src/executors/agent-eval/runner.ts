import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { isUsageLimit, type Agent, type AgentRun } from './agent';
import type { EvalPrompt } from './prompts';
import {
  authoredFiles,
  authoredStylesheets,
  score,
  type Check,
  type VerifyOutput,
} from './score';

/** One prompt attempt's outcome. */
export interface PromptResult {
  /** The prompt's id. */
  id: number;
  /** 1-based attempt, with `--repeat`. */
  attempt: number;
  /** The prompt. */
  prompt: string;
  /** Whether every check passed. */
  passed: boolean;
  /** Each check. */
  checks: Check[];
  /** The agent's own files. */
  files: string[];
  /** Verify's error problems. */
  problems: VerifyOutput['problems'];
  /** Screenshots, relative to the report folder. */
  screenshots: string[];
  /** Turns, tokens and time. */
  turns?: number;
  /** Tokens used. */
  tokens?: { input: number; output: number };
  /** Wall-clock time of the agent. */
  durationMs: number;
  /** The agent's error, when it failed. */
  error?: string;
}

/** The whole run, saved after every prompt. */
export interface EvalReport {
  /** The model, by full name. */
  model: string;
  /** When the run began. */
  startedAt: string;
  /** Attempts per prompt. */
  repeat: number;
  /** Prompts the run covers. */
  prompts: number[];
  /** Finished attempts. */
  results: PromptResult[];
  /** Set when a usage limit stopped the run. */
  stopped?: 'usage-limit';
}

/** The work around the agent, injected so tests can fake it. */
export interface Workspace {
  /**
   * A fresh copy of the fixture app.
   *
   * @param name - A folder name for the copy.
   * @returns Its folder.
   */
  copy(name: string): Promise<string>;
  /**
   * Paths the prompt changed.
   *
   * @param copy - The copy.
   * @returns Changed paths.
   */
  changed(copy: string): Promise<string[]>;
  /**
   * The lockfile's items and files.
   *
   * @param copy - The copy.
   * @returns Item names and file paths.
   */
  locked(copy: string): Promise<{ installed: Set<string>; files: Set<string> }>;
  /**
   * Reads a file of the copy.
   *
   * @param copy - The copy.
   * @param path - Project-relative path.
   * @returns Its text.
   */
  read(copy: string, path: string): Promise<string>;
  /**
   * Reads a file of the fixture every copy starts from.
   *
   * @param path - Project-relative path.
   * @returns Its text, or `undefined` when the fixture doesn't have it.
   */
  original(path: string): Promise<string | undefined>;
  /**
   * Runs `ndop verify --json`.
   *
   * @param copy - The copy.
   * @param files - Project-relative `.ts` files.
   * @returns The result, if it printed one.
   */
  verify(copy: string, files: string[]): Promise<VerifyOutput | undefined>;
  /**
   * Keeps a prompt's artifacts: transcript, the agent's files and
   * screenshots.
   *
   * @param copy - The copy.
   * @param folder - The report folder for this attempt.
   * @param run - The agent run.
   * @param files - The agent's files.
   * @param screenshots - Screenshot paths in the copy.
   * @returns The screenshots' paths in the report folder.
   */
  keep(
    copy: string,
    folder: string,
    run: AgentRun,
    files: string[],
    screenshots: string[],
  ): Promise<string[]>;
}

/** Options of {@link runEval}. */
export interface EvalOptions {
  /** The prompts to run. */
  prompts: EvalPrompt[];
  /** Attempts per prompt. */
  repeat: number;
  /** Model name, for the report. */
  model: string;
  /** Folder the report goes in. */
  reportDir: string;
  /** Continue the report in `reportDir` instead of starting over. */
  resume: boolean;
  /** Reports progress. */
  log?: (message: string) => void;
}

/**
 * Runs the eval suite (ADR-0019): each prompt, one at a time, in a fresh
 * copy of the fixture app, scored on what the agent changed. The report is
 * written after every prompt; a usage-limit error stops the run with the
 * report marked, and `resume` continues from the first unfinished prompt,
 * running again any attempt that ended on a usage limit.
 *
 * @param options - Prompts, attempts, model and report folder.
 * @param agent - The agent.
 * @param workspace - The work around it.
 * @returns The report.
 */
export async function runEval(
  options: EvalOptions,
  agent: Agent,
  workspace: Workspace,
): Promise<EvalReport> {
  const log = options.log ?? (() => undefined);
  await mkdir(options.reportDir, { recursive: true });
  const path = join(options.reportDir, 'report.json');
  const report: EvalReport = options.resume
    ? {
        ...(JSON.parse(await readFile(path, 'utf-8')) as EvalReport),
        model: options.model,
      }
    : {
        model: options.model,
        startedAt: new Date().toISOString(),
        repeat: options.repeat,
        prompts: options.prompts.map((prompt) => prompt.id),
        results: [],
      };
  delete report.stopped;
  // A limit the runner failed to recognise was scored as a failure; those
  // attempts never really ran, so resuming runs them again.
  report.results = report.results.filter(
    (result) => !result.error || !isUsageLimit(result.error),
  );

  for (const prompt of options.prompts) {
    for (let attempt = 1; attempt <= report.repeat; attempt++) {
      if (
        report.results.some(
          (result) => result.id === prompt.id && result.attempt === attempt,
        )
      ) {
        continue;
      }
      const name = `${String(prompt.id).padStart(2, '0')}-${attempt}`;
      log(`Prompt ${prompt.id} (attempt ${attempt}): ${prompt.prompt}`);
      const copy = await workspace.copy(name);
      const agentRun = await agent.run(prompt.prompt, copy);
      if (agentRun.usageLimited) {
        report.stopped = 'usage-limit';
        await save(options.reportDir, report);
        log(
          'The usage limit was reached; run again with --resume once it resets.',
        );
        return report;
      }
      const changed = await workspace.changed(copy);
      const locked = await workspace.locked(copy);
      const files = authoredFiles(changed, locked.files);
      const sources: Record<string, string> = {};
      for (const file of files)
        sources[file] = await workspace.read(copy, file);
      const styles = await stylesheetAdditions(
        workspace,
        copy,
        authoredStylesheets(changed, locked.files),
      );
      const typescript = files.filter((file) => file.endsWith('.ts'));
      const verified = typescript.length
        ? await workspace.verify(copy, typescript)
        : undefined;
      const scored = score({
        components: prompt.components,
        changed,
        ndopFiles: locked.files,
        installed: locked.installed,
        sources,
        styles,
        ...(verified ? { verify: verified } : {}),
      });
      const screenshots = await workspace.keep(
        copy,
        join(options.reportDir, name),
        agentRun,
        files,
        verified?.screenshots ?? [],
      );
      report.results.push({
        id: prompt.id,
        attempt,
        prompt: prompt.prompt,
        passed: scored.passed && agentRun.ok,
        checks: scored.checks,
        files,
        problems: (verified?.problems ?? []).filter(
          (problem) => problem.severity === 'error',
        ),
        screenshots,
        ...(agentRun.turns !== undefined ? { turns: agentRun.turns } : {}),
        ...(agentRun.tokens ? { tokens: agentRun.tokens } : {}),
        durationMs: agentRun.durationMs,
        ...(agentRun.ok ? {} : { error: agentRun.result }),
      });
      await save(options.reportDir, report);
      log(
        `  ${scored.passed && agentRun.ok ? 'passed' : 'failed'}: ${
          scored.checks
            .filter((check) => !check.ok)
            .map((check) => check.detail)
            .join(' ') || 'all checks'
        }`,
      );
    }
  }
  return report;
}

/**
 * What the agent wrote in stylesheets: a new one whole, and only the lines
 * it added to one the fixture had, such as the global stylesheet, whose
 * theme isn't the agent's. A deleted stylesheet adds nothing.
 *
 * @param workspace - The work around the agent.
 * @param copy - The prompt's copy.
 * @param paths - The agent's stylesheets.
 * @returns Their text, by path.
 */
async function stylesheetAdditions(
  workspace: Workspace,
  copy: string,
  paths: readonly string[],
): Promise<Record<string, string>> {
  const styles: Record<string, string> = {};
  for (const path of paths) {
    const now = await workspace.read(copy, path).catch(() => undefined);
    if (now === undefined) continue;
    const before = await workspace.original(path);
    if (before === undefined) {
      styles[path] = now;
      continue;
    }
    const kept = new Set(before.split('\n'));
    styles[path] = now
      .split('\n')
      .filter((line) => !kept.has(line))
      .join('\n');
  }
  return styles;
}

/**
 * Accuracy: passed attempts over all attempts the run covers.
 *
 * @param report - The report.
 * @returns A fraction, 0 to 1.
 */
export function accuracy(report: EvalReport): number {
  const total = report.prompts.length * report.repeat;
  return total
    ? report.results.filter((result) => result.passed).length / total
    : 0;
}

/**
 * The report as Markdown: accuracy, then a row per attempt.
 *
 * @param report - The report.
 * @returns The summary.
 */
export function summary(report: EvalReport): string {
  const total = report.prompts.length * report.repeat;
  const passed = report.results.filter((result) => result.passed).length;
  const tokens = report.results.reduce(
    (sum, result) =>
      sum + (result.tokens?.input ?? 0) + (result.tokens?.output ?? 0),
    0,
  );
  return (
    [
      '# Agent eval',
      `Model: \`${report.model}\` · started ${report.startedAt} · ${report.results.length} of ${total} attempts run${report.stopped ? ' · stopped at the usage limit; resume with --resume' : ''}.`,
      `**Accuracy: ${passed}/${total} (${(accuracy(report) * 100).toFixed(1)}%)** · ${tokens.toLocaleString('en')} tokens.`,
      [
        '| Prompt | Attempt | Result | Turns | Time | Failed checks |',
        '| --- | --- | --- | --- | --- | --- |',
        ...report.results.map(
          (result) =>
            `| ${result.id}. ${result.prompt.replace(/\|/g, '\\|')} | ${result.attempt} | ${result.passed ? 'pass' : 'fail'} | ${result.turns ?? ''} | ${Math.round(result.durationMs / 1000)}s | ${[
              ...result.checks
                .filter((check) => !check.ok)
                .map((check) => check.detail),
              ...(result.error ? [result.error] : []),
            ]
              .join(' ')
              .replace(/\|/g, '\\|')} |`,
        ),
      ].join('\n'),
    ].join('\n\n') + '\n'
  );
}

/**
 * Writes the report and its summary.
 *
 * @param folder - Report folder.
 * @param report - The report.
 */
async function save(folder: string, report: EvalReport): Promise<void> {
  await writeFile(
    join(folder, 'report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  await writeFile(join(folder, 'summary.md'), summary(report));
}
