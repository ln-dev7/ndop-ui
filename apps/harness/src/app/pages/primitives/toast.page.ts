import { Component, inject } from '@angular/core';
import {
  NdToast,
  NdToastAction,
  NdToastClose,
  NdToastDescription,
  NdToaster,
  NdToasterOutlet,
  NdToastRegion,
  NdToastTitle,
} from '@ndop/primitives/toast';

/**
 * Toast demo (`/primitives/toast`): buttons that show a short toast and
 * one with an action, in a region rendered into the overlay.
 */
@Component({
  selector: 'harness-toast-demo',
  imports: [
    NdToasterOutlet,
    NdToastRegion,
    NdToast,
    NdToastTitle,
    NdToastDescription,
    NdToastAction,
    NdToastClose,
  ],
  template: `
    <main class="grid justify-items-start gap-4 p-8">
      <h1 class="text-2xl font-semibold">Toast</h1>
      <button class="rounded-md border px-4 py-2" (click)="saved()">
        Save
      </button>
      <button class="rounded-md border px-4 py-2" (click)="deleted()">
        Delete
      </button>
    </main>
    <ng-template ndToaster>
      <section ndToastRegion class="fixed end-4 bottom-4 w-80">
        <ol class="grid gap-2">
          @for (toast of toaster.toasts(); track toast.id) {
            <li
              [ndToast]="toast"
              class="bg-background grid gap-1 rounded-md border p-3 translate-x-(--nd-toast-swipe)"
            >
              <p ndToastTitle class="font-medium">{{ toast.title }}</p>
              @if (toast.description) {
                <p ndToastDescription>{{ toast.description }}</p>
              }
              <div class="flex gap-2">
                @if (toast.action; as action) {
                  <button ndToastAction class="rounded-md border px-2">
                    {{ action.label }}
                  </button>
                }
                <button
                  ndToastClose
                  aria-label="Close"
                  class="rounded-md border px-2"
                >
                  ×
                </button>
              </div>
            </li>
          }
        </ol>
      </section>
    </ng-template>
  `,
})
export default class ToastDemo {
  protected readonly toaster = inject(NdToaster);

  protected saved(): void {
    this.toaster.show({
      title: 'Saved',
      description: 'Your changes are live.',
    });
  }

  protected deleted(): void {
    this.toaster.show({
      title: 'File deleted',
      duration: Infinity,
      action: {
        label: 'Undo',
        onClick: () => this.toaster.show({ title: 'Restored' }),
      },
    });
  }
}
