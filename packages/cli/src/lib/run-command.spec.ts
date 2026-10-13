import { cliCommand, cliDependency } from './run-command';

describe('run command', () => {
  it('runs the installed bin once the project depends on @ndop/cli', () => {
    expect(cliCommand(true)).toBe('npx ndop');
    expect(cliCommand(false)).toBe('npx @ndop/cli');
  });

  it('adds @ndop/cli at a caret range, or the exact version of a prerelease', () => {
    expect(cliDependency('0.2.0')).toBe('@ndop/cli@^0.2.0');
    expect(cliDependency('1.4.1')).toBe('@ndop/cli@^1.4.1');
    expect(cliDependency('0.0.0-e2e.1760000000000')).toBe(
      '@ndop/cli@0.0.0-e2e.1760000000000',
    );
    expect(cliDependency(undefined)).toBe('@ndop/cli');
  });
});
