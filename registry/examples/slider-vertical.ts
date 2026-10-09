import { Component } from '@angular/core';
import {
  Slider,
  SliderRange,
  SliderThumb,
  SliderTrack,
} from '@/ui/slider/slider';

/** A vertical slider, running bottom to top. */
@Component({
  selector: 'example-slider-vertical',
  imports: [Slider, SliderRange, SliderThumb, SliderTrack],
  template: `
    <div class="flex h-44 items-center gap-6">
      <div ndSlider orientation="vertical">
        <div ndSliderTrack><div ndSliderRange></div></div>
        <span ndSliderThumb aria-label="Bass" [defaultValue]="30"></span>
      </div>
      <div ndSlider orientation="vertical">
        <div ndSliderTrack><div ndSliderRange></div></div>
        <span ndSliderThumb aria-label="Treble" [defaultValue]="70"></span>
      </div>
    </div>
  `,
})
export class SliderVerticalExample {}
