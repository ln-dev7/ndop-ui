import { parseClaudeResult } from './agent';

describe('parseClaudeResult', () => {
  it('reads turns, tokens and the final message', () => {
    const run = parseClaudeResult(
      JSON.stringify({
        type: 'result',
        is_error: false,
        num_turns: 12,
        result: 'Done.',
        usage: {
          input_tokens: 10,
          cache_read_input_tokens: 90,
          cache_creation_input_tokens: 0,
          output_tokens: 5,
        },
      }),
      0,
      1000,
    );
    expect(run).toEqual(
      expect.objectContaining({
        ok: true,
        usageLimited: false,
        turns: 12,
        tokens: { input: 100, output: 5 },
        result: 'Done.',
      }),
    );
  });

  it('recognizes the usage limit', () => {
    const run = parseClaudeResult(
      JSON.stringify({
        is_error: true,
        result: 'Claude AI usage limit reached|1791300000',
      }),
      1,
      10,
    );
    expect(run).toEqual(
      expect.objectContaining({ ok: false, usageLimited: true }),
    );
  });

  it('treats output that is not JSON as a failure', () => {
    expect(parseClaudeResult('Invalid API key', 1, 10)).toEqual(
      expect.objectContaining({
        ok: false,
        usageLimited: false,
        result: 'Invalid API key',
      }),
    );
  });
});

describe('ClaudeCodeAgent', () => {
  it('runs again once when Claude Code printed nothing, recording how it ended', async () => {
    const { mkdtemp, rm, writeFile, chmod } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { ClaudeCodeAgent } = await import('./agent');
    const dir = await mkdtemp(join(tmpdir(), 'agent-eval-'));
    const binary = join(dir, 'claude');
    // Silent and failing the first time, a normal result the second.
    await writeFile(
      binary,
      `#!/bin/sh\nif [ -f "${dir}/ran" ]; then echo '{"is_error":false,"num_turns":3,"result":"Done."}'; else touch "${dir}/ran"; exit 1; fi\n`,
    );
    await chmod(binary, 0o755);
    const agent = new ClaudeCodeAgent({
      binary,
      model: 'claude-sonnet-5',
      mcpConfig: join(dir, 'mcp.json'),
      timeoutMs: 10_000,
      env: process.env,
    });
    const run = await agent.run('Hi', dir);
    expect(run).toEqual(
      expect.objectContaining({
        ok: true,
        turns: 3,
        result: 'Done.',
        exit: 'exit 0',
      }),
    );
    expect(run.transcript).toMatch(
      /^First attempt printed nothing \(exit 1\)\./,
    );
    await rm(dir, { recursive: true, force: true });
  });
});
