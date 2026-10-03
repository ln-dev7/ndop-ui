import { Component } from '@angular/core';
import { Button } from '@/ui/button/button';
import {
  NdTooltip,
  NdTooltipPortal,
  NdTooltipTrigger,
  TooltipContent,
} from '@/ui/tooltip/tooltip';

/** A tooltip describing a button, shown on hover and keyboard focus. */
@Component({
  selector: 'example-tooltip-demo',
  imports: [
    NdTooltip,
    NdTooltipTrigger,
    NdTooltipPortal,
    TooltipContent,
    Button,
  ],
  template: `
    <ng-container ndTooltip>
      <button ndButton ndTooltipTrigger variant="outline">Hover</button>
      <ng-template ndTooltipPortal>
        <div ndTooltipContent>Add to library</div>
      </ng-template>
    </ng-container>
  `,
})
export class TooltipDemoExample {}
