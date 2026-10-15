import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { logger, type PromiseExecutor } from '@nx/devkit';
import { withLocalPackages } from '../../utils/local-packages';
import { ClaudeCodeAgent } from './agent';
import {
  changedFiles,
  copyFixture,
  lockedFiles,
  prepareFixture,
  verifyFiles,
} from './fixture';
import { readPrompts, selectPrompts } from './prompts';
import { accuracy, runEval, summary, type Workspace } from './runner';
import type { AgentEvalExecutorSchema } from './schema';

/**
 * Prompt ids from the `prompts` option, however Nx passed them.
 *
 * @param value - `1,7`, `[1, 7]` or `7`.
 * @returns The ids.
 */
export function promptIds(value: AgentEvalExecutorSchema['prompts']): number[] {
  if (value === undefined || value === '') return [];
  const list = Array.isArray(value) ? value : String(value).split(',');
  return list.map((id) => Number(String(id).trim()));
}

/**
 * The agent eval suite (ADR-0019). Against unpublished Ndop, it builds the
 * fixture app once, then has headless Claude Code carry out each prompt in
 * its own copy, with only the Ndop MCP server, and scores the result with
 * `ndop verify` and the prompt's required components. The report, in
 * `dist/agent-eval/`, is JSON plus a Markdown summary, kept after every
 * prompt.
 *
 * It authenticates with a Claude subscription token,
 * `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token`, never an API key,
 * and refuses to start when `ANTHROPIC_API_KEY` is set. It fails when a
 * usage limit stops it, saying to resume, or when accuracy is under
 * `minAccuracy`.
 *
 * @param options - Prompts, attempts, model, limits and paths.
 * @param context - Nx executor context.
 * @returns Whether the run finished at or above the accuracy bar.
 */
const agentEval: PromiseExecutor<AgentEvalExecutorSchema> = async (
  options,
  context,
) => {
  if (process.env['ANTHROPIC_API_KEY']) {
    logger.error(
      'ANTHROPIC_API_KEY is set. The eval runs on a Claude subscription, not an API account; unset it and set CLAUDE_CODE_OAUTH_TOKEN.',
    );
    return { success: false };
  }
  const token = process.env['CLAUDE_CODE_OAUTH_TOKEN'];
  if (!token) {
    logger.error(
      'Set CLAUDE_CODE_OAUTH_TOKEN to a token from `claude setup-token`; the eval runs on that subscription.',
    );
    return { success: false };
  }
  const root = context.root;
  const prompts = selectPrompts(
    await readPrompts(
      join(root, options.promptsFile ?? 'tools/agent-eval/prompts.json'),
    ),
    promptIds(options.prompts),
  );
  const workDir = join(root, options.workDir ?? 'tmp/agent-eval');
  const reportDir = join(root, options.reportDir ?? 'dist/agent-eval');
  const model = options.model ?? 'claude-sonnet-5';
  const log = join(workDir, 'eval.log');

  const report = await withLocalPackages(
    { root, tag: 'eval' },
    async (packages) => {
      logger.info('Building the fixture app…');
      const fixture = await prepareFixture({
        workDir,
        env: packages.env,
        version: packages.version,
        registryUrl: packages.registryUrl,
        angular: options.angular ?? '22.2.1',
        log,
      });
      const configDir = join(workDir, 'claude-config');
      await mkdir(configDir, { recursive: true });
      const env: NodeJS.ProcessEnv = {
        ...packages.env,
        CLAUDE_CODE_OAUTH_TOKEN: token,
        // A fresh config folder keeps the user's own settings, memory and
        // MCP servers out of the run.
        CLAUDE_CONFIG_DIR: configDir,
      };
      const agent = new ClaudeCodeAgent({
        binary: join(root, 'node_modules/.bin/claude'),
        model,
        mcpConfig: fixture.mcpConfig,
        timeoutMs: (options.timeoutMinutes ?? 15) * 60_000,
        env,
      });
      const workspace: Workspace = {
        copy: async (name) => {
          const copy = join(workDir, 'runs', name);
          await copyFixture(fixture, copy);
          return copy;
        },
        changed: (copy) => changedFiles(fixture, copy),
        locked: (copy) => lockedFiles(copy),
        read: (copy, path) => readFile(join(copy, path), 'utf-8'),
        original: (path) =>
          readFile(join(fixture.template, path), 'utf-8').catch(
            () => undefined,
          ),
        verify: (copy, files) => verifyFiles(copy, files, packages.env, log),
        keep: async (copy, folder, run, files, screenshots) => {
          await rm(folder, { recursive: true, force: true });
          await mkdir(folder, { recursive: true });
          await writeFile(
            join(folder, 'transcript.json'),
            `${run.transcript}\n`,
          );
          for (const file of files) {
            await mkdir(dirname(join(folder, 'files', file)), {
              recursive: true,
            });
            await cp(join(copy, file), join(folder, 'files', file));
          }
          const kept: string[] = [];
          for (const screenshot of screenshots) {
            const name = screenshot.split('/').pop() ?? screenshot;
            await mkdir(join(folder, 'screenshots'), { recursive: true });
            await cp(join(copy, screenshot), join(folder, 'screenshots', name));
            kept.push(
              join(folder.slice(reportDir.length + 1), 'screenshots', name),
            );
          }
          return kept;
        },
      };
      return runEval(
        {
          prompts,
          repeat: options.repeat ?? 1,
          model,
          reportDir,
          resume: options.resume ?? false,
          log: (message) => logger.info(message),
        },
        agent,
        workspace,
      );
    },
  );

  logger.info(summary(report));
  logger.info(`Report: ${reportDir}`);
  if (report.stopped) {
    logger.error(
      'Stopped at the usage limit. Run again with --resume once it resets.',
    );
    return { success: false };
  }
  const reached = accuracy(report);
  const bar = options.minAccuracy ?? 0.95;
  if (reached < bar) {
    logger.error(
      `Accuracy ${(reached * 100).toFixed(1)}% is under ${(bar * 100).toFixed(0)}%.`,
    );
  }
  return { success: reached >= bar };
};

export default agentEval;
