import { Component } from '@angular/core';
import { AspectRatio } from '@/ui/aspect-ratio/aspect-ratio';
import { ScrollArea } from '@/ui/scroll-area/scroll-area';

/** A row of artworks that scrolls sideways. */
@Component({
  selector: 'example-scroll-area-horizontal',
  imports: [AspectRatio, ScrollArea],
  template: `
    <div
      ndScrollArea
      orientation="horizontal"
      class="w-full max-w-md rounded-md border whitespace-nowrap"
      aria-label="Artworks"
    >
      <ul class="flex w-max gap-4 p-4">
        @for (artwork of artworks; track artwork.title) {
          <li class="w-36 shrink-0">
            <figure>
              <div
                ndAspectRatio
                [ratio]="3 / 4"
                class="rounded-md bg-muted"
              ></div>
              <figcaption class="pt-2 text-xs text-muted-foreground">
                By
                <span class="font-semibold text-foreground">{{
                  artwork.artist
                }}</span>
              </figcaption>
            </figure>
          </li>
        }
      </ul>
    </div>
  `,
})
export class ScrollAreaHorizontalExample {
  protected readonly artworks = [
    { title: 'Ripple', artist: 'Ornella Binni' },
    { title: 'Stillness', artist: 'Tom Byrom' },
    { title: 'Drift', artist: 'Vladimir Malyavko' },
    { title: 'Haze', artist: 'Ahmed Saeed' },
  ];
}
