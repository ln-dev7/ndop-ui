import { CliError } from '../errors';
import { parseRef, registrySources } from './client';

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
