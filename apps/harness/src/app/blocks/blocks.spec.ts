import { BLOCK_NAMES } from './block-names';
import { BLOCKS } from './blocks';

describe('BLOCKS', () => {
  it('lists every registry block', () => {
    const files = Object.keys(
      import.meta.glob([
        '../../../../../registry/blocks/*/*.ts',
        '!**/*.spec.ts',
      ]),
    )
      .map((path) => path.replace(/^.*\/|\.ts$/g, ''))
      .filter((name, index, all) => all.indexOf(name) === index);
    expect(Object.keys(BLOCKS).sort()).toEqual(files.sort());
    expect([...BLOCK_NAMES].sort()).toEqual(files.sort());
  });
});
