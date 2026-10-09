import { Component } from '@angular/core';
import {
  Slider,
  SliderRange,
  SliderThumb,
  SliderTrack,
} from '@/ui/slider/slider';

/** A disabled slider. */
@Component({
  selector: 'example-slider-disabled',
  imports: [Slider, SliderRange, SliderThumb, SliderTrack],
  template: `
    <div ndSlider disabled class="w-3/5">
      <div ndSliderTrack><div ndSliderRange></div></div>
      <span ndSliderThumb aria-label="Brightness" [defaultValue]="40"></span>
    </div>
  `,
})
export class SliderDisabledExample {}
