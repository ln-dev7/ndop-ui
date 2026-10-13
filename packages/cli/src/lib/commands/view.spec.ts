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
 * Runs `ndop view --json` and parses the result.
 *
 * @param environment - Test environment.
 * @param args - Items and options.
 * @returns The JSON result.
 */
async function view(
  environment: ReturnType<typeof registryEnvironment>,
  ...args: string[]
) {
  const { out } = await runNdop(environment, 'view', '--json', ...args);
  return JSON.parse(out);
}

describe('ndop view', () => {
  afterEach(() => {
    process.exitCode = undefined;
  });

  it("prints a component's API, keyboard map and examples", async () => {
    const { out, err } = await runNdop(registryEnvironment(), 'view', 'button');
    expect(err).toBe('');
    expect(out).toMatchSnapshot();
  });

  it('prints the item and its metadata as JSON', async () => {
    const result = await view(registryEnvironment(), 'button');
    expect(result).toMatchSnapshot();
  });

  it("adds the examples' source with --code", async () => {
    const environment = registryEnvironment();
    const { out } = await runNdop(environment, 'view', 'button', '--code');
    expect(out).toContain(
      "  button-demo: {ui}/examples/button-demo.ts\n@Component({ template: '<button ndButton>Save</button>' })\n",
    );
    expect(out).not.toContain('Add --code');

    const result = await view(environment, 'button', '--code');
    expect(result.items[0].examples[1]).toEqual({
      name: 'button-link',
      title: 'Button link',
      description: 'A link that looks like a button.',
      files: [
        {
          target: '{ui}/examples/button-link.ts',
          content: expect.stringContaining('export class ButtonLink {}'),
        },
      ],
    });
  });

  it("prints an example's own source with --code", async () => {
    const { out } = await runNdop(
      registryEnvironment(),
      'view',
      'button-link',
      '--code',
    );
    expect(out).toContain('Files\n  {ui}/examples/button-link.ts\n@Component(');
  });

  it('shows models, outputs and required parents', async () => {
    const { out } = await runNdop(registryEnvironment(), 'view', 'dialog');
    expect(out).toContain(
      [
        '  DialogTrigger  [ndDialogTrigger]',
        '    The button that opens its dialog.',
        '    Inside    [ndDialog]',
        '    [(open)]  boolean',
        '              Open state.',
        '    (closed)  void',
        '              After it closes.',
      ].join('\n'),
    );
  });

  it('links each kind of item to its page, or none', async () => {
    const result = await view(
      registryEnvironment(),
      'login-01',
      'default',
      'button-demo',
      'utils',
    );
    expect(
      result.items.map((item: { name: string; docs?: string }) => [
        item.name,
        item.docs,
      ]),
    ).toEqual([
      ['login-01', 'https://ndop.dev/blocks/login-01'],
      ['default', 'https://ndop.dev/themes'],
      ['button-demo', 'https://ndop.dev/docs/components/button'],
      ['utils', undefined],
    ]);
    expect(result.items[2].demonstrates).toEqual(['button']);
  });

  it("prints a block's notes, and no API", async () => {
    const { out } = await runNdop(registryEnvironment(), 'view', 'login-01');
    expect(out).toMatchSnapshot();
  });

  it('views an item of another registry, and what is installed', async () => {
    const environment = registryEnvironment({
      'ndop.json': JSON.stringify({
        style: 'default',
        tailwind: { css: 'src/styles.css' },
        aliases: {
          ui: 'src/app/ui',
          lib: 'src/app/lib',
          blocks: 'src/app/blocks',
        },
        registries: { '@acme': ACME_URL },
      }),
      'ndop.lock.json': JSON.stringify({
        lockfileVersion: 1,
        items: {
          '@ndop/button': {
            name: 'button',
            registry: '@ndop',
            version: '0.1.0',
            files: [{ path: 'src/app/ui/button.ts', sha256: 'a'.repeat(64) }],
          },
        },
      }),
    });
    const result = await view(environment, '@acme/data-table', 'button');
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        registry: '@acme',
        name: 'data-table',
        install: 'npx @ndop/cli add @acme/data-table',
        examples: [],
      }),
    );
    expect(result.items[0].docs).toBeUndefined();
    expect(result.items[1].installed).toBe('0.1.0');

    const { out } = await runNdop(environment, 'view', 'button');
    expect(out).toContain('  Installed  0.1.0; 1.0.0 is the latest\n');
  });

  it('suggests the closest names for an unknown item, and shows the rest', async () => {
    const environment = registryEnvironment();
    const { out, err } = await runNdop(environment, 'view', 'buton', 'utils');
    expect(err).toBe(
      '✗ The registry has no item named "buton". Closest: button, utils, dialog.\n',
    );
    expect(out).toMatch(/^Utils {2}utils 1\.0\.0, library\n/);
    expect(process.exitCode).toBe(1);
  });

  it('takes names only', async () => {
    const result = await view(registryEnvironment(), 'button@0.1.0');
    expect(result.ok).toBe(false);
    expect(result.errors[0].message).toBe(
      'ndop view shows the latest version of an item by name, such as button or @acme/data-table; "button@0.1.0" isn\'t one.',
    );
    const unknown = await view(registryEnvironment(), '@nope/button');
    expect(unknown.errors).toEqual([
      {
        message: 'Unknown registry @nope. Add it to "registries" in ndop.json.',
        file: 'ndop.json',
      },
    ]);
  });
});
