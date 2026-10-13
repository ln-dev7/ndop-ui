import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fixedGroup, releasePackages } from './release-packages';

describe('fixedGroup', () => {
  it('reads the single fixed group', () => {
    expect(fixedGroup('{ "fixed": [["@ndop/core", "@ndop/cli"]] }')).toEqual([
      '@ndop/core',
      '@ndop/cli',
    ]);
    expect(() => fixedGroup('{ "fixed": [] }')).toThrow('exactly one');
    expect(() => fixedGroup('{ "fixed": [["a"], ["b"]] }')).toThrow(
      'exactly one',
    );
  });
});

describe('releasePackages', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'release-packages-'));
    await mkdir(join(root, '.changeset'));
    await writeFile(
      join(root, '.changeset/config.json'),
      '{ "fixed": [["@ndop/core", "@ndop/cli"]] }',
    );
    for (const [folder, name] of [
      ['cli', '@ndop/cli'],
      ['core', '@ndop/core'],
      ['other', '@ndop/other'],
    ] as const) {
      await mkdir(join(root, 'packages', folder), { recursive: true });
      await writeFile(
        join(root, 'packages', folder, 'package.json'),
        JSON.stringify({ name }),
      );
    }
  });

  afterEach(() => rm(root, { recursive: true, force: true }));

  it("finds the group's packages, in the group's order", async () => {
    expect(
      (await releasePackages(root)).map(({ name, dir }) => [name, dir]),
    ).toEqual([
      ['@ndop/core', 'packages/core'],
      ['@ndop/cli', 'packages/cli'],
    ]);
  });

  it('fails when a package of the group is missing', async () => {
    await writeFile(
      join(root, '.changeset/config.json'),
      '{ "fixed": [["@ndop/gone"]] }',
    );
    await expect(releasePackages(root)).rejects.toThrow(
      'No package named @ndop/gone',
    );
  });
});
