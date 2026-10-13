import { runNdop } from '../../testing/environment';
import {
  ACME_URL,
  registryEnvironment as fixtureEnvironment,
} from '../../testing/registry';

/**
 * The fixture registries' environment, in a terminal 80 columns wide.
 *
 * @param args - Project files and options.
 * @returns The environment.
 */
function registryEnvironment(
  ...args: Parameters<typeof fixtureEnvironment>
): ReturnType<typeof fixtureEnvironment> {
  return { ...fixtureEnvironment(...args), columns: 80 };
}

/**
 * A project that installs from the fixture registries, Ndop's and
 * `@acme`'s, with an old Button, Utils and Acme's data table installed.
 *
 * @param registries - `registries` in `ndop.json`.
 * @returns Its files.
 */
function project(
  registries: Record<string, unknown> = { '@acme': ACME_URL },
): Record<string, string> {
  const locked = (registry: string, name: string, version: string) => ({
    [`${registry}/${name}`]: {
      name,
      registry,
      version,
      files: [{ path: `src/app/ui/${name}.ts`, sha256: 'a'.repeat(64) }],
    },
  });
  return {
    'ndop.json': JSON.stringify({
      style: 'default',
      tailwind: { css: 'src/styles.css' },
      aliases: {
        ui: 'src/app/ui',
        lib: 'src/app/lib',
        blocks: 'src/app/blocks',
      },
      registries,
    }),
    'ndop.lock.json': JSON.stringify({
      lockfileVersion: 1,
      items: {
        ...locked('@ndop', 'button', '0.1.0'),
        ...locked('@ndop', 'utils', '1.0.0'),
        ...locked('@acme', 'data-table', '2.1.0'),
      },
    }),
  };
}

/**
 * Runs `ndop list --json` and parses the result.
 *
 * @param environment - Test environment.
 * @param args - Words and options.
 * @returns The JSON result.
 */
async function list(
  environment: ReturnType<typeof registryEnvironment>,
  ...args: string[]
) {
  const { out } = await runNdop(environment, 'list', '--json', ...args);
  return JSON.parse(out);
}

describe('ndop list', () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  it("lists the default registry's items outside a project, without examples", async () => {
    const { out } = await runNdop(registryEnvironment(), 'list');
    expect(out).toMatchSnapshot();
    expect(process.exitCode).toBeUndefined();
  });

  it('prints a stable JSON result', async () => {
    const result = await list(registryEnvironment());
    expect(result).toMatchSnapshot();
  });

  it('adds the registries in ndop.json and what is installed', async () => {
    const environment = registryEnvironment(project());
    const { out } = await runNdop(environment, 'list');
    expect(out).toMatchSnapshot();

    const result = await list(environment, '--type', 'ui');
    expect(
      result.items.map(
        (item: { registry: string; name: string; installed?: string }) => [
          `${item.registry}/${item.name}`,
          item.installed,
        ],
      ),
    ).toEqual([
      ['@ndop/button', '0.1.0'],
      ['@ndop/dialog', undefined],
      ['@acme/data-table', '2.1.0'],
    ]);
  });

  it('filters by type, short or full', async () => {
    const environment = registryEnvironment();
    for (const type of ['block', 'registry:block']) {
      const result = await list(environment, '--type', type);
      expect(result.items.map((item: { name: string }) => item.name)).toEqual([
        'login-01',
      ]);
    }
    const examples = await list(environment, '--type', 'example');
    expect(examples.items.map((item: { name: string }) => item.name)).toEqual([
      'button-demo',
      'button-link',
    ]);
  });

  it('filters by words in the name, description or categories', async () => {
    const environment = registryEnvironment();
    const names = async (...words: string[]) =>
      (await list(environment, ...words)).items.map(
        (item: { name: string }) => item.name,
      );
    expect(await names('BUTTON')).toEqual(['button']);
    expect(await names('auth')).toEqual(['login-01']);
    expect(await names('window', 'page')).toEqual(['dialog']);

    const { out } = await runNdop(environment, 'list', 'nothing');
    expect(out).toContain('No items match "nothing".');
  });

  it('cuts descriptions to the terminal', async () => {
    const environment = { ...registryEnvironment(), columns: 40 };
    const { out } = await runNdop(environment, 'list', '--type', 'ui');
    expect(out).toContain('  button  1.0.0  Displays a button or a…');
    const unknown = { ...registryEnvironment(), columns: undefined };
    expect((await runNdop(unknown, 'list', '--type', 'ui')).out).toContain(
      '  button  1.0.0  Displays a button or a component that looks like a button.',
    );
  });

  it("warns about a registry it can't read, and lists the others", async () => {
    const environment = registryEnvironment(
      project({
        '@acme': ACME_URL,
        '@private': {
          url: 'https://private.test/r/{name}.json',
          headers: { Authorization: 'Bearer ${PRIVATE_TOKEN}' },
        },
      }),
    );
    const result = await list(environment);
    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual([
      '@private: Registry @private needs the PRIVATE_TOKEN environment variable.',
    ]);
    expect(result.items).toContainEqual(
      expect.objectContaining({ registry: '@acme', name: 'data-table' }),
    );
  });

  it('fails when the default registry or the type is wrong', async () => {
    const environment = registryEnvironment();
    const wrongType = await runNdop(environment, 'list', '--type', 'widget');
    expect(wrongType.err).toBe(
      '✗ "widget" isn\'t an item type. Use one of: ui, block, theme, lib, style, file, example.\n',
    );
    expect(process.exitCode).toBe(1);

    const missing = await list(environment, '--registry', 'mem://none/{name}');
    expect(missing).toEqual({
      ok: false,
      command: 'list',
      items: [],
      warnings: [],
      errors: [{ message: 'mem://none/index answered 404 Not Found.' }],
    });
  });
});
