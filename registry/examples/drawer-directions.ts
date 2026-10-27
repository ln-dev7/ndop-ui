import { Component } from '@angular/core';
import { Button } from '@/ui/button/button';
import {
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/ui/drawer/drawer';
import {
  NdDrawer as Drawer,
  NdDrawerClose as DrawerClose,
  NdDrawerTrigger as DrawerTrigger,
} from '@ndop/primitives/drawer';

/**
 * Drawers from the end side and the top, each dragged back toward its
 * own edge.
 */
@Component({
  selector: 'example-drawer-directions',
  imports: [
    Button,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,

    DrawerTitle,
    Drawer,
    DrawerClose,

    DrawerTrigger,
  ],
  template: `
    <div class="flex gap-2">
      @for (direction of directions; track direction) {
        <ng-container ndDrawer>
          <button ndButton variant="outline" ndDrawerTrigger class="capitalize">
            {{ direction }}
          </button>

          <dialog ndDrawerContent [direction]="direction">
            <div ndDrawerHeader>
              <h2 ndDrawerTitle class="capitalize">{{ direction }} drawer</h2>
              <p ndDrawerDescription>Drag it toward its edge to close it.</p>
            </div>
            <div ndDrawerFooter>
              <button ndButton variant="outline" ndDrawerClose>Close</button>
            </div>
          </dialog>
        </ng-container>
      }
    </div>
  `,
})
export class DrawerDirectionsExample {
  protected readonly directions = ['end', 'top'] as const;
}
