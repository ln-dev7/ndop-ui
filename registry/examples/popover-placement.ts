import { Component } from '@angular/core';
import { Button } from '@/ui/button/button';
import {
  Popover,
  PopoverClose,
  PopoverPortal,
  PopoverTrigger,
  PopoverContent,
} from '@/ui/popover/popover';

/**
 * Popovers on each logical side, with a close button inside. `start` and
 * `end` follow the text direction.
 */
@Component({
  selector: 'example-popover-placement',
  imports: [
    Popover,
    PopoverTrigger,
    PopoverPortal,
    PopoverClose,
    PopoverContent,
    Button,
  ],
  template: `
    <div class="flex flex-wrap gap-2">
      @for (placement of placements; track placement.side) {
        <ng-container ndPopover>
          <button ndButton ndPopoverTrigger variant="outline">
            {{ placement.side }}
          </button>
          <ng-template ndPopoverPortal>
            <div
              ndPopoverContent
              class="w-56"
              [side]="placement.side"
              [align]="placement.align"
              [attr.aria-label]="'Placed ' + placement.side"
            >
              <p class="mb-3">Placed on the {{ placement.side }} side.</p>
              <button ndButton ndPopoverClose size="sm" variant="secondary">
                Done
              </button>
            </div>
          </ng-template>
        </ng-container>
      }
    </div>
  `,
})
export class PopoverPlacementExample {
  protected readonly placements = [
    { side: 'top', align: 'center' },
    { side: 'end', align: 'start' },
    { side: 'bottom', align: 'center' },
    { side: 'start', align: 'start' },
  ] as const;
}
