import { Component } from '@angular/core';
import { AspectRatio } from '@/ui/aspect-ratio/aspect-ratio';

/** An illustration kept at 16:9 whatever the width. */
@Component({
  selector: 'example-aspect-ratio-demo',
  imports: [AspectRatio],
  template: `
    <div
      ndAspectRatio
      [ratio]="16 / 9"
      class="w-full max-w-md overflow-hidden rounded-lg bg-muted"
    >
      <svg
        viewBox="0 0 160 90"
        role="img"
        aria-label="Hills under a setting sun"
        class="size-full"
      >
        <circle cx="112" cy="34" r="14" class="fill-primary/30" />
        <path d="M0 70 Q40 40 80 62 T160 52 V90 H0Z" class="fill-primary/20" />
        <path d="M0 80 Q50 58 100 76 T160 70 V90 H0Z" class="fill-primary/40" />
      </svg>
    </div>
  `,
})
export class AspectRatioDemoExample {}
