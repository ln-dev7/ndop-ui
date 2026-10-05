import { physicalClasses, rawColorClasses } from './classes';

describe('physicalClasses', () => {
  it.each([
    ['ml-2', 'ms-2'],
    ['mr-auto', 'me-auto'],
    ['pl-4', 'ps-4'],
    ['-mr-1', '-me-1'],
    ['scroll-pl-2', 'scroll-ps-2'],
    ['left-0', 'start-0'],
    ['right-1/3', 'end-1/3'],
    ['-left-2', '-start-2'],
    ['text-left', 'text-start'],
    ['float-right', 'float-end'],
    ['clear-left', 'clear-start'],
    ['border-l', 'border-s'],
    ['border-r-2', 'border-e-2'],
    ['rounded-l-md', 'rounded-s-md'],
    ['rounded-tr', 'rounded-se'],
    ['rounded-bl-lg', 'rounded-es-lg'],
    ['md:hover:pr-2', 'md:hover:pe-2'],
    ['!ml-2', '!ms-2'],
  ])('fixes %s to %s', (token, fix) => {
    expect(physicalClasses(`p-2 ${token}`)).toEqual([
      { token, offset: 4, fix },
    ]);
  });

  it('leaves logical and two-sided utilities alone', () => {
    expect(
      physicalClasses(
        'ms-2 pe-4 start-0 text-start mx-2 px-4 inset-x-0 border-x rounded-t-md space-x-2 text-lg leading-loose',
      ),
    ).toEqual([]);
  });

  it('leaves centering offsets alone', () => {
    expect(
      physicalClasses(
        'left-1/2 left-[50%] right-1/2 -translate-x-1/2 translate-x-[-50%]',
      ),
    ).toEqual([]);
  });
});

describe('rawColorClasses', () => {
  it('flags palette shades and arbitrary colors', () => {
    expect(
      rawColorClasses(
        'bg-red-500 text-zinc-900/50 hover:border-sky-200 ring-[#333] fill-[oklch(0.5_0_0)]',
      ).map((problem) => problem.token),
    ).toEqual([
      'bg-red-500',
      'text-zinc-900/50',
      'hover:border-sky-200',
      'ring-[#333]',
      'fill-[oklch(0.5_0_0)]',
    ]);
  });

  it('allows tokens, black and white, and non-color utilities', () => {
    expect(
      rawColorClasses(
        'bg-primary text-muted-foreground border-border bg-black/50 text-white text-red ring-2 border-2 text-[14px]',
      ),
    ).toEqual([]);
  });
});
