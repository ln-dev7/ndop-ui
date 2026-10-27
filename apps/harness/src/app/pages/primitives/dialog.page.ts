import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  NdDialog,
  NdDialogClose,
  NdDialogContent,
  NdDialogDescription,
  NdDialogTitle,
  NdDialogTrigger,
} from '@ndop/primitives/dialog';

import {
  NdPopover,
  NdPopoverTrigger,
  NdPopoverPortal,
  NdPopoverContent,
} from '@ndop/primitives/popover';
import {
  NdTooltip,
  NdTooltipTrigger,
  NdTooltipPortal,
  NdTooltipContent,
} from '@ndop/primitives/tooltip';
import {
  NdSelect,
  NdSelectTrigger,
  NdSelectValue,
  NdSelectContent,
  NdSelectItem,
} from '@ndop/primitives/select';
import {
  NdCombobox,
  NdComboboxInput,
  NdComboboxContent,
  NdComboboxList,
  NdComboboxItem,
} from '@ndop/primitives/combobox';
import { NdDropdownMenuTrigger } from '@ndop/primitives/dropdown-menu';
import { NdContextMenuTrigger } from '@ndop/primitives/context-menu';
import {
  NdMenuContent,
  NdMenuItem,
  NdMenuSubTrigger,
} from '@ndop/primitives/menu';

/**
 * Dialog demo (`/primitives/dialog`): a form dialog with overlay, title,
 * description and two close buttons, on a page tall enough to scroll.
 */
@Component({
  selector: 'harness-dialog-demo',
  imports: [
    NdDialog,
    NdDialogTrigger,

    NdDialogContent,
    NdDialogTitle,
    NdDialogDescription,
    NdDialogClose,
    NdPopover,
    NdPopoverTrigger,
    NdPopoverPortal,
    NdPopoverContent,
    NdTooltip,
    NdTooltipTrigger,
    NdTooltipPortal,
    NdTooltipContent,
    NdSelect,
    NdSelectTrigger,
    NdSelectValue,
    NdSelectContent,
    NdSelectItem,
    NdCombobox,
    NdComboboxInput,
    NdComboboxContent,
    NdComboboxList,
    NdComboboxItem,
    NdDropdownMenuTrigger,
    NdContextMenuTrigger,
    NdMenuContent,
    NdMenuItem,
    NdMenuSubTrigger,
  ],
  template: `
    <main class="min-h-[200vh] p-8">
      <h1 class="text-2xl font-semibold">Dialog</h1>
      <ng-container ndDialog [(open)]="open">
        <button
          ndDialogTrigger
          class="bg-primary text-primary-foreground mt-4 rounded-md px-4 py-2"
        >
          Edit profile
        </button>

        <dialog
          ndDialogContent
          class="backdrop:bg-black/50 bg-background fixed top-1/2 left-1/2 grid w-96 -translate-1/2 gap-3 rounded-lg p-6"
        >
          <h2 ndDialogTitle class="text-lg font-semibold">Edit profile</h2>
          <p ndDialogDescription class="text-muted-foreground">
            Changes are saved when you close.
          </p>
          <input
            aria-label="Name"
            class="border-input rounded-md border px-3 py-2"
          />
          <input
            aria-label="Username"
            class="border-input rounded-md border px-3 py-2"
          />
          <ng-container ndDialog>
            <button ndDialogTrigger>Nested dialog</button>
            <dialog
              ndDialogContent
              aria-label="Nested question"
              class="backdrop:bg-black/50 bg-background fixed top-1/2 left-1/2 -translate-1/2 rounded-lg p-6"
            >
              <p>Only the innermost modal handles Escape.</p>
              <button ndDialogClose>Close nested</button>
            </dialog>
          </ng-container>
          <ng-container ndPopover>
            <button ndPopoverTrigger>Nested popover</button>
            <ng-template ndPopoverPortal>
              <div
                ndPopoverContent
                aria-label="Nested filters"
                class="bg-background grid max-h-[60vh] w-72 gap-3 overflow-auto rounded-lg border p-3"
              >
                <input aria-label="Nested filter" />
                <ng-container ndTooltip [openDelay]="0" [closeDelay]="0">
                  <button ndTooltipTrigger>Nested help</button>
                  <ng-template ndTooltipPortal
                    ><div
                      ndTooltipContent
                      class="bg-foreground text-background rounded-md p-2"
                    >
                      A contextual hint.
                    </div></ng-template
                  >
                </ng-container>
                <ng-container ndSelect>
                  <button ndSelectTrigger aria-label="Nested choice">
                    <span ndSelectValue placeholder="Pick one"></span>
                  </button>
                  <div
                    ndSelectContent
                    aria-label="Nested choices"
                    class="bg-background grid rounded-md border p-2"
                  >
                    <div ndSelectItem value="one">One</div>
                    <div ndSelectItem value="two">Two</div>
                  </div>
                </ng-container>
                <ng-container ndCombobox>
                  <input ndComboboxInput aria-label="Nested framework" />
                  <div
                    ndComboboxContent
                    class="bg-background rounded-md border p-2"
                  >
                    <div ndComboboxList>
                      <div ndComboboxItem value="angular">Angular</div>
                      <div ndComboboxItem value="react">React</div>
                    </div>
                  </div>
                </ng-container>
                <button [ndDropdownMenuTrigger]="nestedActions">
                  Nested actions
                </button>
                <ng-template #nestedActions>
                  <div
                    ndMenuContent
                    aria-label="Nested actions menu"
                    class="bg-background grid rounded-md border p-2"
                  >
                    <div ndMenuItem>Primary action</div>
                    <div [ndMenuSubTrigger]="moreActions">More actions</div>
                  </div>
                </ng-template>
                <ng-template #moreActions
                  ><div
                    ndMenuContent
                    aria-label="More actions menu"
                    class="bg-background grid rounded-md border p-2"
                  >
                    <div ndMenuItem>Secondary action</div>
                  </div></ng-template
                >
                <div
                  [ndContextMenuTrigger]="nestedContext"
                  tabindex="0"
                  aria-label="Nested canvas"
                  class="h-12 rounded-md border"
                >
                  Right click for context
                </div>
                <ng-template #nestedContext
                  ><div
                    ndMenuContent
                    aria-label="Nested context menu"
                    class="bg-background rounded-md border p-2"
                  >
                    <div ndMenuItem>Nested command</div>
                  </div></ng-template
                >
              </div>
            </ng-template>
          </ng-container>
          <div class="flex justify-end gap-2">
            <button ndDialogClose class="rounded-md border px-4 py-2">
              Cancel
            </button>
            <button
              ndDialogClose
              class="bg-primary text-primary-foreground rounded-md px-4 py-2"
            >
              Save
            </button>
          </div>
        </dialog>
      </ng-container>
      <ng-container ndDialog>
        <button ndDialogTrigger>Empty dialog</button>
        <dialog
          ndDialogContent
          aria-label="Empty question"
          class="backdrop:bg-black/50 bg-background fixed top-1/2 left-1/2 -translate-1/2 rounded-lg p-6"
        >
          No interactive controls.
        </dialog>
      </ng-container>
      <p data-testid="state">{{ open() ? 'open' : 'closed' }}</p>
    </main>
  `,
})
export default class DialogDemo {
  protected readonly open = signal(
    inject(ActivatedRoute).snapshot.queryParamMap.get('open') === 'true',
  );
}
