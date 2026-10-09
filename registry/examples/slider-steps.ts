import { Component, computed, signal } from '@angular/core';
import {
  Slider,
  SliderRange,
  SliderThumb,
  SliderTrack,
} from '@/ui/slider/slider';

/** Steps of ten, with the value said in words for screen readers. */
@Component({
  selector: 'example-slider-steps',
  imports: [Slider, SliderRange, SliderThumb, SliderTrack],
  template: `
    <div class="grid w-full max-w-sm gap-3">
      <div ndSlider [step]="10">
        <div ndSliderTrack><div ndSliderRange></div></div>
        <span
          ndSliderThumb
          aria-label="Quality"
          [valueText]="label()"
          [(value)]="quality"
        ></span>
      </div>
      <p class="text-sm text-muted-foreground">Quality: {{ label() }}</p>
    </div>
  `,
})
export class SliderStepsExample {
  protected readonly quality = signal(60);

  protected readonly label = computed(() => {
    const quality = this.quality();
    const trade =
      quality < 40
        ? 'smaller files'
        : quality < 80
          ? 'balanced'
          : 'best quality';
    return `${quality}%, ${trade}`;
  });
}
