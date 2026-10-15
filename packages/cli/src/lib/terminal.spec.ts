import { pc } from './colors';
import { canPrompt, table, truncate, visibleWidth, wrap } from './terminal';

describe('terminal text', () => {
  it('wraps at spaces, keeping long words and line breaks', () => {
    expect(wrap('Activates the button.', 12)).toEqual([
      'Activates',
      'the button.',
    ]);
    expect(wrap('a\nsupercalifragilistic b', 5)).toEqual([
      'a',
      'supercalifragilistic',
      'b',
    ]);
  });

  it('cuts with an ellipsis', () => {
    expect(truncate('A window overlaid on the page.', 12)).toBe('A window ov…');
    expect(truncate('Short.', 12)).toBe('Short.');
  });

  it('measures without colors', () => {
    expect(visibleWidth(pc.red('abc'))).toBe(3);
  });

  it('aligns columns and wraps the last one under itself', () => {
    expect(
      table(
        [
          ['Enter', 'Activates the button.'],
          ['Shift + Tab', 'Moves back.'],
        ],
        { width: 34, indent: 2 },
      ),
    ).toEqual([
      '  Enter        Activates the',
      '               button.',
      '  Shift + Tab  Moves back.',
    ]);
  });

  it('keeps the last column readable in a narrow terminal', () => {
    const [line] = table([['a-long-first-column', 'Some text here']], {
      width: 10,
      overflow: 'cut',
    });
    expect(line).toBe('a-long-first-column  Some text here');
  });

  it("leaves the last column alone when the width isn't known", () => {
    expect(table([['a', 'one\ntwo'], ['bb']])).toEqual([
      'a   one',
      '    two',
      'bb',
    ]);
  });
});

describe('canPrompt', () => {
  it('prompts only on a terminal outside CI', () => {
    expect(canPrompt(true, true, {})).toBe(true);
    expect(canPrompt(true, true, { CI: 'false' })).toBe(true);
    expect(canPrompt(true, true, { CI: 'true' })).toBe(false);
    expect(canPrompt(true, true, { CI: '1' })).toBe(false);
    expect(canPrompt(undefined, true, {})).toBe(false);
    expect(canPrompt(true, false, {})).toBe(false);
  });
});
