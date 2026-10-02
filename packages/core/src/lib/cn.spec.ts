import { cn } from './cn';

describe('cn', () => {
  it('joins conditional class values', () => {
    const isDisabled = (): boolean => false;
    expect(
      cn('a', isDisabled() && 'b', ['c', { d: true, e: false }], null),
    ).toBe('a c d');
  });

  it('lets later Tailwind utilities win conflicts', () => {
    expect(cn('px-4 py-2 bg-primary', 'px-2 bg-accent')).toBe(
      'py-2 px-2 bg-accent',
    );
  });

  it('keeps token-based utilities that do not conflict', () => {
    expect(cn('bg-primary text-primary-foreground', 'rounded-md')).toBe(
      'bg-primary text-primary-foreground rounded-md',
    );
  });
});
