import * as publicApi from './index';

describe('root entry point', () => {
  // ADR-0004: primitives are imported from their secondary entry points, so
  // anything exported here would be a second, unintended import path.
  // Angular 21's test builder adds a synthetic `default` key to the module
  // namespace, so it is not counted as an export.
  it('exports nothing', () => {
    expect(Object.keys(publicApi).filter((key) => key !== 'default')).toEqual(
      [],
    );
  });
});
