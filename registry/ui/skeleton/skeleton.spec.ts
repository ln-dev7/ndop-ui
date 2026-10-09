import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import { Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses(
        'skeleton',
        registrySource('ui/skeleton/skeleton.ts'),
      ),
    ).toEqual([]);
  });

  it('is hidden from assistive technology and takes a shape', async () => {
    await render(`<div ndSkeleton data-testid="s" class="h-4 w-48"></div>`, {
      imports: [Skeleton],
    });
    const skeleton = screen.getByTestId('s');
    expect(skeleton.getAttribute('aria-hidden')).toBe('true');
    expect(skeleton.classList).toContain('w-48');
  });
});
