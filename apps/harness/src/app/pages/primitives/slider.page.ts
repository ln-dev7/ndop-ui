import { Component, signal } from '@angular/core';
import {
  NdSlider,
  NdSliderRange,
  NdSliderThumb,
  NdSliderTrack,
} from '@ndop/primitives/slider';

/**
 * Slider demo (`/primitives/slider`): a volume slider, a price range, a
 * disabled slider and a right-to-left one.
 */
@Component({
  selector: 'harness-slider-demo',
  imports: [NdSlider, NdSliderTrack, NdSliderRange, NdSliderThumb],
  template: `
    <main class="grid max-w-sm gap-8 p-8">
      <h1 class="text-2xl font-semibold">Slider</h1>
      <div ndSlider data-testid="volume" [class]="root">
        <div ndSliderTrack [class]="track">
          <div
            ndSliderRange
            #range="ndSliderRange"
            [class]="fill"
            [style.inset-inline-start.%]="range.start()"
            [style.inset-inline-end.%]="100 - range.end()"
          ></div>
        </div>
        <span
          ndSliderThumb
          #thumb="ndSliderThumb"
          aria-label="Volume"
          [(value)]="volume"
          [class]="knob"
          [style.inset-inline-start.%]="thumb.percent()"
        ></span>
      </div>
      <p>Volume: {{ volume() }}</p>
      <div ndSlider [step]="10" [max]="500" [class]="root">
        <div ndSliderTrack [class]="track">
          <div
            ndSliderRange
            #price="ndSliderRange"
            [class]="fill"
            [style.inset-inline-start.%]="price.start()"
            [style.inset-inline-end.%]="100 - price.end()"
          ></div>
        </div>
        <span
          ndSliderThumb
          #low="ndSliderThumb"
          aria-label="Minimum price"
          [defaultValue]="100"
          [class]="knob"
          [style.inset-inline-start.%]="low.percent()"
        ></span>
        <span
          ndSliderThumb
          #high="ndSliderThumb"
          aria-label="Maximum price"
          [defaultValue]="300"
          [class]="knob"
          [style.inset-inline-start.%]="high.percent()"
        ></span>
      </div>
      <div ndSlider disabled [class]="root + ' opacity-50'">
        <span
          ndSliderThumb
          #off="ndSliderThumb"
          aria-label="Brightness"
          [defaultValue]="40"
          [class]="knob"
          [style.inset-inline-start.%]="off.percent()"
        ></span>
      </div>
      <section dir="rtl" aria-label="Right to left">
        <div ndSlider [class]="root">
          <span
            ndSliderThumb
            #rtl="ndSliderThumb"
            aria-label="Balance"
            [defaultValue]="50"
            [class]="knob"
            [style.inset-inline-start.%]="rtl.percent()"
          ></span>
        </div>
      </section>
    </main>
  `,
})
export default class SliderDemo {
  protected readonly root = 'relative h-5 w-64 touch-none';
  protected readonly track =
    'absolute inset-x-0 top-2 h-1 rounded-full bg-muted';
  protected readonly fill = 'absolute inset-y-0 rounded-full bg-foreground';
  protected readonly knob =
    'absolute top-0 -ms-2.5 size-5 rounded-full border border-foreground bg-background';
  protected readonly volume = signal(30);
}
