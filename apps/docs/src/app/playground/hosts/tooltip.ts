import { Component, computed, input } from '@angular/core';
import type { NdAlign, NdSide } from '@ndop/primitives/tooltip';
import { Button } from '@/ui/button/button';
import {
  NdTooltip,
  NdTooltipPortal,
  NdTooltipTrigger,
  TooltipContent,
} from '@/ui/tooltip/tooltip';
import type { PlaygroundHost, PlaygroundValues } from '../playground';

/** The values the Tooltip playground binds. */
interface Values {
  side: NdSide;
  align: NdAlign;
  sideOffset: number;
}

/** Renders a Tooltip with the playground's values. */
@Component({
  selector: 'docs-tooltip-playground',
  imports: [
    Button,
    NdTooltip,
    NdTooltipTrigger,
    NdTooltipPortal,
    TooltipContent,
  ],
  template: `
    <ng-container ndTooltip>
      <button ndButton ndTooltipTrigger variant="outline">Hover</button>
      <ng-template ndTooltipPortal>
        <div
          ndTooltipContent
          [side]="v().side"
          [align]="v().align"
          [sideOffset]="v().sideOffset"
        >
          Add to library
        </div>
      </ng-template>
    </ng-container>
  `,
})
export class TooltipPlayground {
  /** Every control's value. */
  readonly values = input.required<PlaygroundValues>();
  protected readonly v = computed(() => this.values() as unknown as Values);
}

/** Tooltip's playground: where its content opens. */
export const playground: PlaygroundHost = {
  part: 'TooltipContent',
  ranges: { sideOffset: [0, 32, 1] },
  snippet: `<ng-container ndTooltip>
  <button ndButton ndTooltipTrigger variant="outline">Hover</button>
  <ng-template ndTooltipPortal>
    <div ndTooltipContent%attrs%>Add to library</div>
  </ng-template>
</ng-container>`,
  component: TooltipPlayground,
};
