import type { ExecutorContext } from '@nx/devkit';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import executor from './serve-site';

describe('serve-site executor', () => {
  it('serves the folder until it is stopped', async () => {
    const root = await mkdtemp(join(tmpdir(), 'serve-site-executor-'));
    await writeFile(join(root, 'index.html'), '<h1>Home</h1>');
    // Captures the executor's signal handlers instead of sending a real
    // signal to the test process.
    const handlers: (() => void)[] = [];
    vi.spyOn(process, 'once').mockImplementation(((
      _event: string,
      handler: () => void,
    ) => {
      handlers.push(handler);
      return process;
    }) as typeof process.once);
    const running = executor({ dir: '.', port: 4499 }, {
      root,
    } as ExecutorContext);
    await expect
      .poll(() =>
        fetch('http://localhost:4499/')
          .then((r) => r.status)
          .catch(() => 0),
      )
      .toBe(200);
    handlers[0]?.();
    expect(await running).toEqual({ success: true });
    await rm(root, { recursive: true, force: true });
  });
});
