import { packedReleases } from './local-packages';

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
