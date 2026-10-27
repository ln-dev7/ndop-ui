import { Component, signal } from '@angular/core';
import {
  NdAlertDialog,
  NdAlertDialogAction,
  NdAlertDialogCancel,
  NdAlertDialogContent,
  NdAlertDialogDescription,
  NdAlertDialogTitle,
  NdAlertDialogTrigger,
} from '@ndop/primitives/alert-dialog';

/**
 * Alert Dialog demo (`/primitives/alert-dialog`): a delete confirmation
 * that reports what was chosen.
 */
@Component({
  selector: 'harness-alert-dialog-demo',
  imports: [
    NdAlertDialog,
    NdAlertDialogTrigger,

    NdAlertDialogContent,
    NdAlertDialogTitle,
    NdAlertDialogDescription,
    NdAlertDialogCancel,
    NdAlertDialogAction,
  ],
  template: `
    <main class="grid justify-items-start gap-4 p-8">
      <h1 class="text-2xl font-semibold">Alert Dialog</h1>
      <ng-container ndAlertDialog>
        <button ndAlertDialogTrigger class="rounded-md border px-4 py-2">
          Delete project
        </button>

        <dialog
          ndAlertDialogContent
          class="backdrop:bg-black/50 bg-background fixed top-1/2 left-1/2 grid w-96 -translate-1/2 gap-3 rounded-lg p-6"
        >
          <h2 ndAlertDialogTitle class="text-lg font-semibold">
            Delete this project?
          </h2>
          <p ndAlertDialogDescription>This can't be undone.</p>
          <div class="flex justify-end gap-2">
            <button ndAlertDialogCancel class="rounded-md border px-3 py-1">
              Cancel
            </button>
            <button
              ndAlertDialogAction
              class="rounded-md border px-3 py-1"
              (click)="result.set('deleted')"
            >
              Delete
            </button>
          </div>
        </dialog>
      </ng-container>
      <p>Result: {{ result() }}</p>
    </main>
  `,
})
export default class AlertDialogDemo {
  protected readonly result = signal('none');
}
