import { Dir } from '@angular/cdk/bidi';
import { Component } from '@angular/core';
import {
  NdPopover,
  NdPopoverClose,
  NdPopoverContent,
  NdPopoverPortal,
  NdPopoverTrigger,
} from '@ndop/primitives/popover';

/**
 * Popover demo (`/primitives/popover`): a form popover, a text-input
 * popover for keyboard tests, inline-end popovers in LTR and RTL subtrees,
 * and one pinned to the bottom of the viewport so it must flip.
 */
@Component({
  selector: 'harness-popover-demo',
  imports: [
    Dir,
    NdPopover,
    NdPopoverTrigger,
    NdPopoverPortal,
    NdPopoverContent,
    NdPopoverClose,
  ],
  template: `
    <main class="grid justify-items-start gap-4 p-8">
      <h1 class="text-2xl font-semibold">Popover</h1>

      <ng-container ndPopover>
        <button ndPopoverTrigger class="rounded-md border px-4 py-2">
          Filters
        </button>
        <ng-template ndPopoverPortal>
          <div
            ndPopoverContent
            side="bottom"
            align="start"
            aria-label="Filters"
            class="bg-popover text-popover-foreground grid gap-2 rounded-md border p-4"
          >
            <input
              aria-label="Search"
              class="border-input rounded-md border px-3 py-2"
            />
            <button ndPopoverClose class="rounded-md border px-3 py-1">
              Done
            </button>
          </div>
        </ng-template>
      </ng-container>
      <button class="rounded-md border px-4 py-2">After</button>

      <ng-container ndPopover>
        <button ndPopoverTrigger class="rounded-md border px-4 py-2">
          Price
        </button>
        <ng-template ndPopoverPortal>
          <div
            ndPopoverContent
            aria-label="Price"
            class="bg-popover text-popover-foreground grid gap-2 rounded-md border p-4"
          >
            <input
              aria-label="Min"
              class="border-input rounded-md border px-3 py-2"
            />
            <input
              aria-label="Max"
              class="border-input rounded-md border px-3 py-2"
            />
          </div>
        </ng-template>
      </ng-container>
      <input
        aria-label="Notes"
        class="border-input rounded-md border px-3 py-2"
      />

      @for (dir of directions; track dir) {
        <section [dir]="dir" class="w-full">
          <ng-container ndPopover>
            <button ndPopoverTrigger class="rounded-md border px-4 py-2">
              Details {{ dir }}
            </button>
            <ng-template ndPopoverPortal>
              <div
                ndPopoverContent
                side="end"
                [attr.aria-label]="'Details ' + dir"
                class="bg-popover text-popover-foreground rounded-md border p-4"
              >
                More details
              </div>
            </ng-template>
          </ng-container>
        </section>
      }

      <div class="fixed start-8 bottom-2">
        <ng-container ndPopover>
          <button ndPopoverTrigger class="rounded-md border px-4 py-2">
            Pinned
          </button>
          <ng-template ndPopoverPortal>
            <div
              ndPopoverContent
              side="bottom"
              aria-label="Pinned"
              class="bg-popover text-popover-foreground h-40 rounded-md border p-4"
            >
              <button class="rounded-md border px-3 py-1">Inside</button>
            </div>
          </ng-template>
        </ng-container>
      </div>
    </main>
  `,
})
export default class PopoverDemo {
  protected readonly directions = ['ltr', 'rtl'] as const;
}
