import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import { Badge } from './badge';

describe('Badge', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses('badge', registrySource('ui/badge/badge.ts'), {
        'text-white': 'text-destructive-foreground',
      }),
    ).toEqual([]);
  });

  it('styles its host and marks its variant', async () => {
    await render(
      `<span ndBadge variant="secondary" class="font-mono">Beta</span>`,
      { imports: [Badge] },
    );
    const badge = screen.getByText('Beta');
    expect(badge.getAttribute('data-slot')).toBe('badge');
    expect(badge.getAttribute('data-variant')).toBe('secondary');
    expect(badge.classList).toContain('bg-secondary');
    expect(badge.classList).toContain('font-mono');
  });

  it('keeps the semantics of a link', async () => {
    await render(`<a ndBadge variant="outline" href="/changelog">v1.2</a>`, {
      imports: [Badge],
    });
    expect(screen.getByRole('link', { name: 'v1.2' })).toBeTruthy();
  });
});
