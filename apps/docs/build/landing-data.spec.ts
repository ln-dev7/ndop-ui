import { join } from 'node:path';
import { lineDiff, variantsExcerpt } from './landing-data';

describe('lineDiff', () => {
  it('marks added and removed lines, a replaced one old first', () => {
    expect(lineDiff(['a', 'b', 'c'], ['a', 'B', 'c', 'd'])).toEqual([
      { text: 'a' },
      { text: 'b', kind: 'remove' },
      { text: 'B', kind: 'add' },
      { text: 'c' },
      { text: 'd', kind: 'add' },
    ]);
  });

  it('leaves equal files unmarked', () => {
    expect(lineDiff(['a', 'b'], ['a', 'b'])).toEqual([
      { text: 'a' },
      { text: 'b' },
    ]);
  });
});

describe('variantsExcerpt', () => {
  it('cuts a file to its variants declaration', () => {
    const file = [
      "import { x } from 'y';",
      '',
      'const buttonVariants = variants({',
      "  base: 'a',",
      '});',
      '',
      'export class Button {}',
    ].join('\n');
    expect(variantsExcerpt(file)).toEqual([
      'const buttonVariants = variants({',
      "  base: 'a',",
      '});',
    ]);
  });
});

describe('the update demo fixture', () => {
  it('still exists where the landing page reads it', async () => {
    const { readFileSync } = await import('node:fs');
    const fixture = join(
      import.meta.dirname,
      '../../../tools/update-fixtures/button/cases/03-add-size/local/src/app/ui/button/button.ts',
    );
    expect(variantsExcerpt(readFileSync(fixture, 'utf-8'))).toContain(
      "      xl: 'h-12 px-8 text-base',",
    );
  });
});
