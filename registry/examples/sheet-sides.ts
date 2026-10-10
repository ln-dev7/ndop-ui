import { Component } from '@angular/core';
import { Button } from '@/ui/button/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
  type SheetSide,
} from '@/ui/sheet/sheet';

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
    SheetOverlay,
    SheetPortal,
    SheetTitle,
    SheetTrigger,
  ],
  template: `
    <div class="grid grid-cols-2 gap-2">
      @for (side of sides; track side) {
        <ng-container ndSheet>
          <button ndButton variant="outline" ndSheetTrigger class="capitalize">
            {{ side }}
          </button>
          <ng-template ndSheetPortal>
            <div ndSheetOverlay></div>
            <div ndSheetContent [side]="side">
              <div ndSheetHeader>
                <h2 ndSheetTitle class="capitalize">{{ side }} sheet</h2>
                <p ndSheetDescription>It slides in from the {{ side }}.</p>
              </div>
              <div class="p-4">
                <button ndButton variant="outline" ndSheetClose>Close</button>
              </div>
            </div>
          </ng-template>
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
