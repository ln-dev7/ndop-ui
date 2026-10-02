import { variants, type VariantOf } from './variants';

const button = variants({
  base: 'inline-flex',
  variants: {
    variant: { default: 'bg-primary', outline: 'border' },
    size: { sm: 'h-8', md: 'h-9' },
    block: { true: 'w-full', false: 'w-auto' },
  },
  compoundVariants: [
    { variant: 'outline', size: 'sm', class: 'border-2' },
    { variant: ['default', 'outline'], size: 'md', class: 'px-4' },
  ],
  defaults: { variant: 'default', size: 'md', block: false },
});

describe('variants', () => {
  it('applies base classes and defaults', () => {
    expect(button()).toBe('inline-flex bg-primary h-9 w-auto px-4');
  });

  it('applies the chosen options', () => {
    expect(button({ variant: 'outline', block: true })).toBe(
      'inline-flex border h-9 w-full px-4',
    );
  });

  it('applies compound variants when every condition matches', () => {
    expect(button({ variant: 'outline', size: 'sm' })).toBe(
      'inline-flex border h-8 w-auto border-2',
    );
  });

  it('falls back to the default for null', () => {
    expect(button({ size: null })).toBe(button());
  });

  it('exposes its definitions', () => {
    expect(Object.keys(button.definitions)).toEqual([
      'variant',
      'size',
      'block',
    ]);
  });

  it('works without variants', () => {
    expect(variants({ base: 'a b' })()).toBe('a b');
  });

  it('derives input types from the table', () => {
    expectTypeOf<VariantOf<typeof button, 'variant'>>().toEqualTypeOf<
      'default' | 'outline'
    >();
    expectTypeOf<VariantOf<typeof button, 'block'>>().toEqualTypeOf<boolean>();
    expectTypeOf<VariantOf<typeof button, 'missing'>>().toBeNever();
  });
});
