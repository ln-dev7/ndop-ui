import { CliError } from '../errors';
import {
  itemKey,
  lockedRef,
  parseRef,
  parseRequest,
  registrySources,
  RegistryClient,
  resolveItems,
  versionedUrl,
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

  it('reads HTTPS URLs, and HTTP ones on this machine only', () => {
    expect(parseRef('https://x.dev/r/themes/ocean.json?t=1')).toEqual({
      registry: '@ndop',
      name: 'ocean',
      url: 'https://x.dev/r/themes/ocean.json?t=1',
    });
    expect(parseRef('http://localhost:4000/r/a.json').url).toBe(
      'http://localhost:4000/r/a.json',
    );
    expect(parseRef('http://127.0.0.1/r/a.json').url).toBe(
      'http://127.0.0.1/r/a.json',
    );
    expect(() => parseRef('http://x.dev/r/a.json')).toThrow(
      /use an https:\/\/ URL/,
    );
    expect(() => parseRef('ftp://x.dev/r/a.json')).toThrow(
      /use an https:\/\/ URL/,
    );
  });

  it('rejects other text', () => {
    expect(() => parseRef('Dialog')).toThrow(CliError);
  });
});

describe('parseRequest', () => {
  it('reads theme: before any reference', () => {
    expect(parseRequest('theme:ocean')).toEqual({
      ref: { registry: '@ndop', name: 'ocean' },
      theme: true,
    });
    expect(parseRequest('theme:@acme/ocean').ref).toEqual({
      registry: '@acme',
      name: 'ocean',
    });
    expect(parseRequest('theme:https://x.dev/ocean.json').ref.url).toBe(
      'https://x.dev/ocean.json',
    );
    expect(parseRequest('ocean').theme).toBe(false);
  });
});

describe('item keys', () => {
  it('keys URL items by URL and the rest by namespace and name', () => {
    const url = 'https://x.dev/r/ocean.json';
    expect(itemKey(parseRef('dialog'))).toBe('@ndop/dialog');
    expect(itemKey(parseRef(url))).toBe(url);
    expect(lockedRef({ name: 'ocean', source: url })).toEqual({
      registry: '@ndop',
      name: 'ocean',
      url,
    });
    expect(lockedRef({ name: 'table', registry: '@acme' })).toEqual({
      registry: '@acme',
      name: 'table',
    });
  });

  it('puts the version before .json, keeping the query string', () => {
    expect(versionedUrl('https://x.dev/r/ocean.json?t=1', '1.2.0')).toBe(
      'https://x.dev/r/ocean@1.2.0.json?t=1',
    );
    expect(versionedUrl('https://x.dev/api/theme/ocean', '1.2.0')).toBe(
      'https://x.dev/api/theme/ocean@1.2.0.json',
    );
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
  });

  it('records an unset variable instead of failing every registry', () => {
    const sources = registrySources(
      {
        registries: {
          '@acme': {
            url: 'https://acme.dev/r/{name}.json',
            headers: { Authorization: 'Bearer ${ACME_TOKEN}' },
          },
        },
      },
      undefined,
      {},
    );
    expect(sources['@acme']?.missing).toBe('ACME_TOKEN');
    expect(sources['@ndop']).toEqual({ url: 'https://ndop.dev/r/{name}.json' });
  });
});

describe('RegistryClient namespaced registries', () => {
  const served: Record<string, string> = {
    'https://acme.dev/r/widget.json': libItem('widget', '1.0.0', [
      'helper',
      '@ndop/a',
    ]),
    'https://acme.dev/r/helper.json': libItem('helper', '1.0.0'),
    'r/a.json': libItem('a', '0.2.0'),
  };
  const requests: { location: string; headers: Record<string, string> }[] = [];
  const fetcher = async (location: string, headers: Record<string, string>) => {
    requests.push({ location, headers });
    const text = served[location];
    if (text === undefined) throw new CliError(`No ${location}.`);
    return text;
  };
  const config = {
    registry: 'r/{name}.json',
    registries: {
      '@acme': {
        url: 'https://acme.dev/r/{name}.json',
        headers: { Authorization: 'Bearer ${ACME_TOKEN}' },
      },
    },
  };

  it("resolves bare dependencies in the item's registry and @ndop/ ones in the default", async () => {
    const client = new RegistryClient(
      registrySources(config, undefined, { ACME_TOKEN: 's3cret' }),
      fetcher,
    );
    const items = await resolveItems(client, [parseRef('@acme/widget')]);
    expect(items.map(({ ref }) => itemKey(ref))).toEqual([
      '@acme/helper',
      '@ndop/a',
      '@acme/widget',
    ]);
    expect(
      requests.find(({ location }) => location.endsWith('/widget.json'))
        ?.headers,
    ).toEqual({ Authorization: 'Bearer s3cret' });
    expect(
      requests.find(({ location }) => location === 'r/a.json')?.headers,
    ).toEqual({});
  });

  it('names the unset variable only when the registry is used', async () => {
    const client = new RegistryClient(
      registrySources(config, undefined, {}),
      fetcher,
    );
    expect((await client.get(parseRef('a'))).name).toBe('a');
    await expect(client.get(parseRef('@acme/widget'))).rejects.toThrow(
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

describe('RegistryClient URLs', () => {
  const URL = 'https://x.dev/r/kit.json';
  const served: Record<string, string> = {
    [URL]: libItem('my-kit', '2.0.0', ['a']),
    'https://x.dev/r/kit@1.0.0.json': libItem('my-kit', '1.0.0'),
    'r/a.json': libItem('a', '0.2.0'),
  };
  const client = new RegistryClient(
    { '@ndop': { url: 'r/{name}.json' } },
    async (location) => {
      const text = served[location];
      if (text === undefined) throw new CliError(`No ${location}.`);
      return text;
    },
  );

  it("names a URL item after the item, with bare dependencies from Ndop's registry", async () => {
    const items = await resolveItems(client, [parseRef(URL)]);
    expect(items.map(({ ref }) => ref)).toEqual([
      { registry: '@ndop', name: 'a' },
      { registry: '@ndop', name: 'my-kit', url: URL },
    ]);
  });

  it('fetches a version from the versioned URL, or the URL when it holds it', async () => {
    const ref = { registry: '@ndop', name: 'my-kit', url: URL };
    expect((await client.get({ ...ref, version: '1.0.0' })).version).toBe(
      '1.0.0',
    );
    expect((await client.get({ ...ref, version: '2.0.0' })).version).toBe(
      '2.0.0',
    );
    await expect(client.get({ ...ref, version: '1.5.0' })).rejects.toThrow(
      "Can't fetch version 1.5.0 of https://x.dev/r/kit.json: No https://x.dev/r/kit@1.5.0.json.",
    );
  });
});
