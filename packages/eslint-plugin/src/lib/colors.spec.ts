import { colorLiterals, isColorProperty } from './colors';

describe('colorLiterals', () => {
  it.each([
    ['#fff', 'color', ['#fff']],
    ['1px solid #e5e5e5', 'border', ['#e5e5e5']],
    ['#18332dcc', 'background', ['#18332dcc']],
    ['rgb(0 0 0 / 50%)', 'color', ['rgb(0 0 0 / 50%)']],
    ['rgba(0, 0, 0, 0.5)', 'color', ['rgba(0, 0, 0, 0.5)']],
    ['hsl(210 40% 98%)', 'color', ['hsl(210 40% 98%)']],
    ['hwb(0 0% 0%)', 'color', ['hwb(0 0% 0%)']],
    ['lab(50% 40 59)', 'color', ['lab(50% 40 59)']],
    ['lch(50% 40 59)', 'color', ['lch(50% 40 59)']],
    ['oklab(0.5 0.1 0.1)', 'color', ['oklab(0.5 0.1 0.1)']],
    ['oklch(0.5 0.2 240)', 'fill', ['oklch(0.5 0.2 240)']],
    ['color(display-p3 1 0 0)', 'color', ['color(display-p3 1 0 0)']],
    ['tomato', 'color', ['tomato']],
    ['0 0 0 1px Black', 'box-shadow', ['Black']],
    [
      'linear-gradient(to right, red, #00f)',
      'background-image',
      ['red', '#00f'],
    ],
    [
      'color-mix(in oklch, var(--primary) 80%, white)',
      'background-color',
      ['white'],
    ],
    ['var(--ink, #18332d)', 'color', ['#18332d']],
    ['#18332d', '--ink', ['#18332d']],
  ])('finds the literals in %s (%s)', (value, property, expected) => {
    expect(
      colorLiterals(value, property).map((literal) => literal.text),
    ).toEqual(expected);
  });

  it.each([
    ['var(--primary)', 'color'],
    ['color-mix(in oklch, var(--primary) 50%, transparent)', 'background'],
    ['oklch(from var(--primary) l c h / 50%)', 'color'],
    ['transparent', 'color'],
    ['currentColor', 'fill'],
    ['inherit', 'color'],
    ['initial', 'color'],
    ['unset', 'border-color'],
    ['url("#gradient") no-repeat', 'background'],
    ["'#fff'", 'content'],
    ['red 1s ease', 'animation'],
    ['tan', 'font-family'],
    ['1px solid var(--border)', 'border'],
    ['16rem', '--sidebar-width'],
  ])('allows %s (%s)', (value, property) => {
    expect(colorLiterals(value, property)).toEqual([]);
  });

  it('reports offsets in the value', () => {
    expect(colorLiterals('1px solid #e5e5e5', 'border')).toEqual([
      { text: '#e5e5e5', offset: 10 },
    ]);
  });
});

describe('isColorProperty', () => {
  it.each([
    'color',
    'background',
    'border-inline-start-color',
    'fill',
    '--ink',
  ])('treats %s as a color property', (property) =>
    expect(isColorProperty(property)).toBe(true),
  );

  it.each(['animation', 'font-family', 'grid-area'])(
    "doesn't treat %s as one",
    (property) => expect(isColorProperty(property)).toBe(false),
  );
});
