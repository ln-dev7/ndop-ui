import { Component, signal } from '@angular/core';
import { NdIcon } from '@ndop/core';
import { Button } from '@/ui/button/button';
import {
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHandle,
  DrawerHeader,
  DrawerOverlay,
  DrawerTitle,
  Drawer,
  DrawerClose,
  DrawerPortal,
  DrawerTrigger,
} from '@/ui/drawer/drawer';

/**
 * A daily goal set with buttons in a bottom drawer, with a handle to drag
 * it away. The goal is announced as it changes.
 */
@Component({
  selector: 'example-drawer-demo',
  imports: [
    Button,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHandle,
    DrawerHeader,
    DrawerOverlay,
    DrawerTitle,
    Drawer,
    DrawerClose,
    DrawerPortal,
    DrawerTrigger,
    NdIcon,
  ],
  template: `
    <ng-container ndDrawer>
      <button ndButton variant="outline" ndDrawerTrigger>Set goal</button>
      <ng-template ndDrawerPortal>
        <div ndDrawerOverlay></div>
        <div ndDrawerContent>
          <div ndDrawerHandle></div>
          <div class="mx-auto w-full max-w-sm">
            <div ndDrawerHeader>
              <h2 ndDrawerTitle>Move goal</h2>
              <p ndDrawerDescription>Set your daily activity goal.</p>
            </div>
            <div class="flex items-center justify-center gap-4 p-4">
              <button
                ndButton
                variant="outline"
                size="icon"
                class="rounded-full"
                [disabled]="goal() <= 200"
                (click)="change(-10)"
              >
                <svg ndIcon="minus"></svg>
                <span class="sr-only">Decrease</span>
              </button>
              <p class="text-center" aria-live="polite">
                <span class="block text-6xl font-bold tracking-tighter">{{
                  goal()
                }}</span>
                <span class="text-[0.70rem] text-muted-foreground uppercase">
                  Calories a day
                </span>
              </p>
              <button
                ndButton
                variant="outline"
                size="icon"
                class="rounded-full"
                [disabled]="goal() >= 400"
                (click)="change(10)"
              >
                <svg ndIcon="plus"></svg>
                <span class="sr-only">Increase</span>
              </button>
            </div>
            <div ndDrawerFooter>
              <button ndButton ndDrawerClose>Submit</button>
              <button ndButton variant="outline" ndDrawerClose>Cancel</button>
            </div>
          </div>
        </div>
      </ng-template>
    </ng-container>
  `,
})
export class DrawerDemoExample {
  protected readonly goal = signal(350);

  /**
   * Moves the goal by a step, between 200 and 400.
   *
   * @param step - How much to add.
   */
  protected change(step: number): void {
    this.goal.update((goal) => Math.min(400, Math.max(200, goal + step)));
  }
}
