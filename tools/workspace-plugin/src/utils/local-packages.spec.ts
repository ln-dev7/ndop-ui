import { packedReleases, pinTestDependencies } from './local-packages';

describe('packedReleases', () => {
  it('lists the tarballs of a changeset pack output in publishing order', () => {
    const plan = {
      version: 1,
      plan: [
        [
          {
            kind: 'publish',
            name: '@ndop/schema',
            version: '1.0.0',
            access: 'public',
            tag: 'latest',
            tarball: {
              path: 'packages/ndop-schema-1.0.0.tgz',
              integrity: 'sha256-a',
            },
          },
          { kind: 'tag-only', name: 'private', version: '1.0.0' },
        ],
        [
          {
            kind: 'publish',
            name: '@ndop/cli',
            version: '1.0.0',
            access: 'public',
            tag: 'latest',
            tarball: {
              path: 'packages/ndop-cli-1.0.0.tgz',
              integrity: 'sha256-b',
            },
          },
        ],
      ],
    };

    expect(packedReleases(JSON.stringify(plan))).toEqual([
      {
        name: '@ndop/schema',
        version: '1.0.0',
        tarball: 'packages/ndop-schema-1.0.0.tgz',
      },
      {
        name: '@ndop/cli',
        version: '1.0.0',
        tarball: 'packages/ndop-cli-1.0.0.tgz',
      },
    ]);
  });

  it('rejects a publish plan that was never packed', () => {
    const plan = {
      version: 1,
      plan: [[{ kind: 'publish', name: '@ndop/mcp', version: '1.0.0' }]],
    };

    expect(() => packedReleases(JSON.stringify(plan))).toThrow(
      '@ndop/mcp@1.0.0 has no tarball',
    );
    expect(() => packedReleases('{"version":2,"plan":[]}')).toThrow(
      'version 1',
    );
  });
});

describe('test package dependency pins', () => {
  const versions = new Map([
    ['@ndop/primitives', '0.0.0-e2e.123'],
    ['@ndop/core', '0.0.0-e2e.123'],
  ]);
  it('pins only built packages in item dependencies without modifying source or unrelated ranges', () => {
    const item = {
      type: 'registry:ui',
      dependencies: [
        '@ndop/primitives@^2.0.0',
        '@ndop/core',
        '@ndop/core-custom@^1',
        'rxjs@^7',
      ],
      devDependencies: ['@ndop/primitives@~2.1.0'],
      files: [{ content: "import '@ndop/core';" }],
    };
    const actual = JSON.parse(
      pinTestDependencies(JSON.stringify(item), versions),
    );
    expect(actual.dependencies).toEqual([
      '@ndop/primitives@0.0.0-e2e.123',
      '@ndop/core@0.0.0-e2e.123',
      '@ndop/core-custom@^1',
      'rxjs@^7',
    ]);
    expect(actual.devDependencies).toEqual(['@ndop/primitives@0.0.0-e2e.123']);
    expect(actual.files).toEqual(item.files);
    expect(pinTestDependencies(JSON.stringify(actual), versions)).toBe(
      JSON.stringify(actual),
    );
  });
  it('leaves metadata and package manifests byte-for-byte unchanged', () => {
    for (const text of [
      '{"parts":[],"dependencies":["@ndop/core"]}',
      '{"type":"module","dependencies":{"@ndop/core":"^2"}}',
    ])
      expect(pinTestDependencies(text, versions)).toBe(text);
  });
});
