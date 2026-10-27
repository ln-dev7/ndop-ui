import { Component } from '@angular/core';
import {
  NdDrawer,
  NdDrawerClose,
  NdDrawerContent,
  NdDrawerDescription,
  NdDrawerHandle,
  NdDrawerTitle,
  NdDrawerTrigger,
} from '@ndop/primitives/drawer';

/** Drawer demo (`/primitives/drawer`): a bottom drawer that follows drags. */
@Component({
  selector: 'harness-drawer-demo',
  imports: [
    NdDrawer,
    NdDrawerTrigger,

    NdDrawerContent,
    NdDrawerHandle,
    NdDrawerTitle,
    NdDrawerDescription,
    NdDrawerClose,
  ],
  template: `
    <main class="grid justify-items-start gap-4 p-8">
      <h1 class="text-2xl font-semibold">Drawer</h1>
      <ng-container ndDrawer>
        <button ndDrawerTrigger class="rounded-md border px-4 py-2">
          Set goal
        </button>

        <dialog
          ndDrawerContent
          data-testid="drawer"
          class="backdrop:bg-black/50 bg-background fixed inset-x-0 bottom-0 grid h-80 translate-y-(--nd-drawer-drag) gap-3 rounded-t-lg p-6"
        >
          <div
            ndDrawerHandle
            class="bg-muted mx-auto h-2 w-24 rounded-full"
          ></div>
          <h2 ndDrawerTitle class="text-lg font-semibold">Move goal</h2>
          <p ndDrawerDescription>Set your daily activity goal.</p>
          <input aria-label="Calories" class="rounded-md border px-3 py-2" />
          <button ndDrawerClose class="rounded-md border px-3 py-1">
            Done
          </button>
        </dialog>
      </ng-container>
    </main>
  `,
})
export default class DrawerDemo {}
