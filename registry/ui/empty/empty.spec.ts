import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from './empty';

describe('Empty', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses('empty', registrySource('ui/empty/empty.ts')),
    ).toEqual([]);
  });

  it('styles each part', async () => {
    await render(
      `<div ndEmpty class="border">
        <div ndEmptyHeader>
          <div ndEmptyMedia variant="icon" data-testid="media"></div>
          <h3 ndEmptyTitle>No messages</h3>
          <p ndEmptyDescription>Nothing yet.</p>
        </div>
        <div ndEmptyContent>Actions</div>
      </div>`,
      {
        imports: [
          Empty,
          EmptyHeader,
          EmptyMedia,
          EmptyTitle,
          EmptyDescription,
          EmptyContent,
        ],
      },
    );
    expect(screen.getByRole('heading', { name: 'No messages' })).toBeTruthy();
    const media = screen.getByTestId('media');
    expect(media.getAttribute('data-variant')).toBe('icon');
    expect(media.classList).toContain('bg-muted');
  });
});
