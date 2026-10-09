import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from './avatar';

describe('Avatar', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses('avatar', registrySource('ui/avatar/avatar.ts'), {
        'absolute right-0': 'absolute end-0',
        'rounded-full bg-muted text-sm text-muted-foreground':
          'rounded-full bg-muted text-sm text-foreground',
      }),
    ).toEqual([]);
  });

  it('shows the fallback until the image loads, at the chosen size', async () => {
    const { fixture } = await render(
      `<div ndAvatarGroup>
        <span ndAvatar size="lg" data-testid="avatar">
          <img ndAvatarImage src="/me.png" alt="Valery Melou" />
          <span ndAvatarFallback>VM</span>
          <span ndAvatarBadge></span>
        </span>
        <span ndAvatarGroupCount>+3</span>
      </div>`,
      {
        imports: [
          Avatar,
          AvatarImage,
          AvatarFallback,
          AvatarBadge,
          AvatarGroup,
          AvatarGroupCount,
        ],
      },
    );
    const avatar = screen.getByTestId('avatar');
    expect(avatar.getAttribute('data-size')).toBe('lg');
    expect(avatar.getAttribute('data-status')).toBe('loading');
    const image = screen.getByAltText('Valery Melou');
    image.dispatchEvent(new Event('load'));
    await fixture.whenStable();
    expect(avatar.getAttribute('data-status')).toBe('loaded');
    expect(screen.getByText('VM').getAttribute('aria-hidden')).toBe('true');
  });
});
