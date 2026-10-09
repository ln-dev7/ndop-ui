import { Component } from '@angular/core';
import { AspectRatio } from '@/ui/aspect-ratio/aspect-ratio';

/** Square tiles in a grid that stay square as the grid resizes. */
@Component({
  selector: 'example-aspect-ratio-square',
  imports: [AspectRatio],
  template: `
    <ul class="grid w-full max-w-md grid-cols-3 gap-2">
      @for (tile of tiles; track tile) {
        <li
          ndAspectRatio
          class="grid place-items-center rounded-md bg-muted text-sm font-medium"
        >
          {{ tile }}
        </li>
      }
    </ul>
  `,
})
export class AspectRatioSquareExample {
  protected readonly tiles = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
}
