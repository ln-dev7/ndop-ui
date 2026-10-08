import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gitDirtyFiles } from './git';

describe('gitDirtyFiles', () => {
  let repo: string;
  const git = (...args: string[]) =>
    execFileSync('git', args, { cwd: repo, stdio: 'pipe' });

  beforeEach(async () => {
    repo = await mkdtemp(join(tmpdir(), 'ndop-git-'));
  });

  afterEach(async () => {
    await rm(repo, { recursive: true, force: true });
  });

  it('is undefined outside a repository', async () => {
    expect(await gitDirtyFiles(repo, ['a.ts'])).toBeUndefined();
  });

  it('lists changed and untracked files, relative to a project in a subfolder', async () => {
    const app = join(repo, 'apps/web');
    await mkdir(join(app, 'src'), { recursive: true });
    await writeFile(join(app, 'src/clean.ts'), 'a\n');
    await writeFile(join(app, 'src/changed.ts'), 'a\n');
    git('init', '--quiet');
    git('add', '.');
    git(
      '-c',
      'user.name=Test',
      '-c',
      'user.email=test@example.com',
      '-c',
      'commit.gpgsign=false',
      'commit',
      '--quiet',
      '-m',
      'start',
    );
    await writeFile(join(app, 'src/changed.ts'), 'b\n');
    await writeFile(join(app, 'src/untracked.ts'), 'c\n');

    expect(
      await gitDirtyFiles(app, [
        'src/clean.ts',
        'src/changed.ts',
        'src/untracked.ts',
        'src/new.ts',
      ]),
    ).toEqual(['src/changed.ts', 'src/untracked.ts']);
  });
});
