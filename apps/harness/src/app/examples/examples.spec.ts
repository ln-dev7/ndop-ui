import { EXAMPLE_NAMES } from './example-names';
import { EXAMPLES } from './examples';

describe('EXAMPLES', () => {
  it('lists every registry example', () => {
    const files = Object.keys(
      import.meta.glob([
        '../../../../../registry/examples/*.ts',
        '!**/*.spec.ts',
      ]),
    ).map((path) => path.replace(/^.*\/|\.ts$/g, ''));
    expect(Object.keys(EXAMPLES).sort()).toEqual(files.sort());
    expect([...EXAMPLE_NAMES].sort()).toEqual(files.sort());
  });
});
