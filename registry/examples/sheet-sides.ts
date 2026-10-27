import { Component } from '@angular/core';
import { Button } from '@/ui/button/button';
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  type SheetSide,
} from '@/ui/sheet/sheet';
import {
  NdDialog as Sheet,
  NdDialogClose as SheetClose,
  NdDialogTrigger as SheetTrigger,
} from '@ndop/primitives/dialog';

/**
 * A sheet from each edge. `start` and `end` are logical, so they swap in
 * right-to-left layouts.
 */
@Component({
  selector: 'example-sheet-sides',
  imports: [
    Button,
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetHeader,

    SheetTitle,
    SheetTrigger,
  ],
  template: `
    <div class="grid grid-cols-2 gap-2">
      @for (side of sides; track side) {
        <ng-container ndDialog>
          <button ndButton variant="outline" ndDialogTrigger class="capitalize">
            {{ side }}
          </button>

          <dialog ndSheetContent [side]="side">
            <div ndSheetHeader>
              <h2 ndSheetTitle class="capitalize">{{ side }} sheet</h2>
              <p ndSheetDescription>It slides in from the {{ side }}.</p>
            </div>
            <div class="p-4">
              <button ndButton variant="outline" ndDialogClose>Close</button>
            </div>
          </dialog>
        </ng-container>
      }
    </div>
  `,
})
export class SheetSidesExample {
  protected readonly sides: readonly SheetSide[] = [
    'top',
    'end',
    'bottom',
    'start',
  ];
}
