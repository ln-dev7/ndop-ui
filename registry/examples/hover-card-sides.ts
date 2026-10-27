import { Component } from '@angular/core';
import { Button } from '@/ui/button/button';
import { HoverCardContent } from '@/ui/hover-card/hover-card';
import {
  NdHoverCard as HoverCard,
  NdHoverCardPortal as HoverCardPortal,
  NdHoverCardTrigger as HoverCardTrigger,
} from '@ndop/primitives/hover-card';

/**
 * Cards on each side of their links; they flip when there's no room.
 * `start` and `end` swap in right-to-left layouts.
 */
@Component({
  selector: 'example-hover-card-sides',
  imports: [
    Button,
    HoverCardContent,
    HoverCard,
    HoverCardPortal,
    HoverCardTrigger,
  ],
  template: `
    <div class="flex flex-wrap gap-2">
      @for (side of sides; track side) {
        <ng-container ndHoverCard>
          <a
            ndButton
            variant="outline"
            ndHoverCardTrigger
            class="capitalize"
            [href]="'#' + side"
          >
            {{ side }} side
          </a>
          <ng-template ndHoverCardPortal>
            <div ndHoverCardContent [side]="side">
              <p class="text-sm">This card opens on the {{ side }} side.</p>
            </div>
          </ng-template>
        </ng-container>
      }
    </div>
  `,
})
export class HoverCardSidesExample {
  protected readonly sides = ['top', 'end', 'bottom', 'start'] as const;
}
