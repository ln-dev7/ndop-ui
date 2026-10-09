import { Component } from '@angular/core';
import {
  Slider,
  SliderRange,
  SliderThumb,
  SliderTrack,
} from '@/ui/slider/slider';

/** A single value from 0 to 100. */
@Component({
  selector: 'example-slider-demo',
  imports: [Slider, SliderRange, SliderThumb, SliderTrack],
  template: `
    <div ndSlider class="w-3/5">
      <div ndSliderTrack><div ndSliderRange></div></div>
      <span ndSliderThumb aria-label="Volume" [defaultValue]="50"></span>
    </div>
  `,
})
export class SliderDemoExample {}
