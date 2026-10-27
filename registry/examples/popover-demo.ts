import { Component } from '@angular/core';
import { Button } from '@/ui/button/button';
import { Input } from '@/ui/input/input';
import { Label } from '@/ui/label/label';
import {
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
} from '@/ui/popover/popover';
import {
  NdPopover as Popover,
  NdPopoverPortal as PopoverPortal,
  NdPopoverTrigger as PopoverTrigger,
} from '@ndop/primitives/popover';

/** A popover holding a small dimensions form. */
@Component({
  selector: 'example-popover-demo',
  imports: [
    Popover,
    PopoverTrigger,
    PopoverPortal,
    PopoverContent,
    PopoverHeader,
    PopoverTitle,
    PopoverDescription,
    Button,
    Input,
    Label,
  ],
  template: `
    <ng-container ndPopover>
      <button ndButton ndPopoverTrigger variant="outline">Open popover</button>
      <ng-template ndPopoverPortal>
        <div ndPopoverContent class="w-80" aria-labelledby="popover-demo-title">
          <div class="grid gap-4">
            <div ndPopoverHeader>
              <h4 ndPopoverTitle id="popover-demo-title">Dimensions</h4>
              <p ndPopoverDescription>Set the dimensions for the layer.</p>
            </div>
            <div class="grid gap-2">
              @for (field of fields; track field.id) {
                <div class="grid grid-cols-3 items-center gap-4">
                  <label ndLabel [for]="field.id">{{ field.label }}</label>
                  <input
                    ndInput
                    [id]="field.id"
                    [value]="field.value"
                    class="col-span-2 h-8"
                  />
                </div>
              }
            </div>
          </div>
        </div>
      </ng-template>
    </ng-container>
  `,
})
export class PopoverDemoExample {
  protected readonly fields = [
    { id: 'popover-demo-width', label: 'Width', value: '100%' },
    { id: 'popover-demo-max-width', label: 'Max. width', value: '300px' },
    { id: 'popover-demo-height', label: 'Height', value: '25px' },
    { id: 'popover-demo-max-height', label: 'Max. height', value: 'none' },
  ];
}
