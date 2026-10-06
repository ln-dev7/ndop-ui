import type { ExecutorContext } from '@nx/devkit';
import executor, { promptIds } from './agent-eval';

const context = { root: '/workspace' } as ExecutorContext;

describe('agent-eval executor', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('refuses to run with an API key set', async () => {
    process.env['ANTHROPIC_API_KEY'] = 'sk-test';
    process.env['CLAUDE_CODE_OAUTH_TOKEN'] = 'token';
    expect(await executor({}, context)).toEqual({ success: false });
  });

  it('needs a subscription token', async () => {
    delete process.env['ANTHROPIC_API_KEY'];
    delete process.env['CLAUDE_CODE_OAUTH_TOKEN'];
    expect(await executor({}, context)).toEqual({ success: false });
  });
});

describe('promptIds', () => {
  it('reads ids however Nx passes them', () => {
    expect(promptIds(undefined)).toEqual([]);
    expect(promptIds('1, 7')).toEqual([1, 7]);
    expect(promptIds(7)).toEqual([7]);
    expect(promptIds([2, 3])).toEqual([2, 3]);
  });
});
