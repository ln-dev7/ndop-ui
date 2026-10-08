import { CliError } from '../errors';
import {
  parseRef,
  registrySources,
  RegistryClient,
  resolveItems,
} from './client';

describe('parseRef', () => {
  it('reads bare and namespaced names', () => {
    expect(parseRef('dialog')).toEqual({ registry: '@ndop', name: 'dialog' });
    expect(parseRef('dialog', '@acme')).toEqual({
      registry: '@acme',
      name: 'dialog',
    });
    expect(parseRef('@acme/data-table')).toEqual({
      registry: '@acme',
      name: 'data-table',
    });
  });

  it('reads a version after the name', () => {
    expect(parseRef('dialog@0.1.2')).toEqual({
      registry: '@ndop',
      name: 'dialog',
      version: '0.1.2',
    });
    expect(parseRef('@acme/data-table@1.0.0-rc.1')).toEqual({
      registry: '@acme',
      name: 'data-table',
      version: '1.0.0-rc.1',
    });
    expect(() => parseRef('dialog@latest')).toThrow(/isn't a version/);
  });

  it('rejects URLs and other text', () => {
    expect(() => parseRef('https://x.dev/r/a.json')).toThrow(
      /by URL isn't supported/,
    );
    expect(() => parseRef('Dialog')).toThrow(CliError);
  });
});

describe('registrySources', () => {
  const config = { registry: 'https://config/{name}.json' };

  it('prefers --registry, then NDOP_REGISTRY, then ndop.json, then ndop.dev', () => {
    const url = (...args: Parameters<typeof registrySources>) =>
      registrySources(...args)['@ndop']?.url;
    expect(
      url(config, 'https://flag/{name}', {
        NDOP_REGISTRY: 'https://env/{name}',
      }),
    ).toBe('https://flag/{name}');
    expect(
      url(config, undefined, { NDOP_REGISTRY: 'https://env/{name}' }),
    ).toBe('https://env/{name}');
    expect(url(config, undefined, {})).toBe('https://config/{name}.json');
    expect(url(undefined, undefined, {})).toBe(
      'https://ndop.dev/r/{name}.json',
    );
  });

  it('expands environment variables in namespaced registry headers', () => {
    const registries = {
      '@acme': {
        url: 'https://acme.dev/r/{name}.json',
        headers: { Authorization: 'Bearer ${ACME_TOKEN}' },
      },
      '@open': 'https://open.dev/{name}.json',
    };
    expect(
      registrySources({ registries }, undefined, { ACME_TOKEN: 's3cret' }),
    ).toEqual(
      expect.objectContaining({
        '@acme': {
          url: 'https://acme.dev/r/{name}.json',
          headers: { Authorization: 'Bearer s3cret' },
        },
        '@open': { url: 'https://open.dev/{name}.json' },
      }),
    );
    expect(() => registrySources({ registries }, undefined, {})).toThrow(
      'Registry @acme needs the ACME_TOKEN environment variable.',
    );
  });
});

/**
 * A registry:lib item, the smallest valid one.
 *
 * @param name - Item name.
 * @param version - Its version.
 * @param registryDependencies - Items it needs.
 * @returns The item as JSON.
 */
function libItem(
  name: string,
  version: string,
  registryDependencies: string[] = [],
): string {
  return JSON.stringify({
    name,
    type: 'registry:lib',
    version,
    title: name,
    description: `Item ${name}.`,
    registryDependencies,
    files: [
      {
        path: `lib/${name}.ts`,
        type: 'registry:lib',
        target: `{lib}/${name}.ts`,
        content: `export const version = '${version}';\n`,
      },
    ],
  });
}

describe('RegistryClient versions', () => {
  const served: Record<string, string> = {
    'r/a.json': libItem('a', '0.2.0'),
    'r/a@0.1.0.json': libItem('a', '0.1.0'),
    'r/a@0.3.0.json': libItem('a', '0.2.0'),
    'r/b.json': libItem('b', '1.0.0', ['a']),
  };
  const fetched: string[] = [];
  const client = new RegistryClient(
    { '@ndop': { url: 'r/{name}.json' } },
    async (location) => {
      fetched.push(location);
      const text = served[location];
      if (text === undefined) throw new CliError(`No ${location}.`);
      return text;
    },
  );

  it('fetches a version from <name>@<version> in the URL template', async () => {
    const item = await client.get({
      registry: '@ndop',
      name: 'a',
      version: '0.1.0',
    });
    expect(item.version).toBe('0.1.0');
    expect(fetched).toContain('r/a@0.1.0.json');
  });

  it('rejects a file that holds another version', async () => {
    await expect(
      client.get({ registry: '@ndop', name: 'a', version: '0.3.0' }),
    ).rejects.toThrow('r/a@0.3.0.json holds version 0.2.0, not 0.3.0.');
  });

  it('keeps an asked-for version when another item depends on it', async () => {
    const items = await resolveItems(client, [
      parseRef('b'),
      parseRef('a@0.1.0'),
    ]);
    expect(items.map(({ ref, item }) => `${ref.name}@${item.version}`)).toEqual(
      ['a@0.1.0', 'b@1.0.0'],
    );
  });

  it('refuses two versions of one item', async () => {
    await expect(
      resolveItems(client, [parseRef('a@0.1.0'), parseRef('a@0.2.0')]),
    ).rejects.toThrow('@ndop/a is asked for at 0.1.0 and 0.2.0; pick one.');
  });
});
