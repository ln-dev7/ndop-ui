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
  /** How the process ended, such as `exit 1` or `signal SIGKILL`. */
  exit?: string;
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
  /usage limit|session limit|limit reached|hit your (?:\w+ )?limit|rate.?limit|\b429\b/i;

/**
 * Whether an agent's error is a subscription usage limit rather than the
 * agent failing.
 *
 * @param error - The agent's result text.
 * @returns Whether it reads as a usage limit.
 */
export function isUsageLimit(error: string): boolean {
  return USAGE_LIMIT.test(error);
}

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
    usageLimited:
      failed && (data?.['api_error_status'] === 429 || isUsageLimit(result)),
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

/**
 * Told to the agent on top of Claude Code's own system prompt. Nobody
 * answers in an eval, and the app starts empty, so a run that stops to ask
 * where the UI goes scores nothing even when a user would simply reply.
 */
export const UNATTENDED_PROMPT =
  'You are running unattended: nobody will answer questions. Make reasonable assumptions and finish the task. If the app has no page where the UI belongs, create one and route to it.';

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
 * saved session, file, search and shell tools allowed without asking, and
 * {@link UNATTENDED_PROMPT} appended to the system prompt. Anything else is
 * denied. Its config folder is the one `env` sets, so the
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
   * Runs `claude -p` on the prompt in the app's folder. A run that ends
   * without printing anything, which is Claude Code being killed or
   * crashing rather than the agent failing, is tried once more.
   *
   * @param prompt - The request.
   * @param cwd - The app's folder.
   * @returns How it went.
   */
  async run(prompt: string, cwd: string): Promise<AgentRun> {
    const first = await this.once(prompt, cwd);
    if (first.timedOut || first.transcript.trim()) return first;
    const second = await this.once(prompt, cwd);
    return {
      ...second,
      transcript: `First attempt printed nothing (${first.exit ?? 'unknown exit'}).\n${second.transcript}`,
    };
  }

  /**
   * Runs `claude -p` once, stopping it at the time limit.
   *
   * @param prompt - The request.
   * @param cwd - The app's folder.
   * @returns How it went.
   */
  private once(prompt: string, cwd: string): Promise<AgentRun> {
    const started = Date.now();
    const args = [
      '-p',
      prompt,
      '--append-system-prompt',
      UNATTENDED_PROMPT,
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
      child.on('close', (code, signal) => {
        clearTimeout(timer);
        const exit = signal ? `signal ${signal}` : `exit ${code}`;
        const parsed = parseClaudeResult(
          stdout || stderr,
          code,
          Date.now() - started,
        );
        resolve({
          ...parsed,
          ok: parsed.ok && !timedOut,
          timedOut,
          exit,
          ...(timedOut
            ? {
                result: `Stopped after ${this.options.timeoutMs / 60_000} minutes.`,
              }
            : !parsed.result
              ? { result: `Claude Code printed nothing (${exit}).` }
              : {}),
          transcript: `${stdout}\n${stderr}`.trim(),
        });
      });
    });
  }
}
