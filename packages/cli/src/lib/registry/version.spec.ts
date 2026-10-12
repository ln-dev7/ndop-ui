import { compareVersions, satisfies } from './version';

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

describe('satisfies', () => {
  it.each([
    ['22.13.1', '>=22.12.0', true],
    ['22.11.0', '>=22.12.0', false],
    ['1.50.2', '^1.50.0', true],
    ['2.0.0', '^1.50.0', false],
    ['0.2.5', '^0.2.0', true],
    ['0.3.0', '^0.2.0', false],
    ['22.2.3', '~22.2.0', true],
    ['22.3.0', '~22.2.0', false],
    ['22.2.0', '22.2.0', true],
    ['22.2.1', '22.2', true],
    ['23.0.0', '22.x', false],
    ['5.0.0', '*', true],
    ['3.0.0', '^1.0.0 || ^3.0.0', true],
    ['1.5.0', '1.0.0 - 1.4.0', false],
    ['1.2.0', '>1.1 <1.3', true],
  ])('%s in %s is %s', (version, range, expected) => {
    expect(satisfies(version, range)).toBe(expected);
  });

  it("doesn't answer for specs that aren't ranges", () => {
    expect(satisfies('1.0.0', 'workspace:*')).toBeUndefined();
    expect(satisfies('1.0.0', 'latest')).toBeUndefined();
  });
});
