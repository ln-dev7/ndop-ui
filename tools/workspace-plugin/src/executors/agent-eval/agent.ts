import { spawn } from 'node:child_process';

/** How one agent run went. */
export interface AgentRun {
  /** Whether the agent finished without an error. */
  ok: boolean;
  /** Whether it stopped on the subscription's usage limit. */
  usageLimited: boolean;
  /** Whether the time limit stopped it. */
  timedOut: boolean;
  /** Turns it took, when reported. */
  turns?: number;
  /** Tokens used, when reported. */
  tokens?: { input: number; output: number };
  /** Wall-clock time. */
  durationMs: number;
  /** Its final message, or the error. */
  result: string;
  /** Everything it printed, for the transcript. */
  transcript: string;
}

/** Something that carries out a prompt in an app. */
export interface Agent {
  /**
   * Carries out a prompt.
   *
   * @param prompt - The request.
   * @param cwd - The app's folder.
   * @returns How it went.
   */
  run(prompt: string, cwd: string): Promise<AgentRun>;
}

/** Messages Claude Code gives when a subscription's usage limit is hit. */
const USAGE_LIMIT =
  /usage limit|limit reached|hit your limit|rate.?limit|\b429\b/i;

/**
 * Reads `claude -p --output-format json`'s result, defensively, since only
 * its documented core fields are relied on.
 *
 * @param stdout - What it printed.
 * @param exitCode - Its exit code.
 * @param durationMs - Wall-clock time.
 * @returns The run.
 */
export function parseClaudeResult(
  stdout: string,
  exitCode: number | null,
  durationMs: number,
): Omit<AgentRun, 'timedOut'> {
  let data: Record<string, unknown> | undefined;
  try {
    data = JSON.parse(stdout.slice(stdout.indexOf('{'))) as Record<
      string,
      unknown
    >;
  } catch {
    data = undefined;
  }
  const result =
    typeof data?.['result'] === 'string' ? data['result'] : stdout.trim();
  const usage = data?.['usage'] as Record<string, number> | undefined;
  const failed = exitCode !== 0 || data?.['is_error'] === true || !data;
  return {
    ok: !failed,
    usageLimited: failed && USAGE_LIMIT.test(result),
    ...(typeof data?.['num_turns'] === 'number'
      ? { turns: data['num_turns'] }
      : {}),
    ...(usage
      ? {
          tokens: {
            input:
              (usage['input_tokens'] ?? 0) +
              (usage['cache_creation_input_tokens'] ?? 0) +
              (usage['cache_read_input_tokens'] ?? 0),
            output: usage['output_tokens'] ?? 0,
          },
        }
      : {}),
    durationMs,
    result,
    transcript: stdout,
  };
}

/** Options of {@link ClaudeCodeAgent}. */
export interface ClaudeCodeOptions {
  /** The pinned `claude` binary. */
  binary: string;
  /** Model, by full name. */
  model: string;
  /** Path of the MCP config holding only the Ndop server. */
  mcpConfig: string;
  /** Time limit per prompt. */
  timeoutMs: number;
  /** Environment, with `CLAUDE_CODE_OAUTH_TOKEN` and the local registries. */
  env: NodeJS.ProcessEnv;
}

/**
 * Claude Code in headless mode (ADR-0019): `claude -p` with only the Ndop
 * MCP server (`--strict-mcp-config`), the project's settings only, no
 * saved session, and file, search and shell tools allowed without asking.
 * Anything else is denied. Its config folder is the one `env` sets, so the
 * user's own settings and memory stay out of the run.
 */
export class ClaudeCodeAgent implements Agent {
  /**
   * Creates the agent.
   *
   * @param options - Binary, model, MCP config, time limit and environment.
   */
  constructor(private readonly options: ClaudeCodeOptions) {}

  /**
   * Runs `claude -p` on the prompt in the app's folder, stopping it at the
   * time limit.
   *
   * @param prompt - The request.
   * @param cwd - The app's folder.
   * @returns How it went.
   */
  run(prompt: string, cwd: string): Promise<AgentRun> {
    const started = Date.now();
    const args = [
      '-p',
      prompt,
      '--model',
      this.options.model,
      '--output-format',
      'json',
      '--mcp-config',
      this.options.mcpConfig,
      '--strict-mcp-config',
      '--setting-sources',
      'project',
      '--no-session-persistence',
      '--permission-mode',
      'dontAsk',
      '--allowedTools',
      'Read',
      'Edit',
      'Write',
      'Glob',
      'Grep',
      'Bash',
      'mcp__ndop',
    ];
    return new Promise((resolve) => {
      const child = spawn(this.options.binary, args, {
        cwd,
        env: this.options.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
      }, this.options.timeoutMs);
      child.stdout.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
      child.stderr.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
      child.on('close', (code) => {
        clearTimeout(timer);
        const parsed = parseClaudeResult(
          stdout || stderr,
          code,
          Date.now() - started,
        );
        resolve({
          ...parsed,
          ok: parsed.ok && !timedOut,
          timedOut,
          ...(timedOut
            ? {
                result: `Stopped after ${this.options.timeoutMs / 60_000} minutes.`,
              }
            : {}),
          transcript: `${stdout}\n${stderr}`.trim(),
        });
      });
    });
  }
}
