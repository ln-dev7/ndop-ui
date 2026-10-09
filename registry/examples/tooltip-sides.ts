import { Component } from '@angular/core';
import type { NdSide } from '@ndop/primitives/tooltip';
import { Button } from '@/ui/button/button';
import {
  NdTooltip,
  NdTooltipPortal,
  NdTooltipTrigger,
  TooltipContent,
} from '@/ui/tooltip/tooltip';

/**
 * Tooltips on each side of their triggers. `start` and `end` follow the
 * reading direction, so they swap in right-to-left layouts.
 */
@Component({
  selector: 'example-tooltip-sides',
  imports: [
    Button,
    NdTooltip,
    NdTooltipPortal,
    NdTooltipTrigger,
    TooltipContent,
  ],
  template: `
    <div class="flex flex-wrap gap-2">
      @for (side of sides; track side) {
        <ng-container ndTooltip>
          <button ndButton ndTooltipTrigger variant="outline">
            {{ side }}
          </button>
          <ng-template ndTooltipPortal>
            <div ndTooltipContent [side]="side">On the {{ side }} side</div>
          </ng-template>
        </ng-container>
      }
    </div>
  `,
})
export class TooltipSidesExample {
  protected readonly sides: NdSide[] = ['top', 'end', 'bottom', 'start'];
}
