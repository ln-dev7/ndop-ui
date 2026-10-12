import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  missingTokenProblems,
  sampleLockProblems,
  serveWithToken,
  withCliVersion,
  withSampleRegistry,
} from './registries';
import { caseId } from './scenario';

const workspace = join(import.meta.dirname, '../../../../..');

/**
 * Reads a workspace JSON file.
 *
 * @param path - Workspace-relative path.
 * @returns The parsed file.
 */
async function json<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(join(workspace, path), 'utf-8')) as T;
}

describe('serveWithToken', () => {
  let folder: string;

  beforeEach(async () => {
    folder = await mkdtemp(join(tmpdir(), 'registries-spec-'));
    await mkdir(join(folder, 'r'));
    await writeFile(join(folder, 'r/widget.json'), '{"name":"widget"}');
  });

  afterEach(async () => {
    await rm(folder, { recursive: true, force: true });
  });

  it('serves items only with the bearer token', async () => {
    const server = await serveWithToken(folder, 's3cret');
    try {
      const get = (path: string, token?: string) =>
        fetch(`${server.url}${path}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
      expect((await get('/r/widget.json')).status).toBe(401);
      expect((await get('/r/widget.json', 'wrong')).status).toBe(401);
      const ok = await get('/r/widget.json', 's3cret');
      expect(ok.status).toBe(200);
      expect(await ok.json()).toEqual({ name: 'widget' });
      expect((await get('/r/missing.json', 's3cret')).status).toBe(404);
      expect((await get('/r/../../etc/passwd', 's3cret')).status).toBe(404);
    } finally {
      await server.close();
    }
  });
});

describe('the registries case', () => {
  it('is named after the case, with -registries', () => {
    expect(
      caseId({ packageManager: 'npm', angular: '22.2.1', registries: true }),
    ).toBe('npm-ng22-registries');
  });

  it('adds @sample to ndop.json with a header read from SAMPLE_TOKEN', () => {
    const config = withSampleRegistry(
      '{ "style": "default", "registries": { "@acme": "https://acme.dev/{name}.json" } }',
      'http://localhost:4000',
    );
    expect(JSON.parse(config).registries).toEqual({
      '@acme': 'https://acme.dev/{name}.json',
      '@sample': {
        url: 'http://localhost:4000/r/{name}.json',
        headers: { Authorization: 'Bearer ${SAMPLE_TOKEN}' },
      },
    });
  });

  it('points the template at the CLI under test', () => {
    const manifest = withCliVersion(
      '{ "devDependencies": { "@ndop/cli": "0.0.1", "@ndop/core": "0.0.1", "typescript": "6.0.3" } }',
      '0.0.0-e2e.1',
    );
    expect(JSON.parse(manifest).devDependencies).toEqual({
      '@ndop/cli': '0.0.0-e2e.1',
      '@ndop/core': '0.0.0-e2e.1',
      typescript: '6.0.3',
    });
    expect(() => withCliVersion('{}', '1.0.0')).toThrow(
      "The registry template doesn't depend on @ndop/cli.",
    );
  });

  it('checks the lockfile records the widget and the button by registry', () => {
    expect(
      sampleLockProblems(
        {
          items: {
            '@sample/widget': { registry: '@sample', version: '0.1.0' },
            '@ndop/button': { registry: '@ndop', version: '0.1.3' },
          },
        },
        '0.1.0',
      ),
    ).toEqual([]);
    expect(sampleLockProblems({ items: {} }, '0.1.0')).toEqual([
      "the lockfile doesn't record @sample/widget 0.1.0: undefined",
      "the lockfile doesn't record @ndop/button",
    ]);
  });

  it('expects a missing token to fail naming the variable', () => {
    const failed = JSON.stringify({
      ok: false,
      errors: [
        {
          message:
            'Registry @sample needs the SAMPLE_TOKEN environment variable.',
        },
      ],
    });
    expect(missingTokenProblems(`Progress…\n${failed}`)).toEqual([]);
    expect(
      missingTokenProblems(JSON.stringify({ ok: false, errors: [] })),
    ).toHaveLength(1);
  });
});

describe('tools/registry-template', () => {
  it('builds with the Ndop packages and Angular this workspace releases with', async () => {
    const template = await json<{
      private?: boolean;
      devDependencies: Record<string, string>;
    }>('tools/registry-template/package.json');

    const root = await json<{
      dependencies: Record<string, string>;
      devDependencies: Record<string, string>;
    }>('package.json');
    const pinned = { ...root.dependencies, ...root.devDependencies };

    expect(template.private).toBe(true);
    expect(template.devDependencies['@ndop/cli']).toBeDefined();
    for (const [name, version] of Object.entries(template.devDependencies)) {
      // Ndop's own packages are released from packages/<name>.
      const expected = name.startsWith('@ndop/')
        ? (
            await json<{ version: string }>(
              `packages/${name.slice('@ndop/'.length)}/package.json`,
            )
          ).version
        : pinned[name];
      expect(`${name}@${version}`).toBe(`${name}@${expected}`);
    }
  });

  it("has a widget that depends on Ndop's button", async () => {
    const registry = await json<{
      items: { name: string; registryDependencies?: string[] }[];
    }>('tools/registry-template/registry.json');
    expect(registry.items.map((item) => item.name)).toEqual(['widget']);
    expect(registry.items[0]?.registryDependencies).toEqual(['@ndop/button']);
  });
});
