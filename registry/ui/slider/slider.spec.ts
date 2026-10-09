import { render, screen } from '@testing-library/angular/zoneless';
import {
  missingShadcnClasses,
  registrySource,
} from '../../testing/shadcn-parity';
import { Slider, SliderRange, SliderThumb, SliderTrack } from './slider';

const PARTS = [Slider, SliderTrack, SliderRange, SliderThumb];

describe('Slider', () => {
  it('matches shadcn new-york-v4 classes', () => {
    expect(
      missingShadcnClasses('slider', registrySource('ui/slider/slider.ts'), {
        // Tokens only: a raw palette color doesn't follow the theme.
        'bg-white': 'bg-background',
      }),
    ).toEqual([]);
  });

  it('positions the range and thumbs from their values', async () => {
    await render(
      `<div ndSlider>
        <div ndSliderTrack><div ndSliderRange data-testid="range"></div></div>
        <span ndSliderThumb aria-label="Minimum" [defaultValue]="20"></span>
        <span ndSliderThumb aria-label="Maximum" [defaultValue]="75"></span>
      </div>`,
      { imports: PARTS },
    );
    const range = screen.getByTestId('range');
    expect(range.style.insetInlineStart).toBe('20%');
    expect(range.style.insetInlineEnd).toBe('25%');
    const high = screen.getByRole('slider', { name: 'Maximum' });
    expect(high.style.insetInlineStart).toBe('75%');
    expect(high.style.getPropertyValue('--slider-thumb-offset')).toBe('75%');
  });

  it('positions vertical sliders from the bottom', async () => {
    await render(
      `<div ndSlider orientation="vertical">
        <div ndSliderTrack><div ndSliderRange data-testid="range"></div></div>
        <span ndSliderThumb aria-label="Level" [defaultValue]="40"></span>
      </div>`,
      { imports: PARTS },
    );
    expect(screen.getByTestId('range').style.top).toBe('60%');
    expect(screen.getByRole('slider').style.bottom).toBe('40%');
  });
});
