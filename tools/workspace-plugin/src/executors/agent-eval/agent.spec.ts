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
