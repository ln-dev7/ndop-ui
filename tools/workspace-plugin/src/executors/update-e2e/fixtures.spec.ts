import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compareVersions, readCases, writeScenarioRegistry } from './fixtures';

describe('update fixtures', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ndop-fixtures-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  /**
   * Writes a file under the temporary root.
   *
   * @param path - Relative path.
   * @param content - Text.
   */
  async function put(path: string, content: string): Promise<void> {
    await mkdir(join(root, path, '..'), { recursive: true });
    await writeFile(join(root, path), content);
  }

  it('builds every version of a scenario item, the newest as latest', async () => {
    await put(
      'fixtures/a/scenario.json',
      JSON.stringify({
        description: 'A lib.',
        items: [
          {
            name: 'lib-a',
            type: 'registry:lib',
            title: 'A',
            description: 'A lib.',
            files: [
              { path: 'lib/a.ts', type: 'registry:lib', target: '{lib}/a.ts' },
            ],
            versions: { '1.10.0': {}, '1.2.0': { dependencies: ['clsx'] } },
          },
        ],
      }),
    );
    await put('fixtures/a/versions/1.2.0/lib/a.ts', 'old\n');
    await put('fixtures/a/versions/1.10.0/lib/a.ts', 'new\n');
    await writeScenarioRegistry(
      join(import.meta.dirname, '../../../../..'),
      join(root, 'fixtures/a'),
      join(root, 'out'),
    );
    const latest = JSON.parse(
      await readFile(join(root, 'out/lib-a.json'), 'utf-8'),
    );
    expect(latest).toEqual(
      expect.objectContaining({
        version: '1.10.0',
        files: [expect.objectContaining({ content: 'new\n' })],
      }),
    );
    const old = JSON.parse(
      await readFile(join(root, 'out/lib-a@1.2.0.json'), 'utf-8'),
    );
    expect(old.dependencies).toEqual(['clsx']);
    // ndop init's items come from the committed snapshots.
    expect(
      JSON.parse(await readFile(join(root, 'out/default.json'), 'utf-8')).name,
    ).toBe('default');
  });

  it('reads cases by scenario and filters them by id', async () => {
    const data = {
      description: 'x',
      kind: 'merge',
      item: 'a',
      from: '1.0.0',
      to: '1.1.0',
    };
    await put('fixtures/a/cases/01-one/case.json', JSON.stringify(data));
    await put('fixtures/b/cases/02-two/case.json', JSON.stringify(data));
    expect(
      (await readCases(join(root, 'fixtures'))).map(({ id }) => id),
    ).toEqual(['a/01-one', 'b/02-two']);
    expect(
      (await readCases(join(root, 'fixtures'), ['b/'])).map(({ id }) => id),
    ).toEqual(['b/02-two']);
  });

  it('orders versions numerically', () => {
    expect(['1.10.0', '1.2.0', '1.9.1'].sort(compareVersions)).toEqual([
      '1.2.0',
      '1.9.1',
      '1.10.0',
    ]);
  });
});
