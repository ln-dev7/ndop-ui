import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  caseId,
  changedPaths,
  execCommand,
  hashTree,
  lastJsonObject,
  run,
  runScriptCommand,
} from './scenario';
import { serveFolder } from './static-server';

let folder: string;

beforeEach(async () => {
  folder = await mkdtemp(join(tmpdir(), 'registry-e2e-spec-'));
});

afterEach(async () => {
  await rm(folder, { recursive: true, force: true });
});

describe('commands', () => {
  it('names cases by package manager and Angular major', () => {
    expect(caseId({ packageManager: 'pnpm', angular: '21.2.24' })).toBe(
      'pnpm-ng21',
    );
  });

  it('runs bins the way each package manager does', () => {
    expect(execCommand('npm', 'ndop@1.0.0', ['init'])).toEqual([
      'npx',
      ['--yes', 'ndop@1.0.0', 'init'],
    ]);
    expect(execCommand('pnpm', 'ndop@1.0.0', ['init'])).toEqual([
      'pnpm',
      ['dlx', 'ndop@1.0.0', 'init'],
    ]);
    expect(execCommand('bun', 'ndop@1.0.0', ['init'])).toEqual([
      'bunx',
      ['ndop@1.0.0', 'init'],
    ]);
    expect(runScriptCommand('bun', 'build')).toEqual(['bun', ['run', 'build']]);
  });
});

describe('lastJsonObject', () => {
  it('skips progress printed before the JSON', () => {
    expect(lastJsonObject('Packages: +12\n{\n  "ok": true\n}\n')).toEqual({
      ok: true,
    });
  });

  it('fails without JSON', () => {
    expect(() => lastJsonObject('nothing')).toThrow('No JSON in the output');
  });
});

describe('hashTree', () => {
  it('hashes project files but not installed or built output', async () => {
    await mkdir(join(folder, 'src'));
    await mkdir(join(folder, 'node_modules'));
    await writeFile(join(folder, 'src/a.ts'), 'a');
    await writeFile(join(folder, 'node_modules/b.js'), 'b');
    const before = await hashTree(folder);
    expect([...before.keys()]).toEqual(['src/a.ts']);

    await writeFile(join(folder, 'src/a.ts'), 'changed');
    await writeFile(join(folder, 'src/c.ts'), 'c');
    expect(changedPaths(before, await hashTree(folder))).toEqual([
      'src/a.ts',
      'src/c.ts',
    ]);
  });
});

describe('run', () => {
  it('returns standard output and logs both streams', async () => {
    const log = join(folder, 'log.txt');
    const options = { cwd: folder, env: process.env, log };
    const script = "process.stdout.write('out'); process.stderr.write('err')";
    expect(await run([process.execPath, ['-e', script]], options)).toBe('out');
    await expect(
      run(
        [process.execPath, ['-e', "console.error('boom'); process.exit(3)"]],
        options,
      ),
    ).rejects.toThrow(/exited with 3:\nboom/);
  });
});

describe('serveFolder', () => {
  it('serves files inside the folder only', async () => {
    await mkdir(join(folder, 'r'));
    await writeFile(join(folder, 'r/dialog.json'), '{"name":"dialog"}');
    const server = await serveFolder(folder);
    try {
      const response = await fetch(`${server.url}/r/dialog.json`);
      expect(response.headers.get('content-type')).toBe('application/json');
      expect(await response.json()).toEqual({ name: 'dialog' });
      expect((await fetch(`${server.url}/r/missing.json`)).status).toBe(404);
      expect((await fetch(`${server.url}/..%2f..%2fetc%2fpasswd`)).status).toBe(
        403,
      );
    } finally {
      await server.close();
    }
  });
});
