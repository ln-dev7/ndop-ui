import { Component, signal } from '@angular/core';
import {
  NdDialog,
  NdDialogClose,
  NdDialogContent,
  NdDialogDescription,
  NdDialogOverlay,
  NdDialogPortal,
  NdDialogTitle,
  NdDialogTrigger,
} from '@ndop/primitives/dialog';

/**
 * Dialog demo (`/primitives/dialog`): a form dialog with overlay, title,
 * description and two close buttons, on a page tall enough to scroll.
 */
@Component({
  selector: 'harness-dialog-demo',
  imports: [
    NdDialog,
    NdDialogTrigger,
    NdDialogPortal,
    NdDialogOverlay,
    NdDialogContent,
    NdDialogTitle,
    NdDialogDescription,
    NdDialogClose,
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
        <ng-template ndDialogPortal>
          <div
            ndDialogOverlay
            data-testid="overlay"
            class="fixed inset-0 bg-black/50"
          ></div>
          <div
            ndDialogContent
            class="bg-background fixed top-1/2 left-1/2 grid w-96 -translate-1/2 gap-3 rounded-lg p-6"
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
          </div>
        </ng-template>
      </ng-container>
      <p data-testid="state">{{ open() ? 'open' : 'closed' }}</p>
    </main>
  `,
})
export default class DialogDemo {
  protected readonly open = signal(false);
}
