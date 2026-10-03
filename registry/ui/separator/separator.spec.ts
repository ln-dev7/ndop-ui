import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import { Separator } from './separator';

describe('Separator', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses(
        'separator',
        registrySource('ui/separator/separator.ts'),
      ),
    ).toEqual([]);
  });

  it('keeps the semantic default and forwards orientation', async () => {
    await render(
      `<div ndSeparator data-testid="h"></div><div ndSeparator orientation="vertical" decorative data-testid="v"></div>`,
      { imports: [Separator] },
    );
    const horizontal = screen.getByTestId('h');
    expect(horizontal.getAttribute('role')).toBe('separator');
    expect(horizontal.getAttribute('data-slot')).toBe('separator');
    expect(horizontal.classList).toContain('bg-border');
    const vertical = screen.getByTestId('v');
    expect(vertical.getAttribute('data-orientation')).toBe('vertical');
    expect(vertical.getAttribute('role')).toBe('none');
  });
});
