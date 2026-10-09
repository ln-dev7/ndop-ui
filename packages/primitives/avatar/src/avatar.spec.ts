import { render, screen } from '@testing-library/angular/zoneless';
import { NdAvatar, NdAvatarFallback, NdAvatarImage } from './avatar';

const PARTS = [NdAvatar, NdAvatarImage, NdAvatarFallback];

describe('NdAvatar', () => {
  it('shows the fallback while the image loads', async () => {
    await render(
      `<span ndAvatar data-testid="root">
        <img ndAvatarImage src="/me.png" alt="Valery Melou" />
        <span ndAvatarFallback data-testid="fallback">VM</span>
      </span>`,
      { imports: PARTS },
    );
    const image = screen.getByAltText('Valery Melou');
    expect(screen.getByTestId('root').getAttribute('data-status')).toBe(
      'loading',
    );
    expect(image.getAttribute('aria-hidden')).toBe('true');
    expect(image.getAttribute('src')).toBe('/me.png');
    expect(
      screen.getByTestId('fallback').getAttribute('aria-hidden'),
    ).toBeNull();
  });

  it('hides the fallback from assistive technology once loaded', async () => {
    const { fixture } = await render(
      `<span ndAvatar data-testid="root">
        <img ndAvatarImage src="/me.png" alt="Valery Melou" />
        <span ndAvatarFallback data-testid="fallback">VM</span>
      </span>`,
      { imports: PARTS },
    );
    const image = screen.getByAltText('Valery Melou');
    image.dispatchEvent(new Event('load'));
    await fixture.whenStable();
    expect(image.getAttribute('aria-hidden')).toBeNull();
    expect(image.getAttribute('data-status')).toBe('loaded');
    expect(screen.getByTestId('fallback').getAttribute('aria-hidden')).toBe(
      'true',
    );
  });

  it('marks a failed or missing image as an error', async () => {
    const { fixture } = await render(
      `<span ndAvatar data-testid="a"><img ndAvatarImage src="/x.png" alt="A" /></span>
       <span ndAvatar data-testid="b"><img ndAvatarImage alt="B" /></span>`,
      { imports: PARTS },
    );
    screen.getByAltText('A').dispatchEvent(new Event('error'));
    await fixture.whenStable();
    expect(screen.getByTestId('a').getAttribute('data-status')).toBe('error');
    expect(screen.getByTestId('b').getAttribute('data-status')).toBe('error');
  });
});
