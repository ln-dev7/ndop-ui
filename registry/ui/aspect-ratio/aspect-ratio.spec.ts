import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import { AspectRatio } from './aspect-ratio';

describe('AspectRatio', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses(
        'aspect-ratio',
        registrySource('ui/aspect-ratio/aspect-ratio.ts'),
      ),
    ).toEqual([]);
  });

  it('sets the ratio as CSS aspect-ratio', async () => {
    await render(`<div ndAspectRatio [ratio]="16 / 9" data-testid="r"></div>`, {
      imports: [AspectRatio],
    });
    expect(screen.getByTestId('r').style.aspectRatio).toMatch(/^1\.77/);
  });
});
