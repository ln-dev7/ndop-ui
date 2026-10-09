import { Component, signal } from '@angular/core';
import {
  Slider,
  SliderRange,
  SliderThumb,
  SliderTrack,
} from '@/ui/slider/slider';

/**
 * A price filter with two thumbs that can't pass each other, and the
 * chosen range shown beside it.
 */
@Component({
  selector: 'example-slider-range',
  imports: [Slider, SliderRange, SliderThumb, SliderTrack],
  template: `
    <div class="grid w-full max-w-sm gap-3">
      <div class="flex items-center justify-between gap-2">
        <span id="slider-range-label" class="text-sm font-medium">Price</span>
        <span class="text-sm text-muted-foreground">
          {{ '$' + min() }} – {{ '$' + max() }}
        </span>
      </div>
      <div ndSlider [max]="500" [step]="10">
        <div ndSliderTrack><div ndSliderRange></div></div>
        <span
          ndSliderThumb
          aria-label="Minimum price"
          [valueText]="'$' + min()"
          [(value)]="min"
        ></span>
        <span
          ndSliderThumb
          aria-label="Maximum price"
          [valueText]="'$' + max()"
          [(value)]="max"
        ></span>
      </div>
    </div>
  `,
})
export class SliderRangeExample {
  protected readonly min = signal(100);
  protected readonly max = signal(350);
}
