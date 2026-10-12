import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  fakeInstaller,
  runNdop,
  testEnvironment,
} from '../../testing/environment';
import { nodeFs } from '../project/fs';
import { projectFormatter } from '../project/format';

// Inside the workspace, so the fixture finds Prettier in its node_modules
// as a real app finds its own.
const scratch = join(import.meta.dirname, '../../../../../tmp');
const fixtures = join(import.meta.dirname, '../../../fixtures');
let root: string;

beforeEach(async () => {
  await mkdir(scratch, { recursive: true });
  root = await mkdtemp(join(scratch, 'ndop-disk-spec-'));
  await cp(join(fixtures, 'ng22'), root, { recursive: true });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
  process.exitCode = undefined;
});

// Real installs on disk, formatted by the real Prettier: about ten seconds
// alone, and three times that beside the rest of the suite.
vi.setConfig({ testTimeout: 90_000 });

describe('init and add on disk, with the project Prettier', () => {
  it('formats what it writes, and re-running add changes nothing', async () => {
    const base = testEnvironment({});
    const environment = {
      ...base,
      fs: nodeFs,
      formatter: projectFormatter,
      installer: (path: string) => fakeInstaller(nodeFs(path), base.installs),
    };
    await runNdop(environment, 'init', '--cwd', root, '--yes');
    await runNdop(environment, 'add', 'dialog-demo', '--cwd', root, '--yes');

    const appConfig = await readFile(
      join(root, 'src/app/app.config.ts'),
      'utf-8',
    );
    expect(appConfig).toContain('    provideIcons(),\n  ],\n};');

    const { out } = await runNdop(
      environment,
      'add',
      'dialog-demo',
      '--cwd',
      root,
      '--yes',
      '--json',
    );
    expect(JSON.parse(out)).toEqual(
      expect.objectContaining({ ok: true, applied: false, files: [] }),
    );
    const { out: again } = await runNdop(
      environment,
      'init',
      '--cwd',
      root,
      '--json',
    );
    expect(JSON.parse(again).files).toEqual([]);
  });
});

describe('doctor on disk, with the project Prettier', () => {
  it('adds a provider formatted as init writes it, and a rerun changes nothing', async () => {
    const base = testEnvironment({});
    const environment = {
      ...base,
      fs: nodeFs,
      formatter: projectFormatter,
      installer: (path: string) => fakeInstaller(nodeFs(path), base.installs),
    };
    await runNdop(environment, 'init', '--cwd', root, '--yes');
    const path = join(root, 'src/app/app.config.ts');
    const appConfig = await readFile(path, 'utf-8');
    await writeFile(path, appConfig.replace(/\n\s*provideNdop\(\),/, ''));

    const { out: broken } = await runNdop(
      environment,
      'doctor',
      '--cwd',
      root,
      '--offline',
      '--json',
    );
    expect(JSON.parse(broken).ok).toBe(false);

    await runNdop(environment, 'doctor', '--cwd', root, '--fix', '--yes');
    expect(await readFile(path, 'utf-8')).toBe(
      appConfig.replace(
        'provideNdop(),\n    provideIcons(),',
        'provideIcons(),\n    provideNdop(),',
      ),
    );
    const { out } = await runNdop(
      environment,
      'doctor',
      '--cwd',
      root,
      '--fix',
      '--yes',
      '--json',
    );
    expect(JSON.parse(out)).toEqual(
      expect.objectContaining({
        ok: true,
        fix: expect.objectContaining({ applied: false, files: [] }),
      }),
    );
  });
});
