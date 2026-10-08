import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nodeFs } from './fs';

describe('nodeFs', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'ndop-fs-'));
    for (const path of [
      'src/a.ts',
      'src/app/b.html',
      'src/node_modules/x.ts',
      'src/.cache/y.ts',
    ]) {
      await mkdir(join(root, path, '..'), { recursive: true });
      await writeFile(join(root, path), '');
    }
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('lists files with POSIX paths, skipping node_modules and dot-folders', async () => {
    expect(await nodeFs(root).list('src')).toEqual([
      'src/a.ts',
      'src/app/b.html',
    ]);
    expect(await nodeFs(root).list('nowhere')).toEqual([]);
  });

  it('removes files, and ignores ones already gone', async () => {
    const fs = nodeFs(root);
    await fs.remove('src/a.ts');
    await fs.remove('src/a.ts');
    expect(await fs.read('src/a.ts')).toBeUndefined();
  });
});
