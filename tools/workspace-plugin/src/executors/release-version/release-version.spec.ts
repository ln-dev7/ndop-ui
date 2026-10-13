import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ExecutorContext } from '@nx/devkit';
import { runInherited } from '../../utils/processes';
import executor from './release-version';

vi.mock('../../utils/processes', () => ({ runInherited: vi.fn() }));

/**
 * Makes the mocked command exit with a code, after running `effect` as the
 * command would.
 *
 * @param code - Exit code.
 * @param effect - What the command does to the files.
 */
function commandExits(
  code: number,
  effect: () => Promise<void> = async () => undefined,
): void {
  vi.mocked(runInherited).mockImplementation(async () => {
    await effect();
    return code;
  });
}

describe('release-version executor', () => {
  let root: string;
  let context: ExecutorContext;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'release-version-'));
    await mkdir(join(root, 'packages/cli'), { recursive: true });
    await mkdir(join(root, 'tools/registry-template'), { recursive: true });
    await writeFile(
      join(root, 'packages/cli/package.json'),
      '{ "name": "@ndop/cli", "version": "0.0.1" }\n',
    );
    await writeFile(
      join(root, 'tools/registry-template/package.json'),
      `${JSON.stringify(
        {
          name: 'registry-template',
          devDependencies: {
            '@angular/core': '22.2.1',
            '@ndop/cli': '0.0.1',
            '@ndop/core': '0.0.1',
          },
        },
        null,
        2,
      )}\n`,
    );
    context = {
      root,
      cwd: root,
      isVerbose: false,
      projectGraph: { nodes: {}, dependencies: {} },
      projectsConfigurations: { version: 2, projects: {} },
      nxJsonConfiguration: {},
    };
  });

  afterEach(() => rm(root, { recursive: true, force: true }));

  it("runs changeset version, then pins the template's @ndop/* to the new version", async () => {
    commandExits(0, () =>
      writeFile(
        join(root, 'packages/cli/package.json'),
        '{ "name": "@ndop/cli", "version": "1.0.0" }\n',
      ),
    );

    expect((await executor({}, context)).success).toBe(true);
    expect(runInherited).toHaveBeenCalledWith(
      'pnpm',
      ['exec', 'changeset', 'version'],
      root,
    );
    const template = JSON.parse(
      await readFile(
        join(root, 'tools/registry-template/package.json'),
        'utf-8',
      ),
    );
    expect(template.devDependencies).toEqual({
      '@angular/core': '22.2.1',
      '@ndop/cli': '1.0.0',
      '@ndop/core': '1.0.0',
    });
  });

  it('fails without touching the template when changeset version fails', async () => {
    commandExits(1);
    const before = await readFile(
      join(root, 'tools/registry-template/package.json'),
      'utf-8',
    );

    expect((await executor({}, context)).success).toBe(false);
    expect(
      await readFile(
        join(root, 'tools/registry-template/package.json'),
        'utf-8',
      ),
    ).toBe(before);
  });
});
