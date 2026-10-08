import { compareVersions } from './version';

describe('compareVersions', () => {
  it('orders releases numerically', () => {
    expect(
      ['0.10.0', '0.2.0', '1.0.0', '0.2.10', '0.2.9'].sort(compareVersions),
    ).toEqual(['0.2.0', '0.2.9', '0.2.10', '0.10.0', '1.0.0']);
  });

  it('puts pre-releases below their release, in semver order', () => {
    expect(
      [
        '1.0.0',
        '1.0.0-rc.1',
        '1.0.0-beta.11',
        '1.0.0-beta.2',
        '1.0.0-beta',
        '1.0.0-alpha.beta',
        '1.0.0-alpha.1',
        '1.0.0-alpha',
      ].sort(compareVersions),
    ).toEqual([
      '1.0.0-alpha',
      '1.0.0-alpha.1',
      '1.0.0-alpha.beta',
      '1.0.0-beta',
      '1.0.0-beta.2',
      '1.0.0-beta.11',
      '1.0.0-rc.1',
      '1.0.0',
    ]);
  });

  it('ignores build metadata', () => {
    expect(compareVersions('1.0.0+build.1', '1.0.0')).toBe(0);
  });
});
