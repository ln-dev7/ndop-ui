import { missingShadcnClasses, shadcnClassStrings } from './shadcn-parity';

describe('shadcn parity helper', () => {
  it('finds cva base, variant and size strings but not variant names', () => {
    const classes = shadcnClassStrings('button');
    expect(classes).toContain(
      'bg-primary text-primary-foreground hover:bg-primary/90',
    );
    expect(classes).toContain('size-9');
    expect(classes).not.toContain('default');
    expect(classes[0]).toMatch(/^inline-flex shrink-0/);
  });

  it('finds every string of a multi-argument cn() and className attributes', () => {
    expect(shadcnClassStrings('input')).toHaveLength(3);
    expect(
      shadcnClassStrings('dialog').some((c) =>
        c.startsWith('absolute top-4 right-4'),
      ),
    ).toBe(true);
  });

  it('reports what is missing after applying exceptions', () => {
    const source = "'bg-primary text-primary-foreground hover:bg-primary/90'";
    const missing = missingShadcnClasses('button', source, {
      'text-white': 'text-destructive-foreground',
    });
    expect(missing).not.toContain(
      'bg-primary text-primary-foreground hover:bg-primary/90',
    );
    expect(missing.some((c) => c.includes('text-destructive-foreground'))).toBe(
      true,
    );
  });
});
