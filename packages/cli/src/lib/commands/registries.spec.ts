import { createHash } from 'node:crypto';
import type { RegistryItem } from '@ndop/schema';
import { fixture, runNdop, testEnvironment } from '../../testing/environment';
import type { DoctorResult } from './doctor';

type Environment = ReturnType<typeof testEnvironment>;

const TEMPLATE = 'https://sample.example/r/{name}.json';
const WIDGET = 'src/app/ui/widget/widget.ts';
const V1 = "// A sample widget.\n\nexport const widget = 'v1';\n";
const V2 = "// A sample widget.\n\nexport const widget = 'v2';\n";

/**
 * The sample registry's widget: one file, and Ndop's button as a
 * dependency, as `tools/registry-template` has it (ADR-0025).
 *
 * @param version - Its version.
 * @param content - Its file.
 * @returns The item.
 */
function widget(version: string, content: string): RegistryItem {
  return {
    name: 'widget',
    type: 'registry:ui',
    version,
    title: 'Widget',
    description: 'A sample widget.',
    registryDependencies: ['@ndop/button'],
    angular: {
      minVersion: '21.0.0',
      exports: ['widget'],
      zoneless: true,
      ssr: true,
    },
    files: [
      {
        path: 'ui/widget/widget.ts',
        type: 'registry:ui',
        target: '{ui}/widget/widget.ts',
        content,
      },
    ],
  };
}

/**
 * A set-up project whose `ndop.json` declares `@sample` as a private
 * registry, with every request's headers recorded.
 *
 * @param env - Environment variables, such as the token.
 * @returns The environment and the requests made.
 */
async function sampleProject(env: Record<string, string | undefined>) {
  const environment = testEnvironment(fixture('ng22'), { env });
  await runNdop(environment, 'init', '--yes');
  const config = JSON.parse(environment.project.files.get('ndop.json') ?? '');
  config.registries = {
    '@sample': {
      url: TEMPLATE,
      headers: { Authorization: 'Bearer ${SAMPLE_TOKEN}' },
    },
  };
  environment.project.files.set('ndop.json', JSON.stringify(config, null, 2));
  environment.urls[TEMPLATE.replace('{name}', 'widget')] = widget('1.0.0', V1);
  const requests: { location: string; headers: Record<string, string> }[] = [];
  const fetcher = environment.fetcher;
  environment.fetcher = (root) => {
    const fetch = fetcher(root);
    return (location, headers) => {
      requests.push({ location, headers });
      return fetch(location, headers);
    };
  };
  return { environment, requests };
}

/**
 * Runs a command with `--json` and parses the result.
 *
 * @param environment - Test environment.
 * @param args - Command, items and options.
 * @returns The JSON result.
 */
async function json(environment: Environment, ...args: string[]) {
  const { out } = await runNdop(environment, ...args, '--json');
  return JSON.parse(out);
}

/**
 * SHA-256 of a text, as the lockfile records it.
 *
 * @param text - The text.
 * @returns Hex digest.
 */
function hash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

describe('namespaced and private registries', () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  it("installs @sample/widget with the token, and Ndop's button from Ndop's registry", async () => {
    const { environment, requests } = await sampleProject({
      SAMPLE_TOKEN: 's3cret',
    });
    const result = await json(environment, 'add', '--yes', '@sample/widget');

    expect(result.errors).toEqual([]);
    expect(
      result.items.map(
        (item: { registry: string; name: string }) =>
          `${item.registry}/${item.name}`,
      ),
    ).toEqual(['@ndop/utils', '@ndop/button', '@sample/widget']);
    expect(environment.project.files.get(WIDGET)).toBe(V1);
    expect(environment.project.files.has('src/app/ui/button/button.ts')).toBe(
      true,
    );
    expect(
      requests.find(({ location }) => location.includes('sample.example'))
        ?.headers,
    ).toEqual({ Authorization: 'Bearer s3cret' });
    expect(
      requests.find(({ location }) => location === 'mem://button')?.headers,
    ).toEqual({});

    const lock = JSON.parse(
      environment.project.files.get('ndop.lock.json') ?? '',
    );
    expect(lock.items['@sample/widget']).toEqual({
      name: 'widget',
      registry: '@sample',
      version: '1.0.0',
      files: [{ path: WIDGET, sha256: hash(V1) }],
    });
    expect(lock.items['@ndop/button'].registry).toBe('@ndop');

    const again = await json(environment, 'add', '--yes', '@sample/widget');
    expect(again).toEqual(
      expect.objectContaining({ ok: true, files: [], dependencies: [] }),
    );
  });

  it('diffs, updates and checks a namespaced item against its own registry', async () => {
    const { environment } = await sampleProject({ SAMPLE_TOKEN: 's3cret' });
    await runNdop(environment, 'add', '--yes', '@sample/widget');
    environment.project.files.set(WIDGET, `// Mine.\n${V1}`);
    environment.urls[TEMPLATE.replace('{name}', 'widget')] = widget(
      '1.1.0',
      V2,
    );
    // As `ndop build` publishes it: the latest, and every version apart.
    environment.urls[TEMPLATE.replace('{name}', 'widget@1.1.0')] = widget(
      '1.1.0',
      V2,
    );
    environment.urls[TEMPLATE.replace('{name}', 'widget@1.0.0')] = widget(
      '1.0.0',
      V1,
    );

    const doctor = (await json(environment, 'doctor')) as DoctorResult;
    expect(
      doctor.checks.find((check) => check.id === 'lockfile')?.details,
    ).toContain("@sample/widget 1.0.0 is behind the registry's 1.1.0.");

    const [item] = (await json(environment, 'diff', '@sample/widget')).items;
    expect(item.files[0]).toEqual(
      expect.objectContaining({ local: 'edited', upstream: 'changed' }),
    );

    const updated = await json(
      environment,
      'update',
      '--yes',
      '@sample/widget',
    );
    expect(updated.updates).toEqual([
      expect.objectContaining({
        registry: '@sample',
        name: 'widget',
        from: '1.0.0',
        to: '1.1.0',
        files: [{ path: WIDGET, status: 'merged' }],
      }),
    ]);
    expect(environment.project.files.get(WIDGET)).toBe(`// Mine.\n${V2}`);
  });

  it('names the missing token, and keeps the other registries working', async () => {
    const { environment } = await sampleProject({});
    const failed = await json(environment, 'add', '--yes', '@sample/widget');
    expect(failed.errors[0].message).toBe(
      'Registry @sample needs the SAMPLE_TOKEN environment variable.',
    );
    expect(environment.project.files.has(WIDGET)).toBe(false);

    expect((await json(environment, 'add', '--yes', 'button')).ok).toBe(true);
  });
});
