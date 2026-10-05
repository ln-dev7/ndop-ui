import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { catalogFor } from './project';

let root: string;
let requested: string[];
const fetcher = async (location: string) => {
  requested.push(location);
  return JSON.stringify({ name: 'x', homepage: 'https://x.test', items: [] });
};

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'ndop-mcp-'));
  requested = [];
});

afterEach(() => rm(root, { recursive: true, force: true }));

/**
 * Where a catalog in a folder fetches its index from.
 *
 * @param options - Folder, override and environment.
 * @returns The index's location.
 */
async function indexLocation(options: {
  cwd: string;
  registry?: string;
  env?: Record<string, string | undefined>;
}): Promise<string | undefined> {
  const catalog = await catalogFor({ env: {}, ...options, fetcher });
  await catalog.index();
  return requested[0];
}

describe('catalogFor', () => {
  it('uses ndop.dev outside a project', async () => {
    expect(await indexLocation({ cwd: root })).toBe(
      'https://ndop.dev/r/index.json',
    );
  });

  it("uses the nearest ndop.json's registry, from a subfolder", async () => {
    await writeFile(
      join(root, 'ndop.json'),
      JSON.stringify({ registry: 'https://acme.test/r/{name}.json' }),
    );
    await mkdir(join(root, 'src/app'), { recursive: true });
    expect(await indexLocation({ cwd: join(root, 'src/app') })).toBe(
      'https://acme.test/r/index.json',
    );
  });

  it('lets NDOP_REGISTRY and then --registry win', async () => {
    await writeFile(
      join(root, 'ndop.json'),
      JSON.stringify({ registry: 'https://acme.test/r/{name}.json' }),
    );
    const env = { NDOP_REGISTRY: 'https://env.test/r/{name}.json' };
    expect(await indexLocation({ cwd: root, env })).toBe(
      'https://env.test/r/index.json',
    );
    requested = [];
    expect(
      await indexLocation({
        cwd: root,
        env,
        registry: 'https://flag.test/r/{name}.json',
      }),
    ).toBe('https://flag.test/r/index.json');
  });
});
