import { Component } from '@angular/core';
import { Button } from '@/ui/button/button';
import { TooltipContent } from '@/ui/tooltip/tooltip';
import {
  NdTooltip as Tooltip,
  NdTooltipPortal as TooltipPortal,
  NdTooltipTrigger as TooltipTrigger,
} from '@ndop/primitives/tooltip';

/** A tooltip describing a button, shown on hover and keyboard focus. */
@Component({
  selector: 'example-tooltip-demo',
  imports: [Tooltip, TooltipTrigger, TooltipPortal, TooltipContent, Button],
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
