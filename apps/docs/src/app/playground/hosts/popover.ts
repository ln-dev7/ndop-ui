import { Component, computed, input } from '@angular/core';
import type { NdAlign, NdSide } from '@ndop/primitives/popover';
import { Button } from '@/ui/button/button';
import {
  NdPopover,
  NdPopoverPortal,
  NdPopoverTrigger,
  PopoverContent,
} from '@/ui/popover/popover';
import type { PlaygroundHost, PlaygroundValues } from '../playground';

/** The values the Popover playground binds. */
interface Values {
  side: NdSide;
  align: NdAlign;
  sideOffset: number;
}

/** Renders a Popover with the playground's values. */
@Component({
  selector: 'docs-popover-playground',
  imports: [
    Button,
    NdPopover,
    NdPopoverTrigger,
    NdPopoverPortal,
    PopoverContent,
  ],
  template: `
    <ng-container ndPopover>
      <button ndButton ndPopoverTrigger variant="outline">Open popover</button>
      <ng-template ndPopoverPortal>
        <div
          ndPopoverContent
          aria-label="Playground"
          [side]="v().side"
          [align]="v().align"
          [sideOffset]="v().sideOffset"
        >
          Place content for the popover here.
        </div>
      </ng-template>
    </ng-container>
  `,
})
export class PopoverPlayground {
  /** Every control's value. */
  readonly values = input.required<PlaygroundValues>();
  protected readonly v = computed(() => this.values() as unknown as Values);
}

/** Popover's playground: where its content opens. */
export const playground: PlaygroundHost = {
  part: 'PopoverContent',
  ranges: { sideOffset: [0, 32, 1] },
  snippet: `<ng-container ndPopover>
  <button ndButton ndPopoverTrigger variant="outline">Open popover</button>
  <ng-template ndPopoverPortal>
    <div ndPopoverContent aria-label="Playground"%attrs%>
      Place content for the popover here.
    </div>
  </ng-template>
</ng-container>`,
  component: PopoverPlayground,
};
