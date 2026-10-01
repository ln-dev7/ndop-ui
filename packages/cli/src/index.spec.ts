import * as publicApi from './index';

describe('public API', () => {
  // Guards the empty-but-wired state: the first real export must come with
  // its own tests, at which point this spec is deleted.
  it('exports nothing yet', () => {
    expect(Object.keys(publicApi)).toEqual([]);
  });
});
