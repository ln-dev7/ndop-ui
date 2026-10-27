import { Component } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';
import { TooltipContent } from '@/ui/tooltip/tooltip';
import {
  NdTooltip as Tooltip,
  NdTooltipPortal as TooltipPortal,
  NdTooltipTrigger as TooltipTrigger,
} from '@ndop/primitives/tooltip';

/**
 * An icon-only button with its own accessible name and a tooltip on the
 * end side for sighted users.
 */
@Component({
  selector: 'example-tooltip-icon-button',
  imports: [
    Tooltip,
    TooltipTrigger,
    TooltipPortal,
    TooltipContent,
    Button,
    NdIcon,
  ],
  template: `
    <ng-container ndTooltip [openDelay]="300">
      <button
        ndButton
        ndTooltipTrigger
        variant="ghost"
        size="icon"
        aria-label="Dismiss notification"
      >
        <svg ndIcon="x"></svg>
      </button>
      <ng-template ndTooltipPortal>
        <div ndTooltipContent side="end">Dismiss</div>
      </ng-template>
    </ng-container>
  `,
})
export class TooltipIconButtonExample {}
